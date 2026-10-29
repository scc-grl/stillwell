import { useState } from "react";
import { useLocation } from "wouter";
import { DemoPatientDashboard } from "@/components/demo-intake/DemoPatientDashboard";
import { DemoPatientJournal } from "@/components/demo-intake/DemoPatientJournal";
import { createMayaDemoState, upsertDemoEntry, type DemoEntry } from "@/components/demo-intake/demo-patient-data";
import { RayForthcomingScreen } from "@/components/demo-intake/DemoEverydayViews";
import { DemoShell, type DemoView, type Persona } from "@/components/demo-intake/DemoShell";
import { RoadmapScreen, SummaryScreen } from "@/components/demo-intake/ReviewScreens";
import { CrisisScreen, EmergencyScreen, ReadingScreen, StoryScreen, TapQuestionsScreen } from "@/components/demo-intake/StoryScreens";
import { useDemoIntake, localSafetyOutcome, type DemoIntakeResult } from "@/hooks/useDemoIntake";
import { DEMO_SYMPTOMS, MAYA_STORY, STORY_SAMPLES, type AnswerField, type Symptom } from "@/components/demo-intake/demo-data";

const injuryFieldMatchers: [string, RegExp][] = [
  ["When it happened", /\b(?:on (?:last )?(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday)|this morning|yesterday|today|about \w+ (?:days?|weeks?) ago|(?:one|two|three|four|five|six|seven|ten|several) weeks? ago|last (?:week|month)|\d+ days? ago)\b/i],
  ["How it happened", /\b(?:head-to-head hit in (?:a )?soccer match|fell from (?:my|a) bike[^,.!?;]*|hit my head(?: on [\w ]+)?|bumped my head|collided with another player)\b/i],
  ["Seen a doctor since", /\b(?:the team doctor checked me[^.?!;]*|saw (?:my|a) doctor[^.?!;]*|haven't seen (?:a|any) doctor[^.?!;]*|have not seen (?:a|any) doctor[^.?!;]*|have seen (?:a|my) doctor[^.?!;]*)/i],
  ["Getting better or worse", /\b(?:getting worse[^.?!;]*|worse every day[^.?!;]*|mostly better[^.?!;]*|getting better[^.?!;]*|symptoms have been getting worse[^.?!;]*)/i],
  ["What feels okay right now", /\b(?:walking[^.?!;]*(?:okay|fine)[^.?!;]*|a short walk[^.?!;]*(?:okay|fine)[^.?!;]*|walking around feels okay[^.?!;]*)/i],
  ["Concussions before", /\b(?:previous concussion[^.?!;]*|earlier concussion[^.?!;]*|concussions before[^.?!;]*|had a concussion before[^.?!;]*)/i],
];

const symptomPatterns: Record<string, RegExp> = {
  headache: /\b(?:headaches?[^,.!?;]*|head pain[^,.!?;]*)/i,
  fatigue: /\b(?:wiped out[^,.!?;]*|(?:more )?tired[^,.!?;]*|fatigue[^,.!?;]*)/i,
  fog: /\b(?:foggy[^,.!?;]*|brain fog[^,.!?;]*|trouble focusing[^,.!?;]*)/i,
  sleep: /\b(?:not sleeping[^,.!?;]*|sleep(?:ing)? (?:poorly|badly|well)[^,.!?;]*|can't sleep[^,.!?;]*)/i,
  mood: /\b(?:irritable[^,.!?;]*|sad[^,.!?;]*|anxious[^,.!?;]*|mood changes?[^,.!?;]*)/i,
  light: /\b(?:screens? (?:really )?bother[^,.!?;]*|light sensitivity[^,.!?;]*|lights? bother[^,.!?;]*|sensitive to light[^,.!?;]*)/i,
};

const dangerPatterns = [
  /\b(?:vomit(?:ed|ing)?|threw up|throwing up|thrown up)(?: [^,.!?;]{0,40})?/i,
  /\b(?:seizure|convulsion|double vision|blacked out|unconscious|knocked out|hard to wake|very drowsy|increasingly drowsy|more and more drowsy)\b/i,
  /\b(?:my |a )?(?:severe )?headache[^,.!?;]{0,45}(?:getting worse|worsening|increasing)\b/i,
  /\b(?:weakness|numbness|tingling|neck pain|dent in (?:my )?head|skull deformity)\b/i,
];

function exactMatch(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[0]?.trim() ?? "";
}

function evidence(text: string, pattern: RegExp): string {
  const matched = exactMatch(text, pattern);
  return matched ? `“${matched}”` : "";
}

function getEmergencyQuotes(text: string): string[] {
  const matches = dangerPatterns.map((pattern) => exactMatch(text, pattern)).filter(Boolean);
  if (matches.length) return [...new Set(matches)];
  // If a model-only signal stopped the intake, preserve the patient's exact words rather than paraphrasing.
  return text.trim() ? [text.trim()] : [];
}

function makeSummary(text: string, result: DemoIntakeResult | null): { fields: AnswerField[]; symptoms: Symptom[] } {
  const fields = injuryFieldMatchers.map(([label, pattern]) => ({
    label,
    quote: evidence(text, pattern),
    uncertain: label === "When it happened" && Boolean(result?.decision.followUps.some((followUp) => followUp.toLowerCase().includes("how long ago"))),
  }));
  const symptoms = DEMO_SYMPTOMS.map(({ name, label }) => {
    const apiSymptom = result?.decision.symptoms.find((symptom) => symptom.name === name);
    return {
      name,
      label,
      quote: evidence(text, symptomPatterns[name] ?? /$^/),
      level: apiSymptom && Number.isInteger(apiSymptom.level) ? apiSymptom.level : null,
      uncertain: apiSymptom?.needsConfirm ?? false,
    };
  });
  return { fields, symptoms };
}

const initialSummary = makeSummary(MAYA_STORY, null);

export default function DemoIntakePage() {
  const [, setLocation] = useLocation();
  const { pending, submit, error } = useDemoIntake();
  const [view, setView] = useState<DemoView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("persona") === "ray") return "ray-patients";
    const directView = params.get("view");
    if (directView === "dashboard" || directView === "journal") return directView;
    return "story";
  });
  const [persona, setPersona] = useState<Persona>(() => new URLSearchParams(window.location.search).get("persona") === "ray" ? "Ray F. (clinician)" : "Maya J. (patient)");
  const [patientState, setPatientState] = useState(createMayaDemoState);
  const [story, setStory] = useState(MAYA_STORY);
  const [selectedSample, setSelectedSample] = useState<string>(STORY_SAMPLES[0].label);
  const [inputMode, setInputMode] = useState<"typed" | "voice">("typed");
  const [submittedStory, setSubmittedStory] = useState("");
  const [result, setResult] = useState<DemoIntakeResult | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [tapQuestionsMessage, setTapQuestionsMessage] = useState("Stillwell couldn't read this just now, so here are a few quick questions.");

  const changePersona = (nextPersona: Persona) => {
    setPersona(nextPersona);
    setView(nextPersona.startsWith("Ray") ? "ray-patients" : "story");
  };

  const openView = (nextView: DemoView) => {
    if (nextView === "summary" && !result) {
      setView("story");
      return;
    }
    if (nextView === "roadmap" && !result) {
      setView("story");
      return;
    }
    setView(nextView);
  };

  const savePatientEntry = (entry: DemoEntry) => {
    setPatientState((current) => upsertDemoEntry(current, entry));
  };

  const updateTrackedSymptoms = (names: typeof patientState.trackedSymptoms) => {
    setPatientState((current) => ({ ...current, trackedSymptoms: [...names] }));
  };

  const processStory = async (text: string, mode: "typed" | "voice") => {
    if (!text || pending) return;
    setSubmittedStory(text);
    setView("reading");
    const response = await submit(text, mode);
    setResult(response);
    setSummary(makeSummary(text, response));
    if (response?.decision.outcome === "go_to_er") {
      setView("emergency");
    } else if (response?.decision.outcome === "crisis_support") {
      setView("crisis");
    } else if (!response) {
      const safetyOutcome = localSafetyOutcome(text);
      if (safetyOutcome) setView(safetyOutcome === "go_to_er" ? "emergency" : "crisis");
      else {
        setTapQuestionsMessage(error ?? "Stillwell couldn't read this just now, so here are a few quick questions.");
        setView("ai-unavailable");
      }
    } else if (response.decision.outcome === "use_tap_questions") {
      setTapQuestionsMessage("Stillwell couldn't read this just now, so here are a few quick questions.");
      setView("ai-unavailable");
    } else {
      setView("summary");
    }
  };
  const saveStory = () => void processStory(story.trim(), inputMode);

  return (
    <DemoShell view={view} setView={openView} persona={persona} setPersona={changePersona}>
      {view === "story" && <StoryScreen
        story={story}
        setStory={setStory}
        selectedSample={selectedSample}
        setSelectedSample={setSelectedSample}
        inputMode={inputMode}
        setInputMode={setInputMode}
        pending={pending}
        onSave={() => void saveStory()}
      />}
      {view === "reading" && <ReadingScreen />}
      {view === "ai-unavailable" && <TapQuestionsScreen
        message={error ?? tapQuestionsMessage}
        onSafety={(outcome) => setView(outcome === "go_to_er" ? "emergency" : "crisis")}
        onContinue={() => setView("summary")}
        onRetry={() => void processStory(submittedStory, inputMode)}
        retrying={pending}
      />}
      {view === "summary" && <SummaryScreen
        fields={summary.fields}
        setFields={(fields) => setSummary((current) => ({ ...current, fields }))}
        symptoms={summary.symptoms}
        setSymptoms={(symptoms) => setSummary((current) => ({ ...current, symptoms }))}
        onContinue={() => setView("roadmap")}
      />}
      {view === "roadmap" && <RoadmapScreen
        stage={result?.decision.stage ?? null}
        stageNote={result?.decision.stageNote ?? null}
        needsDoctor={result?.decision.outcome === "find_doctor"}
        reasons={result?.decision.reasons ?? []}
        onStartJournal={() => setView("dashboard")}
      />}
      {view === "emergency" && <EmergencyScreen quotes={getEmergencyQuotes(submittedStory)} />}
      {view === "crisis" && <CrisisScreen onExit={() => setLocation("/demo")} />}
      {view === "dashboard" && <DemoPatientDashboard
        state={patientState}
        onNavigate={(next) => setView(next)}
        onRoutineChange={(routine) => setPatientState((current) => ({ ...current, routine }))}
        onTrackedSymptomsChange={updateTrackedSymptoms}
      />}
      {view === "journal" && <DemoPatientJournal
        state={patientState}
        onNavigate={(next) => setView(next)}
        onEntryChange={savePatientEntry}
        onEntrySave={savePatientEntry}
        onTrackedSymptomsChange={updateTrackedSymptoms}
      />}
      {view.startsWith("ray-") && <RayForthcomingScreen view={view} />}
    </DemoShell>
  );
}
