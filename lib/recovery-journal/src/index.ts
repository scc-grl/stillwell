export * from "@workspace/recovery-journal/sleep";
import type {
  DailyCheckIn, DailyCheckInSymptomAnswer, RecoveryLog, RecoveryLogInput,
  RecoveryPreferences, SymptomEntry,
} from "@workspace/api-client-react";

export const checkInSymptoms = [
  { name: "headache", label: "Headache", legacyName: "headache" },
  { name: "fatigue", label: "Fatigue", legacyName: "fatigue" },
  { name: "fog", label: "Fog", legacyName: "focus" },
  { name: "sleep", label: "Sleep", legacyName: "sleep" },
  { name: "mood", label: "Mood", legacyName: "mood" },
  { name: "light", label: "Light", legacyName: "light_sound" },
  { name: "dizziness", label: "Dizziness / balance", legacyName: "dizziness" },
  { name: "nausea", label: "Nausea", legacyName: "nausea" },
  { name: "vision", label: "Vision (blurry or double)", legacyName: "vision" },
  { name: "noise", label: "Noise sensitivity", legacyName: "noise" },
  { name: "neck", label: "Neck pain", legacyName: "neck" },
] as const;

export type CheckInSymptomName = typeof checkInSymptoms[number]["name"];
export const defaultSymptoms: CheckInSymptomName[] = checkInSymptoms.slice(0, 6).map(item => item.name);
export const activityQuestion = "Worse with activity today?";
export const activityAnswerChoices = [
  { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_sure", label: "Not sure" },
] as const;
export function selectedCheckInSymptoms(preferences?: { selectedSymptoms?: readonly string[] } | null) {
  return checkInSymptoms.filter(item => (preferences?.selectedSymptoms ?? defaultSymptoms).includes(item.name));
}

export const overallChoices = [
  { value: "rough", label: "Rough" }, { value: "low", label: "Low" },
  { value: "okay", label: "Okay" }, { value: "good", label: "Good" },
  { value: "great", label: "Great" },
] as const;

export const ratingChoices = [
  { value: 0, label: "Not noticeable" }, { value: 1, label: "Less noticeable" },
  { value: 2, label: "Noticeable" }, { value: 3, label: "More noticeable" },
] as const;

export const activityChoices = [
  { value: "done", label: "Done" },
  { value: "not_done", label: "Not done" },
  { value: "not_planned", label: "Not planned" },
] as const;

export const priorityChoices = [
  { id: "food_hydration", title: "Food & hydration", detail: "Notice what makes everyday nourishment easier." },
  { id: "movement", title: "Movement", detail: "Record activity or rest; get medical advice about what is safe for you." },
  { id: "meditation", title: "Quiet pause", detail: "Make space for meditation or a quiet moment." },
  { id: "pacing", title: "Pacing", detail: "Reflect on pauses, energy, and room to adjust." },
] as const;

export const routinePrompts: Record<RecoveryPreferences["priorities"][number], string> = {
  food_hydration: "Notice meals and fluids that felt manageable. Record what you tried or skipped, without setting a special diet or intake target.",
  movement: "Record the activity you did, or the rest you chose. Ask a clinician what exercise is appropriate; this journal does not set intensity or progression.",
  meditation: "If comfortable, choose a familiar meditation or a quiet pause. Skip or stop if it feels distressing or makes symptoms worse; duration is optional.",
  pacing: "Choose a manageable priority and leave room to adjust. At the end of the day, note any breaks, changed plans, or things you chose not to do.",
};

export const supportModes = [
  { value: "self_guided", title: "Self-guided", detail: "I am keeping this journal for myself." },
  { value: "clinician_supported", title: "With clinician support", detail: "I may review the journal with a clinician." },
] as const;

export const setupCopy = {
  title: "A starting point",
  intro: "This short check-in is a place to record what you notice and which routines you want to keep track of. There are no right answers.",
  consent: "I agree to store these setup answers and my first daily summary in my private journal.",
  consentDetail: "The journal is linked to your account. You can delete your recovery data from the app settings.",
} as const;

const legacySeverity = [0, 3, 6, 9] as const;
const trackedLegacyNames = new Set<string>(checkInSymptoms.slice(0, 6).map((symptom) => symptom.legacyName));

/** Historical severities remain storage-compatible; new UI always uses named ratings. */
export function legacyScoreToRating(severity: number): 0 | 1 | 2 | 3 {
  return severity === 0 ? 0 : severity <= 3 ? 1 : severity <= 6 ? 2 : 3;
}

export function makeEmptyDailyCheckIn(): DailyCheckIn {
  return {
    overallFeeling: null,
    worseWithActivity: null,
    symptoms: checkInSymptoms.map(({ name }) => ({ name, status: "not_recorded", rating: null })),
    summary: "",
  };
}

export function dailyCheckInFromLog(log: Pick<RecoveryLogInput, "symptoms" | "dailyCheckIn">): DailyCheckIn {
  const empty = makeEmptyDailyCheckIn();
  if (log.dailyCheckIn) {
    return {
      ...log.dailyCheckIn,
      symptoms: empty.symptoms.map((missing) => {
        const answer = log.dailyCheckIn!.symptoms.find((item) => item.name === missing.name);
        return answer?.status === "recorded" && ratingChoices.some((item) => item.value === answer.rating)
          ? answer : missing;
      }),
    };
  }
  return {
    ...empty,
    symptoms: empty.symptoms.map((answer) => {
      const config = checkInSymptoms.find((item) => item.name === answer.name)!;
      // Only the original six have a legacy check-in mapping. Missing new
      // answers are never inferred from old, differently scoped symptom logs.
      const prior = defaultSymptoms.includes(config.name)
        ? log.symptoms.find((item) => item.name === config.legacyName) : undefined;
      return prior ? { ...answer, status: "recorded", rating: legacyScoreToRating(prior.severity) } : answer;
    }),
  };
}

export function symptomsForRecoveryLog(checkIn: DailyCheckIn, existing: readonly SymptomEntry[]): SymptomEntry[] {
  const recordedLegacyNames = new Set(checkIn.symptoms.filter(item => item.status === "recorded").map(answer =>
    checkInSymptoms.find(item => item.name === answer.name)?.legacyName));
  const preserved = existing.filter((item) => !trackedLegacyNames.has(item.name) && !recordedLegacyNames.has(item.name));
  const tracked = checkIn.symptoms.flatMap((answer) => {
    if (answer.status !== "recorded" || answer.rating === null) return [];
    const config = checkInSymptoms.find((item) => item.name === answer.name);
    return config ? [{ name: config.legacyName, severity: legacySeverity[answer.rating] }] : [];
  });
  return [...preserved, ...tracked];
}

export function ratingLabel(answer: DailyCheckInSymptomAnswer): string {
  return answer.status === "recorded"
    ? ratingChoices.find((item) => item.value === answer.rating)?.label ?? "Not recorded"
    : "Not recorded";
}

export function summaryLine(checkIn: DailyCheckIn): string {
  const overall = overallChoices.find((item) => item.value === checkIn.overallFeeling);
  return checkIn.summary.trim() || (overall ? `Today felt ${overall.label.toLowerCase()}.` : "Your check-in is saved.");
}

export function hasSavedCheckIn(log: Pick<RecoveryLogInput, "dailyCheckIn" | "symptoms">): boolean {
  return Boolean(log.dailyCheckIn);
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function emptyLog(date = localDate()): RecoveryLogInput {
  return { date, symptoms: [], dietStatus: "not_planned", dietNote: "", exerciseStatus: "not_planned", exerciseNote: "", meditationStatus: "not_planned", meditationMinutes: 0, meditationNote: "", note: "" };
}

export function supportModeLabel(value: RecoveryPreferences["supportMode"]): string {
  return supportModes.find((item) => item.value === value)?.title ?? "Self-guided";
}

export function weekDates(today: string): string[] {
  const current = new Date(`${today}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() - (6 - index));
    return localDate(date);
  });
}

export function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

export function formatDayNumber(date: string): string {
  return String(new Date(`${date}T12:00:00`).getDate());
}

export function weeklyInsight(logs: readonly RecoveryLog[], today: string): string | null {
  const dates = new Set(weekDates(today));
  const entries = logs.filter((log) => dates.has(log.date) && log.dailyCheckIn)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (entries.length < 3) return null;
  const rated = entries.filter((log) => log.dailyCheckIn?.overallFeeling);
  if (rated.length < 2) return `You’ve added ${entries.length} check-ins in the last seven days. Keep noticing what feels different from one day to the next.`;
  const labels = new Map(overallChoices.map((choice) => [choice.value, choice.label]));
  const first = labels.get(rated[0].dailyCheckIn!.overallFeeling!);
  const last = labels.get(rated[rated.length - 1].dailyCheckIn!.overallFeeling!);
  return first === last
    ? `Your overall check-in was ${last?.toLowerCase()} on both the first and latest of ${rated.length} rated days this week.`
    : `Your overall check-in moved from ${first?.toLowerCase()} to ${last?.toLowerCase()} across ${rated.length} rated days this week.`;
}
