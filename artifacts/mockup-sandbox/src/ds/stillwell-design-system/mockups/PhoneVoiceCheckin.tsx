import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import {
  answerLabel,
  baseline,
  cadenceFor,
  daysSince,
  exampleEntries,
  exampleToday,
  formatDate,
  isValidDate,
  protocolStart,
  routineLabels,
  scaleLabels,
  symptoms,
  type JourneyEntry,
  type RoutineStatus,
  type SymptomId,
} from "./_journeyModel";
import { VoicePrompt, type ResponseMode, type VoiceStage } from "./_VoicePrompt";

type Step = 0 | 1 | 2 | 3 | 4;
type RoutineKey = "food" | "movement";
type VoiceEntry = JourneyEntry & { questionNotes?: Record<string, string> };
type QuestionModeOverrides = Record<string, ResponseMode>;
type QuestionNotes = Record<string, string>;

const routineKeys: RoutineKey[] = ["food", "movement"];
const statusChoices: { value: RoutineStatus; label: string }[] = [
  { value: "did", label: "Did" },
  { value: "did_not", label: "Did not" },
  { value: "not_planned", label: "Not planned" },
];
const defaultTracked: SymptomId[] = ["headache", "sleep", "attention"];

function requestedStep(): Step {
  const screen = new URLSearchParams(window.location.search).get("screen");
  if (screen === "routines") return 1;
  if (screen === "reflection") return 2;
  if (screen === "review") return 3;
  if (screen === "journey") return 4;
  return 0;
}

function symptomQuestion(id: SymptomId) {
  return `symptom:${id}`;
}

function routineQuestion(id: RoutineKey) {
  return `routine:${id}`;
}

function responsePrompt(step: Step, symptom: SymptomId | undefined, routine: RoutineKey) {
  if (step === 0 && symptom) return `How has ${symptoms.find((item) => item.id === symptom)?.label.toLowerCase()} felt for you?`;
  if (step === 1) return routine === "food"
    ? "What would you like to remember about food and fluids?"
    : "What would you like to remember about movement, or choosing rest?";
  return "What would you like to remember about this time, in your own words?";
}

function questionTitle(step: Step, symptom: SymptomId | undefined, routine: RoutineKey) {
  if (step === 0) return symptom ? symptoms.find((item) => item.id === symptom)?.label ?? "Symptoms" : "Your symptoms";
  if (step === 1) return routineLabels[routine];
  if (step === 2) return "Your reflection";
  return "";
}

