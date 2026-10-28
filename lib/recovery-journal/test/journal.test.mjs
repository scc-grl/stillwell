import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInSymptoms, dailyCheckInFromLog, emptyLog, legacyScoreToRating,
  makeEmptyDailyCheckIn, ratingLabel, symptomsForRecoveryLog, weekDates, weeklyInsight, hasSavedCheckIn,
} from "../src/index.ts";

test("original six symptoms remain first in the shared eleven-symptom vocabulary", () => {
  assert.deepEqual(checkInSymptoms.slice(0, 6).map((s) => s.label), ["Headache", "Fatigue", "Fog", "Sleep", "Mood", "Light"]);
  const checkIn = makeEmptyDailyCheckIn();
  assert.equal(checkIn.symptoms.length, 11);
  assert.ok(checkIn.symptoms.every((s) => ratingLabel(s) === "Not recorded"));
});

test("legacy conversion uses the phone's original thresholds at every boundary", () => {
  assert.deepEqual(Array.from({ length: 11 }, (_, score) => legacyScoreToRating(score)), [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  const legacy = { ...emptyLog(), symptoms: [{ name: "focus", severity: 6 }, { name: "light_sound", severity: 9 }] };
  const converted = dailyCheckInFromLog(legacy);
  assert.equal(ratingLabel(converted.symptoms.find((s) => s.name === "fog")), "Noticeable");
  assert.equal(ratingLabel(converted.symptoms.find((s) => s.name === "light")), "More noticeable");
  assert.equal(ratingLabel(converted.symptoms.find((s) => s.name === "headache")), "Not recorded");
});

test("explicit not-recorded answers are never inferred from legacy scores", () => {
  const log = { ...emptyLog(), symptoms: [{ name: "headache", severity: 9 }], dailyCheckIn: makeEmptyDailyCheckIn() };
  assert.equal(ratingLabel(dailyCheckInFromLog(log).symptoms[0]), "Not recorded");
});

test("writing named scores roundtrips without losing unrelated historical symptoms", () => {
  const checkIn = makeEmptyDailyCheckIn();
  checkIn.symptoms[0] = { name: "headache", status: "recorded", rating: 2 };
  const symptoms = symptomsForRecoveryLog(checkIn, [{ name: "dizziness", severity: 4 }]);
  assert.deepEqual(symptoms, [{ name: "dizziness", severity: 4 }, { name: "headache", severity: 6 }]);
  assert.equal(dailyCheckInFromLog({ symptoms }).symptoms[0].rating, 2);
});

test("last-seven-days strip crosses month/year boundaries", () => {
  assert.deepEqual(weekDates("2026-01-03"), ["2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03"]);
});

test("activity-only and legacy-only days do not claim a new saved check-in", () => {
  assert.equal(hasSavedCheckIn(emptyLog()), false);
  assert.equal(hasSavedCheckIn({ ...emptyLog(), dailyCheckIn: makeEmptyDailyCheckIn() }), true);
  assert.equal(hasSavedCheckIn({ ...emptyLog(), symptoms: [{ name: "headache", severity: 6 }] }), false);
});

test("weekly pattern is withheld below three saved check-ins and excludes other dates", () => {
  const entry = (date, overallFeeling) => ({ ...emptyLog(date), dailyCheckIn: { ...makeEmptyDailyCheckIn(), overallFeeling }, updatedAt: "" });
  const logs = [entry("2026-10-17", "low"), entry("2026-10-18", "okay")];
  assert.equal(weeklyInsight(logs, "2026-10-19"), null);
  assert.equal(weeklyInsight([...logs, entry("2026-10-01", "great")], "2026-10-19"), null);
  assert.match(weeklyInsight([...logs, entry("2026-10-19", "good")], "2026-10-19"), /from low to good across 3 rated days/);
});
