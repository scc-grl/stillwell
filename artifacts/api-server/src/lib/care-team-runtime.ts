import { clerkClient } from "@clerk/express";
import { accountRoles, clinicianProfiles, db, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CareTeamService, type Identity } from "./care-team";
import { sendCareEmail } from "./care-team-email";
import { logger } from "./logger";

export async function careIdentity(id: string): Promise<Identity> {
  const [role] = await db.select().from(accountRoles).where(eq(accountRoles.userId, id));
  const user = await clerkClient.users.getUser(id);
  const [profile] = role?.accountType === "clinician"
    ? await db.select({ displayName: clinicianProfiles.displayName }).from(clinicianProfiles).where(eq(clinicianProfiles.userId, id))
    : [];
  return {
    id, role: role?.accountType ?? "patient", firstName: user.firstName ?? "", lastName: user.lastName ?? "",
    displayName: profile?.displayName,
    emails: [...user.emailAddresses].sort((a, b) => Number(b.id === user.primaryEmailAddressId) - Number(a.id === user.primaryEmailAddressId))
      .map(e => ({ address: e.emailAddress, verified: e.verification?.status === "verified" })),
  };
}

export const careTeamService = new CareTeamService({
  pool,
  identity: careIdentity,
  send: mail => sendCareEmail(mail, {
    apiKey: process.env.EMAIL_API_KEY, from: process.env.EMAIL_FROM, replyTo: process.env.EMAIL_REPLY_TO,
    logSuppressed: () => logger.info("invite email suppressed"),
  }),
});
