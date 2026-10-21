/**
 * Pure browser hand-off helpers for care-team links (patient invites a
 * clinician: /invite/:token, clinician requests a patient: /request/:token).
 *
 * - No globals: every function takes a Storage-like object and `now`, so the
 *   logic is unit-testable and callers decide which storage to use. Callers
 *   must pass `sessionStorage` (same-origin, tab-scoped) — never localStorage.
 * - Raw tokens only ever leave this module as the canonical route path.
 * - No logging, no analytics, no names or emails in the accepted hand-off.
 */

export type CareLinkKind = "invite" | "request";

/** Structural, platform-neutral storage (web callers pass window.sessionStorage). */
export interface HandoffStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingCareLink {
  kind: CareLinkKind;
  token: string;
  /** Clerk user the link was bound to; null while signed out. */
  ownerId: string | null;
  /** Email typed on the signed-out screen, used only to prefill sign-in. */
  email: string | null;
  /** Patient finished quiz + account setup; show "Your journal is ready". */
  ready: boolean;
  /** Clinician chose "Create a clinician account" from the invite. */
  clinicianSignup: boolean;
  /** Patient went to the care team to free capacity for this request. */
  returnToRequest: boolean;
  /** Set right before an explicit sign-out/switch; preserves only the token. */
  switching: boolean;
  expiresAt: number;
}

export interface AcceptedInviteHandoff {
  linkId: string;
  expiresAt: number;
}

export const PENDING_CARE_LINK_KEY = "stillwell.pending-care-link";
export const ACCEPTED_INVITE_KEY = "stillwell.accepted-care-invite";
export const PENDING_CARE_LINK_TTL_MS = 30 * 60 * 1000;
export const ACCEPTED_INVITE_TTL_MS = 2 * 60 * 1000;

/** Backend tokens: exactly 43 URL-safe base64 characters (32 random bytes). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PATH_PATTERN = /\/(invite|request)\/([^/?#]+)\/?$/;
const SENSITIVE_PATTERN = /\/(?:invite|request)\/[^/?#]+/i;

export function isPlausibleCareToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/** Canonical, base-relative route for a link. */
export function careLinkPath(kind: CareLinkKind, token: string): string {
  return `/${kind}/${encodeURIComponent(token)}`;
}

/** Parse a pathname (with or without a base path) into a link. */
export function parseCareLinkPath(pathname: string): { kind: CareLinkKind; token: string } | null {
  const match = PATH_PATTERN.exec(pathname.split(/[?#]/, 1)[0] ?? "");
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[2]);
    return isPlausibleCareToken(token) ? { kind: match[1] as CareLinkKind, token } : null;
  } catch {
    return null;
  }
}

/** True for any token-bearing link path or string (analytics/referrer guard). */
export function containsCareLinkToken(value: string): boolean {
  return SENSITIVE_PATTERN.test(value);
}

function blank(kind: CareLinkKind, token: string, ownerId: string | null, now: number): PendingCareLink {
  return {
    kind, token, ownerId, email: null, ready: false, clinicianSignup: false,
    returnToRequest: false, switching: false, expiresAt: now + PENDING_CARE_LINK_TTL_MS,
  };
}

function save(storage: HandoffStorage, link: PendingCareLink): boolean {
  try {
    storage.setItem(PENDING_CARE_LINK_KEY, JSON.stringify(link));
    return true;
  } catch {
    return false;
  }
}

export function readPendingCareLink(storage: HandoffStorage, now: number): PendingCareLink | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(PENDING_CARE_LINK_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCareLink>;
    const valid = (value.kind === "invite" || value.kind === "request")
      && isPlausibleCareToken(value.token)
      && typeof value.expiresAt === "number"
      && value.expiresAt > now
      && value.expiresAt <= now + PENDING_CARE_LINK_TTL_MS;
    if (!valid) {
      clearPendingCareLink(storage);
      return null;
    }
    return {
      kind: value.kind as CareLinkKind,
      token: value.token as string,
      ownerId: typeof value.ownerId === "string" ? value.ownerId : null,
      email: typeof value.email === "string" ? value.email : null,
      ready: value.ready === true,
      clinicianSignup: value.clinicianSignup === true,
      returnToRequest: value.returnToRequest === true,
      switching: value.switching === true,
      expiresAt: value.expiresAt as number,
    };
  } catch {
    clearPendingCareLink(storage);
    return null;
  }
}

/**
 * Install the link opened at its canonical route. A different token replaces
 * everything (clearing prior email/prefill/ready). The same token keeps its
 * flow state, but an owner mismatch (unexpected account change) resets it to
 * token-only for the current user.
 */
