import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowRight, Mic, PencilLine, Save, ShieldCheck, Trash2 } from "lucide-react";
import {
  getGetMvpRecoveryQueryKey, getGetRecoveryQueryKey, getGetMyCareTeamQueryKey, useGetMvpRecovery,
  useSaveMvpJournal, useDeleteRecovery, useDeletePatientAccount,
  useGetMyCareTeam, useRemoveCareClinician, useCancelPatientCareInvite,
  useCreatePatientCareInvite, useResendPatientCareInvite,
} from "@workspace/api-client-react";
import type { MvpEntry, MvpRecovery, MvpScores } from "@workspace/api-client-react";
import { scanKeywords, STAGES } from "@workspace/intake-ai";
import { careTeamErrorMessage, inviteFieldError, notSentMessage, sendFailedMessage } from "@workspace/recovery-journal/care-team-copy";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { MvpShell } from "@/components/MvpShell";
import { careMemory, errorCode, httpStatus, pendingLink, privateMutation, privateQuery } from "@/lib/care-link";
import { clearDraft } from "@/lib/recovery";

type MvpSection = "dashboard" | "journal" | "account" | "invite";
const names: Record<keyof MvpScores, string> = {
  headache: "Headache", fog: "Mental fog", light: "Light sensitivity", sleep: "Trouble sleeping",
};
const stageNames = Object.values(STAGES);
const stageGuidance = [
  ["This stage centers on rest and easy daily life.", "More demanding activity may not fit this stage.", "A review of how everyday activity is going can inform the next check."],
  ["This stage is about everyday activity in ways that feel manageable.", "Notice whether symptoms change with activity.", "A steady pattern of ordinary daily activity can be discussed at your next check."],
  ["This stage introduces light exercise as part of the roadmap.", "The roadmap is not a prescription to exercise or push through symptoms.", "Your weekly check-in records how the stage is fitting."],
  ["This stage focuses on building back toward full days at work or school.", "Contact activity is a separate decision and is not cleared by this stage.", "A consistent record can support a discussion with your clinician."],
  ["This stage describes full days and higher-demand activity.", "This roadmap is not medical clearance for contact, driving, or other risk.", "Discuss return-to-activity decisions with a qualified clinician."],
  ["This stage is a maintenance plan after the six-stage progression.", "Maintenance is not medical clearance or a promise that symptoms will not return.", "Optional check-ins can help you notice changes over time."],
] as const;
const todayLocal = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
type SpokenScoreField = keyof MvpScores | "planScore";
const spokenLabels: Array<[SpokenScoreField, string]> = [
  ["headache", "headache"],
  ["fog", "mental\\s+fog"],
  ["light", "light\\s+sensitivity"],
  ["sleep", "trouble\\s+sleeping"],
  ["planScore", "recovery\\s+plan"],
];
const spokenValues: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
function parseExplicitSpokenScores(transcript: string) {
  const result: Record<SpokenScoreField, number | null> = {
    headache: null, fog: null, light: null, sleep: null, planScore: null,
  };
  const ambiguous: SpokenScoreField[] = [];
  for (const [field, label] of spokenLabels) {
    const valuePattern = "(10|[0-9]|zero|one|two|three|four|five|six|seven|eight|nine|ten)";
    const matcher = new RegExp(`\\b${label}\\b(?:\\s+(?:is|was|at|rated|number))?\\s*(?:[:=]\\s*)?${valuePattern}\\b(?![\\w.]|\\s*(?:point|and\\s+a\\s+half)\\b)`, "gi");
    const values = Array.from(transcript.matchAll(matcher), match => spokenValues[match[1].toLowerCase()]);
    const unique = [...new Set(values)];
    if (unique.length === 1) result[field] = unique[0];
    else if (unique.length > 1) ambiguous.push(field);
  }
  return { result, ambiguous, recognized: Object.values(result).filter(value => value !== null).length };
}
function serverErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

function PatientHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <header className="space-y-2"><p className="eyebrow">{eyebrow}</p><h1 className="display text-4xl font-medium leading-tight sm:text-5xl">{title}</h1><p className="max-w-3xl text-base leading-7 text-muted-foreground">{detail}</p></header>;
}

function StageRoad({ stage }: { stage: string }) {
  const active = stage === "maintenance" ? 6 : Number(stage);
  return <ol aria-label="Six recovery stages" className="grid grid-cols-6 gap-2">
    {stageNames.slice(0, 6).map((name, index) => <li key={name} aria-current={index + 1 === active ? "step" : undefined} className="space-y-2">
      <span className={`block h-2 rounded-full ${index + 1 <= active ? "bg-primary" : "bg-muted"}`}/>
      <span className="sr-only">Stage {index + 1}{index + 1 === active ? ", current stage" : ""}</span>
    </li>)}
  </ol>;
}

