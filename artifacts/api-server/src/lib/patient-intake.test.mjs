import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { runIntake } from "../../../../lib/intake-ai/src/index.ts";
import { fakeClient, calm } from "../../../../lib/intake-ai/test/fake-client.ts";
import { migrateJournalRatings } from "../../../../lib/db/scripts/migrate-journal-ratings.mjs";
const built = buildSync({ entryPoints: [fileURLToPath(new URL("./patient-intake.ts", import.meta.url))], bundle: true, platform: "node", format: "esm", write: false });
const { PatientIntakeService } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const { Pool } = createRequire(new URL("../../../../lib/db/package.json", import.meta.url))("pg");
const schema = `intake_test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
let pool, service, calls, decision;
const story = "Fictional soccer match story; fake@example.test or +1 415-555-0123.";
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  for (const table of ["recovery_intake_consents", "recovery_intake_attempts", "recovery_stages"]) {
    await pool.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  }
  await pool.query("CREATE TABLE recovery_logs(owner_id text, date date, data jsonb, updated_at timestamptz DEFAULT now())");
  await pool.query("CREATE TABLE care_team_snapshots(data jsonb)");
  decision = (await runIntake("fictional", { client: fakeClient(calm) })).decision;
});
beforeEach(async () => {
  await pool.query("TRUNCATE recovery_stages,recovery_intake_consents,recovery_intake_attempts CASCADE");
  calls = [];
  service = new PatientIntakeService(pool, async (note, answered) => {
    calls.push({ note, answered });
    return { decision, source: "typesafe" };
  }, () => true);
});
after(async () => {
  await pool?.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
test("no consent, another owner's consent, or expired consent never calls the AI", async () => {
  const id = randomUUID();
  await assert.rejects(service.execute("patient-a", { consentId: id, story }), error => error.status === 403);
  const consent = await service.consent("patient-a");
  await assert.rejects(service.execute("patient-b", { consentId: consent.id, story }), error => error.status === 403);
  await pool.query("UPDATE recovery_intake_consents SET consented_at=now()-interval '2 days' WHERE id=$1", [consent.id]);
  await assert.rejects(service.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  assert.equal(calls.length, 0);
});
test("consent records version/time before reading; stage history is owner-scoped and retries are idempotent", async () => {
  const consent = await service.consent("patient-a");
  assert.ok(consent.version); assert.ok(consent.consentedAt);
  const result = await service.execute("patient-a", { consentId: consent.id, story });
  assert.equal(result.stage.status, "provisional");
  assert.equal(result.stage.syntheticOnly, false);
  assert.equal(result.stage.stage, "2");
  assert.ok(result.stage.ruleIds.includes("P1"));
  await service.execute("patient-a", { consentId: consent.id, story });
  assert.equal((await service.history("patient-a")).length, 1);
  assert.deepEqual(await service.history("patient-b"), []);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { note: "Fictional soccer match story; [email removed] or [phone removed].", answered: {} });
  assert.equal(JSON.stringify(result).includes("fake@example.test"), false);
  const { rows: [savedConsent] } = await pool.query("SELECT * FROM recovery_intake_consents WHERE id=$1", [consent.id]);
  assert.equal(savedConsent.synthetic_only, false);
});
test("no stage is written for ER, crisis, doctor-first or tap-confirmation", async () => {
  for (const outcome of ["go_to_er", "crisis_support", "find_doctor", "use_tap_questions"]) {
    const s = new PatientIntakeService(pool, async () => ({ decision: { ...decision, outcome, stage: null }, source: "typesafe" }), () => true);
    const consent = await s.consent("patient-a");
    const result = await s.execute("patient-a", { consentId: consent.id, story });
    assert.equal(result.stage, null);
  }
  assert.deepEqual(await service.history("patient-a"), []);
});
test("ten attempts per owner per hour, including retries; other owners have their own limit", async () => {
  const consent = await service.consent("patient-a");
  for (let i = 0; i < 10; i++) await service.execute("patient-a", { consentId: consent.id, story });
  await assert.rejects(service.execute("patient-a", { consentId: consent.id, story }), error => error.status === 429);
  assert.equal(calls.length, 10);
  const other = await service.consent("patient-b");
  await service.execute("patient-b", { consentId: other.id, story });
});
test("delete-all while the AI is reading cannot recreate stage history", async () => {
  const consent = await service.consent("patient-a");
  const s = new PatientIntakeService(pool, async () => {
    await pool.query("DELETE FROM recovery_stages WHERE owner_id=$1", ["patient-a"]);
    await pool.query("DELETE FROM recovery_intake_consents WHERE owner_id=$1", ["patient-a"]);
    return { decision, source: "typesafe" };
  }, () => true);
  await assert.rejects(s.execute("patient-a", { consentId: consent.id, story }), error => error.status === 409);
  assert.deepEqual(await service.history("patient-a"), []);
});
test("old synthetic consent cannot authorize real text; no model call is made", async () => {
  const consent = await service.consent("patient-a");
  await pool.query("UPDATE recovery_intake_consents SET synthetic_only=true WHERE id=$1", [consent.id]);
  await assert.rejects(service.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  assert.equal(calls.length, 0);
});
test("feature switch off blocks new consent and existing sessions before AI and keeps history readable", async () => {
  const consent = await service.consent("patient-a");
  const disabled = new PatientIntakeService(pool, async () => { throw new Error("must not run"); }, () => false);
  await assert.rejects(disabled.consent("patient-a"), error => error.status === 403);
  await assert.rejects(disabled.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  assert.deepEqual(await disabled.history("patient-a"), []);
});
test("turning the switch off during reading prevents saving the in-flight result", async () => {
  let enabled = true;
  const s = new PatientIntakeService(pool, async () => { enabled = false; return { decision, source: "typesafe" }; }, () => enabled);
  const consent = await s.consent("patient-a");
  await assert.rejects(s.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  assert.deepEqual(await s.history("patient-a"), []);
});
test("production default service follows its setting, requires consent and retains history while off", async (t) => {
  const originalEnv = process.env.NODE_ENV;
  const originalSetting = process.env.REAL_ACCOUNT_INTAKE_ENABLED;
  t.after(() => {
    if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv;
    if (originalSetting === undefined) delete process.env.REAL_ACCOUNT_INTAKE_ENABLED; else process.env.REAL_ACCOUNT_INTAKE_ENABLED = originalSetting;
  });
  process.env.NODE_ENV = "production";
  process.env.REAL_ACCOUNT_INTAKE_ENABLED = "true";
  let reads = 0;
  const production = new PatientIntakeService(pool, async (note, answered) => {
    reads++;
    assert.equal(note.includes("fake@example.test"), false);
    assert.equal(note.includes("415-555-0123"), false);
    assert.deepEqual(answered, {});
    return { decision, source: "typesafe" };
  });
  await assert.rejects(production.execute("patient-a", { consentId: randomUUID(), story }), error => error.status === 403);
  assert.equal(reads, 0);
  const consent = await production.consent("patient-a");
  const result = await production.execute("patient-a", { consentId: consent.id, story });
  assert.equal(result.stage.status, "provisional");
  assert.equal(result.stage.syntheticOnly, false);
  for (const setting of ["false", "", "TRUE"]) {
    process.env.REAL_ACCOUNT_INTAKE_ENABLED = setting;
    await assert.rejects(production.consent("patient-a"), error => error.status === 403);
    await assert.rejects(production.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  }
  delete process.env.REAL_ACCOUNT_INTAKE_ENABLED;
  await assert.rejects(production.execute("patient-a", { consentId: consent.id, story }), error => error.status === 403);
  assert.equal(reads, 1);
  assert.equal((await production.history("patient-a")).length, 1);
  process.env.REAL_ACCOUNT_INTAKE_ENABLED = "true";
  await production.execute("patient-a", { consentId: consent.id, story });
  assert.equal(reads, 2);
});
test("database rating migration is idempotent, preserves skipped values, routines, sleep and frozen copies", async () => {
  const data = { dailyCheckIn: { symptoms: [0, 1, 2, 3, null].map((rating, i) => ({
    name: ["headache", "fatigue", "fog", "sleep", "mood"][i],
    status: rating === null ? "not_recorded" : "recorded", rating,
  })) }, sleep: { hoursSlept: 7.5 }, dietNote: "Synthetic meal", note: "Synthetic pacing" };
  await pool.query("INSERT INTO recovery_logs(owner_id,date,data) VALUES('fixture','2026-10-20',$1)", [data]);
  await pool.query("INSERT INTO care_team_snapshots(data) VALUES($1)", [data]);
  assert.equal((await migrateJournalRatings(pool)).rowCount, 1);
  assert.equal((await migrateJournalRatings(pool)).rowCount, 0);
  const { rows: [row] } = await pool.query("SELECT data FROM recovery_logs WHERE owner_id='fixture'");
  assert.deepEqual(row.data.dailyCheckIn.symptoms.map(item => item.rating), [0, 3, 6, 9, null]);
  assert.equal(row.data.dailyCheckIn.ratingScale, "ten_point_v1");
  assert.deepEqual(row.data.sleep, data.sleep);
  assert.equal(row.data.dietNote, data.dietNote);
  assert.equal(row.data.note, data.note);
  assert.deepEqual((await pool.query("SELECT data FROM care_team_snapshots")).rows[0].data, data);
});
