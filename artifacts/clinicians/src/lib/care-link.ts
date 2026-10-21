/** Clinician-portal side of the care-link hand-off (sessionStorage, same origin as the website). */
import {
  consumeAcceptedInviteHandoff,
  pendingCareLinkEmail,
  pendingCareLinkReturnPath,
  reconcilePendingCareLink,
  type HandoffStorage,
} from '@workspace/recovery-journal/care-link-handoff';

function storage(): HandoffStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Website path (e.g. /invite/<token>) to return to after auth, if an invite is pending. */
export function pendingInviteReturnPath(): string | null {
  const s = storage();
  if (!s) return null;
  const path = pendingCareLinkReturnPath(s, Date.now());
  return path && path.startsWith('/invite/') ? path : null;
}

export function pendingInviteEmail(): string | null {
  const s = storage();
  return s ? pendingCareLinkEmail(s, 'invite', Date.now()) : null;
}

export function reconcileCareLink(previousId: string | null, nextId: string | null) {
  const s = storage();
  if (s) reconcilePendingCareLink(s, previousId, nextId, Date.now());
}

export function takeAcceptedInvite(): string | null {
  const s = storage();
  return s ? consumeAcceptedInviteHandoff(s, Date.now()) : null;
}
