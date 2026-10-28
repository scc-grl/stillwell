import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import { recoveryLogWrite } from "./recovery-log-write.ts";

const compiled = buildSync({
  stdin: {
    contents: 'export { SaveRecoveryLogBody, GetRecoveryResponse, UpdateRecoveryProfileBody } from "@workspace/api-zod";',
    resolveDir: fileURLToPath(new URL(".", import.meta.url)),
  },
  bundle: true, platform: "node", format: "esm", write: false,
});
const { SaveRecoveryLogBody, GetRecoveryResponse, UpdateRecoveryProfileBody } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { Pool } = createRequire(new URL("../../../../lib/db/package.json", import.meta.url))("pg");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the isolated sleep database tests.");
const schema = `sleep_test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
let pool;
const base = {
  date: "2026-10-20", symptoms: [], dietStatus: "done", dietNote: "Food",
  exerciseStatus: "not_done", exerciseNote: "Movement", meditationStatus: "not_planned",
  meditationMinutes: 0, meditationNote: "", note: "Pacing",
  dailyCheckIn: { overallFeeling: "okay", symptoms: [
    "headache", "fatigue", "fog", "sleep", "mood", "light",
  ].map(name => ({ name, status: "not_recorded", rating: null })), summary: "Check-in" },
};
const sleep = { bedtime: "23:30", wakeTime: "07:00", quality: "fair", wakings: 1, nap: "none", note: "Night note" };

before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  // Use the actual Drizzle-managed table definition, without touching user rows.
  await pool.query(`CREATE TABLE recovery_logs (LIKE public.recovery_logs INCLUDING ALL)`);
  await pool.query(`CREATE TABLE recovery_profiles (LIKE public.recovery_profiles INCLUDING ALL)`);
});
beforeEach(async () => { await pool.query("TRUNCATE recovery_logs, recovery_profiles"); });
after(async () => {
  if (pool) await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
});

async function save(input) {
  const { initial, patch } = recoveryLogWrite(SaveRecoveryLogBody.parse(input));
  const { rows: [row] } = await pool.query(
    `INSERT INTO recovery_logs(owner_id,date,data) VALUES($1,$2,$3)
     ON CONFLICT(owner_id,date) DO UPDATE SET data=recovery_logs.data || $4::jsonb,updated_at=now()
     RETURNING data`,
    ["isolated-sleep-patient", initial.date, initial, patch],
  );
  return row.data;
}
async function saved() {
  return (await pool.query("SELECT data FROM recovery_logs")).rows[0].data;
}

test("sleep atomically merges with latest check-in and activities despite a stale client", async () => {
  await save(base);
  await save({ ...base, section: "activities", dietNote: "Latest food", note: "Latest pacing" });
  await save({ ...base, section: "check_in", dailyCheckIn: { ...base.dailyCheckIn, summary: "Latest check-in" } });
  const result = await save({ ...base, section: "sleep", sleep });
  assert.deepEqual(result.sleep, sleep);
  assert.equal(result.dietNote, "Latest food");
  assert.equal(result.note, "Latest pacing");
  assert.equal(result.dailyCheckIn.summary, "Latest check-in");
});
test("concurrent section saves preserve all three sections in the database", async () => {
  await save(base);
  await Promise.all([
    save({ ...base, section: "sleep", sleep }),
    save({ ...base, section: "activities", dietNote: "Concurrent food" }),
    save({ ...base, section: "check_in", dailyCheckIn: { ...base.dailyCheckIn, summary: "Concurrent check-in" } }),
  ]);
  const result = await saved();
  assert.deepEqual(result.sleep, sleep);
  assert.equal(result.dietNote, "Concurrent food");
  assert.equal(result.dailyCheckIn.summary, "Concurrent check-in");
});
test("activity and check-in saves cannot overwrite sleep with a stale sleep value", async () => {
  await save({ ...base, section: "sleep", sleep });
  await save({ ...base, section: "activities", sleep: null });
  const result = await save({ ...base, section: "check_in", sleep: { quality: "poor" } });
  assert.deepEqual(result.sleep, sleep);
});
test("editing and removing only sleep preserves the rest of the day", async () => {
  await save({ ...base, sleep });
  const edited = await save({ ...base, section: "sleep", sleep: { quality: "great", note: "Updated" } });
  assert.deepEqual(edited.sleep, { quality: "great", note: "Updated" });
  const removed = await save({ ...base, section: "sleep", sleep: null });
  assert.equal(removed.sleep, null);
  assert.deepEqual(removed.dailyCheckIn, base.dailyCheckIn);
  assert.equal(removed.dietNote, "Food");
});
test("legacy clients omitting sleep preserve it; deleting a day removes it", async () => {
  await save({ ...base, sleep });
  assert.deepEqual((await save(base)).sleep, sleep);
  await pool.query("DELETE FROM recovery_logs WHERE owner_id=$1", ["isolated-sleep-patient"]);
  assert.equal((await pool.query("SELECT count(*)::integer AS count FROM recovery_logs")).rows[0].count, 0);
});
test("approximate sleep hours persist through the section-specific save and do not replace other sections", async () => {
  await save({ ...base, sleep: { hoursSlept: 8, quality: "good" } });
  await save({ ...base, section: "check_in", dailyCheckIn: { ...base.dailyCheckIn, summary: "Updated check-in" } });
  const row = await saved();
  assert.deepEqual(row.sleep, { hoursSlept: 8, quality: "good" });
  assert.equal(row.dailyCheckIn.summary, "Updated check-in");
  assert.equal(row.dietNote, "Food");
});
test("generated API validation allows skipped fields and approximate hours through 24", () => {
  for (const sleep of [{}, null, { bedtime: null, wakings: 0 }, { hoursSlept: 0 }, { hoursSlept: 24 }, { note: "x".repeat(280) }]) {
    assert.equal(SaveRecoveryLogBody.safeParse({ ...base, section: "sleep", sleep }).success, true);
  }
  for (const sleep of [{ hoursSlept: -1 }, { hoursSlept: 25 }, { hoursSlept: 7.5 }, { bedtime: "24:00" }, { wakeTime: "07:99" }, { quality: "excellent" }, { wakings: 4 }, { nap: "long" }, { note: "x".repeat(281) }]) {
    assert.equal(SaveRecoveryLogBody.safeParse({ ...base, section: "sleep", sleep }).success, false);
  }
  const result = GetRecoveryResponse.parse({ profile: null, logs: [{ ...base, sleep, updatedAt: "2026-10-20T08:00:00Z" }] });
  assert.deepEqual(result.logs[0].sleep, sleep);
});

test("new check-in symptoms and activity survive independent section saves and database reload", async () => {
  const dailyCheckIn = {
    ...base.dailyCheckIn, worseWithActivity: "not_sure",
    selectedSymptoms: ["headache", "vision"],
    symptoms: [...base.dailyCheckIn.symptoms, ...["dizziness", "nausea", "vision", "noise", "neck"].map(name => ({
      name, status: name === "vision" ? "recorded" : "not_recorded", rating: name === "vision" ? 2 : null,
    }))],
  };
  await save({ ...base, section: "sleep", sleep });
  await save({ ...base, section: "check_in", dailyCheckIn });
  await save({ ...base, section: "activities", dietNote: "Most recent food" });
  await save({ ...base, section: "sleep", sleep: { quality: "good" } });
  const reloaded = await saved();
  assert.deepEqual(reloaded.dailyCheckIn, dailyCheckIn);
  assert.equal(reloaded.dietNote, "Most recent food");
  assert.deepEqual(reloaded.sleep, { quality: "good" });
  await save({ ...base, section: "check_in", dailyCheckIn: { ...dailyCheckIn, worseWithActivity: null } });
  assert.equal((await saved()).dailyCheckIn.worseWithActivity, null);
  assert.equal((await saved()).dietNote, "Most recent food");
  assert.deepEqual((await saved()).sleep, { quality: "good" });
});
test("symptom preferences persist in the profile and routine-only updates preserve them", async () => {
  const preferences = UpdateRecoveryProfileBody.parse({
    supportMode: "self_guided", priorities: [], selectedSymptoms: ["fog", "noise", "neck"],
  });
  await pool.query("INSERT INTO recovery_profiles(owner_id,preferences,consent_version) VALUES($1,$2,$3)", ["isolated-selection-patient", preferences, "test"]);
  const routineEdit = UpdateRecoveryProfileBody.parse({ supportMode: "clinician_supported", priorities: ["movement"] });
  await pool.query("UPDATE recovery_profiles SET preferences=preferences || $1::jsonb WHERE owner_id=$2", [routineEdit, "isolated-selection-patient"]);
  const { rows: [row] } = await pool.query("SELECT preferences FROM recovery_profiles WHERE owner_id=$1", ["isolated-selection-patient"]);
  assert.deepEqual(row.preferences.selectedSymptoms, ["fog", "noise", "neck"]);
  assert.equal(row.preferences.supportMode, "clinician_supported");
  assert.equal(UpdateRecoveryProfileBody.safeParse({ ...preferences, selectedSymptoms: ["unknown"] }).success, false);
});
test("invalid activity responses and out-of-scale new ratings are rejected", () => {
  for (const worseWithActivity of ["maybe", true, 1]) {
    assert.equal(SaveRecoveryLogBody.safeParse({ ...base, dailyCheckIn: { ...base.dailyCheckIn, worseWithActivity } }).success, false);
  }
  assert.equal(SaveRecoveryLogBody.safeParse({ ...base, dailyCheckIn: {
    ...base.dailyCheckIn, symptoms: [...base.dailyCheckIn.symptoms, { name: "nausea", status: "recorded", rating: 4 }],
  } }).success, false);
});
