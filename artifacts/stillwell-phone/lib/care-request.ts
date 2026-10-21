/** Pure helpers for the patient share-request flow. No storage, no logging. */
import type {
  CareRequestDetails,
  PreviewCareRequest200,
} from "@workspace/api-client-react";

export type { CareRequestDetails };
export type CareRequestPreview = PreviewCareRequest200;



export type CareRequestErrorCode =
  | "expired"
  | "withdrawn"
  | "cancelled"
  | "different_email"
  | "unverified_email"
  | "clinician_account"
  | "already_sharing"
  | "care_team_full"
  | "journal_required"
  | "invalid_token"
  | "already_accepted";

const KNOWN: readonly string[] = [
  "expired",
  "withdrawn",
  "cancelled",
  "different_email",
  "unverified_email",
  "clinician_account",
  "already_sharing",
  "care_team_full",
  "journal_required",
  "invalid_token",
  "already_accepted",
];

/** Backend tokens: exactly 43 URL-safe base64 characters (32 random bytes). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isPlausibleToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/** Native/Expo Go links are untrusted input; malformed escapes must not crash the app. */
export function requestTokenFromLink(url: string): string | null {
  const match = /\/request\/([^/?#]+)/.exec(url.split(/[?#]/, 1)[0]);
  if (!match) return null;
  try {
    const candidate = decodeURIComponent(match[1]);
    return isPlausibleToken(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function careRequestErrorCode(error: unknown): CareRequestErrorCode | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: { code?: unknown } | null }).data;
  const code = typeof data?.code === "string" ? data.code : null;
  if (code === "cancelled") return "withdrawn";
  return code && KNOWN.includes(code) ? (code as CareRequestErrorCode) : null;
}

export function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

/** Authenticated request details attached to some CareErrors. */
export function careRequestErrorDetails(error: unknown): CareRequestDetails | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: { request?: unknown } | null }).data;
  const request = data?.request;
  if (!request || typeof request !== "object") return null;
  const r = request as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  if (!str("clinicianName") || !str("expiresAt")) return null;
  return {
    clinicianName: str("clinicianName"),
    clinicianFirstName: str("clinicianFirstName"),
    clinicianLastName: str("clinicianLastName"),
    clinicianEmail: str("clinicianEmail"),
    requestedAt: str("requestedAt"),
    expiresAt: str("expiresAt"),
  };
}

/** "Dr. Chen" from either a last name or a full display name. */
export function doctorName(name: { lastName?: string; fullName?: string }) {
  const last = name.lastName?.trim();
  if (last) return `Dr. ${last}`;
  const full = (name.fullName ?? "").replace(/^dr\.?\s+/i, "").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return parts.length ? `Dr. ${parts[parts.length - 1]}` : "Your clinician";
}

export function initials(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function formatRequestDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}
