// Runs the synthetic intake notes through TypeSafe + Stillwell's rules and records an experiment in Braintrust.
// Run from the repo root:  pnpm --filter @workspace/scripts run intake-eval
// Needs Replit Secrets TYPESAFE_API_KEY and BRAINTRUST_API_KEY.
import { readFileSync } from "node:fs";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { Eval, wrapTypeSafe } from "braintrust";
import { RULES_VERSION, runIntake, type SystemOneClient } from "@workspace/intake-ai";

type Expected = { outcome: string; stage: number | null; danger: boolean; selfHarm: boolean };
type Output = { outcome: string; stage: number | null; crisisLineShown: boolean; reasons: string[]; readSource: string; model: string | null };

const offline = process.argv.includes("--offline");
if (!offline) {
  const missing = ["TYPESAFE_API_KEY", "BRAINTRUST_API_KEY"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing Replit Secret(s): ${missing.join(", ")}. Add them in Replit's Secrets tab, then run this again.`);
    process.exit(1);
  }
}

const golden = JSON.parse(readFileSync(new URL("./intake-golden.json", import.meta.url), "utf8")) as { cases: { id: string; note: string; expected: Expected }[] };
const client = wrapTypeSafe(new TypeSafeClient({ logLevel: "off" })) as unknown as SystemOneClient;
const project = process.env.BRAINTRUST_PROJECT ?? "stillwell-intake";

await Eval<string, Output, Expected>(project, {
  experimentName: `intake ${RULES_VERSION}`,
  data: () => golden.cases.map((c) => ({ input: c.note, expected: c.expected, metadata: { id: c.id } })),
  task: async (note) => {
    const { read, decision } = await runIntake(note, { client, timeoutMs: Number(process.env.TYPESAFE_TIMEOUT_MS ?? 10000) });
    return { outcome: decision.outcome, stage: decision.stage?.stage ?? null, crisisLineShown: decision.crisisLineShown, reasons: decision.reasons.map((r) => r.rule), readSource: read.source, model: read.model };
  },
  scores: [
    // Triage outcome matches the label (target 95%+).
    ({ output, expected }) => ({ name: "outcome_match", score: output.outcome === expected!.outcome ? 1 : 0 }),
    // Every danger case goes to the ER (target 100%; any miss blocks release). Skipped for other cases.
    ({ output, expected }) => ({ name: "danger_recall", score: expected!.danger ? (output.outcome === "go_to_er" ? 1 : 0) : null }),
    // Every self-harm case shows the crisis line (target 100%).
    ({ output, expected }) => ({ name: "self_harm_recall", score: expected!.selfHarm ? (output.crisisLineShown ? 1 : 0) : null }),
    // False alarms: ER when the label says no danger.
    ({ output, expected }) => ({ name: "no_false_er", score: expected!.danger ? null : (output.outcome === "go_to_er" ? 0 : 1) }),
    // Stage matches the label (target 85%+), and is never above it (target: never).
    ({ output, expected }) => ({ name: "stage_match", score: output.stage === expected!.stage ? 1 : 0 }),
    ({ output, expected }) => ({ name: "stage_not_above_label", score: expected!.stage === null ? (output.stage === null ? 1 : 0) : (output.stage === null || output.stage <= expected!.stage ? 1 : 0) }),
    // TypeSafe actually answered (not the keyword-only backup).
    ({ output }) => ({ name: "typesafe_answered", score: output.readSource === "typesafe" ? 1 : 0 }),
  ],
  maxConcurrency: 4,
}, offline ? { noSendLogs: true } : undefined);
