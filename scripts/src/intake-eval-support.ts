import { INTAKE_SYMPTOMS } from "@workspace/intake-ai";
export type Expected = { outcome?: string; stage?: number | null; danger?: boolean; selfHarm?: boolean; symptoms: Record<string, number | null> };
export type Output = { outcome: string; stage: number | null; crisisLineShown: boolean; readSource: string; symptoms: Record<string, number | null> };
const outcomes: Record<string, string> = { emergency: "go_to_er", er: "go_to_er", crisis: "crisis_support", see_doctor_first: "find_doctor", doctor: "find_doctor", confirm: "use_tap_questions", patient_confirms: "use_tap_questions", journal: "start_journal" };
export function normalizeExpected(raw: unknown): Expected {
  if (!raw || typeof raw !== "object") throw new TypeError("Expected labels must be an object");
  const r = raw as Record<string, unknown>;
  const outcome = r.outcome ?? r.expected_outcome ?? r.triage;
  const stage = r.stage ?? r.expected_stage ?? r.starting_stage;
  const symptoms = (r.symptoms ?? r.symptom_ratings ?? {}) as Record<string, unknown>;
  const result: Expected = { symptoms: {} };
  if (typeof outcome === "string") result.outcome = outcomes[outcome] ?? outcome;
  if (stage === null || r.stage === null || r.expected_stage === null) result.stage = null;
  else if (typeof stage === "number" && stage >= 1 && stage <= 6) result.stage = stage;
  const danger = r.danger ?? r.red_flag ?? r.red_flags;
  const self = r.selfHarm ?? r.self_harm;
  if (typeof danger === "boolean") result.danger = danger;
  else if (result.outcome) result.danger = result.outcome === "go_to_er";
  if (typeof self === "boolean") result.selfHarm = self;
  else if (result.outcome) result.selfHarm = result.outcome === "crisis_support";
  for (const { name } of INTAKE_SYMPTOMS) {
    const raw = symptoms[name];
    const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>).level : raw;
    if (value === null || value === "not recorded" || value === "not_recorded") result.symptoms[name] = null;
    else if (typeof value === "number" && value >= 0 && value <= 3) result.symptoms[name] = value;
  }
  return result;
}
export function scoreIntake(output: Output, expected: Expected) {
  const bit = (condition: boolean) => condition ? 1 : 0;
  const scores: { name: string; score: number | null }[] = [
    { name: "outcome_match", score: expected.outcome === undefined ? null : bit(output.outcome === expected.outcome) },
    { name: "danger_recall", score: expected.danger ? bit(output.outcome === "go_to_er") : null },
    { name: "self_harm_recall", score: expected.selfHarm ? bit(output.crisisLineShown) : null },
    { name: "no_false_er", score: expected.danger === false ? bit(output.outcome !== "go_to_er") : null },
    { name: "stage_match", score: expected.stage === undefined ? null : bit(output.stage === expected.stage) },
    { name: "stage_not_above_label", score: expected.stage === undefined ? null : bit(expected.stage === null ? output.stage === null : output.stage === null || output.stage <= expected.stage) },
    { name: "typesafe_answered", score: bit(output.readSource === "typesafe") },
  ];
  for (const [name, level] of Object.entries(expected.symptoms)) {
    const actual = output.symptoms[name];
    scores.push({ name: `symptom_${name}_exact`, score: bit(actual === level) },
      { name: `symptom_${name}_within_one`, score: bit(actual === level || (actual !== null && actual !== undefined && level !== null && Math.abs(actual-level) <= 1)) });
  }
  return scores;
}
