import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AccountType } from "@workspace/db";

const REGISTRATION_INTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AccountRegistrationIntent = {
  intentId: string;
  accountType: AccountType;
  issuedAt: number;
  expiresAt: number;
};

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Account registration signing is not configured.");
  return secret;
}

function signatureFor(encodedPayload: string): Buffer {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest();
}

export function createAccountRegistrationToken(accountType: AccountType): string {
  const issuedAt = Date.now();
  const intent: AccountRegistrationIntent = {
    intentId: randomUUID(),
    accountType,
    issuedAt,
    expiresAt: issuedAt + REGISTRATION_INTENT_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(intent)).toString("base64url");
  const signature = signatureFor(encodedPayload).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAccountRegistrationToken(token: string): AccountRegistrationIntent | null {
  if (token.length > 4096) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) return null;

  let receivedSignature: Buffer;
  try {
    receivedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }
  const expectedSignature = signatureFor(encodedPayload);
  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) return null;

  try {
    const value = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AccountRegistrationIntent>;
    const now = Date.now();
    if (
      typeof value.intentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.intentId) ||
      (value.accountType !== "patient" && value.accountType !== "clinician") ||
      typeof value.issuedAt !== "number" ||
      typeof value.expiresAt !== "number" ||
      !Number.isSafeInteger(value.issuedAt) ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.issuedAt > now + 60_000 ||
      value.expiresAt <= now ||
      value.expiresAt - value.issuedAt !== REGISTRATION_INTENT_TTL_MS
    ) return null;
    return value as AccountRegistrationIntent;
  } catch {
    return null;
  }
}
