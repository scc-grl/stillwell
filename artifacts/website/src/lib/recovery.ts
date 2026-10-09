import type { RecoveryLogInput, RecoveryPreferences, RecoveryState, SymptomEntry } from "@workspace/api-client-react";

export const DRAFT_KEY = "stillwell.consented-recovery-draft";
export const DRAFT_TTL = 30 * 60 * 1000;
let draftExpiryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleDraftExpiry(createdAt: number) {
  if (draftExpiryTimer) clearTimeout(draftExpiryTimer);
  draftExpiryTimer = setTimeout(clearDraft, Math.max(0, createdAt + DRAFT_TTL - Date.now()));
}
export const priorityChoices = [
  { id: "food_hydration", title: "Food & hydration", detail: "Notice what makes everyday nourishment easier." },
  { id: "movement", title: "Movement", detail: "Record activity or rest; get medical advice about what is safe for you." },
  { id: "meditation", title: "Quiet pause", detail: "Make space for meditation or a quiet moment." },
  { id: "pacing", title: "Pacing", detail: "Reflect on pauses, energy, and room to adjust." },
] as const;
export const routinePrompts = {
  food_hydration: "Notice meals and fluids that felt manageable. Record what you tried or skipped, without setting a special diet or intake target.",
  movement: "Record the activity you did, or the rest you chose. Ask a clinician what exercise is appropriate; this journal does not set intensity or progression.",
  meditation: "If comfortable, choose a familiar meditation or a quiet pause. Skip or stop if it feels distressing or makes symptoms worse; duration is optional.",
  pacing: "Choose a manageable priority and leave room to adjust. At the end of the day, note any breaks, changed plans, or things you chose not to do.",
} as const;
export const symptomChoices = [
  ["headache", "Headache"], ["dizziness", "Dizziness"], ["focus", "Focus"], ["fatigue", "Fatigue"],
  ["sleep", "Sleep"], ["light_sound", "Light or sound"], ["mood", "Mood"],
] as const;
export type DraftEnvelope = { createdAt: number; ownerId: string | null; payload: { preferences: RecoveryPreferences; consentAccepted: true; firstLog: RecoveryLogInput } };

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
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
export function emptyLog(date = localDate()): RecoveryLogInput {
  return { date, symptoms: [], dietStatus: "not_planned", dietNote: "", exerciseStatus: "not_planned", exerciseNote: "", meditationStatus: "not_planned", meditationMinutes: 0, meditationNote: "", note: "" };
}
export function replaceSymptom(symptoms: SymptomEntry[], name: SymptomEntry["name"], severity: number) {
  return [...symptoms.filter(item => item.name !== name), { name, severity }].sort((a, b) => symptomChoices.findIndex(s => s[0] === a.name) - symptomChoices.findIndex(s => s[0] === b.name));
}
export function mergeRecovery(old: RecoveryState | undefined, next: RecoveryState): RecoveryState {
  return { profile: next.profile, logs: next.logs };
}