export function PhoneVoiceCheckin() {
  const [step, setStep] = useState<Step>(requestedStep);
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [routineIndex, setRoutineIndex] = useState(0);
  const [tracked, setTracked] = useState<SymptomId[]>(defaultTracked);
  const [ratings, setRatings] = useState<JourneyEntry["symptoms"]>({});
  const [statuses, setStatuses] = useState<JourneyEntry["statuses"]>({});
  const [date, setDate] = useState(exampleToday);
  const [dateOpen, setDateOpen] = useState(false);
  const [symptomPickerOpen, setSymptomPickerOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [globalMode, setGlobalMode] = useState<ResponseMode>(() => new URLSearchParams(window.location.search).get("mode") === "manual" ? "manual" : "voice");
  const [modeOverrides, setModeOverrides] = useState<QuestionModeOverrides>({});
  const [noteDrafts, setNoteDrafts] = useState<QuestionNotes>({});
  const [keptNotes, setKeptNotes] = useState<QuestionNotes>({});
  const [voiceStage, setVoiceStage] = useState<VoiceStage>(() => {
    const stage = new URLSearchParams(window.location.search).get("voiceStage");
    return stage === "review" || stage === "speaking" ? stage : "prompt";
  });
  const [history, setHistory] = useState<VoiceEntry[]>(() => exampleEntries.map((entry) => ({ ...entry, id: `example-${entry.date}` })).reverse());
  const [savedNotice, setSavedNotice] = useState("");
  const [returnStep, setReturnStep] = useState<Step>(() => requestedStep() === 4 ? 0 : requestedStep());
  const [returnSymptomIndex, setReturnSymptomIndex] = useState(0);
  const [returnRoutineIndex, setReturnRoutineIndex] = useState(0);
  const [markReflection, setMarkReflection] = useState(false);

  const visibleSymptoms = useMemo(() => symptoms.filter((item) => tracked.includes(item.id)), [tracked]);
  const activeSymptom = visibleSymptoms[Math.min(symptomIndex, Math.max(visibleSymptoms.length - 1, 0))];
  const activeRoutine = routineKeys[routineIndex];
  const questionKey = step === 0 && activeSymptom
    ? symptomQuestion(activeSymptom.id)
    : step === 1
      ? routineQuestion(activeRoutine)
      : "reflection";
  const activeMode = modeOverrides[questionKey] ?? globalMode;
  const validDate = isValidDate(date) && date >= protocolStart && date <= exampleToday;
  const cadence = validDate ? cadenceFor(date) : null;
  const periodLabel = !cadence ? "the period you choose" : cadence === "weekly" ? "this week" : "this day";
  const showStructured = activeMode === "manual" || voiceStage === "review";
  const pendingNotes = Object.entries(noteDrafts).filter(([key, value]) => value.trim() !== (keptNotes[key] ?? "").trim());
  const hasCurrentAnswer = Boolean(keptNotes[questionKey] || noteDrafts[questionKey]?.trim() || (step === 0 && activeSymptom && ratings[activeSymptom.id] !== undefined) || (step === 1 && statuses[activeRoutine]));

  function noteLabel(key: string) {
    if (key === "reflection") return "Reflection";
    if (key.startsWith("symptom:")) return symptoms.find((item) => item.id === key.slice(8))?.label ?? "Symptom note";
    return routineLabels[key.slice(8) as RoutineKey] ?? "Routine note";
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, symptomIndex, routineIndex]);

  function setModeForQuestion(mode: ResponseMode) {
    setModeOverrides((current) => ({ ...current, [questionKey]: mode }));
    setVoiceStage("prompt");
  }

  function changeGlobalMode(mode: ResponseMode) {
    setGlobalMode(mode);
    setModeOverrides({});
    setVoiceStage("prompt");
  }

  function updateNoteDraft(value: string) {
    setNoteDrafts((current) => ({ ...current, [questionKey]: value }));
  }

  function confirmNote() {
    const value = (noteDrafts[questionKey] ?? "").trim();
    if (!value) return;
    setKeptNotes((current) => ({ ...current, [questionKey]: value }));
  }

  function clearNote() {
    if (questionKey === "reflection") setMarkReflection(false);
    setNoteDrafts((current) => {
      const next = { ...current };
      delete next[questionKey];
      return next;
    });
    setKeptNotes((current) => {
      const next = { ...current };
      delete next[questionKey];
      return next;
    });
  }

  function toggleSymptom(id: SymptomId) {
    if (tracked.includes(id)) setRatings((current) => { const next = { ...current }; delete next[id]; return next; });
    setTracked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setSymptomIndex(0);
  }

  function toggleRating(id: SymptomId, value: number) {
    setRatings((current) => {
      const next = { ...current };
      if (next[id] === value) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  function toggleStatus(key: RoutineKey, value: RoutineStatus) {
    setStatuses((current) => {
      const next = { ...current };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function continueStep() {
    if (step === 0 && activeSymptom && symptomIndex < visibleSymptoms.length - 1) {
      setSymptomIndex((index) => index + 1);
      setVoiceStage("prompt");
      return;
    }
    if (step === 1 && routineIndex === 0) {
      setRoutineIndex(1);
      setVoiceStage("prompt");
      return;
    }
    if (step < 3) {
      setStep((current) => (current + 1) as Step);
      setVoiceStage("prompt");
    }
  }

  function goBack() {
    if (step === 0) {
      if (symptomIndex > 0) {
        setSymptomIndex((index) => index - 1);
        setVoiceStage("prompt");
      }
      return;
    }
    if (step === 1 && routineIndex === 1) {
      setRoutineIndex(0);
      setVoiceStage("prompt");
      return;
    }
    setStep((current) => Math.max(0, current - 1) as Step);
    setVoiceStage("prompt");
  }

  function visitJourney() {
    if (step === 4) {
      setStep(returnStep);
      setSymptomIndex(returnSymptomIndex);
      setRoutineIndex(returnRoutineIndex);
    } else {
      setReturnStep(step);
      setReturnSymptomIndex(symptomIndex);
      setReturnRoutineIndex(routineIndex);
      setStep(4);
    }
  }

  function addToHistory() {
    if (!validDate || !cadence || pendingNotes.length) return;
    const routineNotes: NonNullable<JourneyEntry["routineNotes"]> = {};
    routineKeys.forEach((key) => {
      const value = keptNotes[routineQuestion(key)];
      if (value) routineNotes[key] = value;
    });
    const entry: VoiceEntry = {
      id: `temporary-${Date.now()}`,
      date,
      cadence,
      symptoms: Object.fromEntries(Object.entries(ratings).filter(([id]) => tracked.includes(id as SymptomId))),
      statuses: { ...statuses },
      routineNotes,
      reflection: keptNotes.reflection ?? "",
      moment: markReflection && keptNotes.reflection ? keptNotes.reflection : undefined,
      momentMarked: markReflection && Boolean(keptNotes.reflection),
      questionNotes: { ...keptNotes },
      previewEntry: true,
    };
    setHistory((current) => [entry, ...current].sort((a, b) => b.date.localeCompare(a.date)));
    setSavedNotice("Added to temporary test history in this screen only. Reloading clears it.");
    setReturnStep(3);
    setReturnSymptomIndex(symptomIndex);
    setReturnRoutineIndex(routineIndex);
    setStep(4);
  }

  function startFreshDraft() {
    setRatings({});
    setStatuses({});
    setNoteDrafts({});
    setKeptNotes({});
    setMarkReflection(false);
    setModeOverrides({});
    setSymptomIndex(0);
    setRoutineIndex(0);
    setVoiceStage("prompt");
    setSavedNotice("");
    setStep(0);
    setReturnStep(0);
  }

  const headerStep = step === 4 ? "Your own history" : step === 3 ? "Final review" : step === 0 && !activeSymptom ? "No symptoms chosen" : `Question ${step === 0 ? Math.min(symptomIndex + 1, visibleSymptoms.length) : step === 1 ? visibleSymptoms.length + 1 + routineIndex : visibleSymptoms.length + 3} of ${visibleSymptoms.length + 3}`;
  const promptUI = <VoicePrompt
    prompt={`${responsePrompt(step, activeSymptom?.id, activeRoutine)} Reflect on ${periodLabel}.`}
    mode={activeMode}
    onModeChange={setModeForQuestion}
    draft={noteDrafts[questionKey] ?? ""}
    confirmed={keptNotes[questionKey] ?? ""}
    onDraftChange={updateNoteDraft}
    onConfirm={confirmNote}
    onClear={clearNote}
    voiceStage={voiceStage}
    onVoiceStageChange={setVoiceStage}
    noteOnly={step === 2}
  />;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <img src="/__mockup/images/stillwell-logo.png" alt="Stillwell" className="h-7 w-auto" />
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" aria-expanded={safetyOpen} onClick={() => setSafetyOpen((open) => !open)}>Safety</Button>
          <Button type="button" size="sm" variant="ghost" onClick={visitJourney}>{step === 4 ? "Check-in" : "My journey"}</Button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-3 px-4 py-3 pb-2">
        <p className="text-xs text-muted-foreground">Stillwell · whole check-in · design preview</p>
        {(step === 0 || safetyOpen) && <Card>
          <CardContent className="space-y-1 py-3">
            <p className="text-sm font-medium">Not for a new injury or emergency.</p>
            {safetyOpen
              ? <p className="text-sm leading-5 text-muted-foreground">Worsening symptoms need clinician advice. Severe headache, repeated vomiting, confusion, weakness, or feeling unsafe needs urgent local help.</p>
              : <p className="text-xs leading-5 text-muted-foreground">Worsening symptoms need clinician advice; urgent symptoms need urgent help. Open Safety for details.</p>}
          </CardContent>
        </Card>}

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{headerStep} · optional</p>
          <h1 className="font-serif text-2xl font-medium leading-tight tracking-tight">{step === 4 ? "Your journey" : step === 3 ? "Review this check-in" : questionTitle(step, activeSymptom?.id, activeRoutine)}</h1>
          {step < 3 && <p className="text-sm leading-5 text-muted-foreground">{step === 0 ? "One question at a time. Skip anything; blank stays blank." : step === 1 ? "Notice food, fluids, movement, or rest as they were." : "Your own words, without pressure to explain."}</p>}
        </div>

        {step < 3 && <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">All questions</p>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant={globalMode === "voice" ? "default" : "outline"} aria-pressed={globalMode === "voice"} onClick={() => changeGlobalMode("voice")}>Voice-led</Button>
            <Button type="button" size="sm" variant={globalMode === "manual" ? "default" : "outline"} aria-pressed={globalMode === "manual"} onClick={() => changeGlobalMode("manual")}>Manual</Button>
          </div>
        </div>}

        {step < 3 && <Card>
          <CardContent className="space-y-3 py-4">
            {step === 0 && <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{cadence ? `${cadence === "weekly" ? "Weekly" : "Daily"} · ${formatDate(date)}` : "Choose a preview date"}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{validDate ? `Example day ${daysSince(protocolStart, date)} · ${periodLabel} · self-paced` : "Choose a valid example date."}</p>
                </div>
                <Button type="button" size="sm" variant="ghost" aria-expanded={dateOpen} onClick={() => setDateOpen((open) => !open)}>{dateOpen ? "Close date" : "Change date"}</Button>
              </div>
              {dateOpen && <div className="space-y-2 border-t border-border pt-3">
                <label htmlFor="voice-checkin-date" className="text-sm font-medium">Preview date</label>
                <Input id="voice-checkin-date" type="date" min={protocolStart} max={exampleToday} value={date} aria-invalid={!validDate} onChange={(event) => setDate(event.target.value)} />
                <p className="text-xs leading-5 text-muted-foreground">Example cadence: daily on days 1–30, weekly from day 31. This is a logging schedule, not recovery progress.</p>
              </div>}
              {!validDate && <p role="alert" className="text-sm text-destructive">Choose a date between {formatDate(protocolStart)} and {formatDate(exampleToday)}.</p>}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{visibleSymptoms.length} selected · all ten available</p>
                <Button type="button" size="sm" variant="outline" aria-expanded={symptomPickerOpen} onClick={() => setSymptomPickerOpen((open) => !open)}>{symptomPickerOpen ? "Done" : "Choose symptoms"}</Button>
              </div>
              {symptomPickerOpen && <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {symptoms.map((item) => <label key={item.id} className="flex items-start gap-2 text-xs leading-5">
                  <Checkbox checked={tracked.includes(item.id)} onCheckedChange={() => toggleSymptom(item.id)} />
                  <span>{item.label}</span>
                </label>)}
              </div>}
              {!activeSymptom && <p className="text-sm text-muted-foreground">No symptoms selected. Continue without ratings, or choose any of the ten.</p>}
            </>}

            {(step !== 0 || activeSymptom) && activeMode === "voice" && promptUI}

            {step === 0 && activeSymptom && <fieldset className="space-y-2 border-t border-border pt-3">
                <legend className="text-base font-semibold">Choose your rating · optional</legend>
                {showStructured ? <div className="space-y-1.5">
                  {scaleLabels.map((label, value) => <Button key={label} type="button" size="sm" variant={ratings[activeSymptom.id] === value ? "default" : "outline"} aria-pressed={ratings[activeSymptom.id] === value} aria-label={`${value} · ${label}`} className="w-full justify-start" onClick={() => toggleRating(activeSymptom.id, value)}>{value} · {label}</Button>)}
                  {ratings[activeSymptom.id] !== undefined && <Button type="button" size="sm" variant="ghost" onClick={() => setRatings((current) => { const next = { ...current }; delete next[activeSymptom.id]; return next; })}>Clear this answer</Button>}
                </div> : <p className="text-xs leading-5 text-muted-foreground">{ratings[activeSymptom.id] === undefined ? "No rating selected." : `Selected: ${ratings[activeSymptom.id]}/4 · ${scaleLabels[ratings[activeSymptom.id] as number]}.`} Preview review or switch this question to Type to choose a rating. Words never set it automatically.</p>}
              </fieldset>}

            {step === 1 && <fieldset className="space-y-3">
              <legend className="text-base font-semibold">{routineLabels[activeRoutine]}</legend>
              <p className="text-sm leading-5 text-muted-foreground">{activeRoutine === "food" ? "Food and fluids, as they were." : "Movement or rest, as it happened. Rest is valid."}</p>
              {showStructured && <div className="flex flex-wrap gap-2">
                {statusChoices.map((option) => <Button key={option.value} type="button" size="sm" variant={statuses[activeRoutine] === option.value ? "default" : "outline"} aria-pressed={statuses[activeRoutine] === option.value} onClick={() => toggleStatus(activeRoutine, option.value)}>{option.label}</Button>)}
              </div>}
              {!showStructured && <p className="text-xs leading-5 text-muted-foreground">{answerLabel(statuses[activeRoutine])}. Preview review or switch to Type to choose Did, Did not, or Not planned. Words do not choose for you.</p>}
              <p className="text-xs leading-5 text-muted-foreground">No choice is assumed. You can revise or clear this answer.</p>
              {statuses[activeRoutine] && <Button type="button" size="sm" variant="ghost" onClick={() => setStatuses((current) => { const next = { ...current }; delete next[activeRoutine]; return next; })}>Clear this answer</Button>}
              {activeRoutine === "movement" && <details className="space-y-2 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-semibold">Optional, self-paced milestones</summary>
                <ol className="list-inside list-decimal space-y-1 text-xs leading-5 text-muted-foreground">
                  <li>Notice your current capacity.</li>
                  <li>Repeat only a routine already cleared by a clinician.</li>
                  <li>Review a possible next step with a clinician.</li>
                </ol>
                <p className="text-xs leading-5 text-muted-foreground">No medical clearance, prescribed progression, or exercise instruction is implied.</p>
              </details>}
            </fieldset>}

            {step === 2 && <div className="space-y-2">
              <p className="text-sm leading-5 text-muted-foreground">Nothing needs explaining. You can leave this blank or keep a few words.</p>
              <p className="text-xs text-muted-foreground">Optional · for {periodLabel}</p>
              <label className="flex items-start gap-3 text-sm"><Checkbox checked={markReflection} disabled={!keptNotes.reflection} onCheckedChange={(checked) => setMarkReflection(checked === true)} /><span>Mark this kept reflection as a meaningful moment</span></label>
              <p className="text-xs text-muted-foreground">Keep a reflection first. This is your observation, not evidence of what caused a change.</p>
            </div>}
            {(step !== 0 || activeSymptom) && activeMode === "manual" && promptUI}
          </CardContent>
        </Card>}

        {step === 3 && <Card>
          <CardContent className="space-y-4 py-4">
            <p className="text-sm leading-5 text-muted-foreground">Review every question and note before you choose to add anything. Skipped answers stay blank, never zero.</p>
            {pendingNotes.length > 0 && <div className="space-y-3 border-b border-border pb-3">
              <h2 className="text-sm font-semibold">Edited notes need your decision</h2>
              <p className="text-xs text-muted-foreground">Nothing is added until each changed note is kept or returned to its last kept version.</p>
              {pendingNotes.map(([key, value]) => <div key={key} className="space-y-2">
                <p className="text-sm font-semibold">{noteLabel(key)}</p>
                <p className="whitespace-pre-wrap text-sm">{value.trim() || "You cleared the draft text."}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => setKeptNotes((current) => { const next = { ...current }; if (value.trim()) next[key] = value.trim(); else delete next[key]; return next; })}>{value.trim() ? "Keep this version" : "Confirm note removal"}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setNoteDrafts((current) => ({ ...current, [key]: keptNotes[key] ?? "" }))}>{keptNotes[key] ? "Use last kept version" : "Discard this draft note"}</Button>
                </div>
              </div>)}
            </div>}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Symptoms · {formatDate(date)} · {cadence ?? "date needed"}</h2>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setStep(0); setSymptomIndex(0); }}>Edit</Button>
              </div>
              {visibleSymptoms.map((item) => <div key={item.id} className="space-y-1">
                <p className="text-sm">{item.label}: <span className="text-muted-foreground">{ratings[item.id] === undefined ? "Not recorded" : `${ratings[item.id]}/4 · ${scaleLabels[ratings[item.id] as number]}`}</span></p>
                {keptNotes[symptomQuestion(item.id)] && <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">Kept note: {keptNotes[symptomQuestion(item.id)]}</p>}
              </div>)}
              {!visibleSymptoms.length && <p className="text-sm text-muted-foreground">No symptoms selected or rated.</p>}
              {Object.entries(keptNotes).filter(([key]) => key.startsWith("symptom:") && !tracked.includes(key.slice(8) as SymptomId)).map(([key, note]) => <p key={key} className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">Note kept for an unselected symptom ({symptoms.find((item) => item.id === key.slice(8))?.label}): {note}</p>)}
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Food and movement</h2><Button type="button" size="sm" variant="ghost" onClick={() => { setStep(1); setRoutineIndex(0); }}>Edit</Button></div>
              {routineKeys.map((key) => <div key={key} className="space-y-1">
                <p className="text-sm">{routineLabels[key]}: <span className="text-muted-foreground">{answerLabel(statuses[key])}</span></p>
                {keptNotes[routineQuestion(key)] && <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">Kept note: {keptNotes[routineQuestion(key)]}</p>}
              </div>)}
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Reflection</h2><Button type="button" size="sm" variant="ghost" onClick={() => setStep(2)}>Edit</Button></div>
              <p className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{keptNotes.reflection || "No reflection kept."}</p>
              {markReflection && keptNotes.reflection && <p className="text-sm">Marked by you as a meaningful moment.</p>}
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs leading-5 text-muted-foreground">Only explicitly selected ratings/statuses and confirmed notes will be included. No audio, speech transcript, or sharing is part of this preview.</p>
              {!validDate && <p role="alert" className="text-sm text-destructive">Choose a valid date in the symptom step before adding.</p>}
            </div>
          </CardContent>
        </Card>}

        {step === 4 && <Card>
          <CardContent className="space-y-4 py-4">
            <p className="text-sm leading-5 text-muted-foreground">Your check-in stays self-paced. No recovery score, sharing, or clinical conclusion is inferred from these notes.</p>
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <h2 className="text-sm font-semibold">Starting snapshot · synthetic example</h2>
              {(["headache", "sleep", "attention"] as SymptomId[]).map((id) => <p key={id} className="text-sm">{symptoms.find((item) => item.id === id)?.label}: {baseline[id]}/4 · {scaleLabels[baseline[id] as number]}</p>)}
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={startFreshDraft}>New draft · clear current answers</Button>
            {history.map((entry, index) => <article key={entry.id ?? `${entry.date}-${index}`} className="space-y-2 border-t border-border pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{entry.previewEntry ? "Your temporary test entry" : "Synthetic example"} · {entry.cadence} check-in</p>
                <h2 className="text-base font-semibold">{formatDate(entry.date)}</h2>
              </div>
              <div className="space-y-1">
                {Object.entries(entry.symptoms).map(([id, value]) => <p key={id} className="text-sm">{symptoms.find((item) => item.id === id)?.label}: <span className="text-muted-foreground">{value === undefined ? "Not recorded" : `${value}/4 · ${scaleLabels[value]}`}</span></p>)}
                {!Object.keys(entry.symptoms).length && <p className="text-sm text-muted-foreground">No symptoms recorded.</p>}
              </div>
              <p className="text-sm">Food and hydration: <span className="text-muted-foreground">{answerLabel(entry.statuses.food)}</span></p>
              <p className="text-sm">Movement or rest: <span className="text-muted-foreground">{answerLabel(entry.statuses.movement)}</span></p>
              {entry.reflection && <p className="whitespace-pre-wrap text-sm leading-5">Reflection note: {entry.reflection}</p>}
              {entry.questionNotes && Object.entries(entry.questionNotes).map(([key, note]) => note && key.startsWith("symptom:") && <p key={key} className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{symptoms.find((item) => item.id === key.slice(8))?.label} note: {note}</p>)}
              {entry.routineNotes && Object.entries(entry.routineNotes).map(([key, note]) => note && <p key={key} className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{routineLabels[key as RoutineKey]} note: {note}</p>)}
              {entry.momentMarked && entry.moment && <p className="text-sm leading-5">Patient-marked meaningful moment: {entry.moment}</p>}
              {entry.previewEntry && <p className="text-xs leading-5 text-muted-foreground">Temporary test input held only until reload. No real sharing.</p>}
            </article>)}
            {savedNotice && <p role="status" className="text-xs leading-5 text-muted-foreground">{savedNotice}</p>}
          </CardContent>
        </Card>}

        {step < 3 && <div className="sticky bottom-0 z-10 space-y-2 border-t border-border bg-background py-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 && symptomIndex === 0}>Back</Button>
            {step < 3
              ? <div className="flex items-center gap-2">
                  {!hasCurrentAnswer && <Button type="button" size="sm" variant="ghost" disabled={!validDate} onClick={continueStep}>Skip</Button>}
                  <Button type="button" disabled={!validDate} onClick={continueStep}>{step === 0 && activeSymptom && symptomIndex < visibleSymptoms.length - 1 ? "Next symptom" : step === 1 && routineIndex === 0 ? "Next question" : "Continue"}</Button>
                </div>
              : <Button type="button" onClick={() => setStep(3)}>Review answers</Button>}
          </div>
          <p className="text-center text-xs leading-5 text-muted-foreground">Self-paced · your draft stays here when you go back.</p>
        </div>}
        {step === 3 && <div className="sticky bottom-0 z-10 border-t border-border bg-background py-3">
          <Button type="button" className="w-full" onClick={addToHistory} disabled={!validDate || pendingNotes.length > 0}>Add reviewed check-in to preview</Button>
        </div>}
        {step === 4 && <div className="sticky bottom-0 z-10 border-t border-border bg-background py-3">
          <Button type="button" className="w-full" onClick={visitJourney}>Return to check-in draft</Button>
        </div>}
        <footer className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Design-only prototype · no account, storage, recording, transcription, analytics, or backend. Nothing is shared.</footer>
      </div>
    </main>
  );
}
