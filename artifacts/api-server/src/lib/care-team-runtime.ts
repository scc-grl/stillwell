import { clerkClient } from "@clerk/express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { accountRoles, clinicianProfiles, db, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CareTeamService, type Identity } from "./care-team";
import { safeEmailProviderErrorCode, sendCareEmail, type CareEmailPayload } from "./care-team-email";
import { logger } from "./logger";

const resend = new ReplitConnectors();
async function sendThroughResend(payload: CareEmailPayload) {
  const response = await resend.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let providerCode: string | undefined;
    try {
      providerCode = safeEmailProviderErrorCode(await response.clone().json());
    } catch {
      // Keep provider response bodies out of logs.
    }
    logger.warn({
      providerStatus: response.status,
      ...(providerCode ? { providerCode } : {}),
    }, "Resend rejected a care-team email");
  }
  return { ok: response.ok };
}

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
    from: process.env.EMAIL_FROM, replyTo: process.env.EMAIL_REPLY_TO,
    send: sendThroughResend,
    logSuppressed: () => logger.info("invite email suppressed"),
  }),
});
