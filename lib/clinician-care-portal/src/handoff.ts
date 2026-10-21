import { consumeAcceptedInviteHandoff } from '@workspace/recovery-journal/care-link-handoff';

/** Consumes the one-time accepted-invite receipt (opaque link id) from session storage. */
export function takeAcceptedInvite(): string | null {
  try {
    return consumeAcceptedInviteHandoff(window.sessionStorage, Date.now());
  } catch {
    return null;
  }
}
