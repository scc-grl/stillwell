import assert from "node:assert/strict";
import test from "node:test";
import { dailyCheckInFromLog, emptyLog, makeEmptyDailyCheckIn, symptomsForRecoveryLog, ratingChoices } from "../src/index.ts";
import { normalizeCareEntry } from "../src/clinician-journal.ts";
test("old four-step entries convert 0/1/2/3 to 0/3/6/9 without changing source data", () => {
  const dailyCheckIn = makeEmptyDailyCheckIn();
  delete dailyCheckIn.ratingScale;
  dailyCheckIn.symptoms = dailyCheckIn.symptoms.map((answer, index) =>
    index < 4 ? { ...answer, status: "recorded", rating: index } : answer);
  const log = { ...emptyLog("2026-10-20"), dailyCheckIn };
  const before = JSON.stringify(log);
  const converted = dailyCheckInFromLog(log);
  assert.deepEqual(converted.symptoms.slice(0, 4).map(item => item.rating), [0, 3, 6, 9]);
  assert.ok(converted.symptoms.slice(4).every(item => item.rating === null));
  assert.equal(converted.ratingScale, "ten_point_v1");
  assert.deepEqual(dailyCheckInFromLog({ ...log, dailyCheckIn: converted }), converted);
  assert.equal(JSON.stringify(log), before);
  const frozen = normalizeCareEntry(log);
  assert.equal(frozen.scores.fatigue, 3);
  assert.equal(frozen.scores.focus, 6);
  assert.equal(frozen.scores.sleep, 9);
  assert.equal(JSON.stringify(log), before);
});
test("new scores 1/2/3 are not multiplied and all eleven levels roundtrip", () => {
  for (const { value } of ratingChoices) {
    const dailyCheckIn = makeEmptyDailyCheckIn();
    dailyCheckIn.symptoms[0] = { name: "headache", status: "recorded", rating: value };
    const log = { ...emptyLog(), dailyCheckIn, symptoms: symptomsForRecoveryLog(dailyCheckIn, []) };
    assert.equal(log.symptoms[0].severity, value);
    assert.equal(dailyCheckInFromLog(log).symptoms[0].rating, value);
  }
  assert.deepEqual([ratingChoices[0].label, ratingChoices[5].label, ratingChoices[10].label], ["0 None", "5 Moderate", "10 Worst"]);
  assert.equal(JSON.stringify(ratingChoices).includes("Not noticeable"), false);
});