function useMvpRecovery() {
  const { user } = useUser();
  const owner = user?.id ?? "";
  const key = useMemo(() => [...getGetMvpRecoveryQueryKey(), owner], [owner]);
  const query = useGetMvpRecovery<MvpRecovery>({ query: { enabled: Boolean(owner), queryKey: key, refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false } });
  return { query, key };
}

export function MvpPatientPage({ section }: { section: MvpSection }) {
  const { query, key } = useMvpRecovery();
  return <MvpShell>
    {section === "dashboard" && <Dashboard query={query} />}
    {section === "journal" && <Journal entries={query.data?.entries ?? []} recoveryQuery={query} cacheKey={key}/>}
    {section === "account" && <Account/>}
    {section === "invite" && <InviteDoctor/>}
  </MvpShell>;
}

function Dashboard({ query }: { query: UseQueryResult<MvpRecovery, unknown> }) {
  const newest = [...(query.data?.stages ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const stage = newest?.stage;
  const stageNumber = stage === "maintenance" ? 6 : Number(stage);
  const validStage = Number.isInteger(stageNumber) && stageNumber >= 1 && stageNumber <= 6;
  if (query.isLoading) return <div aria-label="Loading your recovery" className="space-y-4"><div className="h-12 animate-pulse rounded-xl bg-muted"/><div className="h-56 animate-pulse rounded-xl bg-muted"/></div>;
  if (query.isError) return <Card className="space-y-4 p-6" role="alert"><h1 className="display text-3xl">Your recovery could not load</h1><p className="text-base leading-7">Your saved entries have not changed. Please try again.</p><Button className="min-h-12" onClick={() => void query.refetch()}>Try again</Button></Card>;
  if (!stage || !validStage) return <Card className="space-y-4 p-6 sm:p-8"><p className="eyebrow">Your recovery</p><h1 className="display text-3xl">Start with your story</h1><p className="text-base leading-7 text-muted-foreground">Your private recovery roadmap begins with the intake. Your story and answers are not sent until you consent.</p><Button asChild className="min-h-12"><Link href="/dashboard/intake">Start intake <ArrowRight aria-hidden="true"/></Link></Button></Card>;
  const reason = newest?.reasons?.length ? newest.reasons : ["Your current stage is recorded in your recovery history."];
  const guidance = stageGuidance[stageNumber - 1];
  return <>
    <PatientHeader eyebrow="Your recovery" title="One day at a time." detail="Your roadmap and journal are here whenever they are useful. This is general information, not medical advice or clearance."/>
    <Card className="space-y-5 border-primary/30 bg-secondary p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current stage · {newest?.source === "clinician" ? "Doctor review" : newest?.source === "weekly" ? "Weekly check" : "Intake"}</p><h2 className="display mt-2 text-3xl">Stage {stage === "maintenance" ? "6 · Maintenance" : `${stage} · ${STAGES[stageNumber as keyof typeof STAGES]}`}</h2></div><ShieldCheck aria-hidden="true" className="size-7 text-primary"/></div>
      <StageRoad stage={stage}/>
      <section aria-labelledby="why-stage"><h3 id="why-stage" className="font-semibold">Why stage {stage === "maintenance" ? "6" : stage}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7">{reason.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>
    </Card>
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3 p-5"><p className="eyebrow">This week</p><p className="display text-3xl">{query.data?.daysThisWeek ?? 0} of 7 days</p><p className="text-base leading-7 text-muted-foreground">Next weekly check: {query.data?.nextCheck ? new Date(`${query.data.nextCheck}T12:00:00`).toLocaleDateString() : "Not scheduled yet"}</p><Button asChild variant="outline" className="min-h-12"><Link href="/dashboard/journal">Open journal <ArrowRight/></Link></Button></Card>
      <Card className="space-y-3 p-5"><p className="eyebrow">Your doctor</p><h2 className="display text-2xl">Optional, on your terms</h2><p className="text-base leading-7 text-muted-foreground">An invited doctor can see your scores, current stage, reasons, and stage history, and may change your stage with a note. Your written and dictated notes stay private.</p><Button asChild variant="outline" className="min-h-12"><Link href="/dashboard/invite-doctor">Invite your doctor</Link></Button></Card>
    </div>
    <Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">Your road</p><h2 className="display text-3xl">Six stages, in your own time.</h2><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stageNames.slice(0, 6).map((name, index) => <li key={name} className={`rounded-xl border p-4 ${index + 1 === stageNumber ? "border-primary bg-secondary" : "border-border"}`}><p className="text-sm text-muted-foreground">Stage {index + 1}</p><h3 className="mt-1 font-semibold">{name}</h3></li>)}</ol></Card>
    <Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">General stage guidance</p><h2 className="display text-2xl">Stage {stageNumber}</h2><div className="grid gap-4 md:grid-cols-3">{[["What to do", guidance[0]], ["Go easy on", guidance[1]], ["What can move you forward", guidance[2]]].map(([title, body]) => <section key={title}><h3 className="font-semibold">{title}</h3><p className="mt-2 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div><p className="border-t border-border pt-3 text-base leading-7 text-muted-foreground">This roadmap is general information, not a treatment plan or medical clearance. Follow advice from your clinician and seek urgent help for emergencies.</p></Card>
  </>;
}

function Rating({ label, value, onChange, lowLabel = "None", highLabel = "Worst", disabled = false }: {
  label: string;
  value: number | null;
  onChange: (score: number | null) => void;
  lowLabel?: string;
  highLabel?: string;
  disabled?: boolean;
}) {
  return <fieldset className="space-y-2"><legend className="font-semibold">{label}</legend><div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-11" role="group" aria-label={`${label}, from 0 to 10`}>
    {Array.from({ length: 11 }, (_, rating) => <Button type="button" key={rating} variant={rating === value ? "secondary" : "outline"} className="min-h-12 min-w-12 px-2" aria-pressed={rating === value} aria-label={`${label}: ${rating}`} disabled={disabled} onClick={() => onChange(rating)}>{rating}</Button>)}
  </div><div className="flex justify-between text-base text-muted-foreground"><span>0 · {lowLabel}</span>{highLabel === "Worst" && <span>5 · Moderate</span>}<span>10 · {highLabel}</span></div><Button type="button" variant="ghost" className="min-h-12 px-2" disabled={disabled} onClick={() => onChange(null)} aria-label={`Leave ${label} not recorded`}>Leave not recorded</Button></fieldset>;
}

function ExplainNoteConsent({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return <div className="flex items-start gap-3 rounded-xl border border-border p-4">
    <Checkbox id="explain-weekly-note" checked={checked} disabled={disabled} onCheckedChange={value => onChange(value === true)}/>
    <div className="space-y-1">
      <label htmlFor="explain-weekly-note" className="cursor-pointer font-semibold">Use this note to help explain my weekly check</label>
      <p className="text-base leading-7 text-muted-foreground">If you agree, TypeSafe reads only this note for a later weekly explanation after basic email/phone removal. Saving a journal entry makes no AI call. Account metadata is excluded, but this is not full de-identification. It never decides your stage. Your note is never shown to your doctor.</p>
    </div>
  </div>;
}

type SpeechResultLike = { 0: { transcript: string } };
type SpeechEventLike = { results: ArrayLike<SpeechResultLike> };
type BrowserSpeechRecognizer = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function Journal({ entries, recoveryQuery, cacheKey }: { entries: MvpEntry[]; recoveryQuery: UseQueryResult<MvpRecovery, unknown>; cacheKey: readonly unknown[] }) {
  const queryClient = useQueryClient();
  const recognitionRef = useRef<BrowserSpeechRecognizer | null>(null);
  function stopSpeech() {
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (active) {
      active.onresult = null; active.onerror = null; active.onend = null;
      try { active.stop(); } catch { /* Already stopped by the browser. */ }
    }
  }
  const save = useSaveMvpJournal();
  const [date, setDate] = useState(todayLocal);
  useEffect(() => () => stopSpeech(), [date]);
  const [mode, setMode] = useState<"tap" | "talk" | null>(null);
  const [review, setReview] = useState(false);
  const [scores, setScores] = useState<MvpScores>({ headache: null, fog: null, light: null, sleep: null });
  const [planScore, setPlanScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [explainNotes, setExplainNotes] = useState(false);
  const [alert, setAlert] = useState("");
  const [feedback, setFeedback] = useState("");
  const editedByUser = useRef(false);
  const initializedDate = useRef<string | null>(null);
  const editRevision = useRef(0);
  const currentDate = useRef(date);
  const currentNote = useRef(note);
  currentDate.current = date;
  currentNote.current = note;
  const entriesByDate = useMemo(() => new Map(entries.map(entry => [entry.date, entry])), [entries]);
  const selected = entriesByDate.get(date);
  const previous = [...entries].filter(entry => entry.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const largeJump = Boolean(previous && (Object.keys(names) as (keyof MvpScores)[]).some(key =>
    scores[key] !== null && previous.scores[key] !== null && scores[key]! - previous.scores[key]! >= 3));
  const keywordHits = scanKeywords(note);
  const keywordWarning = keywordHits.danger.length > 0 || keywordHits.selfHarm.length > 0;
  const reviewWarning = largeJump || keywordWarning;
  const hasRecoveryData = Boolean(recoveryQuery.data);
  const canEdit = hasRecoveryData && !recoveryQuery.isLoading && !recoveryQuery.isError;

  useEffect(() => {
    if (!hasRecoveryData || recoveryQuery.isLoading || recoveryQuery.isError || editedByUser.current || initializedDate.current === date) return;
    const entry = entriesByDate.get(date);
    initializedDate.current = date;
    setScores(entry?.scores ?? { headache: null, fog: null, light: null, sleep: null });
    setPlanScore(entry?.planScore ?? null);
    setNote(entry?.note ?? "");
    setExplainNotes(entry?.explainNotes ?? false);
    setAlert("");
    setFeedback("");
  }, [date, entriesByDate, hasRecoveryData, recoveryQuery.isError, recoveryQuery.isLoading]);

  function markEdited() {
    editedByUser.current = true;
    editRevision.current += 1;
  }

  function load(entry?: MvpEntry, nextDate = todayLocal()) {
    stopSpeech();
    const loaded = entry ?? entriesByDate.get(nextDate);
    setDate(nextDate);
    setScores(loaded?.scores ?? { headache: null, fog: null, light: null, sleep: null });
    setPlanScore(loaded?.planScore ?? null);
    setNote(loaded?.note ?? "");
    setExplainNotes(loaded?.explainNotes ?? false);
    setMode(null);
    setReview(false);
    setAlert("");
    setFeedback("");
    editedByUser.current = false;
    initializedDate.current = hasRecoveryData ? nextDate : null;
    editRevision.current += 1;
  }

  function applyTranscriptRatings(transcript: string) {
    const parsed = parseExplicitSpokenScores(transcript);
    const { planScore: parsedPlanScore, ...parsedScores } = parsed.result;
    setScores(parsedScores);
    setPlanScore(parsedPlanScore);
    markEdited();
    if (parsed.ambiguous.length) {
      setFeedback("Conflicting spoken values were found for one or more labels. Those scores remain not recorded; review and edit each rating.");
    } else if (parsed.recognized) {
      setFeedback(`${parsed.recognized} explicit ${parsed.recognized === 1 ? "rating" : "ratings"} found. Unmentioned ratings remain not recorded. Review and edit every value before saving.`);
    } else {
      setFeedback("No exact rating labels followed by a 0–10 value were found. Scores remain not recorded until you add them.");
    }
  }

  function beginSpeech() {
    stopSpeech();
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognizer;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognizer;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback("Speech input is unavailable in this browser. You can type a note or use Tap to enter ratings.");
      return;
    }
    markEdited();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language;
    recognition.interimResults = false;
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const spoken = Array.from(event.results, result => result[0].transcript).join(" ").trim();
      const combined = `${currentNote.current}${currentNote.current.trim() ? "\n" : ""}${spoken}`;
      if (combined.length > 4000) { stopSpeech(); setFeedback("That dictation exceeds the 4,000-character note limit. Your previous text is kept; shorten it or use Tap."); return; }
      currentNote.current = combined;
      setNote(combined);
      applyTranscriptRatings(combined);
    };
    recognition.onerror = () => setFeedback("Speech input stopped. The transcript and scores remain editable.");
    recognition.onend = () => setFeedback(current => current || "Speech capture ended. Review the transcript and ratings.");
    setFeedback("Listening. Say a field label followed by its exact 0–10 rating.");
    try {
      recognition.start();
    } catch {
      setFeedback("Speech input could not start. The transcript area and Tap option remain available.");
    }
  }

  async function persist() {
    stopSpeech();
    const submittedDate = date;
    const submittedRevision = editRevision.current;
    const submitted = { scores, planScore, note, explainNotes };
    setFeedback("");
    try {
      const saved = await save.mutateAsync({
        date: submittedDate,
        data: { ...submitted, timezone: timezone() },
      });
      queryClient.setQueryData<MvpRecovery>(cacheKey, old => old
        ? { ...old, entries: [...old.entries.filter(item => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)) }
        : old);
      if (currentDate.current !== submittedDate || editRevision.current !== submittedRevision) return;
      setAlert(saved.flagged ? "Your entry was saved. A warning was flagged. If you may be in immediate danger, contact local emergency services or urgent medical care now." : "");
      setFeedback("Your journal entry is saved.");
      setReview(false);
    } catch {
      if (currentDate.current === submittedDate && editRevision.current === submittedRevision) {
        setFeedback("We couldn’t save this entry. Your changes are still here; try again.");
      }
    }
  }

  return <>
    <PatientHeader eyebrow="Your journal" title="A check-in, in your own words." detail="Choose the ratings you want to record. Your written and dictated note is private and is not shared with your doctor."/>
    {recoveryQuery.isError && <Card role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4"><p>Saved entries could not be loaded.</p><Button variant="outline" className="min-h-12" onClick={() => void recoveryQuery.refetch()}>Try again</Button></Card>}
    <Card className="space-y-5 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div className="space-y-2"><label htmlFor="journal-date" className="font-semibold">Entry date</label><Input id="journal-date" type="date" max={todayLocal()} value={date} className="min-h-12" disabled={!canEdit} onChange={event => load(entriesByDate.get(event.target.value), event.target.value)}/></div>{selected && <span className="text-base text-muted-foreground">Saved entry · edit and save to update</span>}</div>
      {!mode && <div className="flex flex-wrap gap-3"><Button className="min-h-12" disabled={!canEdit} onClick={() => setMode("tap")}>Tap to check in</Button><Button variant="outline" className="min-h-12" disabled={!canEdit} onClick={() => { setMode("talk"); beginSpeech(); }}><Mic/>Talk</Button></div>}
      {mode && !review && <>
        {mode === "talk" && <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="display text-2xl">Talk through your check-in</h2>
          <p className="text-base leading-7 text-muted-foreground">Browser dictation fills your private transcript. Ratings are read only when a spoken field label is followed by an explicit 0–10 number; nothing is inferred. Unmentioned ratings stay not recorded.</p>
          <p className="rounded-xl bg-secondary p-4 text-base leading-7"><strong>Voice example:</strong> “Headache 3, mental fog 2, light sensitivity 4, trouble sleeping 5, recovery plan 7.”</p>
          <Textarea value={note} maxLength={4000} disabled={!canEdit} onChange={event => { markEdited(); setNote(event.target.value); }} className="min-h-32 text-base" aria-label="Private recovery transcript" placeholder="Your private transcript appears here. You can edit it."/>
          <ExplainNoteConsent checked={explainNotes} disabled={!canEdit} onChange={value => { markEdited(); setExplainNotes(value); }}/>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="min-h-12" disabled={!canEdit} onClick={beginSpeech}><Mic/>Speak or dictate</Button>
            <Button variant="outline" className="min-h-12" disabled={!canEdit} onClick={() => applyTranscriptRatings(note)}>Read explicit ratings</Button>
          </div>
        </section>}
        <div className="space-y-6">{(Object.keys(names) as (keyof MvpScores)[]).map(key => <Rating key={key} label={names[key]} value={scores[key]} disabled={!canEdit} onChange={value => { markEdited(); setScores(current => ({ ...current, [key]: value })); }}/>)}</div>
        <Rating label="How did your recovery plan go today?" value={planScore} lowLabel="Not at all" highLabel="Very well" disabled={!canEdit} onChange={value => { markEdited(); setPlanScore(value); }}/>
        {mode === "tap" && <div className="space-y-3"><div className="space-y-2"><label htmlFor="private-note" className="font-semibold">Optional private note</label><Textarea id="private-note" maxLength={4000} value={note} disabled={!canEdit} onChange={event => { markEdited(); setNote(event.target.value); }} className="min-h-28 text-base" placeholder="Anything you want to remember?"/></div><ExplainNoteConsent checked={explainNotes} disabled={!canEdit} onChange={value => { markEdited(); setExplainNotes(value); }}/></div>}
        {feedback && <p role="status" className="text-base leading-7 text-muted-foreground">{feedback}</p>}
        <div className="flex flex-wrap gap-3"><Button className="min-h-12" disabled={!canEdit} onClick={() => { stopSpeech(); setReview(true); }}>Review entry <ArrowRight/></Button><Button variant="outline" className="min-h-12" disabled={!canEdit} onClick={() => load(selected, date)}>Cancel</Button></div>
      </>}
      {review && <section className="space-y-4 rounded-xl border border-border p-4" aria-labelledby="journal-review-heading">
        <h2 id="journal-review-heading" className="display text-2xl">Review before saving</h2>
        <ul className="space-y-2 text-base leading-7">{(Object.keys(names) as (keyof MvpScores)[]).map(key => <li key={key}>{names[key]}: {scores[key] === null ? "Not recorded" : `${scores[key]}/10`}</li>)}<li>Recovery plan: {planScore === null ? "Not recorded" : `${planScore}/10`}</li><li>Weekly note use: {explainNotes ? "Agreed" : "Not agreed"}</li></ul>
        {note && <p className="whitespace-pre-wrap rounded-xl bg-secondary p-4 text-base leading-7">Private note: {note}</p>}
        {reviewWarning && <p role="alert" className="rounded-xl border border-notice-border bg-notice p-4 text-base leading-7 text-notice-foreground">Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>}
        <div className="flex flex-wrap gap-3"><Button className="min-h-12" disabled={save.isPending} onClick={() => void persist()}><Save/>{save.isPending ? "Saving…" : "Save entry"}</Button><Button variant="outline" className="min-h-12" onClick={() => setReview(false)}>Edit</Button></div>
      </section>}
      {alert && <p role="alert" className="rounded-xl border border-notice-border bg-notice p-4 text-base leading-7 text-notice-foreground">{alert}</p>}
      {feedback && !review && <p role="status" className="text-base">{feedback}</p>}
    </Card>
    <section className="space-y-3"><h2 className="display text-3xl">Recorded days</h2>{recoveryQuery.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-muted"/> : entries.length === 0 ? <Card className="p-5 text-base leading-7 text-muted-foreground">Your saved check-ins will appear here. There is no need to make up missed days.</Card> : <div className="grid gap-3 sm:grid-cols-2">{[...entries].sort((a,b)=>b.date.localeCompare(a.date)).map(entry => <Card key={entry.date} className="space-y-3 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{new Date(`${entry.date}T12:00:00`).toLocaleDateString()}</h3><Button variant="outline" className="min-h-12" onClick={() => load(entry, entry.date)}><PencilLine/>Edit</Button></div><p className="text-base text-muted-foreground">{Object.entries(names).map(([key,label]) => `${label}: ${entry.scores[key as keyof MvpScores] ?? "—"}`).join(" · ")}</p>{entry.flagged && <p className="text-base text-notice-foreground">Review note for this entry</p>}</Card>)}</div>}</section>
  </>;
}

function InviteDoctor() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const owner = user?.id ?? "";
  const teamKey = useMemo(() => [...getGetMyCareTeamQueryKey(), owner], [owner]);
  const team = useGetMyCareTeam({ query: { queryKey: teamKey, enabled: Boolean(owner), ...privateQuery } });
  const create = useCreatePatientCareInvite({ mutation: privateMutation });
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [developmentLink, setDevelopmentLink] = useState("");
  const atCapacity = Boolean(team.data && team.data.activeClinicians.length + team.data.pendingInvites.length >= 5);
  function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setDevelopmentLink("");
    const [firstName, ...rest] = name.trim().split(/\s+/); const lastName = rest.join(" ");
    const validationError = inviteFieldError("firstName", firstName ?? "")
      || inviteFieldError("lastName", lastName)
      || inviteFieldError("email", email);
    if (validationError) { setError(validationError); return; }
    create.mutate({ data: { firstName, lastName, email: email.trim(), consentAccepted: true } }, {
      onSuccess: result => {
        setName(""); setEmail("");
        setMessage(result.suppressed ? notSentMessage("patient") : "Invitation sent.");
        if (import.meta.env.DEV && result.suppressed && result.developmentLink) setDevelopmentLink(result.developmentLink);
        void queryClient.invalidateQueries({ queryKey: teamKey });
      },
      onError: err => setError(careTeamErrorMessage(errorCode(err), "patient", sendFailedMessage("patient"))),
    });
  }
  return <>
    <PatientHeader eyebrow="Optional doctor access" title="Invite your doctor." detail="Only invite a doctor you already know and trust. You can remove access at any time."/>
    <Card className="space-y-4 p-5 sm:p-7">
      <h2 className="display text-2xl">What they can see and do</h2>
      <ul className="list-disc space-y-2 pl-5 text-base leading-7">
        <li>Your symptom scores and recovery-plan scores.</li>
        <li>Your current stage, the reasons for it, and stage history.</li>
        <li>They may change your stage and add a review note.</li>
      </ul>
      <p className="rounded-xl bg-secondary p-4 text-base leading-7"><strong>Your notes stay private.</strong> Written and dictated journal notes are never shared with your doctor.</p>
      <p className="text-base leading-7 text-muted-foreground">Sending the invitation is your consent to share the listed scores and stages after the doctor accepts. You can remove access later. Stillwell does not verify clinicians, so only invite someone you know and trust.</p>
      {team.isLoading&&<div aria-label="Loading doctor access" className="h-10 animate-pulse rounded-lg bg-muted"/>}
      {team.isError&&<div role="alert" className="space-y-2"><p>Doctor access could not load, so invitation limits cannot be checked.</p><Button type="button" variant="outline" className="min-h-12" onClick={()=>void team.refetch()}>Try again</Button></div>}
      {team.data&&<p className="text-base text-muted-foreground">{team.data.activeClinicians.length+team.data.pendingInvites.length} of 5 doctor connections used.</p>}
      {atCapacity&&<p role="status" className="rounded-xl bg-secondary p-4 text-base leading-7">You can share with up to 5 clinicians. Remove one to invite someone new.</p>}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><label htmlFor="doctor-name" className="font-semibold">Doctor’s name</label><Input id="doctor-name" autoComplete="name" value={name} onChange={event=>setName(event.target.value)} className="min-h-12" required/></div>
        <div className="space-y-2"><label htmlFor="doctor-email" className="font-semibold">Doctor’s email</label><Input id="doctor-email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} className="min-h-12" required/></div>
        {error&&<p role="alert" className="text-base text-destructive">{error}</p>}
        {message&&<p role="status" className="break-words text-base">{message}</p>}
        {import.meta.env.DEV&&developmentLink&&<a className="inline-flex min-h-12 break-all items-center underline underline-offset-4" href={developmentLink} target="_blank" rel="noreferrer">Open development invitation</a>}
        <Button className="min-h-12" disabled={create.isPending||atCapacity||team.isLoading||team.isError}>{create.isPending?"Sending…":"Send invitation"}</Button>
      </form>
    </Card>
    <Button asChild variant="outline" className="min-h-12"><Link href="/dashboard">Return to dashboard</Link></Button>
  </>;
}

