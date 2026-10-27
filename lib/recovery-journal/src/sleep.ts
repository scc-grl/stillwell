import type { RecoveryLogInput } from "@workspace/api-client-react";

export type SleepLog = NonNullable<RecoveryLogInput["sleep"]>;
export const sleepQualityChoices = [
  { value: "poor", label: "Poor" }, { value: "fair", label: "Fair" },
  { value: "good", label: "Good" }, { value: "great", label: "Great" },
] as const;
export const sleepWakingChoices = [
  { value: 0, label: "0" }, { value: 1, label: "1" },
  { value: 2, label: "2" }, { value: 3, label: "3+" },
] as const;
export const sleepNapChoices = [
  { value: "none", label: "None" },
  { value: "under_30", label: "Under 30 minutes" },
  { value: "30_or_more", label: "30 minutes or more" },
] as const;
export const sleepTips = [
  "A consistent wake time can help make your sleep routine more predictable.",
  "Morning daylight can be part of a regular daily routine.",
  "Fewer screens before bed may make it easier to wind down.",
  "Avoiding alcohol can support a steadier sleep routine.",
] as const;
export const sleepDurationNote = "Calculated from bedtime and wake time. Time awake during the night is not subtracted.";
export const validSleepTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function emptySleep(): SleepLog {
  return { bedtime: null, wakeTime: null, quality: null, wakings: null, nap: null, note: "" };
}

/** Local clock-time estimate, including crossing midnight; no duration target. */
export function sleepDurationMinutes(sleep?: SleepLog | null): number | null {
  if (!validSleepTime(sleep?.bedtime) || !validSleepTime(sleep?.wakeTime)) return null;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return (minutes(sleep.wakeTime) - minutes(sleep.bedtime) + 1440) % 1440;
}

export function sleepDurationLabel(sleep?: SleepLog | null): string {
  const minutes = sleepDurationMinutes(sleep);
  if (minutes === null) return "Not recorded";
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}

export function normalizeSleep(value: unknown): SleepLog | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    bedtime: validSleepTime(row.bedtime) ? row.bedtime : null,
    wakeTime: validSleepTime(row.wakeTime) ? row.wakeTime : null,
    quality: sleepQualityChoices.find(choice => choice.value === row.quality)?.value ?? null,
    wakings: sleepWakingChoices.find(choice => choice.value === row.wakings)?.value ?? null,
    nap: sleepNapChoices.find(choice => choice.value === row.nap)?.value ?? null,
    note: typeof row.note === "string" ? row.note.slice(0, 280) : "",
  };
}

export function sleepQualityLabel(sleep?: SleepLog | null): string {
  return sleepQualityChoices.find(choice => choice.value === sleep?.quality)?.label ?? "Not recorded";
}

export function sleepSummary(sleep?: SleepLog | null): string {
  if (!sleep) return "Sleep: Not recorded";
  const duration = sleepDurationMinutes(sleep) !== null ? sleepDurationLabel(sleep) : null;
  const quality = sleep?.quality ? `${sleepQualityLabel(sleep)} quality` : null;
  return `Sleep: ${[duration, quality].filter(Boolean).join(" · ") || "Logged"}`;
}

export function sleepDetails(sleep?: SleepLog | null) {
  return [
    { label: "Bedtime", value: sleep?.bedtime ?? "Not recorded" },
    { label: "Wake time", value: sleep?.wakeTime ?? "Not recorded" },
    { label: "Hours slept (calculated)", value: sleepDurationLabel(sleep) },
    { label: "Sleep quality", value: sleepQualityLabel(sleep) },
    { label: "Times woke up", value: sleepWakingChoices.find(choice => choice.value === sleep?.wakings)?.label ?? "Not recorded" },
    { label: "Daytime nap", value: sleepNapChoices.find(choice => choice.value === sleep?.nap)?.label ?? "Not recorded" },
    { label: "Sleep note", value: sleep?.note || "Not recorded" },
  ];
}

/** Always seven calendar days, including days without a recorded sleep log. */
export function sleepWeek(logs: readonly { date: string; sleep?: SleepLog | null }[], ending: string) {
  const end = new Date(`${ending}T12:00:00Z`);
  if (!Number.isFinite(end.getTime())) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end.getTime() - (6 - index) * 86400000).toISOString().slice(0, 10);
    const sleep = logs.find(log => log.date === date)?.sleep;
    return { date, duration: sleepDurationLabel(sleep), quality: sleepQualityLabel(sleep) };
  });
}
