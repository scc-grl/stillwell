export * from "./questions.ts";
export * from "./keywords.ts";
export * from "./reader.ts";
export * from "./decide.ts";

import { readIntake, type IntakeRead, type SystemOneClient } from "./reader.ts";
import { decide, type Decision } from "./decide.ts";

/** Read a free-form note with TypeSafe, then apply the rules. */
export async function runIntake(note: string, opts: { client: SystemOneClient | null; timeoutMs?: number; model?: string }): Promise<{ read: IntakeRead; decision: Decision }> {
  const read = await readIntake(note, opts);
  return { read, decision: decide(read) };
}
