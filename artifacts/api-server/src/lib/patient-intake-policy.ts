import { buildQuestions, normalizeAnswer, MAX_NOTE_CHARS, type Decision, type IntakeOptions } from "@workspace/intake-ai";

/** Preview only, regardless of the feature setting. */
export function patientIntakePreviewAllowed(nodeEnv: string | undefined) {
  return nodeEnv === "development" || nodeEnv === "test";
}
export function realTextIntakeAllowed(nodeEnv: string | undefined, setting: string | undefined) {
  return patientIntakePreviewAllowed(nodeEnv) && setting === "true";
}
/**
 * Basic contact-detail filter, NOT full de-identification: names, dates of birth,
 * locations and other identifying narrative can remain. Never claim anonymity.
 * Run locally on our server before any story reaches TypeSafe.
 */
export function stripContactDetails(story: string): string {
  return story
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi, "[email removed]")
    .replace(/(?<![\w])(?:\+?\d[\d ().-]{5,}\d)(?:\s*(?:ext\.?|extension|x)\s*\d{1,6})?(?![\w])/gi, (match) => {
      // Preserve recognizable dates (injury timing), not phone-like strings.
      if (/^(?:\d{4}[-.]\d{1,2}[-.]\d{1,2}|\d{1,2}[-.]\d{1,2}[-.]\d{4})$/.test(match)) return match;
      const digits = match.replace(/\D/g, "").length;
      return digits >= 7 ? "[phone removed]" : match;
    });
}
export function patientIntakeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TypeError("Invalid intake");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !["consentId", "story", "answered"].includes(key))) throw new TypeError("Unexpected intake field");
  if (typeof input.story !== "string" || !input.story.trim() || input.story.length > MAX_NOTE_CHARS
    || typeof input.consentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.consentId)) throw new TypeError("Invalid story or consent");
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
  return { consentId: input.consentId, story: stripContactDetails(input.story.trim()), answered };
}
export function provisionalStageFor(decision: Decision) {
  if (decision.outcome !== "start_journal" || !decision.stage) return null;
  return {
    stage: String(decision.stage.stage) as "1" | "2" | "3",
    status: "provisional" as const, source: "intake" as const,
    reasons: decision.stage.reasons.map(reason => reason.text),
    ruleIds: decision.ruleIds, rulesVersion: decision.rulesVersion,
    syntheticOnly: false, confirmedBy: null,
  };
}
