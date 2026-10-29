// The questions TypeSafe (System One, Jev) answers about a free-form intake note.
// Each question is narrow and literal, one judgment each, so one answer can't hide another.
// Shapes match @typesafe-ai/sdk's Questions type; this file has no SDK import so it stays testable.
import { checkInSymptoms, defaultSymptoms } from "@workspace/recovery-journal";

export const QUESTIONS_VERSION = "intake-questions-2026-10-28.1";

/** The CRT6 red flags (BJSM 2023). */
export const DANGER_SIGNS = {
  neck_pain_or_tenderness: { label: "Neck pain or tenderness", ask: "Does the person say they have pain or tenderness in their neck?" },
  seizure: { label: "Seizure or convulsion", ask: "Does the person say they had a seizure, fit or convulsion?" },
  double_vision: { label: "Double vision", ask: "Does the person say they have double vision?" },
  loss_of_consciousness: { label: "Loss of consciousness", ask: "Does the person say they lost consciousness, blacked out or were knocked out?" },
  weakness_or_tingling: { label: "Weakness or tingling in arms or legs", ask: "Does the person say they have weakness, numbness, tingling or burning in their arms or legs?" },
  getting_drowsier: { label: "Getting more drowsy", ask: "Does the person say they are getting more and more drowsy, or are hard to wake up?" },
  vomiting: { label: "Vomiting", ask: "Does the person say they have vomited or keep vomiting?" },
  severe_or_increasing_headache: { label: "Severe or increasing headache", ask: "Does the person say they have a severe headache, or a headache that keeps getting worse?" },
  increasing_restlessness_or_agitation: { label: "Increasing restlessness or agitation", ask: "Does the person say they are more and more restless, agitated or combative?" },
  visible_skull_deformity: { label: "Visible skull deformity", ask: "Does the person describe a visible dent, deformity or open wound on their head?" },
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

/** The six default journal symptoms, from the shared journal library. */
const SPOKEN_LABELS: Record<string, string> = { light: "Light sensitivity" };
export const INTAKE_SYMPTOMS = defaultSymptoms.map((name) => {
  const item = checkInSymptoms.find((s) => s.name === name)!;
  return { name: item.name, label: SPOKEN_LABELS[item.name] ?? item.label };
});

export const SYMPTOM_LEVEL_LABELS = ["Not noticeable", "Less noticeable", "Noticeable", "More noticeable"] as const;

const symptomCriteria = {
  not_mentioned: "The person does not mention this symptom at all.",
  not_noticeable: "The person says they do not have this symptom, or that it is gone.",
  less_noticeable: "The person says this symptom is mild, slight, or only now and then.",
  noticeable: "The person says this symptom is clearly there and affects their day.",
  more_noticeable: "The person says this symptom is strong, severe, or hard to get through the day with.",
} as const;
export const SYMPTOM_CHOICE_TO_LEVEL = {
  not_mentioned: null,
  not_noticeable: 0,
  less_noticeable: 1,
  noticeable: 2,
  more_noticeable: 3,
} as const;

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

export const SEEN_DOCTOR = {
  seen: "The person says they have seen a doctor, nurse, urgent care or emergency room about this injury.",
  not_seen: "The person says they have not seen any doctor or clinician about this injury.",
  not_mentioned: "The person does not say whether they have seen a doctor or clinician.",
} as const;

type Noul = { type: "noul"; instructions: string };
type Choice = { type: "choice"; instructions: string; criteria: Record<string, string> };

const noul = (instructions: string): Noul => ({ type: "noul", instructions });
const choice = (instructions: string, criteria: Record<string, string>): Choice => ({ type: "choice", instructions, criteria });

/** Every question asked in one TypeSafe call. Keys are the answer names. */
export function buildQuestions(): Record<string, Noul | Choice> {
  const q: Record<string, Noul | Choice> = {};
  for (const [id, sign] of Object.entries(DANGER_SIGNS)) q[`danger_${id}`] = noul(sign.ask);
  q.self_harm = noul("Does the person express thoughts of harming themselves or ending their life, or say they feel hopeless?");
  q.getting_worse = noul("Does the person say their symptoms are getting worse over the days since the injury?");
  q.prior_concussion = noul("Does the person say they have had a concussion before this one?");
  q.seen_doctor = choice("Has the person seen a doctor or clinician about this injury since it happened?", SEEN_DOCTOR);
  q.injury_timing = choice("When did the injury happen, based only on what the person says?", INJURY_TIMING);
  for (const s of INTAKE_SYMPTOMS) q[`symptom_${s.name}`] = choice(symptomPrompts[s.name] ?? `How does the person describe ${s.label.toLowerCase()}?`, symptomCriteria);
  for (const [id, a] of Object.entries(ACTIVITIES)) q[`activity_${id}`] = noul(a.ask);
  return q;
}
