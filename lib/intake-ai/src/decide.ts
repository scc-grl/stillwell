import { DANGER_SIGNS, INTAKE_SYMPTOMS, SYMPTOM_LEVEL_LABELS, type DangerSign } from "./questions.ts";
import type { IntakeRead } from "./reader.ts";

export const RULES_VERSION = "intake-rules-2026-10-29.2";
/** Every decision threshold, versioned together. Positions remain fractional for the composite. */
export const THRESHOLDS = {
  version: RULES_VERSION, danger: 0.2, selfHarm: 0.2, safetyConfidence: 0.5,
  confirm: 0.6, mentioned: 0.5, yes: 0.7, no: 0.3, gettingWorse: 0.7,
  countedLevel: 1, severeMax: 2.5, severeTotal: 9, moderateMax: 1.5,
  countedSymptoms: 4, recentHours: 48, prolongedHours: 28 * 24, timingConfidence: 0.8,
} as const;
export const STAGES = {
  1: "Symptom-limited daily life", 2: "Light to moderate activity", 3: "Individual exercise fuller days",
  4: "Heavy non-contact training", 5: "Full-contact practice", 6: "Return to sport",
} as const;
export const STAGE_GATES = {
  2: "Progress with activity that does not clearly worsen symptoms.",
  3: "Progress when light to moderate activity is tolerated.",
  4: "Opens when symptoms are gone even with exercise",
  5: "Opens with a clinician's okay", 6: "Opens with a clinician's okay",
} as const;
export type Outcome = "go_to_er" | "crisis_support" | "find_doctor" | "start_journal" | "use_tap_questions";
export type Reason = { rule: string; text: string };
export type Band = "yes" | "no" | "unsure";
export type Composite = { count: number; total: number; max: number; hoursSinceInjury: number | null; injuryTimingWindow: string | null };
export type Decision = {
  outcome: Outcome; headline: string; startJournal: boolean; crisisLineShown: boolean;
  reasons: Reason[]; stage: { stage: 1 | 2 | 3; name: string; amsterdamStep: 1 | 2 | 3; reasons: Reason[] } | null;
  stageNote: string | null; followUps: string[];
  symptoms: { name: string; label: string; level: number | null; levelLabel: string; confidence: number | null; needsConfirm: boolean }[];
  resources: string[]; rulesVersion: string; composite: Composite; ruleIds: string[];
  nextStage: { stage: number; name: string; gate: string } | null;
  clinicianPrompts: Reason[];
  redFlagFired: boolean;
};
export function band(p: number): Band {
  return p >= THRESHOLDS.yes ? "yes" : p <= THRESHOLDS.no ? "no" : "unsure";
}
function injuryHours(read: IntakeRead): number | null {
  // A timing Choice supplies a window, not an exact number. Never invent exact hours.
  return read.hoursSinceInjury;
}
export function decide(read: IntakeRead): Decision {
  const s = read.scores;
  const symptoms = INTAKE_SYMPTOMS.map(({ name, label }) => {
    const a = s?.symptoms[name];
    const mentioned = a && a.mentioned.probability >= THRESHOLDS.mentioned;
    const level = mentioned ? Math.round(a.score) : null;
    return { name, label, level, levelLabel: level === null ? "Not recorded" : SYMPTOM_LEVEL_LABELS[level],
      confidence: mentioned ? a.confidence : null, needsConfirm: Boolean(mentioned && a.confidence < THRESHOLDS.confirm) };
  });
  const recorded = s ? Object.values(s.symptoms).filter(a => a.mentioned.probability >= THRESHOLDS.mentioned).map(a => a.score) : [];
  const composite: Composite = { count: recorded.filter(n => n >= THRESHOLDS.countedLevel).length,
    total: recorded.reduce((a,b) => a+b, 0), max: Math.max(0, ...recorded), hoursSinceInjury: injuryHours(read),
    injuryTimingWindow: s && s.injuryTiming.confidence >= THRESHOLDS.timingConfidence && s.injuryTiming.choice !== "not_mentioned" ? s.injuryTiming.choice : null };
  const danger: Reason[] = read.tickedRedFlags.map(id => ({ rule: "E1", text: `Red flag selected: ${DANGER_SIGNS[id].label}` }));
  for (const id of Object.keys(DANGER_SIGNS) as DangerSign[]) {
    // Form answers remain safety-relevant even if the model call failed.
    const form = read.formAnswers[`danger_${id}`] ?? read.answers[`danger_${id}`];
    const p = s?.danger[id] ?? (form && "probability" in form ? form.probability : null);
    const confidence = s?.dangerConfidence[id] ?? (form && "confidence" in form ? form.confidence : null);
    if ((p !== null && p >= THRESHOLDS.danger) || (confidence !== null && confidence < THRESHOLDS.safetyConfidence)) {
      danger.push({ rule: "E1", text: DANGER_SIGNS[id].label });
    }
  }
  if (read.keywords.danger.length) danger.push({ rule: "E1", text: "Danger keyword matched" });
  const formSelf = read.formAnswers.self_harm ?? read.answers.self_harm;
  const selfP = s?.selfHarm ?? (formSelf && "probability" in formSelf ? formSelf.probability : null);
  const selfConfidence = s?.selfHarmConfidence ?? formSelf?.confidence ?? null;
  const crisis = read.keywords.selfHarm.length > 0 || (selfP !== null && selfP >= THRESHOLDS.selfHarm) ||
    (selfConfidence !== null && selfConfidence < THRESHOLDS.safetyConfidence);
  const base: Decision = { outcome: "start_journal", headline: "You can start your journal", startJournal: true,
    crisisLineShown: crisis, reasons: [], stage: null, stageNote: null, followUps: [], symptoms,
    resources: [], rulesVersion: RULES_VERSION, composite, ruleIds: [], nextStage: null, clinicianPrompts: [],
    redFlagFired: danger.length > 0 };
  const finish = (d: Decision) => ({ ...d, ruleIds: [...new Set([...d.reasons, ...(d.stage?.reasons ?? []), ...d.clinicianPrompts].map(r => r.rule))] });
  if (danger.length) return finish({ ...base, outcome: "go_to_er", headline: "Go to the emergency room or call 911 now",
    startJournal: false, reasons: [...danger, ...(crisis ? [{ rule: "C1", text: "Crisis support also indicated" }] : [])],
    stageNote: "No stage. Emergency care comes first." });
  if (crisis) return finish({ ...base, outcome: "crisis_support", headline: "Please reach out now: call or text 988",
    startJournal: false, reasons: [{ rule: "C1", text: "Crisis support indicated" }], stageNote: "No stage. Support comes first." });
  if (!s || symptoms.some(x => x.needsConfirm)) return finish({ ...base, outcome: "use_tap_questions",
    headline: "Please confirm your answers with taps.", startJournal: false,
    reasons: [{ rule: "R0", text: !s ? "TypeSafe unavailable" : "A mentioned symptom needs confirmation" }],
    followUps: symptoms.filter(x => x.needsConfirm).map(x => `Please confirm ${x.label.toLowerCase()}.`) });
  if (s.gettingWorse >= THRESHOLDS.gettingWorse) return finish({ ...base, outcome: "find_doctor",
    headline: "See a doctor first", startJournal: false, reasons: [{ rule: "D1", text: "Symptoms getting worse over time" }],
    stageNote: "No starting stage while symptoms are getting worse. A doctor should see you first." });
  const clinicianPrompts: Reason[] = [];
  if (band(s.seenDoctor.probability) !== "yes") clinicianPrompts.push({ rule: "D2", text: "A clinician has not clearly assessed this injury yet. Arrange a doctor's visit." });
  if (composite.hoursSinceInjury !== null ? composite.hoursSinceInjury > THRESHOLDS.prolongedHours : composite.injuryTimingWindow === "over_four_weeks") clinicianPrompts.push({ rule: "D3", text: "More than 28 days since injury. Arrange a doctor's visit." });
  let n: 1 | 2 | 3 = 1;
  if (band(s.activity.daily_tasks) === "yes" && (band(s.activity.walking) === "yes" || band(s.activity.light_exercise) === "yes")) {
    n = band(s.activity.harder_solo_exercise) === "yes" ? 3 : 2;
  }
  const placement: Reason[] = [{ rule: "P1", text: `Activity tolerance starting stage ${n}` }];
  if (composite.max >= THRESHOLDS.severeMax || composite.total >= THRESHOLDS.severeTotal) {
    n = 1; placement.push({ rule: "P2", text: "Severity cap: maximum at least 2.5 or total at least 9" });
  }
  if (composite.max >= THRESHOLDS.moderateMax || composite.count >= THRESHOLDS.countedSymptoms) {
    n = Math.min(n, 2) as 1 | 2; placement.push({ rule: "P3", text: "At most Stage 2: maximum at least 1.5 or at least four symptoms" });
  }
  if (composite.hoursSinceInjury !== null ? composite.hoursSinceInjury < THRESHOLDS.recentHours : composite.injuryTimingWindow === "under_48_hours") {
    n = 1; placement.push({ rule: "P4", text: "Under 48 hours since injury" });
  }
  const next = (n + 1) as 2 | 3 | 4;
  return finish({ ...base, reasons: [{ rule: "S1", text: "No urgent or confirmation rule fired" }], clinicianPrompts,
    stage: { stage: n, name: STAGES[n], amsterdamStep: n, reasons: placement },
    nextStage: { stage: next, name: STAGES[next], gate: STAGE_GATES[next] },
    followUps: clinicianPrompts.map(r => r.text),
    resources: band(s.priorConcussion) === "yes" ? ["Mention your earlier concussion to your clinician."] : [] });
}
