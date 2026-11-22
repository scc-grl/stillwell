import assert from "node:assert/strict";
import test from "node:test";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { fakeClient, calm } from "../../../../lib/intake-ai/test/fake-client.ts";
const entry = fileURLToPath(new URL("./private-patient-intake.ts", import.meta.url));
const built = buildSync({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false,
  banner: { js: `import {createRequire as makeRequire} from "node:module"; const require=makeRequire(${JSON.stringify(entry)});` } });
const { runPrivatePatientIntake } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);

test("actual TypeSafe request contains only filtered story and fixed questions, never account fields", async () => {
  const requests = [];
  const fake = fakeClient(calm);
  const client = { async systemOne(request, options) { requests.push(request); return fake.systemOne(request, options); } };
  const story = "Synthetic: mostly back at work. Contact fake@example.test or +1 415-555-0123.";
  const result = await runPrivatePatientIntake(story, { symptom_headache: { score: 3, confidence: 1 }, mentioned_headache: { noul: 1, confidence: 1 } }, client);
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["questions", "state"]);
  assert.deepEqual(requests[0].state, { intake_note: "Synthetic: mostly back at work. Contact [email removed] or [phone removed]." });
  for (const key of ["name", "email", "phone", "accountId", "userId", "ownerId", "dateOfBirth", "consentId"]) {
    assert.equal(Object.hasOwn(requests[0], key), false);
    assert.equal(Object.hasOwn(requests[0].state, key), false);
  }
  assert.equal(Object.hasOwn(requests[0].questions, "symptom_headache"), false); // Already answered locally.
  assert.equal(JSON.stringify(requests[0]).includes("fake@example.test"), false);
  assert.equal(Object.hasOwn(result, "read"), false); // No diagnostic/raw reader payload.
  assert.equal(JSON.stringify(result).includes("Synthetic:"), false);
});
test("real-account runner has no Braintrust/span or log call; demo runner remains separate", () => {
  const source = readFileSync(entry, "utf8");
  assert.doesNotMatch(source, /from ["']braintrust|\.traced\(|span\.log\(|console\.|logger\.|runDemoIntake/);
  assert.match(source, /logLevel: "off"/);
});
