import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import {
  answerLabel,
  cadenceFor,
  daysSince,
  baseline,
  exampleEntries,
  exampleToday,
  formatDate,
  isValidDate,
  protocolChoices,
  protocolStart,
  routineLabels,
  scaleLabels,
  symptoms,
  type JourneyEntry,
  type RoutineStatus,
  type SymptomId,
} from "./_journeyModel";

const statusChoices: { value: RoutineStatus; label: string }[] = [
  { value: "did", label: "Did" },
  { value: "did_not", label: "Did not" },
  { value: "not_planned", label: "Not planned" },
];

export function PhoneCheckinJourney() {
  const [step, setStep] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("screen");
    return requested === "journey" ? 4 : requested === "voice" ? 2 : 0;
  });
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [editingSymptoms, setEditingSymptoms] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState(exampleToday);
  const [tracked, setTracked] = useState<SymptomId[]>(["headache", "sleep", "attention"]);
  const [ratings, setRatings] = useState<JourneyEntry["symptoms"]>({});
  const [statuses, setStatuses] = useState<JourneyEntry["statuses"]>({});
  const [routineNotes, setRoutineNotes] = useState<NonNullable<JourneyEntry["routineNotes"]>>({});
  const [reflection, setReflection] = useState("");
  const [markMoment, setMarkMoment] = useState(false);
  const [moment, setMoment] = useState("");
  const [voicePreview, setVoicePreview] = useState(() => new URLSearchParams(window.location.search).get("screen") === "voice");
  const [voiceStage, setVoiceStage] = useState<"intro" | "recording" | "review">("intro");
  const [history, setHistory] = useState<JourneyEntry[]>(() => exampleEntries.map((entry) => ({ ...entry, id: `example-${entry.date}` })).reverse());
  const [momentEditorId, setMomentEditorId] = useState<string | null>(null);
  const [momentEditorText, setMomentEditorText] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const validDate = isValidDate(date) && date >= protocolStart && date <= exampleToday;
  const cadence = validDate ? cadenceFor(date) : null;
  const periodLabel = !cadence ? "the period you choose" : cadence === "daily" ? "today" : "over this past week";
  const visibleSymptoms = useMemo(() => symptoms.filter((item) => tracked.includes(item.id)), [tracked]);
  const activeSymptom = visibleSymptoms[Math.min(symptomIndex, visibleSymptoms.length - 1)];

  function toggleTracked(id: SymptomId) {
    setSymptomIndex(0);
    setTracked((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setRatings((current) => {
      const next = { ...current };
      if (tracked.includes(id)) delete next[id];
      return next;
    });
  }

  function saveEntry() {
    if (!cadence) return;
    const entry: JourneyEntry = {
      id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date,
      cadence,
      symptoms: { ...ratings },
      statuses: { ...statuses },
      routineNotes: { ...routineNotes },
      reflection: reflection.trim(),
      moment: markMoment && moment.trim() ? moment.trim() : undefined,
      momentMarked: markMoment && Boolean(moment.trim()),
      previewEntry: true,
    };
    setHistory((items) => [entry, ...items].sort((a, b) => b.date.localeCompare(a.date)));
    setSavedNotice("Added to temporary preview history. This entry is only held in this frame until it is reloaded.");
    setMomentEditorId(null);
    setStep(4);
  }

  function beginAnother() {
    setRatings({});
    setStatuses({});
    setRoutineNotes({});
    setReflection("");
    setMarkMoment(false);
    setMoment("");
    setVoicePreview(false);
    setVoiceStage("intro");
    setSymptomIndex(0);
    setSavedNotice("");
    setMomentEditorId(null);
    setStep(0);
  }

  function nextStep() {
    if (step === 0 && activeSymptom && symptomIndex < visibleSymptoms.length - 1) {
      setSymptomIndex((current) => current + 1);
    } else {
      setStep((current) => current + 1);
    }
  }

  function stepTitle() {
    return ["Symptoms", "Food, movement & rest", "Your words", "Review this check-in", "Your journey"][step];
  }

  function renderFooter() {
    if (step === 4) {
      return <Button type="button" onClick={() => { setSymptomIndex(0); setStep(0); }} className="w-full">Return to check-in draft</Button>;
    }
    return (
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => { if (step === 0) setSymptomIndex((current) => Math.max(0, current - 1)); else setStep((value) => value - 1); }} disabled={step === 0 && symptomIndex === 0}>Back</Button>
        {step < 3
          ? <div className="flex items-center gap-2"><Button type="button" variant="ghost" disabled={!validDate} onClick={nextStep}>Skip</Button><Button type="button" disabled={!validDate} onClick={nextStep}>Continue</Button></div>
          : <Button type="button" disabled={!validDate} onClick={saveEntry}>Add to preview history</Button>}
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <img src="/__mockup/images/stillwell-logo.png" alt="Stillwell" className="h-8 w-auto" />
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step === 4 ? 0 : 4)}>{step === 4 ? "Check-in" : "My journey"}</Button>
      </header>
      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        <p className="text-xs text-muted-foreground">Example journey · design preview · not connected to a patient</p>
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A note before you begin</p>
            <p className="text-sm leading-6">Not for a new injury or emergency. Worsening symptoms need clinician advice. Severe headache, repeated vomiting, confusion, weakness, or feeling unsafe needs urgent local help.</p>
          </CardContent>
        </Card>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{step === 4 ? "Your own history" : `Step ${step + 1} of 4 · optional`}</p>
          <h1 className="font-serif text-2xl font-medium leading-tight tracking-tight">{stepTitle()}</h1>
          {step < 4 && <p className="text-sm leading-6 text-muted-foreground">A small place to notice what matters. Skip anything; your draft stays here as you move back.</p>}
        </div>

        <Card>
          {step === 0 && <CardContent className="space-y-5 pt-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">{cadence ? `${cadence === "weekly" ? "Weekly" : "Daily"} check-in · ${formatDate(date)}` : "Choose a preview date"}</p>
              <p className="text-xs leading-5 text-muted-foreground">{validDate ? `Example day ${daysSince(protocolStart, date)}. Reflect on ${periodLabel}.` : "A valid date is needed to choose the check-in period."}</p>
              <Button type="button" size="sm" variant="ghost" aria-expanded={editingDate} onClick={() => setEditingDate((current) => !current)}>Explore daily / weekly cadence</Button>
              {editingDate && <div className="space-y-2"><label htmlFor="phone-checkin-date" className="text-sm font-medium">Preview date within the example journey</label><Input id="phone-checkin-date" type="date" required min={protocolStart} max={exampleToday} value={date} aria-invalid={!validDate} onChange={(event) => setDate(event.target.value)} /><p className="text-xs text-muted-foreground">Daily on days 1–30, then weekly from day 31. This is logging cadence, not recovery progress.</p></div>}
              {!validDate && <p role="alert" className="text-sm text-destructive">Choose a date between {formatDate(protocolStart)} and {formatDate(exampleToday)}.</p>}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{visibleSymptoms.length} chosen symptoms · one at a time · all optional</p>
              <Button type="button" variant="outline" size="sm" aria-expanded={editingSymptoms} onClick={() => setEditingSymptoms((current) => !current)}>{editingSymptoms ? "Done choosing symptoms" : "Change tracked symptoms"}</Button>
              {editingSymptoms && <div className="space-y-2">
                {symptoms.map((item) => <label key={item.id} className="flex items-start gap-3 text-sm leading-5">
                  <Checkbox checked={tracked.includes(item.id)} onCheckedChange={() => toggleTracked(item.id)} />
                  <span>{item.label}</span>
                </label>)}
              </div>}
            </div>
            {activeSymptom && <fieldset key={activeSymptom.id} className="space-y-3 border-t border-border pt-3">
              <legend className="text-base font-semibold">{activeSymptom.label} · {Math.min(symptomIndex, visibleSymptoms.length - 1) + 1} of {visibleSymptoms.length}</legend>
              <p className="text-sm text-muted-foreground">How has this felt {periodLabel}?</p>
              <p className="text-xs text-muted-foreground">0 Not present · 1 Mild · 2 Moderate · 3 Severe · 4 Very severe</p>
              <div className="flex flex-wrap gap-2">
                {scaleLabels.map((label, value) => <Button key={label} type="button" size="sm" variant={ratings[activeSymptom.id] === value ? "default" : "outline"} aria-pressed={ratings[activeSymptom.id] === value} onClick={() => setRatings((current) => { const next = { ...current }; if (next[activeSymptom.id] === value) delete next[activeSymptom.id]; else next[activeSymptom.id] = value; return next; })}>{value} · {label}</Button>)}
                {ratings[activeSymptom.id] !== undefined && <Button type="button" size="sm" variant="ghost" onClick={() => setRatings((current) => { const next = { ...current }; delete next[activeSymptom.id]; return next; })}>Clear</Button>}
              </div>
            </fieldset>}
            {!tracked.length && <p className="text-sm text-muted-foreground">No symptoms selected. You can continue without ratings.</p>}
          </CardContent>}

          {step === 1 && <CardContent className="space-y-5 pt-5">
            <p className="text-sm leading-6 text-muted-foreground">For {periodLabel}, choose Did, Did not, or Not planned. These are your observations, not targets. Rest is a valid choice.</p>
            {(Object.entries(routineLabels) as [keyof JourneyEntry["statuses"], string][]).map(([key, label]) => <fieldset key={key} className="space-y-3 border-t border-border pt-4">
              <legend className="text-sm font-semibold">{label}</legend>
              <div className="flex flex-wrap gap-2">{statusChoices.map((option) => <Button key={option.value} type="button" size="sm" variant={statuses[key] === option.value ? "default" : "outline"} aria-pressed={statuses[key] === option.value} onClick={() => setStatuses((current) => { const next = { ...current }; if (next[key] === option.value) delete next[key]; else next[key] = option.value; return next; })}>{option.label}</Button>)}</div>
              {key === "food" && <p className="text-xs leading-5 text-muted-foreground">Your food and hydration choices are yours: {protocolChoices.slice(0, 2).join(", ").toLowerCase()} or something else.</p>}
              {key === "movement" && <p className="text-xs leading-5 text-muted-foreground">Movement is only what is already cleared for you. Pausing or resting is welcome.</p>}
              <label htmlFor={`routine-note-${key}`} className="block text-sm">Anything to note? Optional</label>
              <Textarea id={`routine-note-${key}`} value={routineNotes[key] ?? ""} onChange={(event) => setRoutineNotes((current) => ({ ...current, [key]: event.target.value }))} placeholder={key === "food" ? "Meals, fluids, or changes you want to remember…" : "What you did, or how you chose to rest…"} />
            </fieldset>)}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h2 className="text-sm font-semibold">Self-paced movement milestones</h2>
              <ol className="list-inside list-decimal space-y-2 text-sm leading-5 text-muted-foreground">
                <li>Observe current capacity.</li>
                <li>Repeat only if a clinician already cleared that routine.</li>
                <li>Review a possible next step with a clinician.</li>
              </ol>
              <p className="text-xs leading-5 text-muted-foreground">No prescribed progression or automatic medical clearance.</p>
            </div>
          </CardContent>}

          {step === 2 && <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={voicePreview ? "outline" : "default"} onClick={() => setVoicePreview(false)}>Type a reflection</Button>
              <Button type="button" variant={voicePreview ? "default" : "outline"} onClick={() => setVoicePreview(true)}>Voice-flow preview</Button>
            </div>
            {voicePreview && <div className="space-y-2 rounded-lg bg-muted p-4">
              <h2 className="text-sm font-semibold">Voice-flow design preview</h2>
              <p className="text-sm leading-6 text-muted-foreground">No microphone access, audio, or transcription in this design preview.</p>
              {voiceStage === "intro" && <div className="space-y-3"><p className="text-sm">The flow would give you space to speak, then review what to keep.</p><Button type="button" variant="secondary" onClick={() => setVoiceStage("recording")}>Preview recording screen</Button></div>}
              {voiceStage === "recording" && <div className="space-y-3"><p className="text-sm font-semibold" role="status">Recording-screen concept · microphone is off</p><p className="text-sm">Prompt: What felt different, and what did you do or choose not to do?</p><Button type="button" variant="secondary" onClick={() => setVoiceStage("review")}>Preview stop and review</Button><Button type="button" variant="ghost" onClick={() => setVoiceStage("intro")}>Back to voice introduction</Button></div>}
              {voiceStage === "review" && <div className="space-y-3"><p className="text-sm font-semibold">Review your reflection</p><p className="text-sm">Use the typed test note below. It is not a transcript; you choose what to keep.</p><Button type="button" variant="outline" onClick={() => setVoiceStage("intro")}>Try voice-flow preview again</Button></div>}
            </div>}
            <label htmlFor="personal-reflection" className="block space-y-2 text-sm font-medium">
              Anything you want to remember about {periodLabel}?
              <span className="block text-xs font-normal text-muted-foreground">Optional · your words matter as much as ratings</span>
            </label>
            <Textarea id="personal-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="A moment, a change, or nothing at all…" />
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox checked={markMoment} onCheckedChange={(checked) => setMarkMoment(checked === true)} />
              <span>Mark a moment that felt meaningful to me</span>
            </label>
            {markMoment && <label htmlFor="meaningful-moment" className="block space-y-2 text-sm font-medium">
              What would you like to remember?
              <Textarea id="meaningful-moment" value={moment} onChange={(event) => setMoment(event.target.value)} placeholder="Describe the moment in your own words." />
              <span className="text-xs font-normal text-muted-foreground">A moment is your account of your experience, not evidence that a routine caused a change.</span>
            </label>}
          </CardContent>}

          {step === 3 && <CardContent className="space-y-4 pt-5">
            <p className="text-sm leading-6 text-muted-foreground">Review what you chose. Blank or skipped answers stay blank; they are never counted as zero.</p>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">{formatDate(date)} · {cadence} check-in</h2>
              <div className="space-y-2">{visibleSymptoms.map((item) => <p key={item.id} className="text-sm">{item.label}: <span className="text-muted-foreground">{ratings[item.id] === undefined ? "Not recorded" : `${ratings[item.id]}/4 · ${scaleLabels[ratings[item.id] as number]}`}</span></p>)}</div>
              <div className="space-y-2 border-t border-border pt-3">{(Object.keys(routineLabels) as (keyof JourneyEntry["statuses"])[]).map((key) => <div key={key}><p className="text-sm">{routineLabels[key]}: <span className="text-muted-foreground">{answerLabel(statuses[key])}</span></p>{routineNotes[key]?.trim() && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{routineNotes[key]}</p>}</div>)}</div>
              <div className="space-y-2 border-t border-border pt-3">
                <h3 className="text-sm font-semibold">Your words</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{reflection || "No reflection recorded."}</p>
                {markMoment && moment.trim() && <p className="text-sm leading-6">A moment I marked: <span className="text-muted-foreground">{moment}</span></p>}
              </div>
            </div>
          </CardContent>}

          {step === 4 && <CardContent className="space-y-4 pt-5">
            <p className="text-sm leading-6 text-muted-foreground">Ratings, words, and what you did sit together. Seven sparse example entries illustrate the same journey as the clinician view; they are not a complete daily log.</p>
            <p className="text-sm leading-6">Looking back, is there a moment you did not notice at the time? You can mark a past entry in your own words.</p>
            <div className="space-y-2 rounded-lg bg-muted p-4"><h2 className="text-sm font-semibold">Starting snapshot · example</h2>{(["headache", "sleep", "attention"] as SymptomId[]).map((id) => <p key={id} className="text-sm">{symptoms.find((item) => item.id === id)?.label}: {baseline[id]}/4 · {scaleLabels[baseline[id] as number]}</p>)}</div>
            <Button type="button" variant="outline" onClick={beginAnother}>New check-in · clear current draft</Button>
            {!history.length
              ? <div className="space-y-3 rounded-lg bg-muted p-4"><p className="text-sm">Your journey begins when you choose to add an entry.</p><Button type="button" onClick={() => setStep(0)}>Begin check-in</Button></div>
              : history.map((entry, index) => <article key={entry.id ?? `${entry.date}-${index}`} className="space-y-3 border-t border-border pt-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{entry.previewEntry ? "Your temporary test entry" : "Synthetic example"} · {entry.cadence} check-in</p><h2 className="text-base font-semibold">{formatDate(entry.date)}</h2></div>
                <div className="space-y-1">{Object.entries(entry.symptoms).filter(([, value]) => value !== undefined).map(([id, value]) => <p key={id} className="text-sm">{symptoms.find((item) => item.id === id)?.label}: <span className="text-muted-foreground">{value}/4 · {scaleLabels[value as number]}</span></p>)}
                  {!Object.keys(entry.symptoms).length && <p className="text-sm text-muted-foreground">No symptoms recorded.</p>}</div>
                <p className="text-sm">Food and hydration: <span className="text-muted-foreground">{answerLabel(entry.statuses.food)}</span></p>
                <p className="text-sm">Movement or rest: <span className="text-muted-foreground">{answerLabel(entry.statuses.movement)}</span></p>
                {(Object.entries(entry.routineNotes ?? {})).map(([key, note]) => note?.trim() && <p key={key} className="whitespace-pre-wrap text-sm text-muted-foreground">{routineLabels[key as keyof typeof routineLabels]} note: {note}</p>)}
                <p className="whitespace-pre-wrap text-sm leading-6">{entry.reflection || <span className="text-muted-foreground">No reflection recorded.</span>}</p>
                {entry.momentMarked && entry.moment && <p className="rounded-lg bg-muted p-3 text-sm leading-6"><span className="font-semibold">{entry.momentEdited ? "Your temporary moment note:" : "A moment I marked:"}</span> {entry.moment}</p>}
                <Button type="button" size="sm" variant="outline" onClick={() => { setMomentEditorId(entry.id ?? null); setMomentEditorText(entry.moment ?? ""); }}>{entry.momentMarked ? "Edit this meaningful moment" : "Mark this moment"}</Button>
                {momentEditorId === entry.id && <div className="space-y-2">
                  <label className="text-sm" htmlFor={`moment-${entry.id}`}>What do you notice looking back?</label>
                  <Textarea id={`moment-${entry.id}`} value={momentEditorText} onChange={(event) => setMomentEditorText(event.target.value)} />
                  <p className="text-xs text-muted-foreground">Your observation—not an inferred turning point or evidence of what caused a change.</p>
                  <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!momentEditorText.trim()} onClick={() => { setHistory((items) => items.map((item) => item.id === entry.id ? { ...item, moment: momentEditorText.trim(), momentMarked: true, momentEdited: true } : item)); setMomentEditorId(null); }}>Keep in this preview</Button><Button type="button" size="sm" variant="ghost" onClick={() => setMomentEditorId(null)}>Cancel</Button>{entry.momentMarked && <Button type="button" size="sm" variant="ghost" onClick={() => { setHistory((items) => items.map((item) => item.id === entry.id ? { ...item, moment: undefined, momentMarked: false } : item)); setMomentEditorId(null); }}>Unmark this moment</Button>}</div>
                </div>}
              </article>)}
            {savedNotice && <p role="status" className="text-xs leading-5 text-muted-foreground">{savedNotice}</p>}
            <p className="text-xs leading-5 text-muted-foreground">These test inputs stay isolated in this phone frame. The companion clinician view uses its own fixed illustration, not these entries.</p>
          </CardContent>}
        </Card>

        <div className="sticky bottom-0 z-10 space-y-3 border-t border-border bg-background py-3">{renderFooter()}</div>
        <footer className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Daily in the first 30 days, then weekly by default; change the preview date to explore either cadence. Logging is self-paced, not a completion score.</footer>
      </div>
    </main>
  );
}
