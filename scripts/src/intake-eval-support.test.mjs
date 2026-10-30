import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExpected, scoreIntake } from "./intake-eval-support.ts";
test("dataset label aliases map without treating missing expected symptoms as zero", () => {
  const e = normalizeExpected({ expected_outcome: "see_doctor_first", starting_stage: 2, red_flag: false, self_harm: false, symptom_ratings: { headache: { level: 2 }, sleep: "not_recorded" } });
  assert.deepEqual(e, { outcome: "find_doctor", stage: 2, danger: false, selfHarm: false, symptoms: { headache: 2, sleep: null } });
  assert.equal(Object.hasOwn(e.symptoms, "fatigue"), false);
});
test("unknown labels are unscored, never counted as a successful label match", () => {
  const scores = scoreIntake({ outcome: "start_journal", stage: 1, crisisLineShown: false, readSource: "typesafe", symptoms: {} }, normalizeExpected({}));
  assert.equal(scores.find(s=>s.name === "outcome_match").score, null);
  assert.equal(scores.find(s=>s.name === "stage_match").score, null);
});
test("symptom exact and within-one scoring requires a recorded value, never infers unmentioned zero", () => {
  const scores = scoreIntake({ outcome: "start_journal", stage: 2, crisisLineShown: false, readSource: "typesafe", symptoms: { headache: 1, sleep: null, mood: null } },
    normalizeExpected({ outcome: "start_journal", stage: 2, symptoms: { headache: 2, sleep: null, mood: 0 } }));
  const get = name=>scores.find(s=>s.name===name).score;
  assert.equal(get("symptom_headache_exact"), 0);
  assert.equal(get("symptom_headache_within_one"), 1);
  assert.equal(get("symptom_sleep_exact"), 1);
  assert.equal(get("symptom_mood_within_one"), 0);
});
test("danger and self-harm recalls and stage-not-above remain independent", () => {
  const scores = scoreIntake({ outcome: "go_to_er", stage: null, crisisLineShown: true, readSource: "keywords_only", symptoms: {} }, normalizeExpected({ outcome: "go_to_er", stage: null, danger: true, selfHarm: true }));
  assert.equal(scores.find(s=>s.name==="danger_recall").score, 1);
  assert.equal(scores.find(s=>s.name==="self_harm_recall").score, 1);
  assert.equal(scores.find(s=>s.name==="typesafe_answered").score, 0);
});
