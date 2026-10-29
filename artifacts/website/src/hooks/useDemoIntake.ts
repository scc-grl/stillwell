import { useState } from "react";
import { scanKeywords } from "@workspace/intake-ai";

export type IntakeOutcome = "go_to_er" | "crisis_support" | "find_doctor" | "start_journal" | "use_tap_questions";
export type IntakeSymptom = {
  name: string;
  label: string;
  level: number | null;
  levelLabel: string;
  confidence: number | null;
  needsConfirm: boolean;
};
export type DemoIntakeResult = {
  decision: {
    outcome: IntakeOutcome;
    headline: string;
    startJournal: boolean;
    crisisLineShown: boolean;
    reasons: { rule: string; text: string }[];
    stage: { stage: 1 | 2 | 3; name: string; amsterdamStep: 1 | 2 | 3; reasons: { rule: string; text: string }[] } | null;
    stageNote: string | null;
    followUps: string[];
    symptoms: IntakeSymptom[];
    resources: string[];
    rulesVersion: string;
  };
  read: {
    source: string;
    model: string | null;
    latencyMs: number;
    error: string | null;
    keywords: { danger: string[]; selfHarm: string[] };
    scores: unknown;
  };
  braintrustLogged: boolean;
};

type IntakeState = { pending: boolean; error: string | null };

export function useDemoIntake() {
  const [state, setState] = useState<IntakeState>({ pending: false, error: null });

  const submit = async (note: string, inputMode: "typed" | "voice"): Promise<DemoIntakeResult | null> => {
    setState({ pending: true, error: null });
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/demo/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ note, inputMode }),
      });
      if (!response.ok) throw new Error("unavailable");
      const result = await response.json() as DemoIntakeResult;
      if (!result.decision || !Array.isArray(result.decision.symptoms)) throw new Error("unavailable");
      setState({ pending: false, error: null });
      return result;
    } catch {
      setState({ pending: false, error: "Stillwell couldn't read this just now, so here are a few quick questions." });
      return null;
    }
  };

  return { ...state, submit };
}

/** Only used when the intake service is unreachable; these local checks can stop the flow for safety. */
export function localSafetyOutcome(note: string): "go_to_er" | "crisis_support" | null {
  const hits = scanKeywords(note);
  if (hits.danger.length) return "go_to_er";
  if (hits.selfHarm.length) return "crisis_support";
  return null;
}
