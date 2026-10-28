import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkInSymptoms, defaultSymptoms, selectedCheckInSymptoms, makeEmptyDailyCheckIn,
  dailyCheckInFromLog, symptomsForRecoveryLog, emptyLog, ratingChoices, activityAnswerChoices,
  MAX_RECOVERY_LOG_SYMPTOMS,
} from "../src/index.ts";
import { normalizeCareEntry, careSymptoms } from "../src/clinician-journal.ts";

test("the original six are the default and the new five are opt-in", () => {
  assert.deepEqual(selectedCheckInSymptoms().map(item => item.name), defaultSymptoms);
  assert.deepEqual(checkInSymptoms.slice(6).map(item => item.label), [
    "Dizziness / balance", "Nausea", "Vision (blurry or double)", "Noise sensitivity", "Neck pain",
  ]);
  assert.deepEqual(ratingChoices.map(item => item.value), [0, 1, 2, 3]);
  assert.deepEqual(activityAnswerChoices.map(item => item.label), ["Yes", "No", "Not sure"]);
  assert.equal(careSymptoms.length, checkInSymptoms.length);
});
test("stored profile selections survive serialization, including choosing no symptoms", () => {
  const profile = JSON.parse(JSON.stringify({ supportMode: "self_guided", priorities: [], selectedSymptoms: ["fog", "nausea"] }));
  assert.deepEqual(selectedCheckInSymptoms(profile).map(item => item.name), ["fog", "nausea"]);
  assert.deepEqual(selectedCheckInSymptoms({ selectedSymptoms: [] }), []);
  assert.deepEqual(selectedCheckInSymptoms({ priorities: [] }).map(item => item.name), defaultSymptoms);
});
test("legacy six-answer days gain five not-recorded answers, never inferred", () => {
  const old = { ...makeEmptyDailyCheckIn(), symptoms: makeEmptyDailyCheckIn().symptoms.slice(0, 6) };
  const normalized = dailyCheckInFromLog({ ...emptyLog(), symptoms: [{ name: "dizziness", severity: 9 }], dailyCheckIn: old });
  assert.equal(normalized.symptoms.length, 11);
  assert.ok(normalized.symptoms.slice(6).every(item => item.status === "not_recorded" && item.rating === null));
  assert.equal(normalized.worseWithActivity ?? null, null);
});
test("all new scores roundtrip on the same four-step scale, with explicit skips retained", () => {
  for (const symptom of checkInSymptoms.slice(6)) {
    for (const { value } of ratingChoices) {
      const checkIn = makeEmptyDailyCheckIn();
      checkIn.symptoms = checkIn.symptoms.map(item => item.name === symptom.name ? { ...item, rating: value, status: "recorded" } : item);
      const symptoms = symptomsForRecoveryLog(checkIn, []);
      const result = dailyCheckInFromLog({ ...emptyLog(), symptoms, dailyCheckIn: checkIn });
      assert.equal(result.symptoms.find(item => item.name === symptom.name).rating, value);
      assert.ok(result.symptoms.filter(item => item.name !== symptom.name).every(item => item.status === "not_recorded"));
    }
  }
});
test("the legacy symptom list for saving never exceeds the API schema limit", () => {
  const checkIn = makeEmptyDailyCheckIn();
  checkIn.symptoms = Array.from({ length: 24 }, (_, index) => ({
    name: checkInSymptoms[index % checkInSymptoms.length].name,
    status: "recorded",
    rating: index % ratingChoices.length,
  }));
  const existing = Array.from({ length: 24 }, (_, index) => ({
    name: checkInSymptoms[index % checkInSymptoms.length].legacyName,
    severity: index % 11,
  }));
  const symptoms = symptomsForRecoveryLog(checkIn, existing);

  assert.equal(MAX_RECOVERY_LOG_SYMPTOMS, 11);
  assert.ok(symptoms.length <= MAX_RECOVERY_LOG_SYMPTOMS);
});
test("day-only additions stay on that day and do not mutate saved preferences", () => {
  const preferences = { selectedSymptoms: [...defaultSymptoms] };
  const checkIn = { ...makeEmptyDailyCheckIn(), selectedSymptoms: [...preferences.selectedSymptoms, "neck"], worseWithActivity: "not_sure" };
  const read = dailyCheckInFromLog(JSON.parse(JSON.stringify({ ...emptyLog(), dailyCheckIn: checkIn })));
  assert.ok(read.selectedSymptoms.includes("neck"));
  assert.equal(read.worseWithActivity, "not_sure");
  assert.deepEqual(preferences.selectedSymptoms, defaultSymptoms);
});
test("both flow settings editors use saved profile choices, never the day-only selection", () => {
  for (const path of [
    "../../../artifacts/website/src/components/DailyCheckInFlow.tsx",
    "../../../artifacts/stillwell-phone/components/DailyCheckInFlow.tsx",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /selected=\{draftMode \? selectedSymptoms \?\? defaultSymptoms : preferences.selected\}/);
    assert.doesNotMatch(source, /<SymptomSelector[^>]*selected=\{selectedNames\}/);
  }
});
test("clinician normalization exposes confirmed new answers and activity without inferring missing fields", () => {
  const checkIn = makeEmptyDailyCheckIn();
  checkIn.worseWithActivity = "yes";
  checkIn.symptoms = checkIn.symptoms.map(item => item.name === "vision" ? { ...item, status: "recorded", rating: 2 } : item);
  const entry = normalizeCareEntry({ date: "2026-10-20", dailyCheckIn: checkIn, symptoms: symptomsForRecoveryLog(checkIn, []) });
  assert.equal(entry.checkInRatings.vision, "Noticeable");
  assert.equal(entry.checkInRatings.nausea, "Not recorded");
  assert.equal(entry.activityAnswer, "Yes");
  const legacy = normalizeCareEntry({ date: "2026-10-19", symptoms: [{ name: "headache", severity: 4 }] });
  assert.equal(legacy.scores.headache, 4);
  assert.equal(legacy.scores.vision, null);
  assert.equal(legacy.activityAnswer, "Not recorded");
});
