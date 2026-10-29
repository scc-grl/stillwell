import { useEffect, useState } from "react";
import { DemoDashboard, DemoJournal } from "@/components/demo-intake/DemoEverydayViews";
import { DemoShell, type DemoView, type Persona } from "@/components/demo-intake/DemoShell";
import { RoadmapScreen, SummaryScreen } from "@/components/demo-intake/ReviewScreens";
import { CareBoundary, EmergencyScreen, ReadingScreen, StoryScreen } from "@/components/demo-intake/StoryScreens";
import { MAYA_STORY, STORY_SAMPLES, type AnswerField, type Symptom, type SymptomName } from "@/components/demo-intake/demo-data";

const fieldExtractors: [string, RegExp][] = [
  ["When it happened", /\b(?:on saturday|this morning|yesterday|today|about \w+ (?:days?|weeks?) ago|(?:one|two|three|four|five|six|seven|ten|several) weeks? ago|last (?:week|month))\b/i],
  ["How it happened", /\b(?:head-to-head hit in a soccer match|fell from my bike|hit my head|bumped my head|collided with another player|fell off my bike|hit my head on [\w ]+)\b/i],
  ["Seen a doctor since", /\b(?:the team doctor checked me[^.]*|saw (?:my|a) doctor[^.]*|haven't seen (?:a|any) doctor[^.]*|have not seen (?:a|any) doctor[^.]*)/i],
  ["Getting better or worse", /\b(?:getting worse[^.]*|worse every day[^.]*|mostly better[^.]*|getting better[^.]*)/i],
  ["What feels okay right now", /\b(?:walking[^.]* feels okay|walking[^.]* is okay|walking around feels okay|short walk feels okay)\b/i],
  ["Concussions before", /\b(?:previous concussion[^.]*|earlier concussion[^.]*|concussions before[^.]*)/i],
];

const symptomMatchers: { name: SymptomName; pattern: RegExp }[] = [
  { name: "Headache", pattern: /\b(?:headaches?[^,.!?;]*|head pain[^,.!?;]*)/i },
  { name: "Fatigue", pattern: /\b(?:wiped out[^,.!?;]*|(?:more )?tired[^,.!?;]*|fatigue[^,.!?;]*)/i },
  { name: "Fog", pattern: /\b(?:foggy[^,.!?;]*|brain fog[^,.!?;]*)/i },
  { name: "Sleep", pattern: /\b(?:not sleeping[^,.!?;]*|sleep(?:ing)? (?:poorly|badly|well)[^,.!?;]*|can't sleep[^,.!?;]*)/i },
  { name: "Mood", pattern: /\b(?:irritable[^,.!?;]*|sad[^,.!?;]*|anxious[^,.!?;]*|mood[^,.!?;]*)/i },
  { name: "Light sensitivity", pattern: /\b(?:screens? (?:really )?bother[^,.!?;]*|light sensitivity[^,.!?;]*|lights? bother[^,.!?;]*|sensitive to light[^,.!?;]*)/i },
];

function extractText(story: string, matcher: RegExp): string {
  return story.match(matcher)?.[0]?.trim() ?? "";
}

function buildSummary(story: string, isMayaSample: boolean): { fields: AnswerField[]; symptoms: Symptom[] } {
  const fields = fieldExtractors.map(([label, matcher]) => {
    const extracted = extractText(story, matcher);
    return {
      label,
      quote: extracted ? `“${extracted}”` : "",
      uncertain: label === "When it happened" && Boolean(extracted),
    };
  });
  const mayaLevels: Record<SymptomName, number | null> = {
    Headache: 2,
    Fatigue: 2,
    Fog: 2,
    Sleep: 2,
    Mood: null,
    "Light sensitivity": 2,
  };
  const symptoms = symptomMatchers.map(({ name, pattern }) => {
    const quote = extractText(story, pattern);
    return {
      name,
      quote: quote ? `“${quote}”` : "",
      level: isMayaSample ? mayaLevels[name] : null,
      uncertain: Boolean(quote) && !isMayaSample,
    };
  });
  return { fields, symptoms };
}

function hasDangerSign(story: string): boolean {
  return /\b(?:thrown up|throwing up|vomit(?:ing)?|double vision|seizure|unconscious|loss of consciousness|very drowsy|getting drowsier|increasingly drowsy|severe (?:or )?increasing headache|worsening headache|weakness or tingling|skull deformity|neck pain)\b/i.test(story);
}

const initialSummary = buildSummary(MAYA_STORY, true);

export default function DemoIntakePage() {
  const [view, setView] = useState<DemoView>("story");
  const [persona, setPersona] = useState<Persona>("Maya J. (patient)");
  const [story, setStory] = useState(MAYA_STORY);
  const [selectedSample, setSelectedSample] = useState<string>(STORY_SAMPLES[0].label);
  const [submittedStory, setSubmittedStory] = useState(MAYA_STORY);
  const [summary, setSummary] = useState(initialSummary);
  const [progress, setProgress] = useState(0);
  const [checks, setChecks] = useState([false, false, false]);

  useEffect(() => {
    if (view !== "reading") return;
    setProgress(12);
    setChecks([false, false, false]);
    const timers = [
      window.setTimeout(() => { setProgress(42); setChecks([true, false, false]); }, 380),
      window.setTimeout(() => { setProgress(70); setChecks([true, true, false]); }, 820),
      window.setTimeout(() => { setProgress(100); setChecks([true, true, true]); }, 1260),
      window.setTimeout(() => setView(hasDangerSign(submittedStory) ? "emergency" : "summary"), 1700),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [view, submittedStory]);

  const saveStory = () => {
    const text = story.trim();
    if (!text) return;
    const isMayaSample = selectedSample === STORY_SAMPLES[0].label && text === MAYA_STORY;
    setSubmittedStory(text);
    setSummary(buildSummary(text, isMayaSample));
    setView("reading");
  };

  return (
    <DemoShell view={view} setView={setView} persona={persona} setPersona={setPersona}>
      {view === "story" && (
        <StoryScreen
          story={story}
          setStory={setStory}
          selectedSample={selectedSample}
          setSelectedSample={setSelectedSample}
          onSave={saveStory}
        />
      )}
      {view === "reading" && <ReadingScreen progress={progress} checks={checks} />}
      {view === "summary" && (
        <SummaryScreen
          fields={summary.fields}
          setFields={(fields: AnswerField[]) => setSummary((current) => ({ ...current, fields }))}
          symptoms={summary.symptoms}
          setSymptoms={(symptoms: Symptom[]) => setSummary((current) => ({ ...current, symptoms }))}
          onContinue={() => setView("roadmap")}
        />
      )}
      {view === "roadmap" && <RoadmapScreen symptoms={summary.symptoms} onStartJournal={() => setView("dashboard")} />}
      {view === "emergency" && <EmergencyScreen story={submittedStory} />}
      {view === "dashboard" && <DemoDashboard persona={persona} onJournal={() => setView("journal")} />}
      {view === "journal" && <DemoJournal onDashboard={() => setView("dashboard")} />}
      {(view === "dashboard" || view === "journal") && <CareBoundary />}
    </DemoShell>
  );
}
