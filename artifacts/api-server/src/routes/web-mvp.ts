import { Router, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { pool } from "@workspace/db";
import { SaveMvpJournalBody, SaveMvpJournalParams, SaveMvpJournalResponse, GetMvpRecoveryResponse,
  GetDoctorMvpPatientParams, GetDoctorMvpPatientResponse, ChangeDoctorMvpStageBody,
  ChangeDoctorMvpStageResponse, DeletePatientAccountBody } from "@workspace/api-zod";
import { MvpError, WebMvpService } from "../lib/web-mvp";
import { deletePatientAccount, LegacyCopyOwnershipError } from "../lib/delete-patient-account";
import { careIdentity } from "../lib/care-team-runtime";
import { allowedRequestOrigin } from "../lib/request-origin";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { explainWeeklyNotes } from "../lib/private-weekly-reason";

export const webMvpService = new WebMvpService(pool, undefined, explainWeeklyNotes);
export const patientMvpRouter = Router();
export const doctorMvpRouter = Router();
const owner = (req: Request) => getAuth(req).userId!;
function failure(error: unknown, res: Response) {
  if (error instanceof MvpError) { res.status(error.status).json({ error: error.message }); return; }
  res.status(503).json({ error: "We couldn't complete that just now. Please try again. Your saved entries are kept." });
}
patientMvpRouter.get("/mvp", async (req, res) => {
  try { res.json(GetMvpRecoveryResponse.parse(await webMvpService.patient(owner(req)))); } catch (e) { failure(e, res); }
});
patientMvpRouter.put("/mvp/journal/:date", async (req, res) => {
  const body = SaveMvpJournalBody.safeParse(req.body), params = SaveMvpJournalParams.safeParse(req.params);
  if (!body.success || !params.success) { res.status(400).json({ error: "Use scores from 0 to 10, or leave a field unrecorded." }); return; }
  try { res.json(SaveMvpJournalResponse.parse(await webMvpService.save(owner(req), params.data.date, body.data))); } catch (e) { failure(e, res); }
});
patientMvpRouter.delete("/account", async (req, res) => {
  if (!DeletePatientAccountBody.safeParse(req.body).success) { res.status(400).json({ error: "Type DELETE to confirm permanent account deletion." }); return; }
  try {
    const identity = await careIdentity(owner(req));
    const account = await clerkClient.users.getUser(identity.id);
    await deletePatientAccount(pool, identity.id, identity.emails.map(e => e.address.toLowerCase()), async id => {
      try { await clerkClient.users.deleteUser(id); } catch (e: any) { if (e?.status !== 404) throw new Error("Sign-in deletion pending"); }
    }, account.createdAt);
    res.sendStatus(204);
  } catch (error) {
    if (error instanceof LegacyCopyOwnershipError) { res.status(409).json({ error: error.message }); return; }
    res.status(503).json({ error: "Account deletion could not finish. Some data may already have been removed. Retry Delete account to finish removing your sign-in." });
  }
});
doctorMvpRouter.use("/clinician/mvp", async (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!allowedRequestOrigin({ origin: req.get("origin"), host: getClerkProxyHost(req), authorization: req.get("authorization") })) {
    res.status(403).json({ error: "Cross-origin access is not permitted." }); return;
  }
  if (!getAuth(req).userId) { res.status(401).json({ error: "Please sign in." }); return; }
  try {
    const { rows: [role] } = await pool.query("SELECT account_type FROM account_roles WHERE user_id=$1", [owner(req)]);
    if (role?.account_type !== "clinician") { res.status(403).json({ error: "A clinician account is required." }); return; }
    next();
  } catch (e) { failure(e, res); }
});
doctorMvpRouter.get("/clinician/mvp/patients/:id", async (req, res) => {
  const params = GetDoctorMvpPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Choose a valid patient." }); return; }
  try { res.json(GetDoctorMvpPatientResponse.parse(await webMvpService.doctor(owner(req), params.data.id))); } catch (e) { failure(e, res); }
});
doctorMvpRouter.post("/clinician/mvp/patients/:id/stage", async (req, res) => {
  const params = GetDoctorMvpPatientParams.safeParse(req.params), body = ChangeDoctorMvpStageBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Choose a stage and add a note." }); return; }
  try { res.json(ChangeDoctorMvpStageResponse.parse(await webMvpService.override(owner(req), params.data.id, body.data.stage, body.data.note))); } catch (e) { failure(e, res); }
});
