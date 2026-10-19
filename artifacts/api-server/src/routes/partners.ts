import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  accountRoles,
  clinicianProfiles,
  db,
  patientClinicianConnections,
  partnershipRequests,
  recoveryLogs,
  recoveryProfiles,
} from "@workspace/db";
import {
  AcceptClinicianJournalInvitationParams,
  AcceptClinicianJournalInvitationResponse,
  CreatePartnershipRequestBody,
  CreatePartnershipRequestResponse,
  GetSharedPatientJournalParams,
  GetSharedPatientJournalResponse,
  GetClinicianProfileResponse,
  GetPublicClinicianResponse,
  InviteClinicianToJournalBody,
  InviteClinicianToJournalResponse,
  ListPatientClinicianConnectionsResponse,
  ListClinicianProfilesForAdminResponse,
  ListPartnershipRequestsResponse,
  ListPublicCliniciansResponse,
  RevokeClinicianJournalAccessParams,
  SaveClinicianProfileBody,
  SaveClinicianProfileResponse,
  UpdateClinicianJournalSharingParams,
  UpdateClinicianJournalSharingBody,
  UpdateClinicianJournalSharingResponse,
  ListClinicianJournalInvitationsResponse,
  ListConnectedPatientsResponse,
  UpdateClinicianVerificationBody,
  UpdateClinicianVerificationResponse,
} from "@workspace/api-zod";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { notifyStillwellPartnershipTeam } from "../lib/partner-notifications";
import {
  canReadConnection,
  canPatientManageConnection,
  filterSharedJournalLog,
  transitionConnection,
  type JournalShareArea,
} from "../lib/journal-sharing";

const router: IRouter = Router();
const clinicianDisplayColumns = {
  connectCode: clinicianProfiles.connectCode,
  displayName: clinicianProfiles.displayName,
  profession: clinicianProfiles.profession,
  practiceName: clinicianProfiles.practiceName,
  location: clinicianProfiles.location,
  areas: clinicianProfiles.areas,
  openToNewPatients: clinicianProfiles.openToNewPatients,
};

function sameOrigin(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  try {
    const expectedHost = getClerkProxyHost(req);
    return Boolean(expectedHost && new URL(origin).host === expectedHost);
  } catch {
    return false;
  }
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hasUniqueShareAreas(areas: readonly string[]): boolean {
  return new Set(areas).size === areas.length;
}

async function signedInUser(req: Request, res: Response): Promise<string | null> {
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return null;
  }
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Please sign in to continue." });
    return null;
  }
  return userId;
}

async function hasClinicianRole(userId: string): Promise<boolean> {
  const [role] = await db.select({ accountType: accountRoles.accountType })
    .from(accountRoles)
    .where(eq(accountRoles.userId, userId));
  return role?.accountType === "clinician";
}

async function signedInPatient(req: Request, res: Response): Promise<string | null> {
  const userId = await signedInUser(req, res);
  if (!userId) return null;
  if (await hasClinicianRole(userId)) {
    res.status(403).json({ error: "This feature is for patient accounts." });
    return null;
  }
  return userId;
}

async function signedInClinician(req: Request, res: Response): Promise<string | null> {
  const userId = await signedInUser(req, res);
  if (!userId) return null;
  if (!(await hasClinicianRole(userId))) {
    res.status(403).json({ error: "This feature is for clinician accounts." });
    return null;
  }
  return userId;
}

async function isStillwellAdmin(userId: string): Promise<boolean> {
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch {
    return false;
  }

  const publicMetadata = clerkUser.publicMetadata as Record<string, unknown>;
  if (publicMetadata?.stillwellAdmin === true) return true;

  const primaryEmail = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  if (primaryEmail?.verification?.status !== "verified") return false;
  const allowlist = (process.env.STILLWELL_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizedEmail)
    .filter(Boolean);
  return allowlist.includes(normalizedEmail(primaryEmail.emailAddress));
}

async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = await signedInUser(req, res);
  if (!userId) return null;
  if (!(await isStillwellAdmin(userId))) {
    res.status(403).json({ error: "Stillwell administrator access is required." });
    return null;
  }
  return userId;
}

