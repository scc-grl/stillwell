import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq } from "drizzle-orm";
import {
  accountRoles,
  clinicianProfiles,
  db,
  partnershipRequests,
} from "@workspace/db";
import {
  CreatePartnershipRequestBody,
  CreatePartnershipRequestResponse,
  GetClinicianProfileResponse,
  GetPublicClinicianResponse,
  ListClinicianProfilesForAdminResponse,
  ListPartnershipRequestsResponse,
  ListPublicCliniciansResponse,
  SaveClinicianProfileBody,
  SaveClinicianProfileResponse,
  UpdateClinicianVerificationBody,
  UpdateClinicianVerificationResponse,
} from "@workspace/api-zod";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { notifyStillwellPartnershipTeam } from "../lib/partner-notifications";

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
  return {
    ...profile,
    termsAcceptedAt: profile.termsAcceptedAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
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
  const displayName = clerkUser.fullName?.trim() || "Clinician";
  const input = parsed.data;
  const [existing] = await db.select().from(clinicianProfiles)
    .where(eq(clinicianProfiles.userId, userId));
  const licenseUnchanged = existing?.licenseNumber === input.licenseNumber.trim() &&
    existing.licenseRegion === input.licenseRegion.trim();
  const verificationStatus = licenseUnchanged
    ? existing.verificationStatus
    : "pending";
  const connectCode = existing?.connectCode ?? randomBytes(18).toString("hex");

  const [saved] = await db.insert(clinicianProfiles).values({
    userId,
    displayName,
    phone: input.phone?.trim() || null,
    inviteCode: input.inviteCode?.trim() || null,
    profession: input.profession,
    licenseNumber: input.licenseNumber.trim(),
    licenseRegion: input.licenseRegion.trim(),
    practiceName: input.practiceName.trim(),
    location: input.location.trim(),
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
      phone: input.phone?.trim() || null,
      inviteCode: input.inviteCode?.trim() || null,
      profession: input.profession,
      licenseNumber: input.licenseNumber.trim(),
      licenseRegion: input.licenseRegion.trim(),
      practiceName: input.practiceName.trim(),
      location: input.location.trim(),
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