export function openPendingCareLink(
  storage: HandoffStorage,
  kind: CareLinkKind,
  token: string,
  userId: string | null,
  now: number,
): PendingCareLink | null {
  if (!isPlausibleCareToken(token)) return null;
  const current = readPendingCareLink(storage, now);
  let next: PendingCareLink;
  if (!current || current.kind !== kind || current.token !== token) {
    next = blank(kind, token, userId, now);
  } else if (current.switching) {
    next = { ...blank(kind, token, userId, now) };
  } else if (current.ownerId && userId && current.ownerId !== userId) {
    next = blank(kind, token, userId, now);
  } else {
    next = { ...current, ownerId: current.ownerId ?? userId };
  }
  return save(storage, next) ? next : null;
}

/** Patch flow state, only if the stored link is still `token` (late-async safe). */
export function updatePendingCareLink(
  storage: HandoffStorage,
  token: string,
  patch: Partial<Pick<PendingCareLink, "email" | "ready" | "clinicianSignup" | "returnToRequest" | "switching">>,
  now: number,
): boolean {
  const current = readPendingCareLink(storage, now);
  if (!current || current.token !== token) return false;
  return save(storage, { ...current, ...patch });
}

/** Clear. With `token`, only clears when it still matches (never a newer link). */
export function clearPendingCareLink(storage: HandoffStorage, token?: string): void {
  try {
    if (token !== undefined) {
      const raw = storage.getItem(PENDING_CARE_LINK_KEY);
      if (raw) {
        try {
          if ((JSON.parse(raw) as { token?: unknown }).token !== token) return;
        } catch {
          // Corrupt values are always cleared.
        }
      }
    }
    storage.removeItem(PENDING_CARE_LINK_KEY);
  } catch {
    // Storage can be unavailable in restricted contexts.
  }
}

/** Explicit sign-out to switch account: keep only the token. */
export function preserveTokenForSwitch(storage: HandoffStorage, token: string, now: number): boolean {
  const current = readPendingCareLink(storage, now);
  if (!current || current.token !== token) return false;
  return save(storage, { ...blank(current.kind, token, null, now), switching: true });
}

/**
 * Account listener. `previousId` → `nextId` transitions:
 * - signed out → signed in: expected; bind owner.
 * - explicit switch (switching flag): keep token only.
 * - any other change (sign-out, different account): clear.
 */
export function reconcilePendingCareLink(
  storage: HandoffStorage,
  previousId: string | null,
  nextId: string | null,
  now: number,
): void {
  if (previousId === nextId) return;
  const current = readPendingCareLink(storage, now);
  if (!current) return;
  if (current.switching) {
    if (nextId) save(storage, { ...blank(current.kind, current.token, nextId, now) });
    return;
  }
  if (previousId === null && nextId && (!current.ownerId || current.ownerId === nextId)) {
    save(storage, { ...current, ownerId: nextId });
    return;
  }
  clearPendingCareLink(storage);
}

/** Canonical route to return to after auth/role setup, if a link is pending. */
export function pendingCareLinkReturnPath(storage: HandoffStorage, now: number): string | null {
  const current = readPendingCareLink(storage, now);
  return current ? careLinkPath(current.kind, current.token) : null;
}

/** Email to prefill on sign-in for this kind of link, if any. */
export function pendingCareLinkEmail(storage: HandoffStorage, kind: CareLinkKind, now: number): string | null {
  const current = readPendingCareLink(storage, now);
  return current && current.kind === kind ? current.email : null;
}

/** Opaque accepted-invite hand-off: link id + expiry only. */
export function writeAcceptedInviteHandoff(storage: HandoffStorage, linkId: string, now: number): boolean {
  if (!linkId || typeof linkId !== "string" || linkId.length > 200) return false;
  try {
    const value: AcceptedInviteHandoff = { linkId, expiresAt: now + ACCEPTED_INVITE_TTL_MS };
    storage.setItem(ACCEPTED_INVITE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Read once and remove. Returns null when absent, malformed, or expired. */
export function consumeAcceptedInviteHandoff(storage: HandoffStorage, now: number): string | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(ACCEPTED_INVITE_KEY);
    storage.removeItem(ACCEPTED_INVITE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AcceptedInviteHandoff>;
    if (typeof value.linkId !== "string" || !value.linkId) return null;
    if (typeof value.expiresAt !== "number" || value.expiresAt <= now || value.expiresAt > now + ACCEPTED_INVITE_TTL_MS) return null;
    return value.linkId;
  } catch {
    return null;
  }
}
