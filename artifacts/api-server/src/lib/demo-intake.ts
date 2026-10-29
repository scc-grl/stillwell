// Demo intake runtime: TypeSafe reads the note, @workspace/intake-ai decides, Braintrust records it.
// DEMO ONLY. The demo page tells visitors to use sample stories, never real health details.
// Until TypeSafe signs a data agreement, nothing from real patient accounts may come through here.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { initLogger, wrapTypeSafe, type Logger } from "braintrust";
import { RULES_VERSION, runIntake, type Decision, type IntakeRead, type SystemOneClient } from "@workspace/intake-ai";

export const BRAINTRUST_PROJECT = process.env.BRAINTRUST_PROJECT ?? "stillwell-intake";

let typesafe: SystemOneClient | null | undefined;
let braintrust: Logger<true> | null | undefined;

function getBraintrust(): Logger<true> | null {
  if (braintrust === undefined) {
    braintrust = process.env.BRAINTRUST_API_KEY ? initLogger({ projectName: BRAINTRUST_PROJECT, apiKey: process.env.BRAINTRUST_API_KEY }) : null;
  }
  return braintrust;
}

function getTypeSafe(): SystemOneClient | null {
  if (typesafe === undefined) {
    if (!process.env.TYPESAFE_API_KEY) {
      typesafe = null;
    } else {
      // TypeSafe's own logging stays off: request bodies hold the note.
      const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, logLevel: "off" });
      // wrapTypeSafe makes each systemOne call its own span inside the Braintrust trace.
      typesafe = (getBraintrust() ? wrapTypeSafe(client) : client) as unknown as SystemOneClient;
    }
  }
  return typesafe;
}

export function demoIntakeStatus() {
  return { typesafe: Boolean(process.env.TYPESAFE_API_KEY), braintrust: Boolean(process.env.BRAINTRUST_API_KEY), project: BRAINTRUST_PROJECT };
}

/** AI scores as Braintrust scores (all 0-1), so each one can be charted and compared across runs. */
export function braintrustScores(read: IntakeRead): Record<string, number> {
  const s = read.scores;
  if (!s) return {};
  const out: Record<string, number> = {
    self_harm: s.selfHarm,
    getting_worse: s.gettingWorse,
    prior_concussion: s.priorConcussion,
    danger_max: Math.max(...Object.values(s.danger)),
    seen_doctor_confidence: s.seenDoctor.confidence,
    injury_timing_confidence: s.injuryTiming.confidence,
  };
  for (const [k, v] of Object.entries(s.danger)) out[`danger_${k}`] = v;
  for (const [k, v] of Object.entries(s.activity)) out[`activity_${k}`] = v;
  for (const [k, v] of Object.entries(s.symptoms)) out[`symptom_${k}_confidence`] = v.confidence;
  return out;
}

export async function runDemoIntake(note: string, inputMode: "typed" | "voice"): Promise<{ read: IntakeRead; decision: Decision; braintrustLogged: boolean }> {
  const client = getTypeSafe();
  const bt = getBraintrust();
  const timeoutMs = Number(process.env.TYPESAFE_TIMEOUT_MS ?? 3000);
  if (!bt) {
    const { read, decision } = await runIntake(note, { client, timeoutMs });
    return { read, decision, braintrustLogged: false };
  }
  // Braintrust must never block the intake: if tracing fails, return the result unlogged.
  let result: { read: IntakeRead; decision: Decision } | undefined;
  try {
    return await bt.traced(async (span) => {
      result = await runIntake(note, { client, timeoutMs });
      const { read, decision } = result;
      span.log({
      input: { note, inputMode },
      output: { outcome: decision.outcome, stage: decision.stage?.stage ?? null, reasons: decision.reasons, followUps: decision.followUps, symptoms: decision.symptoms },
      scores: braintrustScores(read),
      metadata: {
        demo: true,
        readSource: read.source,
        typesafeModel: read.model,
        typesafeError: read.error,
        latencyMs: read.latencyMs,
        rulesVersion: RULES_VERSION,
        questionsVersion: read.questionsVersion,
        keywordHits: read.keywords,
        outcome: decision.outcome,
      },
      tags: ["demo", decision.outcome],
      });
      return { read, decision, braintrustLogged: true };
    }, { name: "demo-intake" });
  } catch {
    if (result) return { ...result, braintrustLogged: false };
    const { read, decision } = await runIntake(note, { client, timeoutMs });
    return { read, decision, braintrustLogged: false };
  }
}
