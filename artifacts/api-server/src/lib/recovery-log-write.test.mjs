import assert from "node:assert/strict";
import test from "node:test";
import { SaveRecoveryLogBody } from "../../../../lib/api-zod/src/generated/api.ts";
import { recoveryLogWrite } from "./recovery-log-write.ts";

const original = {
  date: "2026-10-19", symptoms: [], dietStatus: "done", dietNote: "Existing food note",
  exerciseStatus: "not_planned", exerciseNote: "", meditationStatus: "not_planned",
  meditationMinutes: 0, meditationNote: "", note: "Pacing note",
  dailyCheckIn: { overallFeeling: "okay", symptoms: [], summary: "Existing summary" },
};

test("activities save never includes daily check-in or symptom fields", () => {
  const { initial, patch } = recoveryLogWrite({ ...original, section: "activities", dailyCheckIn: undefined, dietNote: "Updated food" });
  assert.equal("section" in initial, false);
  assert.equal("dailyCheckIn" in patch, false);
  assert.equal("symptoms" in patch, false);
  assert.equal({ ...original, ...patch }.dailyCheckIn.summary, "Existing summary");
});

test("check-in save never includes stale activity fields", () => {
  const { patch } = recoveryLogWrite({ ...original, section: "check_in", dietNote: "", dailyCheckIn: { ...original.dailyCheckIn, summary: "Updated summary" } });
  assert.deepEqual(Object.keys(patch), ["symptoms", "dailyCheckIn"]);
  assert.equal({ ...original, ...patch }.dietNote, "Existing food note");
});

test("combined journal save updates check-in and sleep while preserving activities", () => {
  const sleep = { hoursSlept: 5.5, bedtime: null, wakeTime: null, quality: "fair", wakings: null, nap: null, note: "" };
  const { patch } = recoveryLogWrite({ ...original, section: "journal", sleep, dailyCheckIn: { ...original.dailyCheckIn, summary: "Today felt steady" } });
  assert.deepEqual(Object.keys(patch), ["symptoms", "dailyCheckIn", "sleep"]);
  assert.equal(patch.sleep.hoursSlept, 5.5);
  const merged = { ...original, ...patch };
  assert.equal(merged.dietNote, "Existing food note");
  assert.equal(merged.exerciseStatus, "not_planned");
  assert.equal(merged.note, "Pacing note");
});

test("journal schema accepts half-hour sleep entries", () => {
  const symptoms = ["headache", "fatigue", "fog", "sleep", "mood", "light"].map((name) => ({ name, status: "not_recorded", rating: null }));
  const input = {
    date: "2026-10-28", symptoms: [], dietStatus: "not_planned", dietNote: "",
    exerciseStatus: "not_planned", exerciseNote: "", meditationStatus: "not_planned",
    meditationMinutes: 0, meditationNote: "", note: "",
    dailyCheckIn: { overallFeeling: "okay", worseWithActivity: null, symptoms, summary: "" },
    sleep: { hoursSlept: 5.5, bedtime: null, wakeTime: null, quality: "fair", wakings: null, nap: null, note: "" },
    section: "journal",
  };
  assert.equal(SaveRecoveryLogBody.safeParse(input).success, true);
});

test("independent section writes commute even with stale client snapshots", () => {
  const checkIn = recoveryLogWrite({ ...original, section: "check_in", dailyCheckIn: { ...original.dailyCheckIn, summary: "Phone reflection" } }).patch;
  const activities = recoveryLogWrite({ ...original, section: "activities", dietNote: "Web meal" }).patch;
  assert.deepEqual({ ...original, ...checkIn, ...activities }, { ...original, ...activities, ...checkIn });
  assert.equal({ ...original, ...checkIn, ...activities }.dailyCheckIn.summary, "Phone reflection");
  assert.equal({ ...original, ...checkIn, ...activities }.dietNote, "Web meal");
});

test("older clients omitting dailyCheckIn keep the current daily check-in", () => {
  const { dailyCheckIn, ...legacy } = original;
  const { patch } = recoveryLogWrite(legacy);
  assert.equal({ ...original, ...patch }.dailyCheckIn, dailyCheckIn);
});
