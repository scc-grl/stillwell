import type { RecoveryLogInput, RecoveryPreferences } from "@workspace/api-client-react";
import {
  emptyLog,
  localDate,
  priorityChoices,
  routinePrompts,
} from "@workspace/recovery-journal";

export const DRAFT_KEY = "stillwell.consented-recovery-draft";
export const DRAFT_TTL = 30 * 60 * 1000;
let draftExpiryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleDraftExpiry(createdAt: number) {
  if (draftExpiryTimer) clearTimeout(draftExpiryTimer);
  draftExpiryTimer = setTimeout(clearDraft, Math.max(0, createdAt + DRAFT_TTL - Date.now()));
}
export type DraftEnvelope = { createdAt: number; ownerId: string | null; payload: { preferences: RecoveryPreferences; consentAccepted: true; firstLog: RecoveryLogInput } };

export { emptyLog, localDate, priorityChoices, routinePrompts };

export function readDraft(): DraftEnvelope | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftEnvelope;
    if (!Number.isFinite(draft.createdAt) || draft.createdAt > Date.now() || Date.now() - draft.createdAt >= DRAFT_TTL || draft.payload?.consentAccepted !== true) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    scheduleDraftExpiry(draft.createdAt);
    return draft;
  } catch { clearDraft(); return null; }
}
export function clearDraft() {
  if (draftExpiryTimer) clearTimeout(draftExpiryTimer);
  draftExpiryTimer = undefined;
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* unavailable storage */ }
}
export function writeDraft(payload: DraftEnvelope["payload"], ownerId: string | null) {
  const envelope: DraftEnvelope = { createdAt: Date.now(), ownerId, payload };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
  scheduleDraftExpiry(envelope.createdAt);
}
