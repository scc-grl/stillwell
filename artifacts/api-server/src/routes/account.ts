import { Router, type IRouter, type Request } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { accountRoles, db, type AccountType } from "@workspace/db";
import {
  CompleteAccountRegistrationBody,
  CompleteAccountRegistrationResponse,
  CreateAccountRegistrationIntentBody,
  CreateAccountRegistrationIntentResponse,
  GetAccountTypeResponse,
} from "@workspace/api-zod";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { createAccountRegistrationToken, verifyAccountRegistrationToken } from "../lib/account-registration-token";

const router: IRouter = Router();

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

async function typeFor(userId: string): Promise<AccountType> {
  const [role] = await db.select({ accountType: accountRoles.accountType })
    .from(accountRoles)
    .where(eq(accountRoles.userId, userId));
  return role?.accountType ?? "patient";
}

router.post("/account/registration-intent", (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return;
  }
  const parsed = CreateAccountRegistrationIntentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose patient or clinician to continue." });
    return;
  }
  try {
    const registrationToken = createAccountRegistrationToken(parsed.data.accountType);
    res.status(201).json(CreateAccountRegistrationIntentResponse.parse({ registrationToken }));
  } catch {
    res.status(503).json({ error: "Account registration is temporarily unavailable." });
  }
});

router.get("/account/type", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return;
  }
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  res.json(GetAccountTypeResponse.parse({ accountType: await typeFor(userId) }));
});

router.post("/account/complete-registration", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return;
  }
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Please sign in to finish account setup." });
    return;
  }
  const parsed = CompleteAccountRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "The account registration could not be verified." });
    return;
  }

  const [existingRole] = await db.select({ accountType: accountRoles.accountType })
    .from(accountRoles)
    .where(eq(accountRoles.userId, userId));
  if (existingRole) {
    res.json(CompleteAccountRegistrationResponse.parse({ accountType: existingRole.accountType }));
    return;
  }

  const intent = verifyAccountRegistrationToken(parsed.data.registrationToken);
  if (!intent) {
    res.status(400).json({ error: "This account registration link is invalid or expired." });
    return;
  }

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch {
    res.status(503).json({ error: "We could not verify this account just now. Please try again." });
    return;
  }
  if (clerkUser.createdAt < intent.issuedAt) {
    // Legacy or pre-existing Clerk accounts without a stored role remain patients.
    res.json(CompleteAccountRegistrationResponse.parse({ accountType: "patient" }));
    return;
  }

  const [createdRole] = await db.insert(accountRoles).values({
    userId,
    accountType: intent.accountType,
    registrationIntentId: intent.intentId,
  }).onConflictDoNothing().returning({ accountType: accountRoles.accountType });

  if (createdRole) {
    res.json(CompleteAccountRegistrationResponse.parse({ accountType: createdRole.accountType }));
    return;
  }

  const [roleForUser] = await db.select({ accountType: accountRoles.accountType })
    .from(accountRoles)
    .where(eq(accountRoles.userId, userId));
  if (roleForUser) {
    res.json(CompleteAccountRegistrationResponse.parse({ accountType: roleForUser.accountType }));
    return;
  }
  res.status(409).json({ error: "This registration choice has already been used." });
});

export default router;
