import { normalizeSleep, type SleepLog } from "@workspace/recovery-journal/sleep";

/** Read-only interpretation of stored care-team entries. Never fills missing scores. */
export const careSymptoms = [
  { key: "headache", label: "Headache" },
  { key: "dizziness", label: "Dizziness" },
  { key: "focus", label: "Focus" },
  { key: "fatigue", label: "Fatigue" },
  { key: "sleep", label: "Sleep" },
  { key: "light_sound", label: "Light & sound" },
  { key: "mood", label: "Mood" },
] as const;
export type CareSymptomKey = typeof careSymptoms[number]["key"];
export type CareRange = 7 | 30 | 90 | "all";
export type CareRoutine = {
  key: "diet" | "exercise" | "meditation";
  label: string;
  status: "done" | "not_done" | "not_planned" | null;
  minutes: number | null;
  note: string;
};
export type ClinicalEntry = {
  date: string;
  updatedAt: string | null;
  scores: Record<CareSymptomKey, number | null>;
  routines: CareRoutine[];
  note: string;
  summary: string;
  sleep: SleepLog | null;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
const finite = (value: unknown, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;

export function isCareDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(stamp.getTime()) && stamp.toISOString().slice(0, 10) === value;
}

export function normalizeCareEntry(value: unknown): ClinicalEntry | null {
  const row = record(value);
  // Frozen snapshots and live API responses use the same original data payload.
  const data = { ...record(row.data), ...row };
  if (!isCareDate(data.date)) return null;
  const scores = Object.fromEntries(careSymptoms.map(({ key }) => [key, null])) as ClinicalEntry["scores"];
  if (Array.isArray(data.symptoms)) {
    for (const value of data.symptoms) {
      const symptom = record(value);
      if (careSymptoms.some(({ key }) => key === symptom.name)) {
        scores[symptom.name as CareSymptomKey] = finite(symptom.severity, 10);
      }
    }
  }
  // dailyCheckIn ratings are ordinal 0–3. Do not reinterpret those as 0–10.
  const checkIn = record(data.dailyCheckIn);
  const timestamp = data.updatedAt ?? data.updated_at;
  const updatedAt = typeof timestamp === "string" && Number.isFinite(Date.parse(timestamp))
    ? new Date(timestamp).toISOString() : null;
  const routines = ([
    ["diet", "Food & hydration"], ["exercise", "Movement"], ["meditation", "Quiet pause"],
  ] as const).map(([key, label]): CareRoutine => {
    const status = data[`${key}Status`];
    return {
      key, label,
      status: status === "done" || status === "not_done" || status === "not_planned" ? status : null,
      minutes: finite(data[`${key}Minutes`], 1440),
      note: text(data[`${key}Note`]),
    };
  });
  return { date: data.date, updatedAt, scores, routines, note: text(data.note), summary: text(checkIn.summary), sleep: normalizeSleep(data.sleep) };
}

/** Stable newest-first order, de-duplicating pages without losing the latest edit. */
export function normalizeCareEntries(rows: readonly unknown[]): ClinicalEntry[] {
  const dates = new Map<string, ClinicalEntry>();
  for (const row of rows) {
    const entry = normalizeCareEntry(row);
    if (!entry) continue;
    const existing = dates.get(entry.date);
    if (!existing || (entry.updatedAt ?? "") > (existing.updatedAt ?? "")) dates.set(entry.date, entry);
  }
  return [...dates.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Inclusive calendar-day range. Former journals anchor to the disconnection day. */
export function filterCareEntries(entries: readonly ClinicalEntry[], range: CareRange, anchorDate: string): ClinicalEntry[] {
  // A frozen snapshot is already the sharing boundary. Never discard its entries
  // because the patient's calendar day differs from the clinician's time zone.
  if (range === "all") return [...entries];
  if (!isCareDate(anchorDate)) return [];
  const end = Date.parse(`${anchorDate}T12:00:00Z`);
  const start = end - (range - 1) * 86400000;
  return entries.filter(entry => {
    const time = Date.parse(`${entry.date}T12:00:00Z`);
    return time >= start && time <= end;
  });
}

export function careSymptomStats(entries: readonly ClinicalEntry[], key: CareSymptomKey) {
  const points = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => ({ date: entry.date, value: entry.scores[key] }));
  const recorded = points.filter((point): point is { date: string; value: number } => point.value !== null);
  return {
    points,
    latest: recorded.length ? recorded[recorded.length - 1]!.value : null,
    latestDate: recorded.length ? recorded[recorded.length - 1]!.date : null,
    min: recorded.length ? Math.min(...recorded.map(point => point.value)) : null,
    max: recorded.length ? Math.max(...recorded.map(point => point.value)) : null,
  };
}
