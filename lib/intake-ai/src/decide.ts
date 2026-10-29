// The two decisions, in code. Same read in, same result out, with the reason for each.
// Decision 1, triage: E1, C1, T1, D1-D4, S1. Decision 2, placement: P1-P3 (Stages 1-3 only).
// Thresholds are starting points. Stillwell always recommends seeing a doctor; this is a
// mapping to the Amsterdam 2022 return-to-activity steps, not a diagnosis.
import { ACTIVITIES, DANGER_SIGNS, INTAKE_SYMPTOMS, SYMPTOM_CHOICE_TO_LEVEL, SYMPTOM_LEVEL_LABELS, type Activity, type DangerSign } from "./questions.ts";
import type { IntakeRead } from "./reader.ts";

export const RULES_VERSION = "intake-rules-2026-10-28.1";

export const THRESHOLDS = {
  danger: 0.2,      // low on purpose: a false alarm beats a miss
  selfHarm: 0.2,
  yes: 0.7,         // yes/no answers: 0.7+ is yes, 0.3 or less is no, between is unsure
  no: 0.3,
  confirm: 0.8,     // choice answers under this are flagged for the patient to confirm
  countedSymptoms: 3,
} as const;

export const STAGES = {
  1: "Symptom-limited daily life",
  2: "Light to moderate activity",
  3: "Individual exercise, fuller days",
} as const;

export type Outcome = "go_to_er" | "crisis_support" | "find_doctor" | "start_journal" | "use_tap_questions";
export type Reason = { rule: string; text: string };
export type Band = "yes" | "no" | "unsure";

export type Decision = {
  outcome: Outcome;
  headline: string;
  startJournal: boolean;
  crisisLineShown: boolean;
  reasons: Reason[];
  stage: { stage: 1 | 2 | 3; name: string; amsterdamStep: 1 | 2 | 3; reasons: Reason[] } | null;
  stageNote: string | null;
  followUps: string[];
  symptoms: { name: string; label: string; level: number | null; levelLabel: string; confidence: number | null; needsConfirm: boolean }[];
  resources: string[];
  rulesVersion: string;
};

