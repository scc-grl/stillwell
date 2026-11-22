import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { realTextIntakeAllowed, patientIntakeInput, stripContactDetails, provisionalStageFor } from "./patient-intake-policy.ts";
import { runIntake, buildQuestions, STAGES } from "../../../../lib/intake-ai/src/index.ts";
import { fakeClient, calm } from "../../../../lib/intake-ai/test/fake-client.ts";
const consentId = "00000000-0000-4000-8000-000000000001";
test("real text follows the exact true setting in production, development and test", () => {
  for (const env of ["development", "test", "production"]) {
    assert.equal(realTextIntakeAllowed(env, "true"), true);
    for (const value of [undefined, "", "false", "TRUE", "True", "1", " true ", "0"]) {
      assert.equal(realTextIntakeAllowed(env, value), false);
    }
  }
  assert.equal(realTextIntakeAllowed(undefined, "true"), false);
  assert.equal(realTextIntakeAllowed("unknown", "true"), false);
});
test("intake routes retain private caching without a preview-only production denial", () => {
  const routes = readFileSync(new URL("../routes/patient-intake.ts", import.meta.url), "utf8");
  assert.match(routes, /res\.setHeader\("Cache-Control", "private, no-store"\)/);
  assert.doesNotMatch(routes, /patientIntakePreviewAllowed|available in preview only/);
  assert.match(routes, /realTextIntakeAllowed\(process\.env\.NODE_ENV, process\.env\.REAL_ACCOUNT_INTAKE_ENABLED\)/);
});
test("account fields, old samples, blank/oversized stories and missing consent are rejected", () => {
  for (const body of [
    { consentId, sampleId: "maya" }, { consentId, story: "   " },
    { consentId, story: "x".repeat(4001) }, { story: "Fictional story" },
    ...["name", "email", "phone", "ownerId", "accountId", "userId", "dateOfBirth"].map(key => ({ consentId, story: "Fictional", [key]: "excluded" })),
  ]) assert.throws(() => patientIntakeInput(body));
});
test("only sanitized story and reconstructed numeric/enum answers leave the boundary", () => {
  const input = patientIntakeInput({ consentId, story: "Fictional story. Contact fake@example.test or +1 (415) 555-0123.", answered: {
    symptom_headache: { score: 8, arbitraryText: "private", probabilities: { private: 1 } },
    mentioned_headache: { noul: 1 }, injury_cause: { choice: "sport" },
  } });
  assert.equal(input.story, "Fictional story. Contact [email removed] or [phone removed].");
  assert.equal(JSON.stringify(input.answered).includes("private"), false);
  assert.equal(input.answered.symptom_headache.score, 8);
  assert.throws(() => patientIntakeInput({ consentId, story: "Fictional", answered: { symptom_headache: { score: 11 } } }));
  assert.throws(() => patientIntakeInput({ consentId, story: "Fictional", answered: { note: { text: "private" } } }));
});
test("basic contact filter handles common typed/dictated formats but preserves injury dates and ratings", () => {
  for (const contact of ["fake@example.test", "fake+intake@sub.example.test", "4155550123", "+44 20 7946 0958", "415-555-0123 ext 42", "555-0123"]) {
    const filtered = stripContactDetails(`Synthetic contact: ${contact}; fatigue today.`);
    assert.ok(filtered.includes("removed]"), contact);
    assert.equal(filtered.includes(contact), false);
    assert.equal(stripContactDetails(filtered), filtered);
  }
  const narrative = "Hit my head on 2026-10-29, slept 7 hours, headache 5/10. Still tired after 3 days.";
  assert.equal(stripContactDetails(narrative), narrative);
  assert.equal(stripContactDetails("My name is Fictional Person."), "My name is Fictional Person."); // Not full de-identification.
});
test("only start_journal stores a provisional stage with rule IDs, version and reasons", async () => {
  const result = await runIntake("fabricated", { client: fakeClient(calm) });
  const row = provisionalStageFor(result.decision);
  assert.equal(row.status, "provisional"); assert.equal(row.syntheticOnly, false);
  assert.equal(row.stage, "2"); assert.ok(row.ruleIds.includes("P1"));
  assert.equal(row.rulesVersion, result.decision.rulesVersion);
  assert.ok(row.reasons.length);
  for (const outcome of ["go_to_er", "crisis_support", "find_doctor", "use_tap_questions"]) {
    assert.equal(provisionalStageFor({ ...result.decision, outcome }), null);
  }
  assert.deepEqual(Object.values(STAGES), ["Rest and settle", "Everyday activity", "Light exercise", "Building back", "Full days", "Back to life"]);
});
test("all 11 new questions accept scores 0 through 10, never manufacture an unmentioned zero", async () => {
  const q = buildQuestions();
  assert.equal(q.symptom_headache.criteria.length, 10);
  for (const n of [0, 3, 6, 9, 10]) {
    const result = await runIntake("fabricated", { client: fakeClient({ ...calm, mentioned_headache: 1, symptom_headache: n }) });
    assert.equal(result.decision.symptoms[0].level, n);
    assert.equal(result.decision.symptoms.find(item => item.name === "vision").level, null);
  }
});
