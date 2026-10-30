import { QUESTIONS_VERSION, buildQuestions } from "./questions.ts";
import { THRESHOLDS, band, type Decision } from "./decide.ts";
import type { IntakeRead, StructuredAnswer } from "./reader.ts";

/** Expected-free online invariant. 0 is a safety failure; 1 is a pass. */
export function redFlagOutcomeScore(output: { redFlagFired?: boolean; outcome?: string }): number {
  return output.redFlagFired && output.outcome !== "go_to_er" ? 0 : 1;
}
/** Structured demo/eval data only. No story, quotes, names, keyword text, or exception messages. */
export function intakeLogicTrace(read: IntakeRead, decision: Decision) {
  const allowed = buildQuestions();
  const questions = Object.entries(allowed).map(([id, question]) => ({
    id, question, source: Object.hasOwn(read.formAnswers, id) ? "form" : "typesafe",
    sent: Object.hasOwn(read.questions, id),
    answer: safeAnswer(read.formAnswers[id] ?? read.answers[id]),
  }));
  return {
    questionsVersion: QUESTIONS_VERSION, rulesVersion: decision.rulesVersion,
    modelVersion: read.model && /^[a-zA-Z0-9._-]{1,64}$/.test(read.model) ? read.model : null,
    thresholds: THRESHOLDS, questions, composite: { ...decision.composite },
    ruleIds: decision.ruleIds, outcome: decision.outcome, stage: decision.stage?.stage ?? null,
    nextStage: decision.nextStage, redFlagFired: decision.redFlagFired,
    activityBands: read.scores ? Object.fromEntries(Object.entries(read.scores.activity).map(([id, probability]) => [id, band(probability)])) : null,
    keywordDangerMatched: read.keywords.danger.length > 0, keywordCrisisMatched: read.keywords.selfHarm.length > 0,
    tickedRedFlags: read.tickedRedFlags, readSource: read.source, latencyMs: read.latencyMs,
  };
}
function safeAnswer(a: StructuredAnswer | undefined) {
  if (!a) return null;
  if ("probability" in a) return { probability: a.probability, confidence: a.confidence, confidenceSource: a.confidenceSource };
  if ("score" in a) return { scorePosition: a.score, confidence: a.confidence, probabilities: a.probabilities };
  return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities };
}
