// The questions TypeSafe (System One, Jev) answers about a free-form intake note.
// Each question is narrow and literal, one judgment each, so one answer can't hide another.
// Shapes match @typesafe-ai/sdk's Questions type; this file has no SDK import so it stays testable.
import { checkInSymptoms } from "@workspace/recovery-journal";

export const QUESTIONS_VERSION = "intake-questions-2026-11-09.2";

/** Separate safety questions; keyword checks run alongside these. */
export const DANGER_SIGNS = {
  neck_pain_or_tenderness: { label: "Severe neck pain", ask: "Does the person say they have severe neck pain?" },
  seizure: { label: "Seizure or convulsion", ask: "Does the person say they had a seizure, fit or convulsion?" },
  double_vision: { label: "Double vision", ask: "Does the person say they have double vision?" },
  loss_of_consciousness: { label: "Loss of consciousness", ask: "Does the person say they lost consciousness, blacked out or were knocked out?" },
  weakness_or_tingling: { label: "Weakness or tingling in arms or legs", ask: "Does the person say they have weakness, numbness, tingling or burning in their arms or legs?" },
  getting_drowsier: { label: "Unusual drowsiness or confusion", ask: "Does the person describe unusual drowsiness or confusion, or being hard to wake?" },
  vomiting: { label: "Repeated vomiting", ask: "Does the person say they have vomited repeatedly or keep vomiting?" },
  severe_or_increasing_headache: { label: "Headache that keeps getting worse", ask: "Does the person say their headache keeps getting worse?" },
  increasing_restlessness_or_agitation: { label: "Increasing restlessness or agitation", ask: "Does the person say they are more and more restless, agitated or combative?" },
  visible_skull_deformity: { label: "Visible skull deformity", ask: "Does the person describe a visible dent, deformity or open wound on their head?" },
  slurred_speech: { label: "Slurred speech", ask: "Does the person say their speech is slurred?" },
  new_head_hit: { label: "New hit to the head", ask: "Does the person say they have had a new hit to the head since the original injury?" },
} as const;
export type DangerSign = keyof typeof DANGER_SIGNS;

/** Activity tolerance, used by placement (P2). Ordered lowest to highest. */
export const ACTIVITIES = {
  daily_tasks: { label: "Everyday tasks", stage: 1, ask: "Does the person say they can do everyday tasks without their symptoms getting clearly worse?" },
  walking: { label: "Walking about 20 minutes", stage: 2, ask: "Does the person say they can walk for about 20 minutes without their symptoms getting clearly worse?" },
  light_exercise: { label: "Light to moderate exercise", stage: 2, ask: "Does the person say they can do light to moderate exercise, such as an easy bike ride or a brisk walk, without their symptoms getting clearly worse?" },
  harder_solo_exercise: { label: "Harder solo exercise", stage: 3, ask: "Does the person say they can do harder exercise on their own, such as running or a spin class, without their symptoms getting clearly worse?" },
} as const;
export type Activity = keyof typeof ACTIVITIES;

/** All 11 symptoms use the exact shared journal IDs. */
const SPOKEN_LABELS: Record<string, string> = { light: "Light sensitivity" };
export const INTAKE_SYMPTOMS = checkInSymptoms.map((item) => {
  return { name: item.name, label: SPOKEN_LABELS[item.name] ?? item.label };
});

export const SYMPTOM_LEVEL_LABELS = Array.from({ length: 11 }, (_, n) => n === 0 ? "0 None" : n === 5 ? "5 Moderate" : n === 10 ? "10 Worst" : String(n));


const symptomPrompts: Record<string, string> = {
  headache: "How does the person describe headaches or head pain?",
  fatigue: "How does the person describe tiredness, fatigue or low energy?",
  fog: "How does the person describe brain fog, trouble focusing, or feeling slowed down?",
  sleep: "How does the person describe sleep problems, such as trouble sleeping or sleeping much more than usual?",
  mood: "How does the person describe mood changes, such as irritability, sadness, anxiety or feeling more emotional?",
  light: "How does the person describe sensitivity to light or screens?",
};

export const INJURY_TIMING = {
  under_48_hours: "The injury happened less than 48 hours ago (today, yesterday, or last night).",
  two_to_seven_days: "The injury happened between 2 and 7 days ago.",
  one_to_four_weeks: "The injury happened between 1 and 4 weeks ago.",
  over_four_weeks: "The injury happened more than 4 weeks ago.",
  not_mentioned: "The person does not say when the injury happened.",
} as const;
export type InjuryTiming = keyof typeof INJURY_TIMING;

type Noul = { type: "noul"; instructions: string };
type Choice = { type: "choice"; instructions: string; criteria: Record<string, string> };
type Score = { type: "score"; instructions: string; criteria: readonly string[] };
export type IntakeQuestion = Noul | Choice | Score;
// TypeSafe supports at most TEN rubric items (provider positions 0–9).
// Normalize provider positions linearly to the journal's 0–10 domain in reader.ts.
// Form taps are already in the journal domain and must never be normalized again.
export const SYMPTOM_SCORE_CRITERIA = [
  "None: not present or gone.",
  "Very slight symptoms.",
  "Slight symptoms, daily activities unaffected.",
  "Mild symptoms, daily activities mostly unaffected.",
  "Mild to moderate: some daily activities affected.",
  "Moderate: limits some work, school, screens or exercise.",
  "Moderate to severe: noticeably limits several daily activities.",
  "Severe: prevents most normal daily activities.",
  "Very severe: prevents normal daily activities.",
  "Worst: worst symptoms described; unable to do normal daily activities.",
] as const;
export const INJURY_CAUSES = {
  sport: "Sport", fall: "Fall", vehicle_crash: "Vehicle crash", work: "Work",
  assault: "Assault", other: "Other",
} as const;

const noul = (instructions: string): Noul => ({ type: "noul", instructions });
const choice = (instructions: string, criteria: Record<string, string>): Choice => ({ type: "choice", instructions, criteria });

/** Every question asked in one TypeSafe call. Keys are the answer names. */
export function buildQuestions(answered: Record<string, unknown> = {}): Record<string, IntakeQuestion> {
  const q: Record<string, IntakeQuestion> = {};
  for (const [id, sign] of Object.entries(DANGER_SIGNS)) q[`danger_${id}`] = noul(sign.ask);
  q.self_harm = noul("Does the person express thoughts of harming themselves or ending their life, or say they feel hopeless?");
  q.getting_worse = noul("Does the person say their symptoms are getting worse over the days since the injury?");
  q.prior_concussion = noul("Does the person say they have had a concussion before this one?");
  q.seen_doctor = noul("Has a clinician already assessed this injury?");
  q.injury_cause = choice("What caused the injury? Choose only the cause described, without implying an order.", INJURY_CAUSES);
  q.injury_timing = choice("When did the injury happen, based only on what the person says?", INJURY_TIMING);
  for (const s of INTAKE_SYMPTOMS) {
    q[`mentioned_${s.name}`] = noul(`Does the note mention ${s.label.toLowerCase()} at all, including saying it is absent or gone?`);
    q[`symptom_${s.name}`] = {
      type: "score",
      instructions: `${symptomPrompts[s.name] ?? `How does the person describe ${s.label.toLowerCase()}?`} Rate the effect on daily activities only from what is written. The separate mentioned question determines whether this is recorded.`,
      criteria: SYMPTOM_SCORE_CRITERIA,
    };
  }
  for (const [id, a] of Object.entries(ACTIVITIES)) q[`activity_${id}`] = noul(a.ask);
  return Object.fromEntries(Object.entries(q).filter(([key]) => !Object.hasOwn(answered, key)));
}
