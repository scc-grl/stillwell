import assert from "node:assert/strict";
import test from "node:test";
import {
  emptySleep, normalizeSleep, sleepDetails, sleepDurationMinutes, sleepDurationLabel,
  sleepQualityLabel, sleepSummary, sleepWeek, validSleepTime,
} from "../src/sleep.ts";
import { normalizeCareEntry } from "../src/clinician-journal.ts";

test("optional fields stay unrecorded, including partial and legacy entries", () => {
  assert.equal(sleepDurationMinutes(emptySleep()), null);
  assert.equal(sleepDurationMinutes({ bedtime: "23:00" }), null);
  assert.equal(sleepQualityLabel(null), "Not recorded");
  assert.equal(sleepSummary(null), "Sleep: Not recorded");
  assert.ok(sleepDetails(emptySleep()).every(row => row.value === "Not recorded"));
  assert.equal(normalizeCareEntry({ date: "2026-10-20" }).sleep, null);
});
test("sleep duration derives from local times, crossing midnight and preserving zero", () => {
  assert.equal(sleepDurationMinutes({ bedtime: "23:15", wakeTime: "07:45" }), 510);
  assert.equal(sleepDurationLabel({ bedtime: "23:15", wakeTime: "07:45" }), "8h 30m");
  assert.equal(sleepDurationMinutes({ bedtime: "01:00", wakeTime: "06:00" }), 300);
  assert.equal(sleepDurationMinutes({ bedtime: "07:00", wakeTime: "07:00" }), 0);
  assert.equal(validSleepTime("24:00"), false);
  assert.equal(validSleepTime("07:60"), false);
  assert.equal(validSleepTime("7:30"), false);
});
test("shared clinician normalization includes sleep from live and frozen payloads without mutation", () => {
  const sleep = { bedtime: "22:30", wakeTime: "06:30", quality: "good", wakings: 0, nap: "none", note: "Quiet evening" };
  const frozen = { date: "2026-10-20", data: { sleep } };
  assert.deepEqual(normalizeCareEntry(frozen).sleep, sleep);
  assert.deepEqual(normalizeCareEntry({ date: "2026-10-20", sleep }).sleep, sleep);
  assert.equal(sleepDetails(sleep).find(row => row.label === "Times woke up").value, "0");
  assert.equal(sleepDetails({ wakings: 3 }).find(row => row.label === "Times woke up").value, "3+");
  assert.equal(frozen.data.sleep.note, "Quiet evening");
});
test("invalid sleep fields are never guessed in a read-only view", () => {
  assert.deepEqual(normalizeSleep({ bedtime: "bad", quality: "excellent", wakings: 9 }), emptySleep());
});
test("seven-day view includes missing days, hours and quality without targets or scores", () => {
  const week = sleepWeek([{ date: "2026-10-20", sleep: { bedtime: "23:00", wakeTime: "06:00", quality: "fair" } }], "2026-10-20");
  assert.equal(week.length, 7);
  assert.equal(week[0].date, "2026-10-14");
  assert.equal(week[0].duration, "Not recorded");
  assert.deepEqual(week[6], { date: "2026-10-20", duration: "7h", quality: "Fair" });
});
