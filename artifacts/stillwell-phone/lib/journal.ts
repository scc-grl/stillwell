import type {
  RecoveryLog,
  RecoveryLogInput,
  RecoveryPreferences,
  RecoveryState,
  SymptomEntry,
} from "@workspace/api-client-react";

export const symptomChoices: ReadonlyArray<{
  name: SymptomEntry["name"];
  label: string;
}> = [
  { name: "headache", label: "Headache" },
  { name: "dizziness", label: "Dizziness" },
  { name: "focus", label: "Focus" },
  { name: "fatigue", label: "Fatigue" },
  { name: "sleep", label: "Sleep" },
  { name: "light_sound", label: "Light or sound sensitivity" },
  { name: "mood", label: "Mood" },
];

export const priorityChoices: ReadonlyArray<{
  id: RecoveryPreferences["priorities"][number];
  title: string;
  detail: string;
}> = [
  {
    id: "food_hydration",
    title: "Food & hydration",
    detail: "Notice what felt manageable, without a prescribed diet or target.",
  },
  {
    id: "movement",
    title: "Movement & rest",
    detail: "Record activity or rest; ask a clinician what is safe for you.",
  },
  {
    id: "meditation",
    title: "Meditation or a quiet pause",
    detail: "Make room for a pause if it feels comfortable.",
  },
  {
    id: "pacing",
    title: "Pacing",
    detail: "Notice breaks, changed plans, and what you chose to leave for later.",
  },
];

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function emptyLog(date = localDate()): RecoveryLogInput {
  return {
    date,
    symptoms: [],
    dietStatus: "not_planned",
    dietNote: "",
    exerciseStatus: "not_planned",
    exerciseNote: "",
    meditationStatus: "not_planned",
    meditationMinutes: 0,
    meditationNote: "",
    note: "",
  };
}

export function recoveryQueryKey(userId: string) {
  return ["/api/recovery", userId] as const;
}

export function upsertLog(
  state: RecoveryState | undefined,
  saved: RecoveryLog,
): RecoveryState {
  const logs = state?.logs.filter((log) => log.date !== saved.date) ?? [];
  return {
    profile: state?.profile ?? null,
    logs: [saved, ...logs].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
