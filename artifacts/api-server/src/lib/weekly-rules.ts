/** Founder-approved MVP heuristics, awaiting clinical review. AI never decides. */
export const WEEKLY_RULES = Object.freeze({
  version: "weekly-mvp-2026-11-22.1",
  minimumDays: 4, baselineDays: 7, worseningDelta: 3, worseningDays: 2,
  allowedDelta: 2, minimumPlanAverage: 5, journalJump: 3,
  explanationMinimumProbability: 0.7, explanationTimeoutMs: 2000,
  notesConsentVersion: "weekly-notes-2026-11-22.1",
});
export const MVP_SYMPTOMS = ["headache", "fog", "light", "sleep"] as const;
export type MvpSymptom = typeof MVP_SYMPTOMS[number];
export type Scores = Record<MvpSymptom, number | null>;
export type WeeklyDay = { date: string; scores: Scores; planScore: number | null; flagged: boolean };
export const emptyScores = (): Scores => ({ headache: null, fog: null, light: null, sleep: null });

export function decideWeekly(stage: string, days: WeeklyDay[], prior: WeeklyDay[], intake: Scores) {
  const rules = WEEKLY_RULES;
  const logged = [...new Map(days.map(d => [d.date, d])).values()];
  const baseline = emptyScores();
  for (const key of MVP_SYMPTOMS) {
    const values = prior.map(d => d.scores[key]).filter((v): v is number => v !== null);
    baseline[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : intake[key];
  }
  const finish = (next: string, rule: string, reason: string) => ({
    stage: next, reasons: [reason], ruleIds: [rule], rulesVersion: rules.version, baseline,
  });
  if (logged.length < rules.minimumDays) return finish(stage, "W1", "Not enough days: fewer than 4 of 7 days were logged.");
  const repeatedlyHigher = MVP_SYMPTOMS.some(key => baseline[key] !== null &&
    logged.filter(d => d.scores[key] !== null && d.scores[key]! - baseline[key]! >= rules.worseningDelta).length >= rules.worseningDays);
  if (logged.some(d => d.flagged) || repeatedlyHigher) {
    const next = stage === "maintenance" ? "6" : String(Math.max(1, Number(stage) - 1));
    return finish(next, "W2", logged.some(d => d.flagged)
      ? "A day was flagged this week, so the app stepped back one stage where possible."
      : "A symptom was at least 3 points above its baseline on two or more days, so the app stepped back one stage where possible.");
  }
  const complete = logged.every(d => MVP_SYMPTOMS.every(key => baseline[key] !== null && d.scores[key] !== null &&
    d.scores[key]! - baseline[key]! <= rules.allowedDelta));
  const plans = logged.map(d => d.planScore).filter((v): v is number => v !== null);
  // Average only recorded plan answers. No skipped answer is counted as zero.
  if (complete && plans.length > 0 && plans.reduce((a, b) => a + b, 0) / plans.length >= rules.minimumPlanAverage) {
    const next = stage === "6" || stage === "maintenance" ? "maintenance" : String(Number(stage) + 1);
    return finish(next, "W3", "Every logged symptom stayed within 2 points of baseline, the average recovery-plan score was at least 5, and no day was flagged.");
  }
  return finish(stage, "W4", "Your stage stays the same this week. The move-up criteria were not all met; missing answers were not estimated.");
}

export function localDay(now: Date, timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(t => parts.find(p => p.type === t)!.value).join("-");
}
export function offsetDay(day: string, offset: number) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10);
}
export function mondayOf(day: string) {
  return offsetDay(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
}
