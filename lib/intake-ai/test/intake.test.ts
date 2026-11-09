import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestions, DANGER_SIGNS, INTAKE_SYMPTOMS, RULES_VERSION, QUESTIONS_VERSION, runIntake, intakeLogicTrace, redFlagOutcomeScore, STAGE_GATES, normalizeAnswer } from "../src/index.ts";
import { calm, failingClient, fakeClient, type Overrides } from "./fake-client.ts";
const run = (o: Overrides = {}) => runIntake("synthetic note", { client: fakeClient({ ...calm, ...o }) });
test("provider rubric limit is respected; model positions normalize once and tap scores stay exact", () => {
  const q = buildQuestions().symptom_headache;
  assert.equal(q.criteria.length, 10);
  const provider = normalizeAnswer(q, { score: 9, confidence: 1 }, true);
  assert.equal(provider.score, 10);
  assert.equal(provider.providerPosition, 9);
  const moderate = normalizeAnswer(q, { score: 4.5, confidence: 1 }, true);
  assert.equal(moderate.score, 5);
  const tap = normalizeAnswer(q, { score: 9, confidence: 1 });
  assert.equal(tap.score, 9);
  assert.equal(tap.providerPosition, undefined);
});
test("versioned 12 separate flags, 11 mention + Score pairs, unordered cause and unchanged activity prompts", () => {
  const q = buildQuestions();
  assert.equal(QUESTIONS_VERSION, "intake-questions-2026-11-09.2");
  assert.equal(RULES_VERSION, "intake-rules-2026-11-09.1");
  assert.equal(Object.keys(DANGER_SIGNS).length, 12);
  assert.equal(INTAKE_SYMPTOMS.length, 11);
  assert.equal(Object.keys(q).length, 44);
  for (const s of INTAKE_SYMPTOMS) {
    assert.equal(q[`mentioned_${s.name}`].type, "noul");
    assert.equal(q[`symptom_${s.name}`].type, "score");
  }
  assert.equal(q.seen_doctor.type, "noul");
  assert.equal(q.injury_cause.type, "choice");
});
test("form answered questions are not sent; all other questions use one bounded call", async () => {
  const client = fakeClient(calm);
  const { read } = await runIntake("synthetic", { client, answered: { seen_doctor: { noul: 1 } } });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].request.questions.seen_doctor, undefined);
  assert.deepEqual(client.calls[0].options, { timeout: 10000, retry: { maxRetries: 0 } });
  assert.equal(read.scores?.seenDoctor.probability, 1);
});
for (const flag of Object.keys(DANGER_SIGNS)) {
  test(`emergency threshold inclusive for ${flag}`, async () => {
    assert.equal((await run({ [`danger_${flag}`]: 0.2 })).decision.outcome, "go_to_er");
    assert.notEqual((await run({ [`danger_${flag}`]: 0.199 })).decision.outcome, "go_to_er");
    assert.equal((await run({ [`danger_${flag}`]: { noul: 0.01, confidence: 0.49 } })).decision.outcome, "go_to_er");
  });
}
test("ticked flag and keyword retain precedence when TypeSafe fails", async () => {
  assert.equal((await runIntake("note", { client: failingClient, tickedRedFlags: ["slurred_speech"] })).decision.outcome, "go_to_er");
  assert.equal((await runIntake("I passed out", { client: null })).decision.outcome, "go_to_er");
  assert.equal((await runIntake("I feel hopeless", { client: null })).decision.outcome, "crisis_support");
});
test("ER precedes crisis; crisis precedes low-confidence confirmation", async () => {
  const both = await run({ danger_seizure: 0.2, self_harm: 0.2 });
  assert.equal(both.decision.outcome, "go_to_er"); assert.equal(both.decision.crisisLineShown, true);
  assert.equal((await run({ self_harm: { noul: 0.01, confidence: 0.49 } })).decision.outcome, "crisis_support");
  assert.equal((await run({ self_harm: 0.2 })).decision.outcome, "crisis_support");
});
test("unavailable or mentioned symptom confidence below .6 needs taps before worsening rule", async () => {
  assert.equal((await runIntake("note", { client: failingClient })).decision.outcome, "use_tap_questions");
  const d = (await run({ mentioned_headache: 0.9, symptom_headache: { score: 2, confidence: 0.59 }, getting_worse: 0.9 })).decision;
  assert.equal(d.outcome, "use_tap_questions"); assert.ok(d.ruleIds.includes("R0"));
  assert.notEqual((await run({ mentioned_headache: 0.9, symptom_headache: { score: 2, confidence: 0.6 } })).decision.outcome, "use_tap_questions");
});
test("unmentioned symptoms never become zero or affect the composite", async () => {
  const d = (await run({ symptom_headache: { score: 3, confidence: 0.1 } })).decision;
  assert.equal(d.symptoms[0].level, null); assert.equal(d.symptoms[0].levelLabel, "Not recorded");
  assert.equal(d.composite.total, 0); assert.equal(d.outcome, "start_journal");
  const absent = (await run({ mentioned_headache: 1, symptom_headache: 0 })).decision;
  assert.equal(absent.symptoms[0].level, 0);
});
test("worsening at .7 gives no stage, below .7 does not; D2/D3 are prompts, not no-stage outcomes", async () => {
  const d = (await run({ getting_worse: 0.7 })).decision;
  assert.equal(d.outcome, "find_doctor"); assert.equal(d.stage, null); assert.deepEqual(d.ruleIds, ["D1"]);
  assert.equal((await run({ getting_worse: 0.699 })).decision.outcome, "start_journal");
  const p = (await run({ seen_doctor: 0.1, injury_timing: { choice: "over_four_weeks" } })).decision;
  assert.deepEqual(p.clinicianPrompts.map(r => r.rule), ["D2","D3"]); assert.equal(p.stage?.stage, 2);
});
test("P1 requires daily tasks and walking or light exercise; unsure never counts yes", async () => {
  assert.equal((await run()).decision.stage?.stage, 2);
  assert.equal((await run({ activity_harder_solo_exercise: 0.7 })).decision.stage?.stage, 3);
  assert.equal((await run({ activity_daily_tasks: 0.69, activity_harder_solo_exercise: 0.9 })).decision.stage?.stage, 1);
  assert.equal((await run({ activity_walking: 0.5, activity_light_exercise: 0.3, activity_harder_solo_exercise: 0.9 })).decision.stage?.stage, 1);
});
test("P2 exact max 7.5 or total 27 caps to one on the ten-point scale", async () => {
  const max = (await run({ mentioned_headache: 1, symptom_headache: 7.5, activity_harder_solo_exercise: 1 })).decision;
  assert.equal(max.stage?.stage, 1); assert.ok(max.ruleIds.includes("P2")); assert.equal(max.composite.max, 7.5);
  const o: Overrides = {};
  for (const s of INTAKE_SYMPTOMS.slice(0,6)) { o[`mentioned_${s.name}`] = 1; o[`symptom_${s.name}`] = 4.5; }
  const total = (await run(o)).decision;
  assert.equal(total.composite.total, 27); assert.equal(total.stage?.stage, 1);
});
test("P3 exact max 4.5 or four counted symptoms caps to two", async () => {
  const a = (await run({ activity_harder_solo_exercise: 1, mentioned_headache: 1, symptom_headache: 4.5 })).decision;
  assert.equal(a.stage?.stage, 2); assert.ok(a.ruleIds.includes("P3"));
  const o: Overrides = { activity_harder_solo_exercise: 1 };
  for (const s of INTAKE_SYMPTOMS.slice(0,4)) { o[`mentioned_${s.name}`] = 1; o[`symptom_${s.name}`] = 3; }
  assert.equal((await run(o)).decision.stage?.stage, 2);
});
test("P4 under 48 hours, exact timing and D3 >28days; missing timing stays unknown", async () => {
  const make = (hours: number) => runIntake("note", { client: fakeClient({ ...calm, activity_harder_solo_exercise: 1 }), hoursSinceInjury: hours });
  assert.equal((await make(47.99)).decision.stage?.stage, 1);
  assert.equal((await make(48)).decision.stage?.stage, 3);
  assert.ok(!(await make(672)).decision.ruleIds.includes("D3"));
  assert.ok((await make(672.1)).decision.ruleIds.includes("D3"));
  const unknown = (await run({ injury_timing: { choice: "not_mentioned" } })).decision;
  assert.equal(unknown.composite.hoursSinceInjury, null);
});
test("next stage gates and safety scorer; trace includes questions/answers but never story", async () => {
  const { read, decision } = await run({ activity_harder_solo_exercise: 1 });
  assert.equal(decision.nextStage?.stage, 4);
  assert.equal(decision.nextStage?.gate, "Opens when symptoms are gone even with exercise");
  assert.equal(STAGE_GATES[5], "Opens with a clinician's okay");
  const trace = intakeLogicTrace(read, decision);
  assert.equal(trace.questions.length, 44); assert.equal(trace.modelVersion, "jev-fake");
  assert.ok(!JSON.stringify(trace).includes("synthetic note"));
  assert.equal(redFlagOutcomeScore({ redFlagFired: true, outcome: "start_journal" }), 0);
  assert.equal(redFlagOutcomeScore({ redFlagFired: true, outcome: "go_to_er" }), 1);
});