export function band(p: number): Band {
  if (p >= THRESHOLDS.yes) return "yes";
  if (p <= THRESHOLDS.no) return "no";
  return "unsure";
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function decide(read: IntakeRead): Decision {
  const s = read.scores;
  const base = { rulesVersion: RULES_VERSION, resources: [] as string[] };

  // Safety first: TypeSafe's first read plus the keyword scan. Nothing later overrides these.
  const dangerHits: Reason[] = [];
  if (s) {
    for (const id of Object.keys(DANGER_SIGNS) as DangerSign[]) {
      if (s.danger[id] >= THRESHOLDS.danger) dangerHits.push({ rule: "E1", text: `${DANGER_SIGNS[id].label} (AI score ${pct(s.danger[id])})` });
    }
  }
  for (const word of read.keywords.danger) dangerHits.push({ rule: "E1", text: `Danger word found: ${word}` });
  const selfHarmHits: Reason[] = [];
  if (s && s.selfHarm >= THRESHOLDS.selfHarm) selfHarmHits.push({ rule: "C1", text: `Self-harm or hopelessness (AI score ${pct(s.selfHarm)})` });
  for (const word of read.keywords.selfHarm) selfHarmHits.push({ rule: "C1", text: `Crisis word found: ${word}` });

  const symptoms = readSymptoms(read);

  if (dangerHits.length > 0) {
    return { ...base, outcome: "go_to_er", headline: "Go to the emergency room or call 911 now", startJournal: false,
      crisisLineShown: selfHarmHits.length > 0, reasons: [...dangerHits, ...selfHarmHits], stage: null,
      stageNote: "No stage. Emergency care comes first.", followUps: [], symptoms };
  }
  if (selfHarmHits.length > 0) {
    return { ...base, outcome: "crisis_support", headline: "Please reach out now: call or text 988", startJournal: false,
      crisisLineShown: true, reasons: selfHarmHits, stage: null, stageNote: "No stage. Support comes first.", followUps: [], symptoms };
  }
  if (!s) {
    return { ...base, outcome: "use_tap_questions", headline: "Stillwell couldn't read this just now. It would switch to tap questions.",
      startJournal: false, crisisLineShown: false, reasons: [{ rule: "R0", text: `TypeSafe unavailable (${read.error ?? "error"}); keyword scan found nothing urgent` }],
      stage: null, stageNote: null, followUps: ["Every question would be asked again as taps."], symptoms };
  }

  // Decision 1: find-a-doctor reasons. Every reason that applies is listed.
  const reasons: Reason[] = [];
  const followUps: string[] = [];
  const timing = s.injuryTiming;
  const timingKnown = timing.choice !== "not_mentioned" && timing.confidence >= THRESHOLDS.confirm;
  if (!timingKnown) followUps.push("About how long ago did the injury happen?");
  if (timingKnown && timing.choice === "under_48_hours") reasons.push({ rule: "T1", text: "Injury less than 48 hours ago. See a doctor; rest for the first day or two." });

  const worse = band(s.gettingWorse);
  if (worse === "yes") reasons.push({ rule: "D2", text: `Says symptoms are getting worse (AI score ${pct(s.gettingWorse)})` });
  if (worse === "unsure") followUps.push("Are your symptoms getting worse, staying the same, or getting better?");

  const doc = s.seenDoctor;
  if (doc.choice === "not_seen" && doc.confidence >= THRESHOLDS.confirm) {
    reasons.push({ rule: "D1", text: "Hasn't seen a doctor since the injury" });
  } else if (!(doc.choice === "seen" && doc.confidence >= THRESHOLDS.confirm)) {
    reasons.push({ rule: "D1", text: "Didn't clearly say they've seen a doctor since the injury" });
    followUps.push("Have you seen a doctor since the injury?");
  }

  const counted = symptoms.filter((x) => x.level !== null && x.level >= 2);
  if (counted.length >= THRESHOLDS.countedSymptoms) {
    reasons.push({ rule: "D3", text: `${counted.length} symptoms at Noticeable or above: ${counted.map((x) => x.label).join(", ")}` });
  }
  if (timingKnown && timing.choice === "over_four_weeks") reasons.push({ rule: "D4", text: "Symptoms for more than 4 weeks (Amsterdam's persisting symptoms)" });

  for (const x of symptoms) if (x.needsConfirm) followUps.push(`You mentioned ${x.label.toLowerCase()}. ${SYMPTOM_LEVEL_LABELS[1]} or ${SYMPTOM_LEVEL_LABELS[2]}?`);

  const resources: string[] = [];
  if (band(s.priorConcussion) === "yes") resources.push("You mentioned an earlier concussion. Bring it up with your doctor; it can matter for recovery.");

  const outcome: Outcome = reasons.length > 0 ? "find_doctor" : "start_journal";
  const headline = outcome === "find_doctor" ? "Find a doctor, and start your journal" : "You can start your journal";
  if (outcome === "start_journal") reasons.push({ rule: "S1", text: "No danger signs and no reason to see a doctor first" });

  // Decision 2: placement. Getting worse means no stage.
  let stage: Decision["stage"] = null;
  let stageNote: string | null = null;
  if (reasons.some((r) => r.rule === "D2")) {
    stageNote = "No starting stage while symptoms are getting worse. A doctor should see you first.";
  } else {
    stage = place(s.activity, symptoms, reasons.some((r) => r.rule === "T1"));
    if (stage.reasons.some((r) => r.rule === "P0")) followUps.push("What can you do comfortably right now? For example, walking, a bike ride, or a workout.");
  }

  return { ...base, resources, outcome, headline, startJournal: true, crisisLineShown: false, reasons, stage, stageNote, followUps, symptoms };
}

function place(activity: Record<Activity, number>, symptoms: Decision["symptoms"], recentInjury: boolean): NonNullable<Decision["stage"]> {
  const reasons: Reason[] = [];
  const severe = symptoms.filter((x) => x.level === 3);
  let n: 1 | 2 | 3;
  if (severe.length > 0) {
    n = 1;
    reasons.push({ rule: "P1", text: `${severe.map((x) => x.label).join(", ")} at More noticeable` });
  } else if (recentInjury) {
    n = 1;
    reasons.push({ rule: "T1", text: "Injury less than 48 hours ago: start with relative rest and everyday tasks" });
  } else {
    let yesStage = 0;
    let unsureStage = 0;
    const yesLabels: string[] = [];
    for (const id of Object.keys(ACTIVITIES) as Activity[]) {
      const b = band(activity[id]);
      if (b === "yes") { yesStage = Math.max(yesStage, ACTIVITIES[id].stage); yesLabels.push(ACTIVITIES[id].label); }
      if (b === "unsure") unsureStage = Math.max(unsureStage, ACTIVITIES[id].stage);
    }
    n = Math.max(1, yesStage, unsureStage - 1) as 1 | 2 | 3;
    if (yesStage > 0) reasons.push({ rule: "P2", text: `Tolerates: ${yesLabels.join(", ")}` });
    if (unsureStage - 1 > yesStage && unsureStage > 1) reasons.push({ rule: "P3", text: "An activity answer was unsure, so one stage lower" });
    if (yesStage === 0 && unsureStage === 0) reasons.push({ rule: "P0", text: "No activity mentioned clearly, so Stage 1" });
    if (reasons.length === 0) reasons.push({ rule: "P3", text: "Activity answers were unsure, so Stage 1" });
  }
  return { stage: n, name: STAGES[n], amsterdamStep: n, reasons };
}

function readSymptoms(read: IntakeRead): Decision["symptoms"] {
  return INTAKE_SYMPTOMS.map(({ name, label }) => {
    const a = read.scores?.symptoms[name];
    if (!a) return { name, label, level: null, levelLabel: "Not recorded", confidence: null, needsConfirm: false };
    const level = SYMPTOM_CHOICE_TO_LEVEL[a.choice as keyof typeof SYMPTOM_CHOICE_TO_LEVEL] ?? null;
    return {
      name, label, level,
      levelLabel: level === null ? "Not recorded" : SYMPTOM_LEVEL_LABELS[level],
      confidence: a.confidence,
      needsConfirm: level !== null && a.confidence < THRESHOLDS.confirm,
    };
  });
}
