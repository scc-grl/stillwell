import assert from "node:assert/strict";
import test from "node:test";
import { syntheticIntakeAllowed, syntheticIntakeInput, provisionalStageFor } from "./patient-intake-policy.ts";
import { runIntake, buildQuestions, STAGES } from "../../../../lib/intake-ai/src/index.ts";
import { fakeClient, calm } from "../../../../lib/intake-ai/test/fake-client.ts";
const consentId = "00000000-0000-4000-8000-000000000001";
test("synthetic preview fails closed outside development/test", () => {
  assert.equal(syntheticIntakeAllowed("development"), true);
  assert.equal(syntheticIntakeAllowed("test"), true);
  assert.equal(syntheticIntakeAllowed("production"), false);
  assert.equal(syntheticIntakeAllowed(undefined), false);
});
test("real patient stories and unknown samples are rejected before the AI", () => {
  for (const body of [
    { consentId, sampleId: "maya", note: "private patient story" },
    { consentId, sampleId: "patient-supplied-story" },
    { sampleId: "maya" }, { consentId, sampleId: "maya", inputMode: "voice" },
  ]) assert.throws(() => syntheticIntakeInput(body));
});
test("only canonical synthetic stories and reconstructed numeric/enum answers leave the server", () => {
  const input = syntheticIntakeInput({ consentId, sampleId: "maya", answered: {
    symptom_headache: { score: 8, arbitraryText: "private", probabilities: { private: 1 } },
    mentioned_headache: { noul: 1 }, injury_cause: { choice: "sport" },
  } });
  assert.ok(input.sample.story.includes("soccer"));
  assert.equal(JSON.stringify(input.answered).includes("private"), false);
  assert.equal(input.answered.symptom_headache.score, 8);
  assert.throws(() => syntheticIntakeInput({ consentId, sampleId: "maya", answered: { symptom_headache: { score: 11 } } }));
  assert.throws(() => syntheticIntakeInput({ consentId, sampleId: "maya", answered: { note: { text: "private" } } }));
});
test("only start_journal stores a provisional stage with rule IDs, version and reasons", async () => {
  const result = await runIntake("fabricated", { client: fakeClient(calm) });
  const row = provisionalStageFor(result.decision);
  assert.equal(row.status, "provisional"); assert.equal(row.syntheticOnly, true);
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
