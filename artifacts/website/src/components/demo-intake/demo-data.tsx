export const MAYA_STORY =
  "I took a head-to-head hit in a soccer match on Saturday. The team doctor checked me on the sideline and told me to rest. Since then I've had headaches most of the day, I'm wiped out by the afternoon, and screens really bother me. I'm not sleeping well, and I feel foggy in class. Walking to class is okay, but I haven't tried anything harder.";

export const STORY_SAMPLES = [
  { label: "Maya · day 3 after a match", story: MAYA_STORY },
  {
    label: "Two weeks after a bike fall",
    story: "I fell from my bike two weeks ago and bumped my head. I have a mild headache at the end of the day, but walking around feels okay.",
  },
  {
    label: "Symptoms getting worse",
    story: "I hit my head about ten days ago. My headaches and tiredness have been getting worse over the last few days. I have not seen a doctor yet.",
  },
  {
    label: "Back at work, mostly better",
    story: "I bumped my head three weeks ago and saw a doctor the next day. I am mostly back at work. I feel a little tired after a full day, and a short walk feels okay.",
  },
  {
    label: "A story with a danger sign",
    story: "I hit my head at practice yesterday and have thrown up three times since. I feel very drowsy and my headache is getting worse.",
  },
] as const;

export const CARE_BOUNDARY =
  "Stillwell is not a diagnosis tool. It can't diagnose or treat a concussion; please see a medical provider for that. Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.";

export const FOUR_LEVELS = [
  "Not noticeable",
  "Less noticeable",
  "Noticeable",
  "More noticeable",
] as const;

export const STAGES = [
  "Symptom-limited daily life",
  "Light to moderate activity",
  "Individual exercise, fuller days",
  "Heavy, non-contact training",
  "Full-contact practice",
  "Return to sport",
] as const;

export type SymptomName =
  | "Headache"
  | "Fatigue"
  | "Fog"
  | "Sleep"
  | "Mood"
  | "Light sensitivity";

export type Symptom = {
  name: SymptomName;
  quote: string;
  level: number | null;
  uncertain?: boolean;
};

export type AnswerField = {
  label: string;
  quote: string;
  uncertain?: boolean;
};
