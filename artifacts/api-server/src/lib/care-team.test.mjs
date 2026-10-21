import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { requestLogPath } from "./request-log-path.ts";

// Bundle our TS modules in memory so Node's test runner need not resolve
// extensionless TypeScript imports. No build artifacts or secrets are written.
async function load(name) {
  const result = buildSync({ entryPoints: [fileURLToPath(new URL(name, import.meta.url))], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}
const { CareTeamService, PATIENT_INVITE, CLINICIAN_REQUEST, hashCareToken, inviteInput } = await load("./care-team.ts");
const { sendCareEmail, renderCareEmail, careDeliveryResponse } = await load("./care-team-email.ts");
const { patientWrite } = await load("./recovery-lock.ts");
const { Pool } = createRequire(new URL("../../../../lib/db/package.json", import.meta.url))("pg");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the isolated care-team database tests.");
const schema = `care_team_test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
let pool, service, clock, users, deliveries, failSending, suppressionLogs;
const baseUrl = "https://stillwell.example";
const id = (role, n) => ({
  id: `${role}-${n}`, role, firstName: role === "patient" ? `Person${n}` : `Clinician${n}`, lastName: "Example",
  emails: [{ address: `${role}${n}@example.com`, verified: true }],
});
const patient = id("patient", 1), clinician = id("clinician", 1), other = id("clinician", 2);
const tokenOf = result => result.link.split("/").at(-1);
const fields = user => ({ firstName: user.firstName, lastName: user.lastName, email: user.emails[0].address });
const rejects = (promise, code) => assert.rejects(promise, e => e.code === code);
const advance = minutes => { clock = new Date(clock.getTime() + minutes * 60000); };

before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  for (const table of ["recovery_profiles", "recovery_logs", "care_team_links", "care_team_invites", "care_team_snapshots", "care_team_email_sends"])
    await pool.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  await pool.query(`ALTER TABLE ${schema}.recovery_logs ADD FOREIGN KEY(owner_id) REFERENCES ${schema}.recovery_profiles(owner_id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE ${schema}.care_team_snapshots ADD FOREIGN KEY(link_id) REFERENCES ${schema}.care_team_links(id) ON DELETE CASCADE`);
});
after(async () => {
  await pool?.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
beforeEach(async () => {
  await pool.query("TRUNCATE care_team_invites,care_team_links,care_team_snapshots,care_team_email_sends,recovery_logs,recovery_profiles CASCADE");
  clock = new Date("2026-10-21T00:00:00Z");
  users = new Map([patient, clinician, other].map(u => [u.id, structuredClone(u)]));
  deliveries = []; suppressionLogs = []; failSending = false;
  service = new CareTeamService({
    pool, now: () => new Date(clock),
    identity: async key => users.get(key),
    send: async mail => {
      if (failSending) throw new Error("provider failed");
      deliveries.push(mail);
      return sendCareEmail(mail, { logSuppressed: () => suppressionLogs.push("invite email suppressed") });
    },
  });
  await setupJournal();
});
async function setupJournal() {
  await pool.query("INSERT INTO recovery_profiles(owner_id,preferences,consent_version) VALUES($1,$2,'test') ON CONFLICT DO NOTHING",
    [patient.id, { supportMode: "with_clinician", priorities: ["sleep"], focusAreas: ["Headache"] }]);
}
async function invite(c = clinician) {
  users.set(c.id, c);
  return service.sendInvite(patient, PATIENT_INVITE, fields(c), baseUrl, undefined, true);
}
async function connect(c = clinician) {
  const sent = await invite(c);
  return service.accept(c, tokenOf(sent), PATIENT_INVITE);
}
async function log(date = "2026-10-20", note = "Original note") {
  const data = { date, symptoms: ["headache","fatigue","fog","sleep","mood","light","dizziness"].map((name, i) => ({name, severity: i})),
    dietStatus: "done", exerciseStatus: "skipped", meditationStatus: "done", meditationMinutes: 12,
    dietNote: "Food note", exerciseNote: "Movement note", meditationNote: "Pause note", note,
    dailyCheckIn: { overall: "okay", summary: "A private summary", symptoms: {headache: 2, light: null} } };
  await pool.query("INSERT INTO recovery_logs(owner_id,date,data) VALUES($1,$2,$3) ON CONFLICT(owner_id,date) DO UPDATE SET data=$3,updated_at=now()", [patient.id, date, data]);
  return data;
}

test("validation uses the requested plain messages and normalized email", () => {
  assert.throws(() => inviteInput({}), /Enter their first name/);
  assert.throws(() => inviteInput({firstName:"A"}), /Enter their last name/);
  assert.throws(() => inviteInput({firstName:"A",lastName:"B",email:"bad"}), /Enter an email like/);
  assert.equal(inviteInput({firstName:" A ",lastName:" B ",email:" C@EXAMPLE.COM "}).email, "c@example.com");
});
test("role restrictions, own email and consent are enforced", async () => {
  await rejects(service.listTeam(clinician), "clinician_account");
  await rejects(service.listPatients(patient), "patient_account");
  await rejects(service.sendInvite(patient, PATIENT_INVITE, fields(patient), baseUrl, undefined, true), "own_email");
  await rejects(service.sendInvite(patient, PATIENT_INVITE, fields(clinician), baseUrl), "consent_required");
  await rejects(service.sendInvite(patient, CLINICIAN_REQUEST, fields(clinician), baseUrl), "patient_account");
});
test("tokens are hashed, expire in 14 days and can only be accepted once", async () => {
  const sent = await invite();
  const token = tokenOf(sent);
  const { rows: [row] } = await pool.query("SELECT * FROM care_team_invites");
  assert.equal(row.token_hash, hashCareToken(token));
  assert.ok(!JSON.stringify(row).includes(token));
  assert.equal(row.expires_at - row.sent_at, 14 * 86400000);
  assert.ok(row.consent_version && row.consented_at);
  const accepted = await service.accept(clinician, token, PATIENT_INVITE);
  assert.ok(accepted.linkId);
  await rejects(service.accept(clinician, token, PATIENT_INVITE), "already_accepted");
});
test("acceptance requires a clinician and a matching verified email, including secondary/case-insensitive addresses", async () => {
  const token = tokenOf(await invite());
  await rejects(service.accept(patient, token, PATIENT_INVITE), "patient_account");
  await rejects(service.accept(other, token, PATIENT_INVITE), "different_email");
  await rejects(service.accept({...clinician,emails:[{address:clinician.emails[0].address,verified:false}]}, token, PATIENT_INVITE), "unverified_email");
  const secondary = {...clinician,emails:[{address:"primary@example.com",verified:true},{address:clinician.emails[0].address.toUpperCase(),verified:true}]};
  assert.equal((await service.accept(secondary, token, PATIENT_INVITE)).state, "accepted");
});
test("cancelled, withdrawn, expired, and invalid tokens have distinct states", async () => {
  const sent = await invite();
  await service.cancel(patient, sent.invite.id, PATIENT_INVITE);
  await rejects(service.accept(clinician, tokenOf(sent), PATIENT_INVITE), "cancelled");
  const request = await service.sendInvite(clinician, CLINICIAN_REQUEST, fields(patient), baseUrl);
  await service.cancel(clinician, request.invite.id, CLINICIAN_REQUEST);
  await rejects(service.viewRequest(patient, tokenOf(request)), "withdrawn");
  const expiring = await invite();
  advance(14 * 24 * 60);
  await rejects(service.accept(clinician, tokenOf(expiring), PATIENT_INVITE), "expired");
  assert.equal((await service.listTeam(patient)).expiredInvites.length, 1);
  await rejects(service.accept(clinician, "invalid", PATIENT_INVITE), "invalid_token");
});
test("resend rotates the token, restarts expiry and applies both 10-minute cooldowns", async () => {
  for (const [actor, direction, recipient] of [[patient,PATIENT_INVITE,clinician],[clinician,CLINICIAN_REQUEST,patient]]) {
    const sent = await service.sendInvite(actor, direction, fields(recipient), baseUrl, undefined, true);
    await rejects(service.sendInvite(actor, direction, {}, baseUrl, sent.invite.id), "resend_cooldown");
    advance(9);
    await assert.rejects(service.sendInvite(actor, direction, {}, baseUrl, sent.invite.id), /Resend available in 1 minutes/);
    advance(1);
    const resent = await service.sendInvite(actor, direction, {}, baseUrl, sent.invite.id);
    assert.notEqual(tokenOf(sent), tokenOf(resent));
    assert.equal(new Date(resent.invite.expiresAt) - clock, 14 * 86400000);
    await rejects(service.accept(recipient, tokenOf(sent), direction, true), "invalid_token");
    await service.cancel(actor, sent.invite.id, direction);
  }
});
test("five slots includes pending and active, while acceptance replaces its pending slot", async () => {
  const invitations = [];
  for (let n = 1; n <= 5; n++) invitations.push(await invite(id("clinician", n)));
  await rejects(invite(id("clinician", 6)), "care_team_full");
  await service.accept(clinician, tokenOf(invitations[0]), PATIENT_INVITE);
  assert.equal((await service.listTeam(patient)).activeClinicians.length, 1);
  await rejects(invite(clinician), "already_connected");
  await rejects(invite(other), "already_invited");
  await service.cancel(patient, invitations[4].invite.id, PATIENT_INVITE);
  await invite(id("clinician", 6));
});
test("expired pending invitations do not consume slots and can be resent subject to capacity", async () => {
  const first = await invite();
  advance(14 * 24 * 60);
  await service.sendInvite(patient, PATIENT_INVITE, {}, baseUrl, first.invite.id);
  assert.equal((await service.listTeam(patient)).pendingInvites.length, 1);
});
test("patient daily limit includes resends and cancelled emails; next UTC day resets it", async () => {
  const sent = await invite();
  for (let n = 1; n < 10; n++) {
    advance(10);
    await service.sendInvite(patient, PATIENT_INVITE, {}, baseUrl, sent.invite.id);
  }
  advance(10);
  await rejects(service.sendInvite(patient, PATIENT_INVITE, {}, baseUrl, sent.invite.id), "daily_limit");
  await service.cancel(patient, sent.invite.id, PATIENT_INVITE);
  await rejects(invite(), "daily_limit");
  advance(24*60);
  await invite();
});
test("clinician daily limit includes all 20 requests even after cancellation", async () => {
  for (let n = 1; n <= 20; n++) {
    const sent = await service.sendInvite(clinician, CLINICIAN_REQUEST, fields(id("patient", n)), baseUrl);
    await service.cancel(clinician, sent.invite.id, CLINICIAN_REQUEST);
  }
  await rejects(service.sendInvite(clinician, CLINICIAN_REQUEST, fields(patient), baseUrl), "daily_limit");
});
test("clinician request validation, duplicate, email/role checks and explicit patient consent", async () => {
  const sent = await service.sendInvite(clinician, CLINICIAN_REQUEST, fields(patient), baseUrl);
  await rejects(service.sendInvite(clinician, CLINICIAN_REQUEST, fields(patient), baseUrl), "already_invited");
  await rejects(service.viewRequest(clinician, tokenOf(sent)), "clinician_account");
  await rejects(service.viewRequest(id("patient", 2), tokenOf(sent)), "different_email");
  await rejects(service.viewRequest({...patient,emails:[{address:patient.emails[0].address,verified:false}]},tokenOf(sent)), "unverified_email");
  assert.equal((await service.viewRequest(patient,tokenOf(sent))).state, "pending");
  const before = await pool.query("SELECT * FROM care_team_invites");
  assert.equal((await service.accept(patient, tokenOf(sent), CLINICIAN_REQUEST, false, true)).state, "not_now");
  assert.deepEqual((await pool.query("SELECT * FROM care_team_invites")).rows, before.rows);
  assert.equal(deliveries.length, 1);
  await rejects(service.accept(patient, tokenOf(sent), CLINICIAN_REQUEST), "consent_required");
  await service.accept(patient, tokenOf(sent), CLINICIAN_REQUEST, true);
  await rejects(service.viewRequest(patient, tokenOf(sent)), "already_sharing");
  await rejects(service.sendInvite(clinician, CLINICIAN_REQUEST, fields(patient), baseUrl), "already_connected");
  const {rows:[row]}=await pool.query("SELECT * FROM care_team_invites");
  assert.ok(row.consented_at && row.consent_version);
});
test("patient request full state and concurrent acceptance cannot exceed five", async () => {
  for (let n = 3; n <= 6; n++) await invite(id("clinician", n));
  const a = await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  const b = await service.sendInvite(other,CLINICIAN_REQUEST,fields(patient),baseUrl);
  const results = await Promise.allSettled([
    service.accept(patient,tokenOf(a),CLINICIAN_REQUEST,true),
    service.accept(patient,tokenOf(b),CLINICIAN_REQUEST,true),
  ]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  const remaining = results[0].status==="rejected" ? a : b;
  await rejects(service.viewRequest(patient,tokenOf(remaining)), "care_team_full");
  // Not now still does not mutate a request when the team is full.
  assert.equal((await service.accept(patient,tokenOf(remaining),CLINICIAN_REQUEST,false,true)).state,"not_now");
});
test("unlinked clinicians and patients cannot read journal history; all history is paginated in twenties", async () => {
  for(let day=1;day<=25;day++) await log(`2026-09-${String(day).padStart(2,"0")}`);
  await rejects(service.readPatient(clinician,randomUUID()),"not_found");
  const {linkId}=await connect();
  await rejects(service.readPatient(other,linkId),"not_found");
  await rejects(service.readPatient(patient,linkId),"patient_account");
  const first=await service.readPatient(clinician,linkId);
  assert.equal(first.entries.length,20);assert.equal(first.total,25);assert.equal(first.hasMore,true);
  assert.equal(first.entries[0].symptoms.length,7);
  assert.equal(first.entries[0].meditationMinutes,12);
  assert.equal((await service.readPatient(clinician,linkId,2)).entries.length,5);
  await rejects(service.readPatient(clinician,linkId,0),"invalid_page");
  await service.removeClinician(patient,linkId);
  assert.deepEqual((await service.readPatient(clinician,linkId)).entries,first.entries);
  assert.equal((await service.readPatient(clinician,linkId,2)).entries.length,5);
});
test("a former snapshot is unchanged by patient edits, day deletion and delete-all; reconnect creates a separate link", async () => {
  await log();
  const first=await connect();
  await rejects(service.removeClinician(id("patient",2),first.linkId),"not_found");
  await service.removeClinician(patient,first.linkId);
  const frozen=await service.readPatient(clinician,first.linkId);
  assert.equal(frozen.status,"former");
  await patientWrite(pool,patient.id,async tx=>{
    await tx.query("UPDATE recovery_profiles SET preferences=$2 WHERE owner_id=$1",[patient.id,{focusAreas:["Changed"]}]);
    await tx.query("UPDATE recovery_logs SET data=$2 WHERE owner_id=$1",[patient.id,{date:"2026-10-20",note:"Changed"}]);
  });
  assert.deepEqual(await service.readPatient(clinician,first.linkId),frozen);
  await pool.query("DELETE FROM recovery_logs WHERE owner_id=$1",[patient.id]);
  assert.deepEqual(await service.readPatient(clinician,first.linkId),frozen);
  const second=await connect();
  assert.notEqual(second.linkId,first.linkId);
  await log("2026-10-21","New connection history");
  await service.deleteRecovery(patient);
  assert.deepEqual(await service.readPatient(clinician,first.linkId),frozen);
  const secondFrozen=await service.readPatient(clinician,second.linkId);
  assert.equal(secondFrozen.status,"former");assert.equal(secondFrozen.entries[0].note,"New connection history");
  assert.equal((await pool.query("SELECT * FROM recovery_logs")).rows.length,0);
  assert.equal((await pool.query("SELECT * FROM recovery_profiles")).rows.length,0);
  assert.equal((await service.listTeam(patient)).activeClinicians.length,0);
  assert.equal((await service.listPatients(clinician)).former.length,2);
  await rejects(service.removeFormer(other,first.linkId),"not_found");
  await service.removeFormer(clinician,first.linkId);
  await rejects(service.readPatient(clinician,first.linkId),"not_found");
  assert.equal((await pool.query("SELECT * FROM care_team_snapshots")).rows.length,1);
});
test("delete-all snapshots every active clinician and deletes patient-side invitations without resetting email counts", async()=>{
  await log();const a=await connect();const b=await connect(other);
  const third=id("clinician",3);await invite(third);
  await service.sendInvite(third,CLINICIAN_REQUEST,fields(patient),baseUrl);
  await rejects(service.removeFormer(clinician,a.linkId),"not_found");
  await service.deleteRecovery(patient);
  assert.equal((await service.readPatient(clinician,a.linkId)).status,"former");
  assert.equal((await service.readPatient(other,b.linkId)).status,"former");
  assert.equal((await pool.query("SELECT * FROM care_team_invites WHERE status='pending'")).rows.length,0);
  assert.equal(Number((await pool.query("SELECT count(*) AS n FROM care_team_email_sends WHERE inviter_id=$1",[patient.id])).rows[0].n),3);
});
test("failed sending rolls back a new invite and preserves the old token on failed resend",async()=>{
  failSending=true;
  await rejects(invite(),"email_failed");
  assert.equal((await pool.query("SELECT * FROM care_team_invites")).rows.length,0);
  assert.equal((await pool.query("SELECT * FROM care_team_email_sends")).rows.length,0);
  failSending=false;const sent=await invite();advance(10);failSending=true;
  await rejects(service.sendInvite(patient,PATIENT_INVITE,{},baseUrl,sent.invite.id),"email_failed");
  await service.accept(clinician,tokenOf(sent),PATIENT_INVITE);
});
test("suppression sends nothing, logs only the exact phrase and exposes links only in development",async()=>{
  const sent=await invite();assert.deepEqual(suppressionLogs,["invite email suppressed"]);
  let called=false;
  await sendCareEmail(deliveries[0],{fetcher:async()=>{called=true;throw new Error()},logSuppressed:()=>{}});
  assert.equal(called,false);
  assert.equal(careDeliveryResponse(sent,"development").developmentLink,sent.link);
  for(const env of ["production","test",undefined]) assert.equal("developmentLink" in careDeliveryResponse(sent,env),false);
  assert.equal("developmentLink" in careDeliveryResponse({...sent,suppressed:false},"development"),false);
});
test("Resend payload has HTML/plain text, optional reply-to, and failure/configuration errors are sanitized",async()=>{
  await invite();let payload;
  await sendCareEmail(deliveries[0],{apiKey:"test-only",from:"sender@example.com",replyTo:"reply@example.com",logSuppressed:()=>assert.fail(),
    fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true}}});
  assert.ok(payload.html&&payload.text);assert.equal(payload.reply_to,"reply@example.com");
  await assert.rejects(sendCareEmail(deliveries[0],{apiKey:"test-only",logSuppressed:()=>{}}),/configuration/);
  await assert.rejects(sendCareEmail(deliveries[0],{apiKey:"test-only",from:"sender@example.com",logSuppressed:()=>{},fetcher:async()=>({ok:false})}),/Email delivery failed/);
});
test("email templates use required copy, escape user values, and omit journal content and patient last names",async()=>{
  await invite();const a=renderCareEmail(deliveries[0]);
  assert.equal(a.subject,`${patient.firstName} invited you to view their Stillwell journal`);
  assert.match(a.text,/Read-only: you can't change anything/);assert.match(a.text,/Nothing is shared unless you accept/);
  assert.ok(!a.text.includes(patient.lastName));assert.ok(!a.text.includes("Original note"));
  const b=renderCareEmail({...deliveries[0],direction:CLINICIAN_REQUEST,clinicianName:"<Dr. Example>"});
  assert.match(b.html,/&lt;Dr\. Example&gt;/);assert.match(b.text,/You decide\. Nothing is shared unless you agree/);
  assert.match(b.text,/It's not for emergencies/);
});
test("token routes, link identifiers and query strings are redacted from request logs",()=>{
  const secret="private-token";
  for(const path of [`/invite/${secret}`,`/request/${secret}`,`/api/invite/${secret}`,`/api/request/${secret}`,
    `/api/patient/care-team/requests/${secret}/respond`,`/api/clinician/care-team/invites/${secret}/accept`,
    `/api/clinician/care-team/requests/${secret}/resend`,`/api/patient/care-team/links/${secret}`,
    `/api/clinician/care-team/patients/${secret}?email=private@example.com`]) {
    const value=requestLogPath(path);assert.ok(!value.includes(secret));assert.ok(!value.includes("private@example.com"));
  }
});

test("parallel patient invites and repeated acceptance cannot race past limits or reuse a token",async()=>{
  for(let n=3;n<=6;n++) await invite(id("clinician",n));
  const attempts=await Promise.allSettled([invite(clinician),invite(other)]);
  assert.equal(attempts.filter(r=>r.status==="fulfilled").length,1);
  assert.equal((await service.listTeam(patient)).pendingInvites.length,5);
  const chosen=attempts[0].status==="fulfilled" ? clinician : other;
  const sent=attempts.find(r=>r.status==="fulfilled").value;
  const accepts=await Promise.allSettled([
    service.accept(chosen,tokenOf(sent),PATIENT_INVITE),
    service.accept(chosen,tokenOf(sent),PATIENT_INVITE),
  ]);
  assert.equal(accepts.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(accepts.find(r=>r.status==="rejected").reason.code,"already_accepted");
});
test("cancel and resend are scoped to their inviter, even if another account knows the ID",async()=>{
  const sent=await invite();advance(10);
  const stranger=id("patient",2);
  await rejects(service.cancel(stranger,sent.invite.id,PATIENT_INVITE),"not_found");
  await rejects(service.sendInvite(stranger,PATIENT_INVITE,{},baseUrl,sent.invite.id),"not_found");
  const request=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  await rejects(service.cancel(other,request.invite.id,CLINICIAN_REQUEST),"not_found");
  await rejects(service.sendInvite(other,CLINICIAN_REQUEST,{},baseUrl,request.invite.id),"not_found");
});

test("cancellation takes effect immediately and Undo restores the same token without another email",async()=>{
  const sent=await invite();
  await service.cancel(patient,sent.invite.id,PATIENT_INVITE);
  await rejects(service.accept(clinician,tokenOf(sent),PATIENT_INVITE),"cancelled");
  await rejects(service.undoCancel(other,sent.invite.id),"clinician_account");
  await rejects(service.undoCancel(id("patient",2),sent.invite.id),"not_found");
  advance(5/60);
  const restored=await service.undoCancel(patient,sent.invite.id);
  assert.equal(restored.id,sent.invite.id);assert.equal(restored.status,"pending");
  assert.equal(deliveries.length,1);
  assert.equal((await service.listTeam(patient)).inviteEmailQuota.used,1);
  await service.accept(clinician,tokenOf(sent),PATIENT_INVITE);
});
test("Undo rechecks capacity, duplicates, expiry and the short server window",async()=>{
  const sent=await invite();await service.cancel(patient,sent.invite.id,PATIENT_INVITE);
  for(let n=2;n<=6;n++) await invite(id("clinician",n));
  await rejects(service.undoCancel(patient,sent.invite.id),"care_team_full");
  const team=await service.listTeam(patient);
  await service.cancel(patient,team.pendingInvites[0].id,PATIENT_INVITE);
  const replacement=await invite();
  await rejects(service.undoCancel(patient,sent.invite.id),"already_invited");
  await service.cancel(patient,replacement.invite.id,PATIENT_INVITE);
  advance(11/60);
  await rejects(service.undoCancel(patient,sent.invite.id),"undo_expired");
});
test("expired invitations can be removed by their owner and send counters remain accurate",async()=>{
  const sent=await invite();advance(14*24*60);
  await rejects(service.cancel(id("patient",2),sent.invite.id,PATIENT_INVITE),"not_found");
  await service.cancel(patient,sent.invite.id,PATIENT_INVITE);
  assert.equal((await service.listTeam(patient)).expiredInvites.length,0);
  await rejects(service.undoCancel(patient,sent.invite.id),"not_found");
  assert.equal((await pool.query("SELECT * FROM care_team_email_sends")).rows.length,1);
});
test("Undo cannot restore an invitation whose original expiry has passed",async()=>{
  const sent=await invite();
  advance(14*24*60-1/60);
  await service.cancel(patient,sent.invite.id,PATIENT_INVITE);
  advance(2/60);
  await rejects(service.undoCancel(patient,sent.invite.id),"expired");
});
test("care-team list exposes quota and reset time from the server, including cancelled sends",async()=>{
  const sent=await invite();await service.cancel(patient,sent.invite.id,PATIENT_INVITE);
  const state=await service.listTeam(patient);
  assert.deepEqual(state.inviteEmailQuota,{used:1,limit:10,resetsAt:"2026-10-22T00:00:00.000Z"});
  assert.equal(state.serverTime,clock.toISOString());
  advance(24*60);
  assert.equal((await service.listTeam(patient)).inviteEmailQuota.used,0);
});

test("public request preview exposes only masked recipient metadata and never shares",async()=>{
  const sent=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  const preview=await service.previewRequest(tokenOf(sent));
  assert.deepEqual(Object.keys(preview).sort(),["state","clinicianName","maskedEmail","requestedAt","expiresAt"].sort());
  assert.equal(preview.state,"pending");
  const email=patient.emails[0].address.toLowerCase();
  assert.equal(preview.maskedEmail,`${email[0]}•••@${email.split("@")[1]}`);
  assert.ok(!JSON.stringify(preview).includes(email));
  assert.equal((await pool.query("SELECT count(*) FROM care_team_links")).rows[0].count,"0");
  assert.equal((await pool.query("SELECT consented_at FROM care_team_invites WHERE id=$1",[sent.invite.id])).rows[0].consented_at,null);
  await rejects(service.previewRequest("bad"),"invalid_token");
  const wrongDirection=await invite(other);
  await rejects(service.previewRequest(tokenOf(wrongDirection)),"invalid_token");
});
test("public preview distinguishes expired, withdrawn and consumed request links",async()=>{
  const sent=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  await service.cancel(clinician,sent.invite.id,CLINICIAN_REQUEST);
  assert.equal((await service.previewRequest(tokenOf(sent))).state,"withdrawn");
  const expiring=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  advance(14*24*60);
  assert.equal((await service.previewRequest(tokenOf(expiring))).state,"expired");
  const accepted=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  await service.accept(patient,tokenOf(accepted),CLINICIAN_REQUEST,true);
  assert.equal((await service.previewRequest(tokenOf(accepted))).state,"accepted");
});
test("review contact details and expired-invite prefill are available only to the verified recipient",async()=>{
  const sent=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  const details=await service.viewRequest(patient,tokenOf(sent));
  assert.equal(details.clinicianEmail,clinician.emails[0].address.toLowerCase());
  assert.equal(details.clinicianFirstName,clinician.firstName);
  assert.equal(details.clinicianLastName,clinician.lastName);
  const stranger=id("patient",2);
  await assert.rejects(service.viewRequest(stranger,tokenOf(sent)),error=>error.code==="different_email"&&!error.request);
  const unverified={...patient,emails:[{address:patient.emails[0].address,verified:false}]};
  await assert.rejects(service.viewRequest(unverified,tokenOf(sent)),error=>error.code==="unverified_email"&&!error.request);
  await assert.rejects(service.viewRequest(clinician,tokenOf(sent)),error=>error.code==="clinician_account"&&!error.request);
  advance(14*24*60);
  await assert.rejects(service.viewRequest(patient,tokenOf(sent)),error=>error.code==="expired"&&error.request?.clinicianEmail===details.clinicianEmail);
  await assert.rejects(service.viewRequest(stranger,tokenOf(sent)),error=>error.code==="different_email"&&!error.request);
});
test("request review alone and Not now never share; only explicit Share connects, and removal is not already-sharing",async()=>{
  const sent=await service.sendInvite(clinician,CLINICIAN_REQUEST,fields(patient),baseUrl);
  await service.viewRequest(patient,tokenOf(sent));
  await service.accept(patient,tokenOf(sent),CLINICIAN_REQUEST,false,true);
  assert.equal((await service.listTeam(patient)).activeClinicians.length,0);
  assert.equal((await service.listTeam(patient)).pendingInvites.length,0);
  await rejects(service.accept(patient,tokenOf(sent),CLINICIAN_REQUEST),"consent_required");
  const linked=await service.accept(patient,tokenOf(sent),CLINICIAN_REQUEST,true);
  await assert.rejects(service.viewRequest(patient,tokenOf(sent)),error=>error.code==="already_sharing"&&Boolean(error.request));
  await service.removeClinician(patient,linked.linkId);
  await rejects(service.viewRequest(patient,tokenOf(sent)),"already_accepted");
});
test("public request preview paths redact tokens and query strings",()=>{
  const secret="sensitive-token";
  assert.equal(requestLogPath(`/api/care-team/requests/${secret}/preview?email=private`),"/api/care-team/requests/:redacted/preview");
});
