import type { Decision, IntakeRead } from "@workspace/intake-ai";

/** Explicit allowlist: never pass story text, quotes, errors, or free-form answers. */
export function demoIntakeTrace(read: IntakeRead, decision: Decision, inputMode: "typed" | "voice") {
  const s = read.scores;
  const scores: Record<string, number> = {};
  if (s) {
    Object.assign(scores, {
      self_harm: s.selfHarm,
      getting_worse: s.gettingWorse,
      prior_concussion: s.priorConcussion,
      danger_max: Math.max(0, ...Object.values(s.danger)),
      seen_doctor_confidence: s.seenDoctor.confidence,
      injury_timing_confidence: s.injuryTiming.confidence,
    });
    for (const [key, value] of Object.entries(s.danger)) scores[`danger_${key}`] = value;
    for (const [key, value] of Object.entries(s.activity)) scores[`activity_${key}`] = value;
    for (const [key, value] of Object.entries(s.symptoms)) scores[`symptom_${key}_confidence`] = value.confidence;
  }
  return {
    input: { inputMode },
    output: { outcome: decision.outcome, stage: decision.stage?.stage ?? null },
    scores,
    metadata: {
      demo: true,
      readSource: read.source,
      latencyMs: read.latencyMs,
      rulesVersion: decision.rulesVersion,
      questionsVersion: read.questionsVersion,
      outcome: decision.outcome,
    },
    tags: ["demo", decision.outcome],
  };
}
