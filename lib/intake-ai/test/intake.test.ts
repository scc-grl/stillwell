import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestions, decide, readIntake, runIntake, scanKeywords, THRESHOLDS } from "../src/index.ts";
import { calm, failingClient, fakeClient } from "./fake-client.ts";

const rules = (d: { reasons: { rule: string }[] }) => d.reasons.map((r) => r.rule);

test("asks every question in one TypeSafe call, with a 3 second timeout and no retries", async () => {
  const client = fakeClient(calm);
  await readIntake("I hit my head at practice two weeks ago.", { client });
  assert.equal(client.calls.length, 1);
  const { request, options } = client.calls[0];
  assert.deepEqual(request.state, { intake_note: "I hit my head at practice two weeks ago." });
  assert.equal(Object.keys(request.questions).length, 25);
  assert.equal(Object.keys(buildQuestions()).filter((k) => k.startsWith("danger_")).length, 10);
  assert.deepEqual(options, { timeout: 3000, retry: { maxRetries: 0 } });
});

test("Maya: three Noticeable symptoms, walks fine, spin class not -> find a doctor + journal, Stage 2", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({
    ...calm,
    symptom_headache: { choice: "noticeable", confidence: 0.9 },
    symptom_fog: { choice: "noticeable", confidence: 0.88 },
    symptom_fatigue: { choice: "noticeable", confidence: 0.85 },
    activity_light_exercise: 0.5,
    activity_harder_solo_exercise: 0.08,
  }) });
  assert.equal(decision.outcome, "find_doctor");
  assert.deepEqual(rules(decision), ["D3"]);
  assert.equal(decision.startJournal, true);
  assert.equal(decision.stage?.stage, 2);
  assert.equal(decision.stage?.amsterdamStep, 2);
});

test("a danger sign scored exactly 0.2 sends to the ER; 0.19 does not", async () => {
  const er = await runIntake("note", { client: fakeClient({ ...calm, danger_vomiting: THRESHOLDS.danger }) });
  assert.equal(er.decision.outcome, "go_to_er");
  assert.equal(er.decision.stage, null);
  const ok = await runIntake("note", { client: fakeClient({ ...calm, danger_vomiting: 0.19 }) });
  assert.equal(ok.decision.outcome, "start_journal");
});

test("self-harm at 0.2 shows crisis support; with a danger sign too, ER wins and 988 still shows", async () => {
  const crisis = await runIntake("note", { client: fakeClient({ ...calm, self_harm: 0.2 }) });
  assert.equal(crisis.decision.outcome, "crisis_support");
  const both = await runIntake("note", { client: fakeClient({ ...calm, self_harm: 0.6, danger_seizure: 0.9 }) });
  assert.equal(both.decision.outcome, "go_to_er");
  assert.equal(both.decision.crisisLineShown, true);
  assert.deepEqual(rules(both.decision), ["E1", "C1"]);
});

test("the keyword scan alone is enough, even when every AI score is low", async () => {
  const { decision } = await runIntake("I threw up twice this morning", { client: fakeClient(calm) });
  assert.equal(decision.outcome, "go_to_er");
  assert.match(decision.reasons[0].text, /vomiting/);
  assert.deepEqual(scanKeywords("I feel hopeless").selfHarm, ["self-harm"]);
  assert.deepEqual(scanKeywords("I have thrown up three times").danger, ["vomiting"]);
});

test("TypeSafe failing falls back to the keyword scan and tap questions, without leaking the error text", async () => {
  const read = await readIntake("my head hurts", { client: failingClient });
  assert.equal(read.source, "keywords_only");
  assert.equal(read.error, "APITimeoutError");
  assert.equal(decide(read).outcome, "use_tap_questions");
  const urgent = await readIntake("I passed out again", { client: failingClient });
  assert.equal(decide(urgent).outcome, "go_to_er");
  const none = await readIntake("my head hurts", { client: null });
  assert.equal(none.error, "NotConfigured");
});

test("under 48 hours: find a doctor and start the journal, capped at Stage 1", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, injury_timing: { choice: "under_48_hours", confidence: 0.95 }, activity_harder_solo_exercise: 0.9 }) });
  assert.equal(decision.outcome, "find_doctor");
  assert.deepEqual(rules(decision), ["T1"]);
  assert.equal(decision.startJournal, true);
  assert.equal(decision.stage?.stage, 1);
});

