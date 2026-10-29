import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runIntake } from "../../../../lib/intake-ai/src/index.ts";
import { calm, fakeClient } from "../../../../lib/intake-ai/test/fake-client.ts";
import { demoIntakeTrace } from "./demo-intake-trace.ts";

test("demo tracing keeps numeric scores and outcome without story or free-form fields", async () => {
  const privateText = "PRIVATE_SYNTHETIC_STORY_MARKER";
  const { read, decision } = await runIntake(privateText, { client: fakeClient(calm) });
  read.error = privateText;
  read.model = privateText;
  read.keywords.danger = [privateText];
  decision.headline = privateText;
  decision.reasons = [{ rule: "S1", text: privateText }];
  decision.followUps = [privateText];
  decision.resources = [privateText];
  decision.symptoms[0].label = privateText;

  const trace = demoIntakeTrace(read, decision, "typed");
  assert.equal(JSON.stringify(trace).includes(privateText), false);
  assert.deepEqual(trace.input, { inputMode: "typed" });
  assert.deepEqual(trace.output, { outcome: decision.outcome, stage: decision.stage.stage });
  assert.equal(trace.scores.self_harm, read.scores.selfHarm);
  assert.equal(trace.scores.symptom_headache_confidence, read.scores.symptoms.headache.confidence);
  assert.ok(Object.values(trace.scores).every(value => typeof value === "number" && value >= 0 && value <= 1));
  assert.equal(trace.metadata.rulesVersion, decision.rulesVersion);
});

test("keyword-only emergency and crisis traces never contain the triggering words", async () => {
  for (const story of ["I threw up twice after a head injury.", "I feel hopeless."]) {
    const { read, decision } = await runIntake(story, { client: null });
    const trace = demoIntakeTrace(read, decision, "voice");
    assert.ok(["go_to_er", "crisis_support"].includes(trace.output.outcome));
    assert.deepEqual(trace.scores, {});
    assert.equal(trace.output.stage, null);
    assert.equal(JSON.stringify(trace).includes(story), false);
    assert.equal("keywordHits" in trace.metadata, false);
  }
});

test("the TypeSafe client disables SDK logging and is never auto-instrumented", () => {
  const source = readFileSync(new URL("./demo-intake.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /wrapTypeSafe/);
  assert.match(source, /logLevel: "off"/);
  assert.match(source, /span\.log\(demoIntakeTrace\(read, decision, inputMode\)\)/);
  assert.doesNotMatch(source, /input:\s*\{\s*note/);
});
