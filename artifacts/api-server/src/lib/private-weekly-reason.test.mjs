import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const path = fileURLToPath(new URL("./private-weekly-reason.ts", import.meta.url));
const built = buildSync({ entryPoints: [path], bundle: true, platform: "node", format: "esm", write: false,
  banner: { js: `import {createRequire as makeRequire} from "node:module"; const require=makeRequire(${JSON.stringify(path)});` } });
const { explainWeeklyNotes } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
test("weekly note reader sends only filtered consenting notes and fixed questions, never numeric decision or identity", async () => {
  const calls = [];
  const reader = { async systemOne(body) {
    calls.push(body); return { model: "fake", answers: { daily_context: { noul: 0.9 }, rest_context: { noul: 0 } } };
  } };
  const reason = await explainWeeklyNotes(["Synthetic: tasks were hard. email@example.test +1 415-555-0123"], reader);
  assert.deepEqual(Object.keys(calls[0]).sort(), ["questions", "state"]);
  assert.deepEqual(Object.keys(calls[0].state), ["weekly_notes"]);
  assert.doesNotMatch(calls[0].state.weekly_notes, /email@example|415-555/);
  assert.match(reason, /numbers determined the stage/);
  assert.equal(await explainWeeklyNotes([], reader), null);
  assert.equal(calls.length, 1);
});
test("weekly reason failures and missing service add no invented context", async () => {
  assert.equal(await explainWeeklyNotes(["Synthetic"], null), null);
  assert.equal(await explainWeeklyNotes(["Synthetic"], { async systemOne() { throw new Error("Do not log"); } }), null);
  const source = readFileSync(path, "utf8");
  assert.doesNotMatch(source, /from ["']braintrust|span\.log|console\.|logger\./);
  assert.match(source, /logLevel: "off"/);
});
