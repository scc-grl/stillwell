import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCareEntry, normalizeCareEntries, careSymptomStats, filterCareEntries, isCareDate } from "../src/clinician-journal.ts";

test("stored severities preserve zero and decimals; missing or invalid scores are not invented", () => {
  const entry = normalizeCareEntry({ date: "2026-10-20", symptoms: [
    { name: "headache", severity: 0 }, { name: "dizziness", severity: 6.5 },
    { name: "focus", severity: 11 }, { name: "sleep", severity: "5" },
  ], dailyCheckIn: { summary: "A short reflection", symptoms: [{ name: "mood", rating: 3, status: "recorded" }] } });
  assert.equal(entry.scores.headache, 0);
  assert.equal(entry.scores.dizziness, null);
  assert.equal(entry.scores.focus, null);
  assert.equal(entry.scores.sleep, null);
  assert.equal(entry.scores.mood, null);
  assert.equal(entry.summary, "A short reflection");
});
test("snapshot envelopes, original fields and timestamp aliases are read without modifying the input", () => {
  const input = { date: "2026-10-20", updated_at: "2026-10-20T10:20:00Z", data: {
    dietStatus: "done", dietNote: "Lunch", exerciseStatus: "not_done", meditationStatus: "not_planned",
    meditationMinutes: 0, meditationNote: "", note: "Daily note",
  } };
  const original = JSON.stringify(input);
  const entry = normalizeCareEntry(input);
  assert.equal(entry.updatedAt, "2026-10-20T10:20:00.000Z");
  assert.deepEqual(entry.routines.map(r => r.status), ["done", "not_done", "not_planned"]);
  assert.equal(entry.routines[2].minutes, 0);
  assert.equal(entry.note, "Daily note");
  assert.equal(JSON.stringify(input), original);
});
test("invalid calendar dates are rejected, missing routines are not reported as not planned", () => {
  assert.equal(isCareDate("2026-02-30"), false);
  assert.equal(normalizeCareEntry({ date: "2026-02-30" }), null);
  assert.equal(normalizeCareEntry(null), null);
  assert.equal(normalizeCareEntry({ date: "2026-10-20" }).routines[0].status, null);
});
test("paginated entries are newest-first, with latest edit winning duplicated dates", () => {
  const entries = normalizeCareEntries([
    { date: "2026-10-19" }, { date: "2026-10-20", note: "Old", updatedAt: "2026-10-20T10:00:00Z" },
    { date: "2026-10-20", note: "Edited", updatedAt: "2026-10-20T11:00:00Z" },
  ]);
  assert.deepEqual(entries.map(e => e.date), ["2026-10-20", "2026-10-19"]);
  assert.equal(entries[0].note, "Edited");
});
test("range includes seven calendar days and anchors frozen journals to the shared-to date", () => {
  const entries = normalizeCareEntries([{ date: "2026-10-13" }, { date: "2026-10-14" }, { date: "2026-10-20" }, { date: "2026-10-21" }]);
  assert.deepEqual(filterCareEntries(entries, 7, "2026-10-20").map(e => e.date), ["2026-10-20", "2026-10-14"]);
  assert.equal(filterCareEntries(entries, "all", "2026-10-20").length, 4);
  assert.equal(filterCareEntries(entries, "all", "invalid").length, 4);
  assert.deepEqual(filterCareEntries(entries, 30, "invalid"), []);
});
test("stats use recorded values only, retain gaps and show the latest recorded observation", () => {
  const entries = normalizeCareEntries([
    { date: "2026-10-18", symptoms: [{ name: "headache", severity: 7 }] },
    { date: "2026-10-19", symptoms: [{ name: "headache", severity: 0 }] },
    { date: "2026-10-20", symptoms: [] },
  ]);
  const stats = careSymptomStats(entries, "headache");
  assert.equal(stats.latest, 0);
  assert.equal(stats.latestDate, "2026-10-19");
  assert.equal(stats.min, 0);
  assert.equal(stats.max, 7);
  assert.deepEqual(stats.points.map(p => p.value), [7, 0, null]);
  assert.equal(careSymptomStats(entries, "mood").min, null);
});
