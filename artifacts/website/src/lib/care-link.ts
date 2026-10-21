/** Website glue for care-team links. No logging, no analytics, no tokens in storage beyond the shared hand-off. */
import {
  clearPendingCareLink,
  containsCareLinkToken,
  openPendingCareLink,
  pendingCareLinkEmail,
  pendingCareLinkReturnPath,
  preserveTokenForSwitch,
  readPendingCareLink,
  reconcilePendingCareLink,
  updatePendingCareLink,
  writeAcceptedInviteHandoff,
  type CareLinkKind,
  type HandoffStorage,
  type PendingCareLink,
} from "@workspace/recovery-journal/care-link-handoff";
import type { CareRequestDetails } from "@workspace/api-client-react";

const memoryFallback = new Map<string, string>();
const fallbackStorage: HandoffStorage = {
  getItem: (key) => memoryFallback.get(key) ?? null,
  setItem: (key, value) => { memoryFallback.set(key, value); },
  removeItem: (key) => { memoryFallback.delete(key); },
};

function storage(): HandoffStorage {
  try {
    return window.sessionStorage;
  } catch {
    return fallbackStorage;
  }
}

export const pendingLink = {
  read: (): PendingCareLink | null => readPendingCareLink(storage(), Date.now()),
  open: (kind: CareLinkKind, token: string, userId: string | null) => openPendingCareLink(storage(), kind, token, userId, Date.now()),
  update: (token: string, patch: Parameters<typeof updatePendingCareLink>[2]) => updatePendingCareLink(storage(), token, patch, Date.now()),
  clear: (token?: string) => clearPendingCareLink(storage(), token),
  preserveForSwitch: (token: string) => preserveTokenForSwitch(storage(), token, Date.now()),
  reconcile: (previousId: string | null, nextId: string | null) => reconcilePendingCareLink(storage(), previousId, nextId, Date.now()),
  returnPath: () => pendingCareLinkReturnPath(storage(), Date.now()),
  email: (kind: CareLinkKind) => pendingCareLinkEmail(storage(), kind, Date.now()),
};

export function handOffAcceptedInvite(linkId: string): boolean {
  return writeAcceptedInviteHandoff(storage(), linkId, Date.now());
}

/** True only when the real sessionStorage works, so a token can survive a full auth navigation. */
export function handoffStorageAvailable(): boolean {
  try {
    const probe = "stillwell.storage-probe";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_BLOCKED_MESSAGE = "Your browser is blocking storage for this tab, so we can’t keep your place while you sign in. Allow site data for Stillwell, then open the link from your email again.";

/** Same wording as the phone app. */
export const OFFLINE_MESSAGE = "You’re offline. Try again when you’re connected.";
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** True while on a token route or while a link flow is pending (privacy guards). */
export function inPrivateLinkFlow(): boolean {
  try {
    return containsCareLinkToken(window.location.pathname) || pendingLink.read() !== null;
  } catch {
    return true;
  }
}

/* ---------- In-memory only (never persisted): invite prefill and closed requests ---------- */

export type InvitePrefill = { firstName: string; lastName: string; email: string };
let invitePrefill: InvitePrefill | null = null;
const exitedTokens = new Set<string>();
let focusCareTeam = false;

export const careMemory = {
  getPrefill: () => invitePrefill,
  setPrefill: (value: InvitePrefill | null) => { invitePrefill = value; },
  markExited: (token: string) => { exitedTokens.add(token); },
  wasExited: (token: string) => exitedTokens.has(token),
  claim: (token: string) => { exitedTokens.delete(token); },
  focusCareTeam: () => { focusCareTeam = true; },
  consumeFocus: () => { const value = focusCareTeam; focusCareTeam = false; return value; },
  clearAll: () => { invitePrefill = null; exitedTokens.clear(); focusCareTeam = false; },
};

/* ---------- API error helpers ---------- */

function errorData(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: unknown }).data;
  return data && typeof data === "object" ? data as Record<string, unknown> : null;
}

export function errorCode(error: unknown): string | null {
  const code = errorData(error)?.code;
  return typeof code === "string" ? code : null;
}

export function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function emailToVerify(error: unknown): string | null {
  const value = errorData(error)?.emailToVerify;
  return typeof value === "string" && value ? value : null;
}

/** Request codes, with "cancelled" folded into the phone's "withdrawn". */
export function requestErrorCode(error: unknown): string | null {
  const code = errorCode(error);
  return code === "cancelled" ? "withdrawn" : code;
}

export function requestErrorDetails(error: unknown): CareRequestDetails | null {
  const request = errorData(error)?.request;
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

/* ---------- Copy helpers (equivalent to the phone app) ---------- */

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

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" });

export function formatLinkDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value: string) {
  return value.trim().length <= 254 && EMAIL_PATTERN.test(value.trim());
}
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/** Private-flow query defaults: never cached past unmount, never retried. */
export const privateQuery = { gcTime: 0, retry: false, refetchOnWindowFocus: false } as const;
export const privateMutation = { networkMode: "always", retry: false } as const;
