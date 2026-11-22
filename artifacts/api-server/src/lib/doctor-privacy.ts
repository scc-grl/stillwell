import { checkInSymptoms } from "@workspace/recovery-journal";
const names = new Set<string>(checkInSymptoms.map(s => s.name));
const legacyNames = new Set<string>(checkInSymptoms.flatMap(s => [s.name, s.legacyName]));
const rating = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
/** Whitelist every field returned by the legacy clinician reader, including frozen copies. */
export function doctorJournalEntry(entry: Record<string, any>) {
  return {
    date: entry.date, updatedAt: entry.updatedAt,
    symptoms: (entry.symptoms ?? []).filter((s: any) => legacyNames.has(s.name))
      .map((s: any) => ({ name: s.name, severity: rating(s.severity) })),
    dietStatus: entry.dietStatus, dietNote: "",
    exerciseStatus: entry.exerciseStatus, exerciseNote: "",
    meditationStatus: entry.meditationStatus, meditationMinutes: entry.meditationMinutes, meditationNote: "",
    note: "",
    ...(entry.dailyCheckIn ? { dailyCheckIn: {
      ratingScale: entry.dailyCheckIn.ratingScale, overallFeeling: entry.dailyCheckIn.overallFeeling,
      worseWithActivity: entry.dailyCheckIn.worseWithActivity, summary: "",
      symptoms: Array.isArray(entry.dailyCheckIn.symptoms) ? entry.dailyCheckIn.symptoms.filter((s: any) => names.has(s.name)).map((s: any) => ({
        name: s.name, status: s.status === "recorded" && rating(s.rating) !== null ? "recorded" : "not_recorded",
        rating: s.status === "recorded" ? rating(s.rating) : null,
      })) : Object.entries(entry.dailyCheckIn.symptoms ?? {}).filter(([name]) => names.has(name))
        .map(([name, value]) => ({ name, rating: rating(value), status: rating(value) === null ? "not_recorded" : "recorded" })),
    } } : {}),
    ...(entry.sleep ? { sleep: {
      ...Object.fromEntries(["hoursSlept", "bedtime", "wakeTime", "quality", "wakings", "nap"]
        .filter(k => entry.sleep[k] !== undefined).map(k => [k, entry.sleep[k]])), note: "",
    } } : {}),
  };
}
export function doctorProfile(profile: Record<string, any>) {
  return Object.fromEntries(["supportMode", "supportApproach", "priorities", "focusAreas", "selectedSymptoms"]
    .filter(k => profile[k] !== undefined).map(k => [k, profile[k]]));
}
