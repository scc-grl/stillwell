import { buildQuestions, normalizeAnswer, SYNTHETIC_INTAKE_SAMPLES, type Decision, type IntakeOptions } from "@workspace/intake-ai";

/** Fail closed in production. Never accept a note, identifier, quote or arbitrary nested payload. */
export function syntheticIntakeAllowed(nodeEnv: string | undefined) {
  return nodeEnv === "development" || nodeEnv === "test";
}
export function syntheticIntakeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TypeError("Invalid synthetic intake");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !["consentId", "sampleId", "answered"].includes(key))) throw new TypeError("Only synthetic samples are permitted");
  const sample = SYNTHETIC_INTAKE_SAMPLES.find(item => item.id === input.sampleId);
  if (!sample || typeof input.consentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.consentId)) throw new TypeError("Invalid sample or consent");
  const definitions = buildQuestions();
  const answered: NonNullable<IntakeOptions["answered"]> = {};
  if (input.answered !== undefined) {
    if (!input.answered || typeof input.answered !== "object" || Array.isArray(input.answered)) throw new TypeError("Invalid tap answers");
    for (const [key, raw] of Object.entries(input.answered)) {
      if (!Object.hasOwn(definitions, key) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Invalid tap answer");
      const question = definitions[key];
      const answer = raw as Record<string, unknown>;
      // Reconstruct an allowlisted object; neither unused text nor nested metadata reaches the reader.
      const safe = question.type === "noul"
        ? { noul: answer.noul, confidence: 1 }
        : question.type === "score" ? { score: answer.score, confidence: 1, probabilities: {} }
          : { choice: answer.choice, confidence: 1, probabilities: {} };
      normalizeAnswer(question, safe);
      answered[key] = safe;
    }
  }
  return { consentId: input.consentId, sample, answered };
}
export function provisionalStageFor(decision: Decision) {
  if (decision.outcome !== "start_journal" || !decision.stage) return null;
  return {
    stage: String(decision.stage.stage) as "1" | "2" | "3",
    status: "provisional" as const, source: "intake" as const,
    reasons: decision.stage.reasons.map(reason => reason.text),
    ruleIds: decision.ruleIds, rulesVersion: decision.rulesVersion,
    syntheticOnly: true, confirmedBy: null,
  };
}
