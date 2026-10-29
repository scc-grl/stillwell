import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createMayaDemoState,
  makeEmptyDemoEntry,
  MAYA_DEMO_DATE,
  upsertDemoEntry,
} from "../components/demo-intake/demo-patient-data.ts";

test("Maya starts with the six shared symptoms and the approved day-28 responses", () => {
  const state = createMayaDemoState();
  assert.deepEqual(state.trackedSymptoms, ["headache", "fatigue", "fog", "sleep", "mood", "light"]);
  const today = state.entries.find(entry => entry.date === MAYA_DEMO_DATE);
  assert.equal(today.overall, "good");
  assert.equal(today.saved, false);
  assert.deepEqual(today.symptoms, { headache: 1, fatigue: 1, fog: 1, sleep: 0, mood: 0, light: 1 });
  assert.equal(today.sleep.hoursSlept, 8);
  assert.equal(today.sleep.quality, "good");
  assert.equal(today.note, "");
  assert.deepEqual(state.routine.map(item => [item.id, item.done]), [
    ["movement", true], ["pacing", true], ["quiet", false],
  ]);
});

test("sample history contains only the six reference dates, leaving unrecorded days absent", () => {
  const state = createMayaDemoState();
  assert.deepEqual(state.entries.filter(entry => entry.saved).map(entry => [entry.date, entry.overall]), [
    ["2026-10-28", "okay"], ["2026-10-27", "low"], ["2026-10-26", "okay"],
    ["2026-10-23", "okay"], ["2026-10-22", "good"], ["2026-10-21", "okay"],
  ]);
  assert.equal(state.entries.filter(entry => entry.date >= "2026-10-23").length, 5);
  for (const date of ["2026-10-24", "2026-10-25"]) {
    assert.equal(state.entries.some(entry => entry.date === date), false);
  }
});

test("editing and saving a day preserves other fields, other dates, settings and routines", () => {
  const state = createMayaDemoState();
  const original = structuredClone(state);
  const today = state.entries[0];
  const edited = {
    ...today, saved: true, note: "A made-up reflection.",
    symptoms: { ...today.symptoms, headache: 2, nausea: null },
    sleep: { ...today.sleep, hoursSlept: 7.5, quality: "fair", wakings: 2 },
    addedSymptoms: ["nausea"],
  };
  const saved = upsertDemoEntry(state, edited);
  assert.deepEqual(state, original);
  assert.equal(saved.entries.length, state.entries.length);
  assert.deepEqual(saved.entries.slice(1), state.entries.slice(1));
  assert.deepEqual(saved.routine, state.routine);
  assert.deepEqual(saved.trackedSymptoms, state.trackedSymptoms);
  assert.equal(saved.entries[0].overall, "good");
  assert.equal(saved.entries[0].symptoms.fatigue, 1);
  assert.equal(saved.entries[0].symptoms.nausea, null);
  assert.equal(saved.entries[0].sleep.hoursSlept, 7.5);
  assert.equal(saved.entries[0].note, "A made-up reflection.");
  assert.equal(saved.entries[0].saved, true);
  edited.symptoms.headache = 3;
  edited.sleep.hoursSlept = 10;
  edited.addedSymptoms.push("vision");
  assert.equal(saved.entries[0].symptoms.headache, 2);
  assert.equal(saved.entries[0].sleep.hoursSlept, 7.5);
  assert.deepEqual(saved.entries[0].addedSymptoms, ["nausea"]);
});

test("editing a past day replaces only that day without adding missing dates", () => {
  const state = createMayaDemoState();
  const past = state.entries.find(entry => entry.date === "2026-10-23");
  const updated = upsertDemoEntry(state, { ...past, overall: "great", note: "Edited sample day." });
  assert.equal(updated.entries.length, state.entries.length);
  assert.deepEqual(updated.entries.map(entry => entry.date), state.entries.map(entry => entry.date));
  assert.deepEqual(updated.entries.find(entry => entry.date === MAYA_DEMO_DATE), state.entries[0]);
  assert.equal(updated.entries.find(entry => entry.date === past.date).overall, "great");
});

test("fresh sessions reset edits and empty entries never infer skipped values", () => {
  const state = createMayaDemoState();
  state.entries[0].symptoms.headache = 3;
  state.entries[0].sleep.hoursSlept = 1;
  state.trackedSymptoms.pop();
  state.routine[0].done = false;
  const fresh = createMayaDemoState();
  assert.equal(fresh.entries[0].symptoms.headache, 1);
  assert.equal(fresh.entries[0].sleep.hoursSlept, 8);
  assert.equal(fresh.trackedSymptoms.length, 6);
  assert.equal(fresh.routine[0].done, true);
  const blank = makeEmptyDemoEntry("2026-10-20");
  assert.equal(blank.overall, null);
  assert.ok(Object.values(blank.symptoms).every(value => value === null));
  assert.equal(blank.sleep.hoursSlept, null);
  assert.equal(blank.sleep.quality, null);
  assert.equal(blank.saved, false);
});

test("demo patient surfaces contain no persistence, network, authenticated recovery hooks or logging", () => {
  for (const name of [
    "DemoPatientDashboard.tsx", "DemoPatientJournal.tsx", "DemoJournalEntry.tsx",
    "DemoPatientNavigation.tsx", "demo-patient-data.ts",
  ]) {
    const source = readFileSync(new URL(`../components/demo-intake/${name}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b|\bconsole\s*\.|\buse(?:Get|Save|Update|Delete|Start)Recovery/);
  }
  const controller = readFileSync(new URL("../pages/DemoIntakePage.tsx", import.meta.url), "utf8");
  assert.match(controller, /useState\(createMayaDemoState\)/);
  assert.match(controller, /upsertDemoEntry\(current, entry\)/);
  assert.doesNotMatch(controller, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
});
