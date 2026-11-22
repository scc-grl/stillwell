import { TypeSafeClient } from "@typesafe-ai/sdk";
import { runIntake, type IntakeOptions, type SystemOneClient } from "@workspace/intake-ai";
import { stripContactDetails } from "./patient-intake-policy";

let client: SystemOneClient | null | undefined;
function privateReaderClient() {
  if (client === undefined) {
    // No instrumentation/SDK logging: exception messages and bodies can hold a story.
    client = process.env.TYPESAFE_API_KEY
      ? new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, logLevel: "off" }) as unknown as SystemOneClient
      : null;
  }
  return client;
}

/** No Braintrust dependency or spans on the real-account path. Evals stay synthetic. */
export async function runPrivatePatientIntake(story: string, answered: NonNullable<IntakeOptions["answered"]>,
  reader: SystemOneClient | null = privateReaderClient()) {
  const result = await runIntake(stripContactDetails(story), {
    client: reader, answered, timeoutMs: Number(process.env.TYPESAFE_TIMEOUT_MS ?? 10000),
  });
  // Structured numbers/choices only, so summary can show what the reader actually
  // found. Do not return the raw story, questions' state or account metadata.
  return { decision: result.decision, source: result.read.source,
    answers: { ...result.read.answers, ...result.read.formAnswers } };
}
