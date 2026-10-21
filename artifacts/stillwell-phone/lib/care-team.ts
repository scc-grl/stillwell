
import { notSentMessage } from "@workspace/recovery-journal/care-team-copy";

export const CARE_TEAM_LIMIT = 5;
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
export const UNDO_WINDOW_MS = 5_000;
export const TOAST_MS = 4_000;

export const OFFLINE_MESSAGE = "You’re offline. Try again when you’re connected.";

export class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = "OfflineError";
  }
}

export function errorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { code?: unknown } | null }).data;
    return typeof data?.code === "string" ? data.code : null;
  }
  return null;
}

export function isOffline(error: unknown) {
  return error instanceof OfflineError;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return value.trim().length <= 254 && EMAIL_PATTERN.test(value.trim());
}

export type ResendState =
  | { available: true }
  | { available: false; reason: "cooldown"; minutes: number }
  | { available: false; reason: "quota" };

export function resendState(
  invite: { sentAt: string; lastResendAt: string | null },
  quota: { used: number; limit: number; resetsAt?: string } | undefined,
  now: number,
): ResendState {
  const quotaCurrent = !quota?.resetsAt || new Date(quota.resetsAt).getTime() > now;
  if (quota && quotaCurrent && quota.used >= quota.limit)
    return { available: false, reason: "quota" };
  const last = new Date(invite.lastResendAt ?? invite.sentAt).getTime();
  const remaining = last + RESEND_COOLDOWN_MS - now;
  if (remaining > 0)
    return { available: false, reason: "cooldown", minutes: Math.max(1, Math.ceil(remaining / 60000)) };
  return { available: true };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const longDate = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
});

export function formatShort(iso: string) {
  return shortDate.format(new Date(iso));
}

export function formatLong(iso: string) {
  return longDate.format(new Date(iso));
}

export function expiredInviteCopy(expiresAt: string) {
  return {
    line: `Not accepted within 14 days · expired ${formatShort(expiresAt)}`,
    a11y: `Expired ${formatLong(expiresAt)}, not accepted within 14 days`,
  };
}

export function isSameDay(iso: string, now: number) {
  const a = new Date(iso);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sentLabel(iso: string, now: number) {
  return isSameDay(iso, now) ? "Sent today" : `Sent ${formatShort(iso)}`;
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}

export type DeliveryResult = { suppressed: boolean; developmentLink?: string };

export type DeliveryNotice =
  | { kind: "sent"; toast: string }
  | { kind: "dev-preview"; toast: string; link: string | null }
  | { kind: "not-sent"; error: string };

export const NOT_SENT_MESSAGE = notSentMessage("patient");

/**
 * Decide what to tell the patient after an invite is created or resent.
 * The preview wording and development link are development-only: in a
 * production build a suppressed delivery is always reported as "not sent",
 * and a development link is never surfaced, even if the API supplies one.
 */
export function deliveryNotice(
  result: DeliveryResult,
  liveText: string,
  isDevelopment: boolean,
): DeliveryNotice {
  if (!result.suppressed) return { kind: "sent", toast: liveText };
  if (!isDevelopment) return { kind: "not-sent", error: NOT_SENT_MESSAGE };
  return {
    kind: "dev-preview",
    toast: "Preview invite created, no email sent",
    link: result.developmentLink ?? null,
  };
}
