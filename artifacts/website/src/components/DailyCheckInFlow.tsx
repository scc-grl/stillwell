import { useMemo, useState } from "react";
import type {
  DailyCheckIn,
  DailyCheckInSymptomAnswer,
  RecoveryLog,
  RecoveryLogInput,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { SymptomSelector, useSymptomPreferences } from "./SymptomPreferences";
import {
  checkInSymptoms,
  dailyCheckInFromLog,
  formatDayNumber,
  formatDate,
  formatWeekday,
  overallChoices,
  ratingChoices,
  ratingLabel,
  summaryLine,
  symptomsForRecoveryLog,
  weekDates,
  weeklyInsight,
  hasSavedCheckIn,
  defaultSymptoms, activityQuestion, activityAnswerChoices, type CheckInSymptomName,
} from "@workspace/recovery-journal";

type FlowPage = "home" | "symptoms" | "voice" | "review" | "edit" | "saved";
type Props = {
  initial: RecoveryLogInput;
  logs: readonly RecoveryLog[];
  today: string;
  startAt?: FlowPage;
  draftMode?: boolean;
  onPersist?: (log: RecoveryLogInput) => Promise<RecoveryLog>;
  onDraftChange?: (log: RecoveryLogInput) => void;
  onDraftComplete?: (log: RecoveryLogInput) => void;
  onEditActivities?: () => void;
  onExit?: () => void;
  exitLabel?: string;
  selectedSymptoms?: CheckInSymptomName[];
  onSelectSymptoms?: (names: CheckInSymptomName[]) => void;
};

function answerFor(checkIn: DailyCheckIn, name: DailyCheckInSymptomAnswer["name"]) {
  return checkIn.symptoms.find((answer) => answer.name === name) ??
    ({ name, status: "not_recorded", rating: null } satisfies DailyCheckInSymptomAnswer);
}

export function DailyCheckInFlow({
  initial,
  logs,
  today,
  startAt = "home",
  draftMode = false,
  onPersist,
  onDraftChange,
  onDraftComplete,
  onEditActivities,
  onExit,
  exitLabel = "Back",
  selectedSymptoms,
  onSelectSymptoms,
}: Props) {
  const initialCheckIn = useMemo(
    () => dailyCheckInFromLog(initial),
    [initial],
  );
  const [page, setPage] = useState<FlowPage>(startAt);
  const [log, setLog] = useState<RecoveryLogInput>(initial);
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(initialCheckIn);
  const [original, setOriginal] = useState<DailyCheckIn>(initialCheckIn);
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState(initialCheckIn.summary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preferences = useSymptomPreferences(!draftMode);
  const [daySelection, setDaySelection] = useState<CheckInSymptomName[] | null>(initial.dailyCheckIn?.selectedSymptoms ?? null);
  const [choosingSymptoms, setChoosingSymptoms] = useState(false);
  const selectedNames = daySelection ?? selectedSymptoms ?? preferences.selected ?? defaultSymptoms;
  const flowSymptoms = checkInSymptoms.filter(item => selectedNames.includes(item.name) ||
    checkIn.symptoms.some(answer => answer.name === item.name && answer.status === "recorded"));
  const dates = weekDates(today);
  const savedDates = new Set(logs.filter(hasSavedCheckIn).map((entry) => entry.date));
  const symptom = flowSymptoms[symptomIndex];
  const currentAnswer = symptom ? answerFor(checkIn, symptom.name) : undefined;
  const insight = draftMode ? null : weeklyInsight(logs, today);
  const overallLabel = overallChoices.find((choice) => choice.value === checkIn.overallFeeling)?.label;

  function keepDraft(next: RecoveryLogInput) {
    setLog(next);
    onDraftChange?.(next);
  }

  async function persist(nextCheckIn: DailyCheckIn) {
    nextCheckIn = { ...nextCheckIn, selectedSymptoms: nextCheckIn.selectedSymptoms ?? selectedNames };
    const nextLog: RecoveryLogInput = {
      ...log,
      dailyCheckIn: nextCheckIn,
      symptoms: symptomsForRecoveryLog(nextCheckIn, log.symptoms),
    };
    setCheckIn(nextCheckIn);
    setError("");
    if (draftMode) {
      keepDraft(nextLog);
      return true;
    }
    if (!onPersist) return false;
    setSaving(true);
    try {
      const saved = await onPersist(nextLog);
      setLog(saved);
      setCheckIn(saved.dailyCheckIn ?? nextCheckIn);
      return true;
    } catch {
      setError("This check-in could not be saved. Your answers are still here; try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function chooseOverall(value: DailyCheckIn["overallFeeling"]) {
    if (await persist({ ...checkIn, overallFeeling: value })) setPage("saved");
  }

  async function answerSymptom(
    answer: DailyCheckInSymptomAnswer,
    nextIndex: number,
  ) {
    const next = {
      ...checkIn,
      symptoms: checkIn.symptoms.map((item) => item.name === answer.name ? answer : item),
    };
    if (await persist(next)) {
      if (nextIndex >= flowSymptoms.length) setPage("review");
      else setSymptomIndex(nextIndex);
    }
  }

  async function saveReview() {
    if (await persist(checkIn)) {
      setPage("saved");
    }
  }

  function chooseActivityAnswer(value: DailyCheckIn["worseWithActivity"]) {
    if (page === "edit") {
      setCheckIn((current) => ({ ...current, worseWithActivity: value }));
      return;
    }
    void persist({ ...checkIn, worseWithActivity: value });
  }

  function skipActivityAnswer() {
    if (page === "edit") {
      setCheckIn((current) => ({ ...current, worseWithActivity: null }));
      return;
    }
    void persist({ ...checkIn, worseWithActivity: null });
  }

  const title = page === "home" ? "How is today, overall?"
    : page === "symptoms" ? "Add symptoms"
      : page === "voice" ? "Use voice-to-text"
        : page === "review" ? "Review my check-in"
          : page === "edit" ? "Edit your check-in"
            : draftMode ? "Your first summary is ready to review." : "Today’s check-in";

  return <div className="space-y-5">
    {onExit && <Button variant="outline" size="sm" onClick={onExit}><ArrowLeft />{exitLabel}</Button>}
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {page === "saved" ? (draftMode ? "SUMMARY READY" : "CHECK-IN SAVED") : page === "edit" ? "EDIT CHECK-IN" : "DAILY CHECK-IN"}
      </p>
      <h2 className="font-serif text-3xl font-medium leading-tight text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{formatDate(initial.date)}</p>
    </header>
    {(page === "home" || page === "symptoms" || page === "review" || page === "edit") && <div className="space-y-3">
      <Button variant="outline" disabled={saving} onClick={() => setChoosingSymptoms(value => !value)}>Choose symptoms to track</Button>
      {((!initial.dailyCheckIn && preferences.profile && !preferences.profile.selectedSymptoms) || choosingSymptoms || draftMode && page === "home") &&
        <SymptomSelector key={(draftMode ? selectedSymptoms ?? defaultSymptoms : preferences.selected).join(",")} selected={draftMode ? selectedSymptoms ?? defaultSymptoms : preferences.selected} onSave={async names => {
          if (!draftMode) await preferences.save(names);
          onSelectSymptoms?.(names);
          setDaySelection(names); setCheckIn(current => ({ ...current, selectedSymptoms: names })); setSymptomIndex(0); setChoosingSymptoms(false);
        }} />}
    </div>}

    {page === "home" && <>
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold">Your last seven days</p>
        <div className="grid grid-cols-7 gap-1" aria-label="Your last seven days">
          {dates.map((date) => (
            <div key={date} className="flex min-w-0 flex-col items-center gap-1 rounded-lg bg-muted/50 px-1 py-2">
              <span className="text-[11px] text-muted-foreground">{formatWeekday(date)}</span>
              <span className="text-sm font-semibold">{formatDayNumber(date)}</span>
              <span className={savedDates.has(date) ? "text-primary" : "text-muted-foreground"} aria-label={savedDates.has(date) ? "Check-in saved" : "No check-in"}>{savedDates.has(date) ? "•" : "—"}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4 bg-secondary p-5">
        <div>
          <h3 className="font-serif text-2xl font-medium">How is today, overall?</h3>
          <p className="mt-2 text-sm text-muted-foreground">One tap saves a check-in. Add detail now or later.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {overallChoices.map((choice) => <Button key={choice.value} variant={checkIn.overallFeeling === choice.value ? "default" : "outline"} size="sm" aria-pressed={checkIn.overallFeeling === choice.value} onClick={() => void chooseOverall(choice.value)} disabled={saving} data-testid={`overall-${choice.value}`}>{choice.label}</Button>)}
        </div>
      </Card>
      <Button variant="outline" onClick={() => { setSymptomIndex(0); setPage(flowSymptoms.length ? "symptoms" : "review"); }}><Plus />Add symptoms</Button>
      <Button variant="secondary" onClick={() => { setVoiceDraft(checkIn.summary); setPage("voice"); }}>Use voice-to-text</Button>
      {onEditActivities && <Button variant="outline" onClick={onEditActivities}>Log food, movement and pacing</Button>}
    </>}

    {page === "symptoms" && symptom && currentAnswer && <>
      <div className="space-y-2">
        <div className="text-sm font-medium">Progress {symptomIndex + 1} of {flowSymptoms.length}</div>
        <div role="progressbar" aria-label="Symptom progress" aria-valuemin={1} aria-valuemax={flowSymptoms.length} aria-valuenow={symptomIndex + 1} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((symptomIndex + 1) / flowSymptoms.length) * 100}%` }} /></div>
      </div>
      <Card className="space-y-4 p-5">
        <div><h3 className="font-serif text-2xl font-medium">{symptom.label}</h3><p className="mt-2 text-sm text-muted-foreground">Choose the description that fits today, or skip.</p></div>
        <div className="grid gap-2">
          {ratingChoices.map((choice) => <Button key={choice.value} variant={currentAnswer.status === "recorded" && currentAnswer.rating === choice.value ? "default" : "outline"} aria-pressed={currentAnswer.status === "recorded" && currentAnswer.rating === choice.value} onClick={() => void answerSymptom({ name: symptom.name, status: "recorded", rating: choice.value }, symptomIndex + 1)} disabled={saving} data-testid={`rating-${symptom.name}-${choice.value}`}>{choice.label}</Button>)}
        </div>
        <Button variant="outline" onClick={() => void answerSymptom({ name: symptom.name, status: "not_recorded", rating: null }, symptomIndex + 1)} disabled={saving}>Skip this symptom</Button>
      </Card>
      <div className="flex flex-col gap-2 sm:flex-row">
        {symptomIndex > 0 && <Button variant="outline" onClick={() => setSymptomIndex((value) => Math.max(0, value - 1))} disabled={saving}><ArrowLeft />Previous</Button>}
        <Button variant="secondary" onClick={async () => { if (await persist(checkIn)) setPage("saved"); }} disabled={saving}>Save and stop here</Button>
      </div>
    </>}

    {page === "voice" && <Card className="space-y-4 bg-secondary p-5">
      <div><h3 className="font-serif text-2xl font-medium">Speak your check-in</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap the text field, then use the microphone on your device’s keyboard or browser dictation. Your words appear here as editable text. Stillwell does not create or upload an audio recording.</p></div>
      <label htmlFor="voice-check-in" className="text-sm font-medium">Your words</label>
      <Textarea id="voice-check-in" value={voiceDraft} onChange={(event) => setVoiceDraft(event.target.value.slice(0, 500))} placeholder="Tap here to type, or use your keyboard’s microphone to dictate." maxLength={500} data-testid="textarea-voice-check-in" />
      <p className="text-xs leading-5 text-muted-foreground">Dictation depends on your device and browser settings. Review each symptom before saving; only the ratings you confirm will be recorded.</p>
      <Button onClick={() => { setCheckIn((value) => ({ ...value, summary: voiceDraft })); setPage("review"); }}>Review my check-in <ArrowRight /></Button>
      <Button variant="outline" onClick={() => { setCheckIn((value) => ({ ...value, summary: voiceDraft })); setSymptomIndex(0); setPage(flowSymptoms.length ? "symptoms" : "review"); }}>Rate symptoms instead</Button>
    </Card>}

    {(page === "review" || page === "edit") && <>
      <Card className="space-y-2 bg-secondary p-5">
        <h3 className="font-serif text-xl font-medium">A private summary for your own review</h3>
        <p className="text-sm leading-6 text-muted-foreground">Your check-in is part of your journal. Only clinicians you choose to share with can read it. Your dictated words are editable text; Stillwell does not create or share an audio recording.</p>
      </Card>
      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold">Overall, how did today feel?</p>
        {page === "edit" && <p className="text-xs text-muted-foreground">Was: {overallChoices.find((item) => item.value === original.overallFeeling)?.label ?? "Not recorded"}</p>}
        <div className="flex flex-wrap gap-2">{overallChoices.map((choice) => <Button key={choice.value} size="sm" variant={checkIn.overallFeeling === choice.value ? "default" : "outline"} aria-pressed={checkIn.overallFeeling === choice.value} onClick={() => setCheckIn((value) => ({ ...value, overallFeeling: choice.value }))}>{choice.label}</Button>)}</div>
      </Card>
      {flowSymptoms.map((config) => {
        const answer = answerFor(checkIn, config.name);
        const previous = answerFor(original, config.name);
        const answerLabel = ratingLabel(answer);
        const previousLabel = ratingLabel(previous);
        return <Card key={config.name} className="space-y-3 p-5">
          <h3 className="font-serif text-xl font-medium">{config.label}</h3>
          <p className="text-sm text-muted-foreground">{answerLabel}</p>
          {page === "edit" && <p className="text-xs text-muted-foreground">Was: {previousLabel}</p>}
          <div className="grid grid-cols-2 gap-2">
            {ratingChoices.map((choice) => <Button key={choice.value} size="sm" variant={answer.status === "recorded" && answer.rating === choice.value ? "default" : "outline"} aria-pressed={answer.status === "recorded" && answer.rating === choice.value} onClick={() => setCheckIn((current) => ({ ...current, symptoms: current.symptoms.map((item) => item.name === config.name ? { name: config.name, status: "recorded", rating: choice.value } : item) }))}>{choice.label}</Button>)}
            <Button size="sm" variant={answer.status === "not_recorded" ? "secondary" : "outline"} aria-pressed={answer.status === "not_recorded"} onClick={() => setCheckIn((current) => ({ ...current, symptoms: current.symptoms.map((item) => item.name === config.name ? { name: config.name, status: "not_recorded", rating: null } : item) }))}>Not recorded</Button>
          </div>
        </Card>;
      })}
      <div className="space-y-2">
        <label htmlFor="check-in-summary" className="text-sm font-medium">Short summary (optional)</label>
        <Textarea id="check-in-summary" value={checkIn.summary} onChange={(event) => setCheckIn((current) => ({ ...current, summary: event.target.value.slice(0, 500) }))} placeholder="Add a few words about how today felt, or edit what you dictated." maxLength={500} data-testid="textarea-check-in-summary" />
        {page === "edit" && <p className="text-xs text-muted-foreground">Was: {original.summary.trim() || "No summary added."}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {page === "review" && flowSymptoms.length > 0 && <Button variant="outline" onClick={() => { setSymptomIndex(0); setPage("symptoms"); }}>Rate symptoms</Button>}
        <Button onClick={() => void saveReview()} disabled={saving} data-testid={page === "edit" ? "button-save-check-in-changes" : "button-save-check-in"}>{saving ? "Saving…" : draftMode ? "Use this summary" : page === "edit" ? "Save changes" : "Save check-in"} <Check /></Button>
      </div>
    </>}

    {page === "saved" && <>
      <Card className="space-y-4 bg-secondary p-5">
        {draftMode
          ? <p className="text-sm leading-6 text-muted-foreground">Not stored until you agree to save your starting summary.</p>
          : <h3 className="font-serif text-2xl font-medium">{checkIn.summary.trim() || summaryLine(checkIn)}</h3>}
        {draftMode
          ? <p className="text-sm leading-6">{checkIn.summary.trim() || (overallLabel ? `Today felt ${overallLabel.toLowerCase()}.` : "No additional reflection entered.")}</p>
          : <p className="text-sm text-muted-foreground">Saved for {formatDate(initial.date)}</p>}
        <div className="flex flex-wrap gap-2">
          {overallLabel && <span className="rounded-full border border-border bg-card px-3 py-2 text-xs">Overall · {overallLabel}</span>}
          {checkIn.symptoms.filter(answer => flowSymptoms.some(item => item.name === answer.name)).map((answer) => {
            const config = checkInSymptoms.find((item) => item.name === answer.name);
            const label = ratingLabel(answer);
            return <span key={answer.name} className="rounded-full border border-border bg-card px-3 py-2 text-xs">{config?.label} · {label}</span>;
          })}
        </div>
      </Card>
      {insight && <Card className="space-y-2 p-5"><p className="text-sm font-semibold">A weekly pattern</p><p className="text-sm leading-6">{insight}</p><p className="text-xs text-muted-foreground">A pattern to notice, not a diagnosis.</p></Card>}
      {draftMode
        ? <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => onDraftComplete?.({ ...log, dailyCheckIn: checkIn, symptoms: symptomsForRecoveryLog(checkIn, log.symptoms) })}>Use this summary <ArrowRight /></Button><Button variant="outline" onClick={() => { setOriginal(checkIn); setPage("edit"); }}>Edit this summary</Button></div>
        : <Button onClick={() => { setOriginal(checkIn); setPage("edit"); }}>{today === initial.date ? "Edit today" : "Edit this check-in"}</Button>}
      {onEditActivities && <Button variant="outline" onClick={onEditActivities}>Edit food, movement and pacing</Button>}
      {!draftMode && !onExit && <Button variant="outline" onClick={() => setPage("home")}>Back to today</Button>}
    </>}

    {(page === "home" || page === "review" || page === "edit" || page === "saved") && <Card className="space-y-3 p-5">
      <h3 className="font-serif text-xl">{activityQuestion}</h3>
      <p className="text-sm text-muted-foreground">Optional. Skip if you’re not sure what to record.</p>
      <div className="flex flex-wrap gap-2">
        {activityAnswerChoices.map(choice => <Button key={choice.value} variant={checkIn.worseWithActivity === choice.value ? "default" : "outline"} aria-pressed={checkIn.worseWithActivity === choice.value} disabled={saving} onClick={() => chooseActivityAnswer(choice.value)}>{choice.label}</Button>)}
        <Button variant="outline" disabled={saving} onClick={skipActivityAnswer}>Skip</Button>
      </div>
      {page === "edit" && <p className="text-xs text-muted-foreground">Was: {activityAnswerChoices.find(choice => choice.value === original.worseWithActivity)?.label ?? "Not recorded"}</p>}
    </Card>}
    {error && <Card role="alert" className="border-destructive p-4 text-sm text-destructive">{error}</Card>}
  </div>;
}
