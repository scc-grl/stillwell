import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { SystemOneClient } from "@workspace/intake-ai";
import { stripContactDetails } from "./patient-intake-policy";
import { WEEKLY_RULES } from "./weekly-rules";

let client: SystemOneClient | null | undefined;
/** Optional note context only. No identity, scores, stage or decision is sent, traced or logged. */
export async function explainWeeklyNotes(notes: string[], reader?: SystemOneClient | null): Promise<string | null> {
  if (reader === undefined) {
    if (client === undefined) client = process.env.TYPESAFE_API_KEY
      ? new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, logLevel: "off" }) as unknown as SystemOneClient : null;
    reader = client;
  }
  if (!reader || !notes.length) return null;
  try {
    const result = await reader.systemOne({
      state: { weekly_notes: stripContactDetails(notes.join("\n").slice(0, 4000)) },
      questions: {
        daily_context: { type: "noul", instructions: "Do the notes explicitly describe daily tasks feeling difficult? Only read what was written; do not diagnose, score, or decide a recovery stage." },
        rest_context: { type: "noul", instructions: "Do the notes explicitly mention taking pauses or adapting plans? Only read what was written; do not diagnose, score, or decide a recovery stage." },
      },
    }, { timeout: WEEKLY_RULES.explanationTimeoutMs, retry: { maxRetries: 0 } });
    const probability = (key: string) => {
      const p = (result.answers[key] as { noul?: unknown })?.noul;
      return typeof p === "number" && p >= WEEKLY_RULES.explanationMinimumProbability && p <= 1;
    };
    if (probability("daily_context")) return "Your notes also mentioned everyday tasks feeling difficult. This adds context only; your recorded numbers determined the stage.";
    if (probability("rest_context")) return "Your notes also mentioned pauses or adapting your plans. This adds context only; your recorded numbers determined the stage.";
    return null;
  } catch { return null; } // Optional explanation failure cannot change or prevent a deterministic check.
}
