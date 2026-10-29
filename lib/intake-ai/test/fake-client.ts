// A stand-in for TypeSafe that returns scripted answers. Everything defaults to "nothing said".
import { buildQuestions } from "../src/questions.ts";

export type Overrides = Record<string, number | { choice: string; confidence?: number }>;

export function fakeAnswers(overrides: Overrides = {}): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const [key, q] of Object.entries(buildQuestions())) {
    const o = overrides[key];
    if (q.type === "noul") {
      answers[key] = { type: "noul", noul: typeof o === "number" ? o : 0.02 };
    } else {
      const c = typeof o === "object" ? o : { choice: "not_mentioned", confidence: 0.95 };
      answers[key] = { type: "choice", choice: c.choice, confidence: c.confidence ?? 0.95, probabilities: { [c.choice]: c.confidence ?? 0.95 } };
    }
  }
  return answers;
}

export function fakeClient(overrides: Overrides = {}) {
  const calls: { request: any; options: any }[] = [];
  return {
    calls,
    async systemOne(request: any, options: any) {
      calls.push({ request, options });
      return { model: "jev-fake", answers: fakeAnswers(overrides) };
    },
  };
}

export const failingClient = {
  async systemOne(): Promise<never> {
    const e = new Error("timed out: the note said something private");
    e.name = "APITimeoutError";
    throw e;
  },
};

/** A calm, doctor-already-seen baseline to change one thing at a time. */
export const calm: Overrides = {
  injury_timing: { choice: "one_to_four_weeks", confidence: 0.92 },
  seen_doctor: { choice: "seen", confidence: 0.93 },
  getting_worse: 0.05,
  activity_daily_tasks: 0.9,
  activity_walking: 0.9,
};
