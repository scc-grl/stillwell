import type {
  DailyCheckIn,
  DailyCheckInSymptomAnswer,
  RecoveryLog,
  SymptomEntry,
} from "@workspace/api-client-react";

export const checkInSymptoms = [
  { name: "headache", label: "Headache", legacyName: "headache" },
  { name: "fatigue", label: "Fatigue", legacyName: "fatigue" },
  { name: "fog", label: "Fog", legacyName: "focus" },
  { name: "sleep", label: "Sleep", legacyName: "sleep" },
  { name: "mood", label: "Mood", legacyName: "mood" },
  { name: "light", label: "Light", legacyName: "light_sound" },
] as const;

export const overallChoices = [
  { value: "rough", label: "Rough" },
  { value: "low", label: "Low" },
  { value: "okay", label: "Okay" },
  { value: "good", label: "Good" },
  { value: "great", label: "Great" },
] as const;

export const ratingChoices = [
  { value: 0, label: "Not noticeable" },
  { value: 1, label: "Less noticeable" },
  { value: 2, label: "Noticeable" },
  { value: 3, label: "More noticeable" },
] as const;

const legacySeverity = [0, 3, 6, 9] as const;
const trackedLegacyNames = new Set<string>(
  checkInSymptoms.map((symptom) => symptom.legacyName),
);

export function makeEmptyDailyCheckIn(): DailyCheckIn {
  return {
    overallFeeling: null,
    symptoms: checkInSymptoms.map(
      ({ name }) =>
        ({
          name,
          status: "not_recorded",
          rating: null,
        }) satisfies DailyCheckInSymptomAnswer,
    ),
    summary: "",
  };
}

export function dailyCheckInFromLog(
  log: Pick<RecoveryLog, "symptoms" | "dailyCheckIn">,
): DailyCheckIn {
  if (log.dailyCheckIn) return log.dailyCheckIn;

  const empty = makeEmptyDailyCheckIn();
  return {
    ...empty,
    symptoms: empty.symptoms.map((answer) => {
      const config = checkInSymptoms.find(
        (symptom) => symptom.name === answer.name,
      );
      const prior = log.symptoms.find(
        (symptom) => symptom.name === config?.legacyName,
      );
      if (!prior) return answer;
      const rating =
        prior.severity === 0
          ? 0
          : prior.severity <= 3
            ? 1
            : prior.severity <= 6
              ? 2
              : 3;
      return { ...answer, status: "recorded", rating };
    }),
  };
}

export function symptomsForRecoveryLog(
  checkIn: DailyCheckIn,
  existing: readonly SymptomEntry[],
): SymptomEntry[] {
  const preserved = existing.filter(
    (symptom) => !trackedLegacyNames.has(symptom.name),
  );
  const tracked = checkIn.symptoms.flatMap((answer) => {
    if (answer.status !== "recorded" || answer.rating === null) return [];
    const config = checkInSymptoms.find(
      (symptom) => symptom.name === answer.name,
    );
    if (!config) return [];
    return [{
      name: config.legacyName,
      severity: legacySeverity[answer.rating],
    }];
  });
  return [...preserved, ...tracked];
}

export function weekDates(today: string): string[] {
  const current = new Date(`${today}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() - (6 - index));
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });
}

export function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function formatDayNumber(date: string): string {
  return String(new Date(`${date}T12:00:00`).getDate());
}

export function weeklyInsight(logs: readonly RecoveryLog[], today: string) {
  const dates = new Set(weekDates(today));
  const entries = logs
    .filter((log) => dates.has(log.date) && log.dailyCheckIn)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (entries.length < 3) return null;

  const rated = entries.filter((log) => log.dailyCheckIn?.overallFeeling);
  if (rated.length < 2) {
    return `You’ve added ${entries.length} check-ins in the last seven days. Keep noticing what feels different from one day to the next.`;
  }

  const labels = new Map(overallChoices.map((choice) => [choice.value, choice.label]));
  const first = labels.get(rated[0].dailyCheckIn!.overallFeeling!);
  const last = labels.get(rated[rated.length - 1].dailyCheckIn!.overallFeeling!);
  if (first === last) {
    return `Your overall check-in was ${last?.toLowerCase()} on both the first and latest of ${rated.length} rated days this week.`;
  }
  return `Your overall check-in moved from ${first?.toLowerCase()} to ${last?.toLowerCase()} across ${rated.length} rated days this week.`;
}
