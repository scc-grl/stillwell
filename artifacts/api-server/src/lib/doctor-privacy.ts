/** Whitelist every field returned by the legacy clinician reader, including frozen copies. */
export function doctorJournalEntry(entry: Record<string, any>) {
  return {
    date: entry.date, updatedAt: entry.updatedAt,
    symptoms: (entry.symptoms ?? []).map((s: any) => ({ name: s.name, severity: s.severity })),
    dietStatus: entry.dietStatus, dietNote: "",
    exerciseStatus: entry.exerciseStatus, exerciseNote: "",
    meditationStatus: entry.meditationStatus, meditationMinutes: entry.meditationMinutes, meditationNote: "",
    note: "",
    ...(entry.dailyCheckIn ? { dailyCheckIn: {
      ratingScale: entry.dailyCheckIn.ratingScale, overallFeeling: entry.dailyCheckIn.overallFeeling,
      worseWithActivity: entry.dailyCheckIn.worseWithActivity, summary: "",
      symptoms: Array.isArray(entry.dailyCheckIn.symptoms) ? entry.dailyCheckIn.symptoms.map((s: any) => ({
        name: s.name, status: s.status, rating: s.rating, ...(s.addedOn ? { addedOn: s.addedOn } : {}),
      })) : entry.dailyCheckIn.symptoms,
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
