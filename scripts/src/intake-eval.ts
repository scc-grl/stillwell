// Dataset is read from Braintrust, never from the old local golden JSON.
// Notes stay in this process and TypeSafe only. Experiment inputs contain opaque row IDs.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { Eval, initDataset, initExperiment } from "braintrust";
import { RULES_VERSION, runIntake, intakeLogicTrace, type SystemOneClient } from "@workspace/intake-ai";
import { normalizeExpected, scoreIntake, type Expected, type Output } from "./intake-eval-support";

const required = ["TYPESAFE_API_KEY", "BRAINTRUST_API_KEY"];
if (required.some(key => !process.env[key])) throw new Error("Intake eval needs the TypeSafe and Braintrust secrets.");
const project = "stillwell-intake";
const dataset = initDataset({ project, dataset: "stillwell-intake", orgName: "scc-grl" });
const notes = new Map<string, string>();
const cases: { input: { rowId: string }; expected: Expected }[] = [];
const expectedFields = new Set<string>();
for await (const row of dataset) {
  const input = row.input;
  const object = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const note = typeof input === "string" ? input : object.note ?? object.story ?? object.intake_note ?? object.text;
  if (typeof note !== "string") throw new Error("Dataset input must be text or contain note/story/intake_note/text.");
  for (const field of Object.keys(row.expected ?? {})) expectedFields.add(field);
  notes.set(row.id, note);
  cases.push({ input: { rowId: row.id }, expected: normalizeExpected(row.expected) });
}
console.log(JSON.stringify({ datasetRows: cases.length, expectedFields: [...expectedFields] }));
if (!cases.length) {
  // Preserve an honest, inspectable attempt without fabricating labels or dividing by zero.
  const experiment = initExperiment(project, { experiment: RULES_VERSION, dataset, metadata: { status: "blocked_empty_dataset", rulesVersion: RULES_VERSION } });
  const summary = await experiment.summarize();
  console.log(JSON.stringify({ status: "blocked_empty_dataset", experimentUrl: summary.experimentUrl, summaryScores: null }));
} else {
  const client = new TypeSafeClient({ logLevel: "off" }) as unknown as SystemOneClient;
  const result = await Eval<{ rowId: string }, Output, Expected>(project, {
    experimentName: RULES_VERSION,
    data: cases,
    metadata: { dataset: "stillwell-intake", datasetId: await dataset.id, rulesVersion: RULES_VERSION },
    task: async ({ rowId }, hooks) => {
      const { read, decision } = await runIntake(notes.get(rowId)!, { client, timeoutMs: 10000 });
      hooks.span.log({ metadata: { logic: intakeLogicTrace(read, decision) } });
      return { outcome: decision.outcome, stage: decision.stage?.stage ?? null,
        crisisLineShown: decision.crisisLineShown, readSource: read.source,
        symptoms: Object.fromEntries(decision.symptoms.map(s => [s.name, s.level])) };
    },
    scores: [({ output, expected }) => scoreIntake(output, expected!)],
    maxConcurrency: 2,
  });
  console.log(JSON.stringify({ experimentUrl: result.summary.experimentUrl, scores: result.summary.scores }));
}