test("getting worse: find a doctor, no protocol stage", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, getting_worse: 0.85 }) });
  assert.equal(decision.outcome, "find_doctor");
  assert.deepEqual(rules(decision), ["D2"]);
  assert.equal(decision.stage, null);
  assert.match(decision.stageNote ?? "", /getting worse/);
});

test("getting worse at 0.5 is unsure: no D2, but Stillwell asks", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, getting_worse: 0.5 }) });
  assert.ok(!rules(decision).includes("D2"));
  assert.ok(decision.followUps.some((f) => /getting worse/.test(f)));
});

test("not mentioning a doctor still recommends one, and asks", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, seen_doctor: { choice: "not_mentioned", confidence: 0.9 } }) });
  assert.deepEqual(rules(decision), ["D1"]);
  assert.ok(decision.followUps.includes("Have you seen a doctor since the injury?"));
  const notSeen = await runIntake("note", { client: fakeClient({ ...calm, seen_doctor: { choice: "not_seen", confidence: 0.9 } }) });
  assert.deepEqual(rules(notSeen.decision), ["D1"]);
});

test("over 4 weeks adds D4; unclear timing asks instead", async () => {
  const late = await runIntake("note", { client: fakeClient({ ...calm, injury_timing: { choice: "over_four_weeks", confidence: 0.9 } }) });
  assert.deepEqual(rules(late.decision), ["D4"]);
  const unclear = await runIntake("note", { client: fakeClient({ ...calm, injury_timing: { choice: "over_four_weeks", confidence: 0.6 } }) });
  assert.equal(unclear.decision.outcome, "start_journal");
  assert.ok(unclear.decision.followUps.includes("About how long ago did the injury happen?"));
});

test("every doctor reason that applies is listed", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({
    ...calm,
    seen_doctor: { choice: "not_seen", confidence: 0.9 },
    injury_timing: { choice: "over_four_weeks", confidence: 0.9 },
    symptom_headache: { choice: "noticeable" }, symptom_sleep: { choice: "noticeable" }, symptom_mood: { choice: "more_noticeable" },
  }) });
  assert.deepEqual(rules(decision), ["D1", "D3", "D4"]);
});

test("any More noticeable symptom places at Stage 1 (P1)", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, symptom_light: { choice: "more_noticeable" }, activity_harder_solo_exercise: 0.95 }) });
  assert.equal(decision.stage?.stage, 1);
  assert.equal(decision.stage?.reasons[0].rule, "P1");
});

test("harder solo exercise places at Stage 3, never higher", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, activity_light_exercise: 0.9, activity_harder_solo_exercise: 0.95 }) });
  assert.equal(decision.stage?.stage, 3);
});

test("unsure about the higher activity goes one stage lower (P3)", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, activity_walking: 0.1, activity_harder_solo_exercise: 0.5 }) });
  assert.equal(decision.stage?.stage, 2);
  assert.ok(decision.stage?.reasons.some((r) => r.rule === "P3"));
  const none = await runIntake("note", { client: fakeClient({ ...calm, activity_daily_tasks: 0.02, activity_walking: 0.02 }) });
  assert.equal(none.decision.stage?.stage, 1);
  assert.equal(none.decision.stage?.reasons[0].rule, "P0");
});

test("unmentioned symptoms stay unrecorded; low-confidence levels are flagged to confirm", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, symptom_headache: { choice: "less_noticeable", confidence: 0.6 } }) });
  const headache = decision.symptoms.find((x) => x.name === "headache")!;
  assert.equal(headache.levelLabel, "Less noticeable");
  assert.equal(headache.needsConfirm, true);
  assert.equal(decision.symptoms.find((x) => x.name === "sleep")!.levelLabel, "Not recorded");
});

test("a calm note with a doctor already seen starts the journal (S1)", async () => {
  const { decision } = await runIntake("note", { client: fakeClient(calm) });
  assert.equal(decision.outcome, "start_journal");
  assert.deepEqual(rules(decision), ["S1"]);
  assert.equal(decision.stage?.stage, 2);
});

test("an earlier concussion is surfaced as a resource, not a rule", async () => {
  const { decision } = await runIntake("note", { client: fakeClient({ ...calm, prior_concussion: 0.9 }) });
  assert.equal(decision.outcome, "start_journal");
  assert.equal(decision.resources.length, 1);
});
