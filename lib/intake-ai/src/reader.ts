// Reads a free-form intake note with TypeSafe. AI only reads; code decides (see decide.ts).
// If TypeSafe errors or is slow, the keyword scan still runs and the result says so,
// so the intake never fails silently.
import { ACTIVITIES, DANGER_SIGNS, INTAKE_SYMPTOMS, QUESTIONS_VERSION, buildQuestions, type Activity, type DangerSign } from "./questions.ts";
import { scanKeywords, type KeywordHits } from "./keywords.ts";

export const MAX_NOTE_CHARS = 4000;
export const DEFAULT_TIMEOUT_MS = 3000;

export type ChoiceAnswer = { choice: string; confidence: number; probabilities: Record<string, number> };

export type IntakeScores = {
  danger: Record<DangerSign, number>;
  selfHarm: number;
  gettingWorse: number;
  priorConcussion: number;
  seenDoctor: ChoiceAnswer;
  injuryTiming: ChoiceAnswer;
  symptoms: Record<string, ChoiceAnswer>;
  activity: Record<Activity, number>;
};

export type IntakeRead = {
  source: "typesafe" | "keywords_only";
  /** TypeSafe model that answered, e.g. "jev-1.13". */
  model: string | null;
  questionsVersion: string;
  keywords: KeywordHits;
  scores: IntakeScores | null;
  /** Error class name only, never the message (it could echo the note). */
  error: string | null;
  latencyMs: number;
};

/** TypeSafeClient from @typesafe-ai/sdk fits this shape, and so does Braintrust's wrapTypeSafe(client). */
export type SystemOneClient = {
  systemOne(
    request: { state: unknown; questions: Record<string, unknown>; model?: string },
    options?: { timeout?: number; retry?: { maxRetries?: number } },
  ): Promise<{ model: string; answers: Record<string, unknown> }>;
};

export async function readIntake(
  note: string,
  opts: { client: SystemOneClient | null; timeoutMs?: number; model?: string },
): Promise<IntakeRead> {
  const keywords = scanKeywords(note);
  const started = Date.now();
  const base = { questionsVersion: QUESTIONS_VERSION, keywords };
  if (!opts.client) {
    return { ...base, source: "keywords_only", model: null, scores: null, error: "NotConfigured", latencyMs: 0 };
  }
  try {
    const response = await opts.client.systemOne(
      { state: { intake_note: note }, questions: buildQuestions(), ...(opts.model ? { model: opts.model } : {}) },
      { timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, retry: { maxRetries: 0 } },
    );
    return { ...base, source: "typesafe", model: response.model, scores: mapAnswers(response.answers), error: null, latencyMs: Date.now() - started };
  } catch (error) {
    const name = error instanceof Error ? error.name || "Error" : "Error";
    return { ...base, source: "keywords_only", model: null, scores: null, error: name, latencyMs: Date.now() - started };
  }
}

function noulOf(answers: Record<string, unknown>, key: string): number {
  const a = answers[key] as { noul?: unknown } | undefined;
  if (!a || typeof a.noul !== "number" || a.noul < 0 || a.noul > 1) throw new TypeError(`Missing or bad noul answer: ${key}`);
  return a.noul;
}

function choiceOf(answers: Record<string, unknown>, key: string): ChoiceAnswer {
  const a = answers[key] as { choice?: unknown; confidence?: unknown; probabilities?: unknown } | undefined;
  if (!a || typeof a.choice !== "string" || typeof a.confidence !== "number") throw new TypeError(`Missing or bad choice answer: ${key}`);
  return { choice: a.choice, confidence: a.confidence, probabilities: (a.probabilities ?? {}) as Record<string, number> };
}

export function mapAnswers(answers: Record<string, unknown>): IntakeScores {
  const danger = {} as Record<DangerSign, number>;
  for (const id of Object.keys(DANGER_SIGNS) as DangerSign[]) danger[id] = noulOf(answers, `danger_${id}`);
  const activity = {} as Record<Activity, number>;
  for (const id of Object.keys(ACTIVITIES) as Activity[]) activity[id] = noulOf(answers, `activity_${id}`);
  const symptoms: Record<string, ChoiceAnswer> = {};
  for (const s of INTAKE_SYMPTOMS) symptoms[s.name] = choiceOf(answers, `symptom_${s.name}`);
  return {
    danger,
    selfHarm: noulOf(answers, "self_harm"),
    gettingWorse: noulOf(answers, "getting_worse"),
    priorConcussion: noulOf(answers, "prior_concussion"),
    seenDoctor: choiceOf(answers, "seen_doctor"),
    injuryTiming: choiceOf(answers, "injury_timing"),
    symptoms,
    activity,
  };
}
