import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { CreateClinicianCareRequestBody, CreatePatientCareInviteBody, RespondToCareRequestBody, GetCarePatientJournalQueryParams } from "@workspace/api-zod";
import { careIdentity, careTeamService } from "../lib/care-team-runtime";
import { CareTeamError, CLINICIAN_REQUEST, PATIENT_INVITE, inviteInput, type Identity } from "../lib/care-team";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { careDeliveryResponse } from "../lib/care-team-email";
import { allowedRequestOrigin } from "../lib/request-origin";

const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function id(req: Request) {
  const value = String(req.params.id ?? "");
  if (!uuid.test(value)) throw new CareTeamError("invalid_id", "Choose a valid invite or connection.");
  return value;
}
function input(req: Request) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CareTeamError("invalid_input", "Check the invite details.");
  for (const [key, message] of [["firstName", "Enter their first name."], ["lastName", "Enter their last name."], ["email", "Enter an email like name@example.com."]]) {
    if (body[key] !== undefined && typeof body[key] !== "string") throw new CareTeamError("invalid_input", message!);
  }
  const fields = inviteInput({ firstName: body.firstName, lastName: body.lastName, email: body.email });
  const parsed = CreateClinicianCareRequestBody.safeParse(fields);
  if (!parsed.success) throw new CareTeamError("invalid_email", "Enter an email like name@example.com.");
  if (req.path.startsWith("/patient/")) {
    const patientInput = CreatePatientCareInviteBody.safeParse({ ...fields, consentAccepted: body.consentAccepted });
    if (!patientInput.success) throw new CareTeamError("consent_required", "Confirm that you want to share your journal with this clinician.");
  }
  return parsed.data;
}
export function careTeamFailure(error: unknown, res: Response) {
  if (error instanceof CareTeamError) {
    res.status(error.status).json({ code: error.code, error: error.message, ...(error.request ? { request: error.request } : {}) });
    return true;
  }
  return false;
}
type Handler = (req: Request, user: Identity) => Promise<unknown>;
function endpoint(handler: Handler, status = 200) {
  return async (req: Request, res: Response, next: (error?: unknown) => void) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      if (!allowedRequestOrigin({ origin: req.get("origin"), host: getClerkProxyHost(req), authorization: req.get("authorization") }))
        throw new CareTeamError("cross_origin", "Cross-origin access is not permitted.", 403);
      const userId = getAuth(req).userId;
      if (!userId) throw new CareTeamError("sign_in_required", "Please sign in to continue.", 401);
      const result = await handler(req, await careIdentity(userId));
      if (status === 204) res.sendStatus(204);
      else res.status(status).json(result);
    } catch (error) {
      if (!careTeamFailure(error, res)) next(error);
    }
  };
}
function baseUrl(req: Request) {
  const configured = process.env.CARE_TEAM_WEBSITE_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
      throw new CareTeamError("email_configuration", "The invite service is temporarily unavailable.", 503);
    return url.origin;
  }
  if (process.env.EMAIL_API_KEY) throw new CareTeamError("email_configuration", "The invite service is temporarily unavailable.", 503);
  return process.env.NODE_ENV === "development" ? `https://${getClerkProxyHost(req)}` : "";
}
function deliveryResult(result: { invite: unknown; suppressed: boolean; link: string }) {
  return careDeliveryResponse(result, process.env.NODE_ENV);
}
router.get("/care-team/requests/:token/preview", async (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  try { res.json(await careTeamService.previewRequest(String(req.params.token))); }
  catch (error) { if (!careTeamFailure(error, res)) next(error); }
});
router.get("/patient/care-team", endpoint((_req, user) => careTeamService.listTeam(user)));
router.post("/patient/care-team/invites", endpoint(async (req, user) =>
  deliveryResult(await careTeamService.sendInvite(user, PATIENT_INVITE, input(req), baseUrl(req), undefined, req.body?.consentAccepted === true)), 201));
router.post("/patient/care-team/invites/:id/resend", endpoint(async (req, user) =>
  deliveryResult(await careTeamService.sendInvite(user, PATIENT_INVITE, {}, baseUrl(req), id(req)))));
router.delete("/patient/care-team/invites/:id", endpoint((req, user) => careTeamService.cancel(user, id(req), PATIENT_INVITE), 204));
router.post("/patient/care-team/invites/:id/undo-cancel", endpoint((req, user) => careTeamService.undoCancel(user, id(req))));
router.delete("/patient/care-team/links/:id", endpoint((req, user) => careTeamService.removeClinician(user, id(req)), 204));
router.get("/patient/care-team/requests/:token", endpoint((req, user) => careTeamService.viewRequest(user, String(req.params.token))));
router.post("/patient/care-team/requests/:token/respond", endpoint((req, user) => {
  const parsed = RespondToCareRequestBody.safeParse(req.body);
  if (!parsed.success) throw new CareTeamError("invalid_action", "Choose Share or Not now.");
  return careTeamService.accept(user, String(req.params.token), CLINICIAN_REQUEST, parsed.data.consentAccepted === true, parsed.data.action === "not_now");
}));
router.post("/clinician/care-team/invites/:token/accept", endpoint((req, user) =>
  careTeamService.accept(user, String(req.params.token), PATIENT_INVITE)));
router.get("/clinician/care-team/patients", endpoint((_req, user) => careTeamService.listPatients(user)));
router.get("/clinician/care-team/patients/:id", endpoint((req, user) => {
  const parsed = GetCarePatientJournalQueryParams.safeParse(req.query);
  if (!parsed.success) throw new CareTeamError("invalid_page", "Choose a valid page.");
  return careTeamService.readPatient(user, id(req), parsed.data.page);
}));
router.delete("/clinician/care-team/patients/:id", endpoint((req, user) => careTeamService.removeFormer(user, id(req)), 204));
router.get("/clinician/care-team/requests", endpoint((_req, user) => careTeamService.listRequests(user)));
router.post("/clinician/care-team/requests", endpoint(async (req, user) =>
  deliveryResult(await careTeamService.sendInvite(user, CLINICIAN_REQUEST, input(req), baseUrl(req))), 201));
router.post("/clinician/care-team/requests/:id/resend", endpoint(async (req, user) =>
  deliveryResult(await careTeamService.sendInvite(user, CLINICIAN_REQUEST, {}, baseUrl(req), id(req)))));
router.delete("/clinician/care-team/requests/:id", endpoint((req, user) => careTeamService.cancel(user, id(req), CLINICIAN_REQUEST), 204));
export default router;
