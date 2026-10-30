import { buildQuestions } from "../src/questions.ts";
export type Overrides = Record<string, number | { choice?: string; score?: number; confidence?: number; noul?: number }>;
export function fakeAnswers(overrides: Overrides = {}, questions = buildQuestions()): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const [key, q] of Object.entries(questions)) {
    const o = overrides[key];
    if (q.type === "noul") answers[key] = { type: "noul", noul: typeof o === "number" ? o : o?.noul ?? 0.02, ...(typeof o === "object" && o.confidence !== undefined ? { confidence: o.confidence } : {}) };
    else if (q.type === "score") answers[key] = { type: "score", score: typeof o === "number" ? o : o?.score ?? 0, confidence: typeof o === "object" ? o.confidence ?? 0.95 : 0.95, probabilities: {} };
    else {
      const choice = typeof o === "object" ? o.choice ?? "not_mentioned" : "not_mentioned";
      answers[key] = { type: "choice", choice: key === "injury_cause" && choice === "not_mentioned" ? "other" : choice, confidence: typeof o === "object" ? o.confidence ?? 0.95 : 0.95, probabilities: {} };
    }
  }
  return answers;
}
export function fakeClient(overrides: Overrides = {}) {
  const calls: { request: any; options: any }[] = [];
  return { calls, async systemOne(request: any, options: any) {
    calls.push({ request, options });
    return { model: "jev-fake", answers: fakeAnswers(overrides, request.questions) };
  } };
}
export const failingClient = { async systemOne(): Promise<never> { const e = new Error("PRIVATE_NOTE"); e.name = "APITimeoutError"; throw e; } };
export const calm: Overrides = {
  injury_timing: { choice: "one_to_four_weeks", confidence: 0.92 }, seen_doctor: 0.93,
  getting_worse: 0.05, activity_daily_tasks: 0.9, activity_walking: 0.9,
};