function Account() {
  const { user } = useUser(); const { signOut } = useClerk(); const queryClient = useQueryClient(); const [, setLocation] = useLocation();
  const [confirmText, setConfirmText] = useState(""); const [showDelete, setShowDelete] = useState(false);
  const [showRecoveryDelete, setShowRecoveryDelete] = useState(false);
  const [careAction, setCareAction] = useState<{ kind: "remove" | "cancel"; id: string; name: string } | null>(null);
  const [status, setStatus] = useState(""); const [error, setError] = useState("");
  const owner = user?.id ?? "";
  const teamKey = useMemo(() => [...getGetMyCareTeamQueryKey(), owner], [owner]);
  const team = useGetMyCareTeam({ query: { queryKey: teamKey, enabled: Boolean(owner), ...privateQuery } });
  const remove = useRemoveCareClinician({ mutation: privateMutation });
  const cancel = useCancelPatientCareInvite({ mutation: privateMutation });
  const resend = useResendPatientCareInvite({ mutation: privateMutation });
  const deleteRecovery = useDeleteRecovery();
  const deleteAccount = useDeletePatientAccount();
  async function clearRecovery() {
    setError(""); setStatus("");
    try { await deleteRecovery.mutateAsync(); await queryClient.invalidateQueries({ queryKey: getGetMvpRecoveryQueryKey() }); await queryClient.invalidateQueries({ queryKey: getGetRecoveryQueryKey() }); setShowRecoveryDelete(false); setStatus("All recovery data was deleted. Your account and any former doctor copies remain."); }
    catch { setError("Recovery data could not be deleted. Please try again."); }
  }
  async function logout() {
    clearDraft(); careMemory.clearAll(); pendingLink.clear(); queryClient.clear();
    try { sessionStorage.clear(); } catch {}
    await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  }
  function performCareAction() {
    if (!careAction) return;
    const mutation = careAction.kind === "remove" ? remove : cancel;
    mutation.mutate({ id: careAction.id }, {
      onSuccess: () => { setCareAction(null); void queryClient.invalidateQueries({ queryKey: teamKey }); },
      onError: () => setError(careAction.kind === "remove" ? "Doctor access could not be removed." : "The invitation could not be cancelled."),
    });
  }
  function fullDelete() {
    setError(""); deleteAccount.mutate({ data: { confirmation: "DELETE" } }, { onSuccess: async () => { queryClient.clear(); clearDraft(); careMemory.clearAll(); pendingLink.clear(); try { sessionStorage.clear(); const prefix = `stillwell.journal-draft:${encodeURIComponent(user?.id ?? "")}:`; Object.keys(localStorage).filter(key => key.startsWith(prefix)).forEach(key => localStorage.removeItem(key)); } catch {} try { await signOut({ redirectUrl: "/account-deleted" }); } catch { setLocation("/account-deleted", { replace: true }); } }, onError: err => { const serverMessage = serverErrorText(err, "Account deletion could not be completed."); setError(httpStatus(err) === 409 ? `${serverMessage}\nNo data was removed. Your account remains available. Retry after the shared-copy ownership issue has been reviewed.` : `${serverMessage}\nYour account was not deleted. You can retry from this page.`); } });
  }
  return <><PatientHeader eyebrow="Account" title="Your account and privacy." detail={user?.primaryEmailAddress?.emailAddress ?? "Manage recovery data and doctor access."}/>
    <Card className="space-y-4 p-5"><h2 className="display text-2xl">Doctor access</h2><p className="text-base leading-7 text-muted-foreground">Doctors can view shared scores and stage history, but never your notes. They may change your stage and add a review note.</p>{team.isLoading&&<div className="h-12 animate-pulse rounded-lg bg-muted"/>}{team.isError&&<div role="alert" className="space-y-2"><p>Doctor access could not load.</p><Button variant="outline" className="min-h-12" onClick={()=>void team.refetch()}>Try again</Button></div>}{team.data?.activeClinicians.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="font-semibold">{item.name}</p><Button variant="outline" className="min-h-12" disabled={remove.isPending} onClick={()=>setCareAction({kind:"remove",id:item.id,name:item.name})}>Remove access</Button></div>)}{team.data?.pendingInvites.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="font-semibold">{item.firstName} {item.lastName} · invitation</p><div className="flex gap-2"><Button variant="outline" className="min-h-12" disabled={resend.isPending} onClick={()=>resend.mutate({id:item.id},{onSuccess:()=>void queryClient.invalidateQueries({queryKey:teamKey}),onError:()=>setError("Invitation could not be resent.")})}>Resend</Button><Button variant="outline" className="min-h-12" disabled={cancel.isPending} onClick={()=>setCareAction({kind:"cancel",id:item.id,name:`${item.firstName} ${item.lastName}`})}>Cancel</Button></div></div>)}
      {careAction&&<div role="alertdialog" aria-labelledby="care-action-title" className="space-y-3 rounded-xl border border-notice-border bg-notice p-4"><h3 id="care-action-title" className="font-semibold text-notice-foreground">{careAction.kind==="remove"?"Remove doctor access?":"Cancel this invitation?"}</h3><p className="text-base leading-7 text-notice-foreground">{careAction.kind==="remove"?`${careAction.name} will no longer receive access to new scores or stage history. They may keep any frozen copy already received.`:`The invitation to ${careAction.name} will stop working.`}</p><div className="flex flex-wrap gap-3"><Button variant="destructive" className="min-h-12" disabled={remove.isPending||cancel.isPending} onClick={performCareAction}>{careAction.kind==="remove"?"Remove access":"Cancel invitation"}</Button><Button variant="outline" className="min-h-12" onClick={()=>setCareAction(null)}>Keep</Button></div></div>}
    </Card>
    <Card className="space-y-4 p-5"><h2 className="display text-2xl">Delete recovery data</h2><p className="text-base leading-7">This removes your recovery entries and stages. Your account remains. Doctors who previously received a copy keep a frozen snapshot of what they received. This is different from full account deletion.</p>{!showRecoveryDelete?<Button variant="outline" className="min-h-12" onClick={()=>setShowRecoveryDelete(true)}><Trash2/>Delete all recovery data</Button>:<div className="space-y-3"><p className="text-base leading-7">Delete all Stillwell recovery entries and stages now? Your account remains, and doctor snapshots are preserved.</p><div className="flex flex-wrap gap-3"><Button variant="destructive" className="min-h-12" disabled={deleteRecovery.isPending} onClick={()=>void clearRecovery()}>{deleteRecovery.isPending?"Deleting…":"Confirm deletion"}</Button><Button variant="outline" className="min-h-12" onClick={()=>setShowRecoveryDelete(false)}>Cancel</Button></div></div>}</Card>
    <Card className="space-y-4 border-destructive/40 p-5"><h2 className="display text-2xl">Delete your account</h2><p className="text-base leading-7">This permanently deletes your account and all recovery records, doctor copies, doctor notes, and access. Doctor accounts remain. This cannot be undone.</p>{!showDelete?<Button variant="destructive" className="min-h-12" onClick={()=>setShowDelete(true)}>Delete my account</Button>:<div className="space-y-3"><label htmlFor="delete-confirm" className="font-semibold">Type DELETE to confirm</label><Input id="delete-confirm" value={confirmText} onChange={event=>setConfirmText(event.target.value)} className="min-h-12" autoComplete="off"/><div className="flex flex-wrap gap-3"><Button variant="destructive" className="min-h-12" disabled={confirmText!=="DELETE"||deleteAccount.isPending} onClick={fullDelete}>{deleteAccount.isPending?"Deleting…":"Permanently delete account"}</Button><Button variant="outline" className="min-h-12" onClick={()=>{setShowDelete(false);setConfirmText("");}}>Cancel</Button></div></div>}</Card>
    {(status||error)&&<p role={error?"alert":"status"} className="whitespace-pre-wrap text-base">{error||status}</p>}
    <Button variant="outline" className="min-h-12" onClick={() => void logout()}>Sign out</Button>
  </>;
}

export function AccountDeletedPage() {
  return <main className="stillwell flex min-h-[100dvh] items-center justify-center px-4 py-12"><Card className="max-w-xl space-y-4 p-7"><p className="eyebrow">Account removed</p><h1 className="display text-3xl">Your Stillwell account was deleted.</h1><p className="text-base leading-7">Your recovery information and account access have been removed.</p><Button asChild className="min-h-12"><Link href="/">Return home</Link></Button></Card></main>;
}
