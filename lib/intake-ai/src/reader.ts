// AI reads the note; deterministic code makes every decision. No raw note is traced.
import { ACTIVITIES, DANGER_SIGNS, INTAKE_SYMPTOMS, QUESTIONS_VERSION, buildQuestions, type Activity, type DangerSign, type IntakeQuestion } from "./questions.ts";
import { scanKeywords, type KeywordHits } from "./keywords.ts";

export const MAX_NOTE_CHARS = 4000;
export const DEFAULT_TIMEOUT_MS = 10000;
export type ChoiceAnswer = { choice: string; confidence: number; probabilities: Record<string, number> };
export type NoulAnswer = { probability: number; confidence: number; confidenceSource: "reported" | "binary_probability" };
export type SymptomAnswer = { mentioned: NoulAnswer; score: number; confidence: number; probabilities: Record<string, number> };
export type StructuredAnswer = NoulAnswer | ChoiceAnswer | { score: number; confidence: number; probabilities: Record<string, number> };
export type IntakeScores = {
  danger: Record<DangerSign, number>;
  dangerConfidence: Record<DangerSign, number>;
  selfHarm: number; selfHarmConfidence: number;
  gettingWorse: number; priorConcussion: number;
  seenDoctor: NoulAnswer; injuryTiming: ChoiceAnswer; injuryCause: ChoiceAnswer;
  symptoms: Record<string, SymptomAnswer>;
  activity: Record<Activity, number>;
};
export type IntakeRead = {
  source: "typesafe" | "keywords_only"; model: string | null; questionsVersion: string;
  keywords: KeywordHits; scores: IntakeScores | null; error: string | null; latencyMs: number;
  questions: Record<string, IntakeQuestion>;
  answers: Record<string, StructuredAnswer>;
  formAnswers: Record<string, StructuredAnswer>;
  tickedRedFlags: DangerSign[];
  hoursSinceInjury: number | null;
};
export type SystemOneClient = {
  systemOne(request: { state: unknown; questions: Record<string, unknown>; model?: string },
    options?: { timeout?: number; retry?: { maxRetries?: number } }):
    Promise<{ model: string; answers: Record<string, unknown> }>;
};
export type IntakeOptions = {
  client: SystemOneClient | null; timeoutMs?: number; model?: string;
  /** TypeSafe-compatible structured answers already given in the form. Never free text. */
  answered?: Record<string, unknown>; tickedRedFlags?: DangerSign[]; hoursSinceInjury?: number;
};

function unit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new TypeError("Invalid probability");
  return value;
}
export function normalizeAnswer(question: IntakeQuestion, raw: unknown): StructuredAnswer {
  const a = raw as Record<string, unknown> | undefined;
  if (!a) throw new TypeError("Missing answer");
  if (question.type === "noul") {
    const probability = unit(a.noul);
    // SDK 0.7 Noul has no independent confidence. Do not invent a model-reported one.
    return { probability, confidence: a.confidence === undefined ? Math.max(probability, 1 - probability) : unit(a.confidence),
      confidenceSource: a.confidence === undefined ? "binary_probability" : "reported" };
  }
  const confidence = unit(a.confidence);
  const probabilities: Record<string, number> = {};
  const allowed = question.type === "choice" ? Object.keys(question.criteria) : ["0", "1", "2", "3"];
  const rawProbabilities = a.probabilities as Record<string, unknown> | undefined;
  for (const key of allowed) if (rawProbabilities?.[key] !== undefined) probabilities[key] = unit(rawProbabilities[key]);
  if (question.type === "choice") {
    if (typeof a.choice !== "string" || !Object.hasOwn(question.criteria, a.choice)) throw new TypeError("Invalid choice");
    return { choice: a.choice, confidence, probabilities };
  }
  if (typeof a.score !== "number" || !Number.isFinite(a.score) || a.score < 0 || a.score > 3) throw new TypeError("Invalid score");
  return { score: a.score, confidence, probabilities };
}
export function mapAnswers(answers: Record<string, StructuredAnswer>): IntakeScores {
  const n = (key: string) => answers[key] as NoulAnswer;
  const danger = {} as Record<DangerSign, number>;
  const dangerConfidence = {} as Record<DangerSign, number>;
  for (const id of Object.keys(DANGER_SIGNS) as DangerSign[]) {
    danger[id] = n(`danger_${id}`).probability; dangerConfidence[id] = n(`danger_${id}`).confidence;
  }
  const activity = {} as Record<Activity, number>;
  for (const id of Object.keys(ACTIVITIES) as Activity[]) activity[id] = n(`activity_${id}`).probability;
  const symptoms: Record<string, SymptomAnswer> = {};
  for (const { name } of INTAKE_SYMPTOMS) symptoms[name] = {
    ...answers[`symptom_${name}`] as { score: number; confidence: number; probabilities: Record<string, number> },
    mentioned: n(`mentioned_${name}`),
  };
  return { danger, dangerConfidence, activity, symptoms, selfHarm: n("self_harm").probability,
    selfHarmConfidence: n("self_harm").confidence, gettingWorse: n("getting_worse").probability,
    priorConcussion: n("prior_concussion").probability, seenDoctor: n("seen_doctor"),
    injuryTiming: answers.injury_timing as ChoiceAnswer, injuryCause: answers.injury_cause as ChoiceAnswer };
}
export async function readIntake(note: string, opts: IntakeOptions): Promise<IntakeRead> {
  const allQuestions = buildQuestions();
  const formAnswers: Record<string, StructuredAnswer> = {};
  for (const [key, raw] of Object.entries(opts.answered ?? {})) {
    if (!allQuestions[key]) throw new TypeError("Unknown form question");
    formAnswers[key] = normalizeAnswer(allQuestions[key], raw);
  }
  const questions = buildQuestions(formAnswers);
  const started = Date.now();
  const base = { questionsVersion: QUESTIONS_VERSION, keywords: scanKeywords(note), questions, formAnswers,
    tickedRedFlags: (opts.tickedRedFlags ?? []).filter(id => Object.hasOwn(DANGER_SIGNS, id)),
    hoursSinceInjury: typeof opts.hoursSinceInjury === "number" && Number.isFinite(opts.hoursSinceInjury) && opts.hoursSinceInjury >= 0 ? opts.hoursSinceInjury : null };
  if (!opts.client && Object.keys(questions).length) return { ...base, source: "keywords_only", model: null, scores: null, answers: {}, error: "NotConfigured", latencyMs: 0 };
  let answers: Record<string, StructuredAnswer> = {};
  try {
    const response = Object.keys(questions).length ? await opts.client!.systemOne(
      { state: { intake_note: note }, questions, ...(opts.model ? { model: opts.model } : {}) },
      { timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, retry: { maxRetries: 0 } },
    ) : { model: "form-only", answers: {} };
    for (const [key, question] of Object.entries(questions)) answers[key] = normalizeAnswer(question, response.answers[key]);
    return { ...base, source: "typesafe", model: response.model, scores: mapAnswers({ ...answers, ...formAnswers }),
      answers, error: null, latencyMs: Date.now() - started };
  } catch (error) {
    const allowed = ["APITimeoutError", "APIConnectionError", "AuthenticationError", "RateLimitError", "TypeError"];
    const name = error instanceof Error && allowed.includes(error.name) ? error.name : "Error";
    return { ...base, source: "keywords_only", model: null, scores: null, answers, error: name, latencyMs: Date.now() - started };
  }
}
