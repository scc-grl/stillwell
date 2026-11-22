import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import { freezeLink, patientWrite } from "./recovery-lock.ts";
import { doctorJournalEntry } from "./doctor-privacy.ts";
const built = buildSync({ entryPoints: [fileURLToPath(new URL("./web-mvp.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false });
const { WebMvpService } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const deletionBuilt = buildSync({ entryPoints: [fileURLToPath(new URL("./delete-patient-account.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false });
const { deletePatientAccount } = await import(`data:text/javascript;base64,${Buffer.from(deletionBuilt.outputFiles[0].text).toString("base64")}`);
const { Pool } = createRequire(new URL("../../../../lib/db/package.json", import.meta.url))("pg");
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = `mvp_test_${randomUUID().replaceAll("-", "")}`;
let pool, service, clock;
const scores = n => ({ headache: n, fog: n, light: n, sleep: n });
const entries = () => ({ scores: scores(3), planScore: 5, note: "Synthetic private words", timezone: "UTC" });
const tables = ["recovery_profiles", "recovery_logs", "recovery_stages", "recovery_intake_consents",
  "recovery_intake_attempts", "recovery_intake_baselines", "recovery_weekly_checks", "recovery_stage_emails",
  "recovery_account_deletions", "care_team_links", "care_team_snapshots", "care_team_invites",
  "care_team_email_sends", "patient_clinician_connections", "account_roles", "newsletter_subscriptions", "partnership_requests"];
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  for (const table of tables) await pool.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  await pool.query("ALTER TABLE care_team_snapshots ADD FOREIGN KEY(link_id) REFERENCES care_team_links(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE care_team_invites ADD FOREIGN KEY(accepted_link_id) REFERENCES care_team_links(id) ON DELETE SET NULL");
});
after(async () => { await pool?.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
beforeEach(async () => {
  await pool.query(`TRUNCATE ${tables.join(",")} CASCADE`);
  clock = new Date("2026-11-20T12:00:00Z");
  service = new WebMvpService(pool, () => clock);
});
async function stage(owner = "patient", value = "2", source = "intake", created = "2026-11-15T12:00:00Z") {
  return (await pool.query(`INSERT INTO recovery_stages(owner_id,stage,status,source,reasons,rule_ids,rules_version,synthetic_only,created_at)
    VALUES($1,$2,'confirmed',$3,'["Synthetic reason"]','["P1"]','test',false,$4) RETURNING *`, [owner, value, source, created])).rows[0];
}
async function link() {
  return (await pool.query(`INSERT INTO care_team_links(patient_id,clinician_id,patient_first_name,patient_last_name,patient_email,clinician_name,clinician_email)
    VALUES('patient','doctor','Synthetic','Person','patient@example.test','Synthetic Doctor','doctor@example.test') RETURNING id`)).rows[0].id;
}
test("saving MVP scores preserves other journal sections and exposes recorded values after reload", async () => {
  await service.save("patient", "2026-11-19", entries());
  await pool.query(`UPDATE recovery_logs SET data=data || '{"sleep":{"hoursSlept":7},"dietNote":"Private food"}'::jsonb`);
  await service.save("patient", "2026-11-19", { ...entries(), scores: scores(5) });
  const state = await service.patient("patient");
  assert.equal(state.entries[0].scores.headache, 5);
  const data = (await pool.query("SELECT data FROM recovery_logs")).rows[0].data;
  assert.equal(data.sleep.hoursSlept, 7); assert.equal(data.dietNote, "Private food");
  assert.equal(data.dailyCheckIn.symptoms.find(s => s.name === "headache").rating, 5);
});
test("jump three or danger dictation flags without blocking persistence; subsequent edits preserve warning", async () => {
  await service.save("patient", "2026-11-18", entries());
  assert.equal((await service.save("patient", "2026-11-19", { ...entries(), scores: scores(6) })).flagged, true);
  assert.equal((await service.save("patient", "2026-11-19", entries())).flagged, true);
  assert.equal((await service.save("patient", "2026-11-20", { ...entries(), note: "Synthetic: passed out" })).flagged, true);
});
test("doctors cannot read or override unlinked patients; only active links allow overrides", async () => {
  await assert.rejects(service.doctor("doctor", randomUUID()), e => e.status === 404);
  const id = await link();
  await assert.rejects(service.doctor("other-doctor", id), e => e.status === 404);
  await assert.rejects(service.override("other-doctor", id, "3", "No access"), e => e.status === 403);
  await service.save("patient", "2026-11-19", entries());
  await patientWrite(pool, "patient", tx => freezeLink(tx, id, clock));
  await assert.rejects(service.override("doctor", id, "3", "No longer active"), e => e.status === 403);
});
test("doctor active and frozen projections never expose any patient-written notes", async () => {
  await stage(); await service.save("patient", "2026-11-19", entries());
  const id = await link();
  const active = await service.doctor("doctor", id);
  assert.equal(JSON.stringify(active).includes("Synthetic private words"), false);
  assert.deepEqual(Object.keys(active.days[0]).sort(), ["date", "flagged", "jumpSymptoms", "planScore", "scores"]);
  const projected = doctorJournalEntry({ symptoms: [], dailyCheckIn: { symptoms: { headache: 3, note: "PRIVATE", fog: "PRIVATE" } } });
  assert.doesNotMatch(JSON.stringify(projected), /PRIVATE/);
  assert.deepEqual(projected.dailyCheckIn.symptoms, [
    { name: "headache", rating: 3, status: "recorded" }, { name: "fog", rating: null, status: "not_recorded" },
  ]);
  await patientWrite(pool, "patient", tx => freezeLink(tx, id, clock));
  await service.save("patient", "2026-11-20", { ...entries(), scores: scores(9) });
  const former = await service.doctor("doctor", id);
  assert.equal(former.status, "former"); assert.equal(former.days[0].date, "2026-11-19");
  assert.equal(former.days[0].scores.headache, 3);
  assert.equal(JSON.stringify(former).includes("Synthetic private words"), false);
  const legacy = doctorJournalEntry({ note: "secret", dietNote: "secret", sleep: { note: "secret" },
    dailyCheckIn: { summary: "secret", symptoms: [] }, mvp: { note: "secret" } });
  assert.equal(JSON.stringify(legacy).includes("secret"), false);
});
test("weekly is Monday-based, once per owner/week under concurrency, and uses intake baseline", async () => {
  await stage("patient", "2", "intake", "2026-11-16T00:00:00Z"); await pool.query("INSERT INTO recovery_intake_baselines VALUES('patient',$1)", [scores(3)]);
  for (const date of ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]) await service.save("patient", date, entries());
  clock = new Date("2026-11-23T09:00:00Z");
  await Promise.all([service.weekly("patient"), service.weekly("patient")]);
  const state = await service.patient("patient");
  assert.equal(state.stages[0].stage, "3"); assert.deepEqual(state.stages[0].ruleIds, ["W3"]);
  assert.equal((await pool.query("SELECT * FROM recovery_weekly_checks")).rowCount, 1);
  assert.equal((await pool.query("SELECT * FROM recovery_stages WHERE source='weekly'")).rowCount, 1);
});
test("doctor override writes a reason and queued email; following weekly check starts from override", async () => {
  const id = await link(); await stage();
  await assert.rejects(service.override("doctor", id, "3", " "), e => e.status === 400);
  const updated = await service.override("doctor", id, "4", "Synthetic doctor reason");
  assert.equal(updated.source, "clinician"); assert.deepEqual(updated.reasons, ["Synthetic doctor reason"]);
  assert.equal((await pool.query("SELECT * FROM recovery_stage_emails")).rowCount, 1);
  await pool.query("UPDATE recovery_stages SET created_at='2026-11-20T12:00:00Z' WHERE id=$1", [updated.id]);
  clock = new Date("2026-11-23T12:00:00Z");
  await service.weekly("patient");
  const state = await service.patient("patient");
  assert.equal(state.stages[0].stage, "4"); assert.deepEqual(state.stages[0].ruleIds, ["W1"]);
});
test("full deletion removes former snapshots and doctor-written stage notes, but not doctor's account", async () => {
  await stage(); await service.save("patient", "2026-11-19", entries());
  const id = await link(); await service.override("doctor", id, "3", "Doctor note to erase");
  await patientWrite(pool, "patient", tx => freezeLink(tx, id, clock));
  await pool.query(`INSERT INTO account_roles(user_id,account_type,registration_intent_id) VALUES
    ('patient','patient',$1),('doctor','clinician',$2)`, [randomUUID(), randomUUID()]);
  let deleted;
  await deletePatientAccount(pool, "patient", ["patient@example.test"], async id => { deleted = id; });
  assert.equal(deleted, "patient");
  for (const table of ["recovery_logs", "recovery_profiles", "recovery_stages", "care_team_snapshots", "care_team_links", "recovery_stage_emails"]) {
    assert.equal((await pool.query(`SELECT * FROM ${table}`)).rowCount, 0, table);
  }
  assert.equal((await pool.query("SELECT * FROM recovery_account_deletions WHERE owner_id='patient'")).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM account_roles WHERE user_id='doctor'")).rowCount, 1);
});
test("Clerk failure is retryable and blocks new records; provider is called only after database deletion", async () => {
  await stage(); await service.save("patient", "2026-11-19", entries());
  await assert.rejects(deletePatientAccount(pool, "patient", [], async () => {
    assert.equal((await pool.query("SELECT * FROM recovery_stages")).rowCount, 0);
    throw new Error("Simulated provider failure");
  }));
  assert.equal((await pool.query("SELECT * FROM recovery_account_deletions")).rowCount, 1);
  await assert.rejects(service.save("patient", "2026-11-20", entries()), e => e.status === 409);
  await deletePatientAccount(pool, "patient", [], async () => {});
  const { rows: tombstones } = await pool.query("SELECT owner_id FROM recovery_account_deletions");
  assert.equal(tombstones.length, 1);
  assert.match(tombstones[0].owner_id, /^deleted:[a-f0-9]{64}$/);
  assert.notEqual(tombstones[0].owner_id, "patient");
  await assert.rejects(service.save("patient", "2026-11-20", entries()), e => e.status === 409);
  await deletePatientAccount(pool, "patient", [], async () => assert.fail("Already completed; do not call provider again"));
});
test("unattributable legacy copies stop erasure without guessing; newer accounts are not their owners", async () => {
  await service.save("patient", "2026-11-19", entries());
  await pool.query(`INSERT INTO care_team_links(patient_id,clinician_id,patient_first_name,patient_last_name,patient_email,clinician_name,clinician_email,status,connected_at,disconnected_at)
    VALUES(NULL,'doctor','Old','Fictional','','Synthetic Doctor','doctor@example.test','former','2026-10-01','2026-10-03')`);
  let providerCalls = 0;
  await assert.rejects(deletePatientAccount(pool, "patient", [], async () => { providerCalls++; }, Date.parse("2026-09-01")),
    e => /No data was removed/.test(e.message));
  assert.equal(providerCalls, 0);
  assert.equal((await pool.query("SELECT * FROM recovery_logs")).rowCount, 1);
  await deletePatientAccount(pool, "patient", [], async () => { providerCalls++; }, Date.parse("2026-11-01"));
  assert.equal(providerCalls, 1);
  assert.equal((await pool.query("SELECT * FROM care_team_links WHERE clinician_id='doctor'")).rowCount, 1);
});
test("failed database deletion rolls back all changes and never calls Clerk", async () => {
  await service.save("patient", "2026-11-19", entries());
  const failPool = {
    async connect() {
      const c = await pool.connect();
      return { release: () => c.release(), query: (sql, values) => {
        if (sql.startsWith("DELETE FROM recovery_profiles")) throw new Error("Synthetic database failure");
        return c.query(sql, values);
      } };
    },
  };
  let called = false;
  await assert.rejects(deletePatientAccount(failPool, "patient", [], async () => { called = true; }));
  assert.equal(called, false);
  assert.equal((await pool.query("SELECT * FROM recovery_logs")).rowCount, 1);
  assert.equal((await pool.query("SELECT * FROM recovery_account_deletions")).rowCount, 0);
});
test("Jev sees only opted-in weekly notes after consent was stored and cannot alter the numeric decision", async () => {
  await stage("patient", "2", "intake", "2026-11-16T00:00:00Z");
  await pool.query("INSERT INTO recovery_intake_baselines VALUES('patient',$1)", [scores(3)]);
  for (const date of ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]) {
    await service.save("patient", date, { ...entries(), note: date, explainNotes: date === "2026-11-19" });
  }
  clock = new Date("2026-11-23T12:00:00Z");
  const calls = [];
  const withExplanation = new WebMvpService(pool, () => clock, async notes => {
    calls.push(notes);
    const { rows } = await pool.query("SELECT data->'mvp'->'explanationConsent' AS consent FROM recovery_logs WHERE date='2026-11-19'");
    assert.ok(rows[0].consent.version);
    return "Synthetic optional context.";
  });
  const result = await withExplanation.weekly("patient");
  assert.equal(result.stage, "3");
  assert.deepEqual(result.ruleIds, ["W3"]);
  assert.deepEqual(calls, [["2026-11-19"]]);
  assert.equal(result.reasons[1], "Synthetic optional context.");
});
