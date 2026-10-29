// Demo intake runtime: TypeSafe reads the note, @workspace/intake-ai decides, Braintrust records it.
// DEMO ONLY. The demo page tells visitors to use sample stories, never real health details.
// Until TypeSafe signs a data agreement, nothing from real patient accounts may come through here.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { initLogger, type Logger } from "braintrust";
import { runIntake, type Decision, type IntakeRead, type SystemOneClient } from "@workspace/intake-ai";
import { demoIntakeTrace } from "./demo-intake-trace";

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
      // Do not instrument the SDK: automatic tracing would capture the story.
      // Only the allowlisted numeric scores and rule outcome are traced below.
      typesafe = client as unknown as SystemOneClient;
    }
  }
  return typesafe;
}

export function demoIntakeStatus() {
  return { typesafe: Boolean(process.env.TYPESAFE_API_KEY), braintrust: Boolean(process.env.BRAINTRUST_API_KEY), project: BRAINTRUST_PROJECT };
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
      span.log(demoIntakeTrace(read, decision, inputMode));
      return { read, decision, braintrustLogged: true };
    }, { name: "demo-intake" });
  } catch {
    if (result) return { ...result, braintrustLogged: false };
    const { read, decision } = await runIntake(note, { client, timeoutMs });
    return { read, decision, braintrustLogged: false };
  }
}
