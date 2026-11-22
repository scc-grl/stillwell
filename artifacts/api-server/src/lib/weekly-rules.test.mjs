import assert from "node:assert/strict";
import test from "node:test";
import { decideWeekly, WEEKLY_RULES, localDay, mondayOf } from "./weekly-rules.ts";
const scores = (value) => ({ headache: value, fog: value, light: value, sleep: value });
const baseline = scores(3);
const days = (count = 4, value = 3, planScore = 5) => Array.from({ length: count }, (_, i) => ({
  date: `2026-11-${String(16 + i).padStart(2, "0")}`, scores: scores(value), planScore, flagged: false,
}));
test("weekly thresholds live in one versioned founder-approved table", () => {
  assert.match(WEEKLY_RULES.version, /^weekly-mvp-/);
  assert.equal(WEEKLY_RULES.minimumDays, 4);
});
test("fewer than four recorded days holds, even with a warning", () => {
  const entries = days(3); entries[0].flagged = true;
  assert.deepEqual(decideWeekly("2", entries, [], baseline).ruleIds, ["W1"]);
});
test("exactly four days, all within two points, plan average five moves up", () => {
  const result = decideWeekly("2", days(4, 5), [], baseline);
  assert.equal(result.stage, "3"); assert.deepEqual(result.ruleIds, ["W3"]);
});
test("three or more over baseline on two days steps back; one day holds", () => {
  const entries = days(); entries[0].scores.headache = 6;
  assert.equal(decideWeekly("3", entries, [], baseline).stage, "3");
  entries[1].scores.headache = 6;
  assert.equal(decideWeekly("3", entries, [], baseline).stage, "2");
});
test("any saved flag steps back with four days, even if current numeric values are low", () => {
  const entries = days(); entries[0].flagged = true;
  assert.equal(decideWeekly("2", entries, [], baseline).stage, "1");
  assert.equal(decideWeekly("1", entries, [], baseline).stage, "1");
});
test("baseline is the previous week's per-symptom average, not this week's average", () => {
  const prior = days(4, 1); prior[0].scores.headache = null;
  const result = decideWeekly("3", days(4, 4), prior, scores(9));
  assert.equal(result.baseline.headache, 1); assert.equal(result.stage, "2");
});
test("unrecorded scores/baselines/plan answers are never inferred for move-up", () => {
  let entries = days(); entries[0].scores.headache = null;
  assert.equal(decideWeekly("2", entries, [], baseline).stage, "2");
  entries = days(4, 3, null);
  assert.equal(decideWeekly("2", entries, [], baseline).stage, "2");
  assert.equal(decideWeekly("2", days(), [], { ...baseline, fog: null }).stage, "2");
});
test("plan average excludes skipped answers instead of treating them as zero", () => {
  const entries = days(); entries[0].planScore = null;
  assert.equal(decideWeekly("2", entries, [], baseline).stage, "3");
});
test("plan average below five holds; plan average at five qualifies", () => {
  assert.equal(decideWeekly("2", days(4, 3, 4), [], baseline).stage, "2");
  const entries = days(); entries[0].planScore = 2; entries[1].planScore = 8;
  assert.equal(decideWeekly("2", entries, [], baseline).stage, "3");
});
test("stage six advances to maintenance; maintenance continues checks and can step back", () => {
  assert.equal(decideWeekly("6", days(), [], baseline).stage, "maintenance");
  assert.equal(decideWeekly("maintenance", days(), [], baseline).stage, "maintenance");
  const entries = days(); entries[0].flagged = true;
  assert.equal(decideWeekly("maintenance", entries, [], baseline).stage, "6");
});
test("duplicate calendar days cannot satisfy four-day minimum", () => {
  assert.equal(decideWeekly("2", [...days(3), days(1)[0]], [], baseline).ruleIds[0], "W1");
});
test("Monday boundaries follow patient's timezone, including Sunday in the Americas", () => {
  const instant = new Date("2026-11-23T01:00:00Z");
  assert.equal(mondayOf(localDay(instant, "America/Los_Angeles")), "2026-11-16");
  assert.equal(mondayOf(localDay(instant, "Europe/London")), "2026-11-23");
});