function serializedProfile(profile: typeof clinicianProfiles.$inferSelect) {
  const nameParts = profile.displayName.trim().split(/\s+/).filter(Boolean);
  return {
    ...profile,
    firstName: profile.firstName ?? nameParts[0] ?? "",
    lastName: profile.lastName ?? nameParts.slice(1).join(" "),
    practiceType: profile.practiceType === "clinic" ? "clinic" : "individual",
    website: profile.website ?? null,
    termsAcceptedAt: profile.termsAcceptedAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function patientConnectionPayload(connection: {
  id: string;
  status: "pending" | "accepted" | "revoked";
  shareAreas: string[];
  clinicianDisplayName: string;
  clinicianProfession: string | null;
  clinicianPracticeName: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
}) {
  return {
    ...connection,
    clinicianProfession: connection.clinicianProfession ?? "Other",
    clinicianPracticeName: connection.clinicianPracticeName ?? "",
    createdAt: connection.createdAt.toISOString(),
    acceptedAt: connection.acceptedAt?.toISOString() ?? null,
  };
}

async function getPatientConnection(connectionId: string, patientId: string) {
  const [connection] = await db.select({
    id: patientClinicianConnections.id,
    status: patientClinicianConnections.status,
    shareAreas: patientClinicianConnections.shareAreas,
    clinicianDisplayName: clinicianProfiles.displayName,
    clinicianProfession: clinicianProfiles.profession,
    clinicianPracticeName: clinicianProfiles.practiceName,
    createdAt: patientClinicianConnections.createdAt,
    acceptedAt: patientClinicianConnections.acceptedAt,
  }).from(patientClinicianConnections)
    .innerJoin(clinicianProfiles, eq(clinicianProfiles.userId, patientClinicianConnections.clinicianId))
    .where(and(
      eq(patientClinicianConnections.id, connectionId),
      eq(patientClinicianConnections.patientId, patientId),
      inArray(patientClinicianConnections.status, ["pending", "accepted"]),
    ));
  return connection;
}

function patientLabel(connectionId: string): string {
  return `Patient ${connectionId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

router.post("/partnership-requests", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return;
  }
  const parsed = CreatePartnershipRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the required organization and contact details." });
    return;
  }

  const input = parsed.data;
  const notificationStatus = await notifyStillwellPartnershipTeam();
  await db.insert(partnershipRequests).values({
    organizationName: input.organizationName.trim(),
    organizationType: input.organizationType,
    contactName: input.contactName.trim(),
    contactRole: input.contactRole.trim(),
    workEmail: normalizedEmail(input.workEmail),
    phone: input.phone?.trim() || null,
    peopleSupported: input.peopleSupported,
    message: input.message?.trim() || null,
    notificationStatus,
  });
  res.status(201).json(CreatePartnershipRequestResponse.parse({ saved: true, notificationStatus }));
});

router.get("/admin/partnership-requests", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!(await requireAdmin(req, res))) return;

  const items = await db.select().from(partnershipRequests)
    .orderBy(desc(partnershipRequests.createdAt));
  res.json(ListPartnershipRequestsResponse.parse({
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  }));
});

router.get("/clinician/profile", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const userId = await signedInUser(req, res);
  if (!userId) return;
  if (!(await hasClinicianRole(userId))) {
    res.status(403).json({ error: "This page is for clinician accounts." });
    return;
  }
  const [profile] = await db.select().from(clinicianProfiles)
    .where(eq(clinicianProfiles.userId, userId));
  res.json(GetClinicianProfileResponse.parse({
    profile: profile ? serializedProfile(profile) : null,
  }));
});

router.put("/clinician/profile", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const userId = await signedInUser(req, res);
  if (!userId) return;
  if (!(await hasClinicianRole(userId))) {
    res.status(403).json({ error: "This page is for clinician accounts." });
    return;
  }

  const parsed = SaveClinicianProfileBody.safeParse(req.body);
  if (!parsed.success || parsed.data.termsAccepted !== true) {
    res.status(400).json({ error: "Complete the profile and accept the clinician terms to continue." });
    return;
  }

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch {
    res.status(503).json({ error: "We could not confirm your account just now. Please try again." });
    return;
  }
  const input = parsed.data;
  const firstName = input.firstName?.trim() || clerkUser.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || clerkUser.lastName?.trim() || "";
  if (!firstName || !lastName) {
    res.status(400).json({ error: "First and last name are required to save your profile." });
    return;
  }
  const displayName = `${firstName} ${lastName}`.trim();
  const practiceType = input.practiceType ?? "individual";
  const profession = input.profession ?? null;
  const licenseNumber = input.licenseNumber?.trim() || null;
  const licenseRegion = input.licenseRegion?.trim() || null;
  const practiceName = input.practiceName?.trim() || null;
  const location = input.location?.trim() || null;
  const website = input.website?.trim() || null;
  const [existing] = await db.select().from(clinicianProfiles)
    .where(eq(clinicianProfiles.userId, userId));
  const licenseUnchanged = existing?.licenseNumber === licenseNumber &&
    existing.licenseRegion === licenseRegion;
  const verificationStatus = licenseUnchanged
    ? existing.verificationStatus
    : "pending";
  const connectCode = existing?.connectCode ?? randomBytes(18).toString("hex");

  const [saved] = await db.insert(clinicianProfiles).values({
    userId,
    displayName,
    firstName,
    lastName,
    practiceType,
    phone: input.phone?.trim() || null,
    website,
    inviteCode: input.inviteCode?.trim() || null,
    profession,
    licenseNumber,
    licenseRegion,
    practiceName,
    location,
    areas: input.areas,
    listInDirectory: input.listInDirectory,
    openToNewPatients: input.openToNewPatients,
    verificationStatus,
    connectCode,
    termsAcceptedAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: clinicianProfiles.userId,
    set: {
      displayName,
      firstName,
      lastName,
      practiceType,
      phone: input.phone?.trim() || null,
      website,
      inviteCode: input.inviteCode?.trim() || null,
      profession,
      licenseNumber,
      licenseRegion,
      practiceName,
      location,
      areas: input.areas,
      listInDirectory: input.listInDirectory,
      openToNewPatients: input.openToNewPatients,
      verificationStatus,
      termsAcceptedAt: new Date(),
      updatedAt: new Date(),
    },
  }).returning();
  res.json(SaveClinicianProfileResponse.parse(serializedProfile(saved)));
});

router.get("/patient/clinician-connections", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const patientId = await signedInPatient(req, res);
  if (!patientId) return;
  const items = await db.select({
    id: patientClinicianConnections.id,
    status: patientClinicianConnections.status,
    shareAreas: patientClinicianConnections.shareAreas,
    clinicianDisplayName: clinicianProfiles.displayName,
    clinicianProfession: clinicianProfiles.profession,
    clinicianPracticeName: clinicianProfiles.practiceName,
    createdAt: patientClinicianConnections.createdAt,
    acceptedAt: patientClinicianConnections.acceptedAt,
  }).from(patientClinicianConnections)
    .innerJoin(clinicianProfiles, eq(clinicianProfiles.userId, patientClinicianConnections.clinicianId))
    .where(and(
      eq(patientClinicianConnections.patientId, patientId),
      inArray(patientClinicianConnections.status, ["pending", "accepted"]),
    ))
    .orderBy(desc(patientClinicianConnections.updatedAt));
  res.json(ListPatientClinicianConnectionsResponse.parse({
    items: items.map(patientConnectionPayload),
  }));
});

router.post("/patient/clinician-connections", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const patientId = await signedInPatient(req, res);
  if (!patientId) return;
  const parsed = InviteClinicianToJournalBody.safeParse(req.body);
  if (!parsed.success || !hasUniqueShareAreas(parsed.data.shareAreas)) {
    res.status(400).json({ error: "Enter a valid clinician connection code and choose journal areas." });
    return;
  }
  const [journal] = await db.select({ ownerId: recoveryProfiles.ownerId })
    .from(recoveryProfiles)
    .where(eq(recoveryProfiles.ownerId, patientId));
  if (!journal) {
    res.status(404).json({ error: "Create your private journal before inviting a clinician." });
    return;
  }
  const [clinician] = await db.select({
    userId: clinicianProfiles.userId,
    connectCode: clinicianProfiles.connectCode,
  }).from(clinicianProfiles)
    .where(eq(clinicianProfiles.connectCode, parsed.data.connectCode.trim()));
  if (!clinician) {
    res.status(404).json({ error: "No clinician profile matches that connection code." });
    return;
  }
  if (clinician.userId === patientId) {
    res.status(409).json({ error: "You cannot invite your own account." });
    return;
  }
  const [existing] = await db.select({
    id: patientClinicianConnections.id,
    status: patientClinicianConnections.status,
    acceptedAt: patientClinicianConnections.acceptedAt,
  }).from(patientClinicianConnections)
    .where(and(
      eq(patientClinicianConnections.patientId, patientId),
      eq(patientClinicianConnections.clinicianId, clinician.userId),
    ));
  const status = transitionConnection(existing?.status ?? "none", "invite");
  if (!status) {
    res.status(409).json({ error: "This invitation cannot be created right now." });
    return;
  }
  const now = new Date();
  const [saved] = await db.insert(patientClinicianConnections).values({
    patientId,
    clinicianId: clinician.userId,
    status,
    shareAreas: parsed.data.shareAreas,
    acceptedAt: status === "accepted" ? existing?.acceptedAt ?? now : null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [patientClinicianConnections.patientId, patientClinicianConnections.clinicianId],
    set: {
      status,
      shareAreas: parsed.data.shareAreas,
      acceptedAt: status === "accepted" ? existing?.acceptedAt ?? now : null,
      updatedAt: now,
    },
  }).returning({ id: patientClinicianConnections.id });
  const connection = await getPatientConnection(saved.id, patientId);
  if (!connection) {
    res.status(500).json({ error: "The invitation could not be loaded after it was saved." });
    return;
  }
  res.status(201).json(InviteClinicianToJournalResponse.parse(patientConnectionPayload(connection)));
});

router.patch("/patient/clinician-connections/:connectionId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const patientId = await signedInPatient(req, res);
  if (!patientId) return;
  const params = UpdateClinicianJournalSharingParams.safeParse(req.params);
  const body = UpdateClinicianJournalSharingBody.safeParse(req.body);
  if (!params.success || !body.success || !hasUniqueShareAreas(body.data.shareAreas)) {
    res.status(400).json({ error: "Choose valid journal areas." });
    return;
  }
  const [updated] = await db.update(patientClinicianConnections)
    .set({ shareAreas: body.data.shareAreas, updatedAt: new Date() })
    .where(and(
      eq(patientClinicianConnections.id, params.data.connectionId),
      eq(patientClinicianConnections.patientId, patientId),
      inArray(patientClinicianConnections.status, ["pending", "accepted"]),
    ))
    .returning({ id: patientClinicianConnections.id });
  if (!updated) {
    res.status(404).json({ error: "This patient-owned invitation or connection was not found." });
    return;
  }
  const connection = await getPatientConnection(updated.id, patientId);
  if (!connection) {
    res.status(404).json({ error: "This patient-owned invitation or connection was not found." });
    return;
  }
  res.json(UpdateClinicianJournalSharingResponse.parse(patientConnectionPayload(connection)));
});

router.delete("/patient/clinician-connections/:connectionId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const patientId = await signedInPatient(req, res);
  if (!patientId) return;
  const params = RevokeClinicianJournalAccessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid connection." });
    return;
  }
  const [ownedConnection] = await db.select({
    patientId: patientClinicianConnections.patientId,
    status: patientClinicianConnections.status,
  }).from(patientClinicianConnections)
    .where(eq(patientClinicianConnections.id, params.data.connectionId));
  if (
    !ownedConnection ||
    !canPatientManageConnection(ownedConnection.status, ownedConnection.patientId, patientId)
  ) {
    res.status(404).json({ error: "This patient-owned invitation or connection was not found." });
    return;
  }
  const revokedStatus = transitionConnection(ownedConnection.status, "revoke");
  if (revokedStatus !== "revoked") {
    res.status(404).json({ error: "This patient-owned invitation or connection was not found." });
    return;
  }
  const [revoked] = await db.update(patientClinicianConnections)
    .set({ status: revokedStatus, shareAreas: [], updatedAt: new Date() })
    .where(and(
      eq(patientClinicianConnections.id, params.data.connectionId),
      eq(patientClinicianConnections.patientId, patientId),
      eq(patientClinicianConnections.status, ownedConnection.status),
    ))
    .returning({ id: patientClinicianConnections.id });
  if (!revoked) {
    res.status(404).json({ error: "This patient-owned invitation or connection was not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/clinician/invitations", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const clinicianId = await signedInClinician(req, res);
  if (!clinicianId) return;
  const invitations = await db.select({
    id: patientClinicianConnections.id,
    shareAreas: patientClinicianConnections.shareAreas,
    createdAt: patientClinicianConnections.createdAt,
  }).from(patientClinicianConnections)
    .where(and(
      eq(patientClinicianConnections.clinicianId, clinicianId),
      eq(patientClinicianConnections.status, "pending"),
    ))
    .orderBy(desc(patientClinicianConnections.createdAt));
  res.json(ListClinicianJournalInvitationsResponse.parse({
    items: invitations.map((invite) => ({
      ...invite,
      createdAt: invite.createdAt.toISOString(),
    })),
  }));
});

router.post("/clinician/invitations/:connectionId/accept", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const clinicianId = await signedInClinician(req, res);
  if (!clinicianId) return;
  const params = AcceptClinicianJournalInvitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid invitation." });
    return;
  }
  const [invitation] = await db.select({
    id: patientClinicianConnections.id,
    status: patientClinicianConnections.status,
  }).from(patientClinicianConnections)
    .where(and(
      eq(patientClinicianConnections.id, params.data.connectionId),
      eq(patientClinicianConnections.clinicianId, clinicianId),
    ));
  if (!invitation || !transitionConnection(invitation.status, "accept")) {
    res.status(404).json({ error: "This invitation is no longer available." });
    return;
  }
  const acceptedAt = new Date();
  const [accepted] = await db.update(patientClinicianConnections)
    .set({ status: "accepted", acceptedAt, updatedAt: acceptedAt })
    .where(and(
      eq(patientClinicianConnections.id, params.data.connectionId),
      eq(patientClinicianConnections.clinicianId, clinicianId),
      eq(patientClinicianConnections.status, "pending"),
    ))
    .returning({ id: patientClinicianConnections.id });
  if (!accepted) {
    res.status(404).json({ error: "This invitation is no longer available." });
    return;
  }
  // The patient identifier is intentionally never returned; look up the
  // accepted connection with the authenticated clinician's exact owner scope.
  const [acceptedConnection] = await db.select({
    id: patientClinicianConnections.id,
    status: patientClinicianConnections.status,
    shareAreas: patientClinicianConnections.shareAreas,
    clinicianDisplayName: clinicianProfiles.displayName,
    clinicianProfession: clinicianProfiles.profession,
    clinicianPracticeName: clinicianProfiles.practiceName,
    createdAt: patientClinicianConnections.createdAt,
    acceptedAt: patientClinicianConnections.acceptedAt,
  }).from(patientClinicianConnections)
    .innerJoin(clinicianProfiles, eq(clinicianProfiles.userId, patientClinicianConnections.clinicianId))
    .where(and(
      eq(patientClinicianConnections.id, accepted.id),
      eq(patientClinicianConnections.clinicianId, clinicianId),
      eq(patientClinicianConnections.status, "accepted"),
    ));
  if (!acceptedConnection) {
    res.status(404).json({ error: "This invitation is no longer available." });
    return;
  }
  res.json(AcceptClinicianJournalInvitationResponse.parse(patientConnectionPayload(acceptedConnection)));
});

router.get("/clinician/patients", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const clinicianId = await signedInClinician(req, res);
  if (!clinicianId) return;
  const connections = await db.select({
    id: patientClinicianConnections.id,
    shareAreas: patientClinicianConnections.shareAreas,
    acceptedAt: patientClinicianConnections.acceptedAt,
  }).from(patientClinicianConnections)
    .where(and(
      eq(patientClinicianConnections.clinicianId, clinicianId),
      eq(patientClinicianConnections.status, "accepted"),
    ))
    .orderBy(desc(patientClinicianConnections.acceptedAt));
  res.json(ListConnectedPatientsResponse.parse({
    items: connections.map((connection) => {
      if (!connection.acceptedAt) throw new Error("Accepted journal connection has no acceptance time.");
      return {
        id: connection.id,
        patientLabel: patientLabel(connection.id),
        shareAreas: connection.shareAreas,
        acceptedAt: connection.acceptedAt.toISOString(),
      };
    }),
  }));
});

router.get("/clinician/patients/:connectionId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const clinicianId = await signedInClinician(req, res);
  if (!clinicianId) return;
  const params = GetSharedPatientJournalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Choose a valid patient connection." });
    return;
  }
  const [connection] = await db.select({
    id: patientClinicianConnections.id,
    patientId: patientClinicianConnections.patientId,
    clinicianId: patientClinicianConnections.clinicianId,
    status: patientClinicianConnections.status,
    shareAreas: patientClinicianConnections.shareAreas,
  }).from(patientClinicianConnections)
    .where(and(
      eq(patientClinicianConnections.id, params.data.connectionId),
      eq(patientClinicianConnections.clinicianId, clinicianId),
      eq(patientClinicianConnections.status, "accepted"),
    ));
  if (
    !connection ||
    !canReadConnection(connection.status, connection.clinicianId, clinicianId)
  ) {
    res.status(404).json({ error: "This active patient connection was not found." });
    return;
  }
  const logs = await db.select({
    date: recoveryLogs.date,
    data: recoveryLogs.data,
  }).from(recoveryLogs)
    .where(eq(recoveryLogs.ownerId, connection.patientId))
    .orderBy(desc(recoveryLogs.date));
  const shareAreas = connection.shareAreas as JournalShareArea[];
  const sharedLogs = logs.flatMap((log) => {
    const filtered = filterSharedJournalLog({ ...log.data, date: log.date }, shareAreas);
    return filtered ? [filtered] : [];
  });
  res.json(GetSharedPatientJournalResponse.parse({
    patientLabel: patientLabel(connection.id),
    shareAreas,
    logs: sharedLogs,
  }));
});

router.get("/clinicians", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=60");
  const items = await db.select(clinicianDisplayColumns)
    .from(clinicianProfiles)
    .where(and(
      eq(clinicianProfiles.listInDirectory, true),
      eq(clinicianProfiles.verificationStatus, "verified"),
    ))
    .orderBy(clinicianProfiles.location, clinicianProfiles.displayName);
  res.json(ListPublicCliniciansResponse.parse(items));
});

router.get("/clinicians/:connectCode", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=60");
  const [profile] = await db.select(clinicianDisplayColumns)
    .from(clinicianProfiles)
    .where(and(
      eq(clinicianProfiles.connectCode, req.params.connectCode),
      eq(clinicianProfiles.listInDirectory, true),
      eq(clinicianProfiles.verificationStatus, "verified"),
    ));
  if (!profile) {
    res.status(404).json({ error: "This clinician profile is not available in the directory." });
    return;
  }
  res.json(GetPublicClinicianResponse.parse(profile));
});

router.get("/admin/clinicians", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!(await requireAdmin(req, res))) return;

  const profiles = await db.select().from(clinicianProfiles)
    .orderBy(desc(clinicianProfiles.updatedAt));
  const items = await Promise.all(profiles.map(async (profile) => {
    let email: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(profile.userId);
      email = clerkUser.emailAddresses.find(
        (address) => address.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? null;
    } catch {
      // Retain the review row if Clerk is temporarily unavailable.
    }
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      email,
      phone: profile.phone,
      profession: profile.profession,
      licenseNumber: profile.licenseNumber,
      licenseRegion: profile.licenseRegion,
      practiceName: profile.practiceName,
      location: profile.location,
      areas: profile.areas,
      listInDirectory: profile.listInDirectory,
      openToNewPatients: profile.openToNewPatients,
      verificationStatus: profile.verificationStatus,
      connectCode: profile.connectCode,
      termsAcceptedAt: profile.termsAcceptedAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }));
  res.json(ListClinicianProfilesForAdminResponse.parse({ items }));
});

router.patch("/admin/clinicians/verification", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!(await requireAdmin(req, res))) return;
  const parsed = UpdateClinicianVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose pending or verified." });
    return;
  }
  const [updated] = await db.update(clinicianProfiles)
    .set({ verificationStatus: parsed.data.verificationStatus, updatedAt: new Date() })
    .where(eq(clinicianProfiles.userId, parsed.data.userId))
    .returning({
      userId: clinicianProfiles.userId,
      verificationStatus: clinicianProfiles.verificationStatus,
    });
  if (!updated) {
    res.status(404).json({ error: "Clinician profile not found." });
    return;
  }
  res.json(UpdateClinicianVerificationResponse.parse(updated));
});

export default router;
