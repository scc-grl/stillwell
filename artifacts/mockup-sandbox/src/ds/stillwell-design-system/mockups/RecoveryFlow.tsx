import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";

type Screen = "baseline" | "protocol" | "checkin" | "history" | "share";
type SymptomId = "overall" | "headache" | "dizziness" | "nausea" | "tinnitus" | "lowMood" | "sleep" | "attention" | "light" | "memory";
type SymptomValues = Partial<Record<SymptomId, number>>;
type RoutineItem = { id: string; label: string; note: string };
type Milestone = "observe" | "repeat-cleared" | "review-next";
type Entry = {
  id: string;
  date: string;
  cadence: "daily" | "weekly";
  symptoms: SymptomValues;
  statuses: Partial<Record<string, "did" | "did_not" | "not_planned">>;
  notes: Record<string, string>;
  routineLabels: Record<string, string>;
  reflection: string;
  source: "manual" | "audio";
  audioUrl?: string;
};

const symptomList: { id: SymptomId; label: string }[] = [
  { id: "overall", label: "Overall difficulty from symptoms" },
  { id: "headache", label: "Headache" },
  { id: "dizziness", label: "Dizziness" },
  { id: "nausea", label: "Nausea" },
  { id: "tinnitus", label: "Tinnitus or ringing in the ears" },
  { id: "lowMood", label: "Low mood or depressive symptoms" },
  { id: "sleep", label: "Difficulty sleeping" },
  { id: "attention", label: "Attention or concentration difficulty" },
  { id: "light", label: "Sensitivity to light" },
  { id: "memory", label: "Forgetfulness or memory difficulty" },
];
const scaleLabels = ["Not present", "Mild", "Moderate", "Severe", "Very severe"];
const dietChoices = ["Meals", "Fluids", "A familiar meal routine"];
const movementChoices = ["An already-cleared walk", "Rest", "A clinician-cleared routine"];
const milestoneLabels: Record<Milestone, string> = {
  observe: "Observe current capacity",
  "repeat-cleared": "Repeat an already clinician-cleared, manageable routine",
  "review-next": "Review a possible next step with a clinician",
};
const statusOptions: { value: Entry["statuses"][string]; label: string }[] = [
  { value: "did", label: "Did" },
  { value: "did_not", label: "Did not" },
  { value: "not_planned", label: "Not planned" },
];

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calendarDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getInitialScreen(): Screen {
  const requested = new URLSearchParams(window.location.search).get("screen");
  return requested === "protocol" || requested === "checkin" || requested === "share" ? requested : "baseline";
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateAnswer(values: SymptomValues, id: SymptomId, value: number | undefined): SymptomValues {
  const next = { ...values };
  if (value === undefined) delete next[id];
  else next[id] = value;
  return next;
}

function toggleStatus(values: Entry["statuses"], id: string, value: Entry["statuses"][string]) {
  const next = { ...values };
  if (next[id] === value || value === undefined) delete next[id];
  else next[id] = value;
  return next;
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="space-y-2 font-sans">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h2 className="font-serif text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {detail && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ChoiceRow({ label, description, selected, onClick }: { label: string; description?: string; selected: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={onClick} className="h-auto min-h-10 whitespace-normal text-left">
      <span>{label}{description && <span className="mt-1 block text-xs font-normal opacity-80">{description}</span>}</span>
    </Button>
  );
}

function SymptomScale({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  return (
    <fieldset className="space-y-3 border-b border-border pb-4 last:border-0">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {scaleLabels.map((scale, index) => (
          <Button key={scale} type="button" size="sm" variant={value === index ? "default" : "outline"} aria-pressed={value === index} onClick={() => onChange(value === index ? undefined : index)}>
            {index} · {scale}
          </Button>
        ))}
        {value !== undefined && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)}>Clear</Button>}
      </div>
    </fieldset>
  );
}

function SafetyNote() {
  return (
    <Card className="mt-6">
      <CardContent className="space-y-2 pt-6">
        <h2 className="text-sm font-semibold text-foreground">A safety note</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Stillwell is not for a new head injury or an emergency. If symptoms are worsening, contact a clinician. Severe headache, repeated vomiting, confusion, or weakness needs urgent medical care. If you feel unsafe or are thinking about harming yourself, seek urgent help now from local emergency services or a crisis service.
        </p>
      </CardContent>
    </Card>
  );
}

export function RecoveryFlow() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [baseline, setBaseline] = useState<SymptomValues>({});
  const [dietPattern, setDietPattern] = useState("");
  const [preInjuryExercise, setPreInjuryExercise] = useState("");
  const [preInjuryPreference, setPreInjuryPreference] = useState("");
  const [routine, setRoutine] = useState<RoutineItem[]>([
    { id: "food", label: "Food and hydration", note: "" },
    { id: "movement", label: "Movement or rest", note: "" },
  ]);
  const [newRoutineLabel, setNewRoutineLabel] = useState("");
  const [protocolStart, setProtocolStart] = useState(localDate());
  const [cadenceOverride, setCadenceOverride] = useState<"automatic" | "daily" | "weekly" | "paused">("automatic");
  const [milestone, setMilestone] = useState<Milestone>("observe");
  const [movementPaused, setMovementPaused] = useState(false);
  const [supplements, setSupplements] = useState("");
  const [clinicianQuestions, setClinicianQuestions] = useState("");
  const [checkinMode, setCheckinMode] = useState<"manual" | "audio">("manual");
  const [checkinSymptoms, setCheckinSymptoms] = useState<SymptomValues>({});
  const [checkinStatuses, setCheckinStatuses] = useState<Entry["statuses"]>({});
  const [checkinNotes, setCheckinNotes] = useState<Entry["notes"]>({});
  const [reflection, setReflection] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [microphoneConsent, setMicrophoneConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requestingAudio, setRequestingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const [audioSummary, setAudioSummary] = useState("");
  const [includeBaseline, setIncludeBaseline] = useState(true);
  const [includeRoutine, setIncludeRoutine] = useState(true);
  const [includeMilestone, setIncludeMilestone] = useState(true);
  const [includeEntries, setIncludeEntries] = useState(true);
  const [shareMessage, setShareMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRequestRef = useRef(0);
  const audioRequestPendingRef = useRef(false);
  const audioUrlRef = useRef("");
  const audioUrlsRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const hasValidStart = /^\d{4}-\d{2}-\d{2}$/.test(protocolStart) && protocolStart <= localDate() && Number.isFinite(calendarDayNumber(protocolStart));
  const elapsedDays = hasValidStart ? Math.max(1, calendarDayNumber(localDate()) - calendarDayNumber(protocolStart) + 1) : null;
  const calculatedCadence = elapsedDays === null ? "not_set" : elapsedDays <= 30 ? "daily" : "weekly";
  const cadence = cadenceOverride === "automatic" ? calculatedCadence : cadenceOverride;
  const isPaused = cadence === "paused";
  const cadenceLabel = isPaused ? "Paused" : cadence === "not_set" ? "Start date needed" : cadence === "daily" ? "Daily" : "Weekly";
  const checkinTitle = cadence === "weekly" ? "Past week check-in" : "Today’s check-in";
  const orderedEntries = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  function cancelPermissionRequest() {
    audioRequestRef.current += 1;
    audioRequestPendingRef.current = false;
    setRequestingAudio(false);
  }

  function releaseAudio(discardUrl = true) {
    cancelPermissionRequest();
    if (discardUrl && audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlsRef.current.delete(audioUrlRef.current);
    }
    if (discardUrl) {
      audioUrlRef.current = "";
      setAudioUrl("");
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioRequestRef.current += 1;
      audioRequestPendingRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (screen !== "checkin" || checkinMode !== "audio" || !microphoneConsent) {
      cancelPermissionRequest();
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [screen, checkinMode, microphoneConsent]);

  async function startRecording() {
    if (audioRequestPendingRef.current || recorderRef.current) return;
    setAudioError("");
    if (!microphoneConsent) {
      setAudioError("Please review and check the microphone consent before access is requested.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("Audio recording is not supported in this browser or embedded preview. You can use the manual quiz instead.");
      return;
    }
    const requestId = ++audioRequestRef.current;
    audioRequestPendingRef.current = true;
    setRequestingAudio(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestId !== audioRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        const ownsDraft = recorderRef.current === recorder;
        if (chunks.length && ownsDraft && mountedRef.current) {
          const recordingBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const nextUrl = URL.createObjectURL(recordingBlob);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlsRef.current.delete(audioUrlRef.current);
          }
          audioUrlRef.current = nextUrl;
          audioUrlsRef.current.add(nextUrl);
          setAudioUrl(nextUrl);
        }
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (ownsDraft) recorderRef.current = null;
        if (ownsDraft && mountedRef.current) setRecording(false);
      };
      recorder.onerror = () => {
        if (mountedRef.current && recorderRef.current === recorder) {
          setAudioError("Recording could not finish. You can try again or use the manual quiz; any earlier draft is still available.");
          releaseAudio(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      if (mountedRef.current && requestId === audioRequestRef.current) {
        setAudioError("Microphone access was denied or blocked. Nothing was recorded. You can continue with the manual quiz.");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      }
    } finally {
      if (mountedRef.current && requestId === audioRequestRef.current) {
        audioRequestPendingRef.current = false;
        setRequestingAudio(false);
      }
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function addEntry(source: Entry["source"]) {
    if (recording || requestingAudio) return;
    if (source === "audio" && !audioUrl && !audioSummary.trim()) {
      setAudioError("Record audio to review it, or add a typed summary. No transcript is created.");
      return;
    }
    const note = source === "audio" ? audioSummary.trim() : reflection.trim();
    const nextEntry: Entry = {
      id: makeId(),
      date: localDate(),
      cadence: cadence === "weekly" ? "weekly" : "daily",
      symptoms: { ...checkinSymptoms },
      statuses: { ...checkinStatuses },
      notes: { ...checkinNotes },
      routineLabels: Object.fromEntries(routine.map((item) => [item.id, item.label])),
      reflection: note,
      source,
      audioUrl: source === "audio" ? audioUrlRef.current || undefined : undefined,
    };
    setEntries((previous) => [nextEntry, ...previous]);
    setCheckinSymptoms({});
    setCheckinStatuses({});
    setCheckinNotes({});
    setReflection("");
    setAudioSummary("");
    setMicrophoneConsent(false);
    releaseAudio(source !== "audio");
    if (source === "audio") {
      audioUrlRef.current = "";
      setAudioUrl("");
    }
    setAudioError("");
    setScreen("history");
  }

  function updateRoutine(id: string, updates: Partial<RoutineItem>) {
    setRoutine((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function addRoutine() {
    const label = newRoutineLabel.trim();
    if (!label) return;
    setRoutine((items) => [...items, { id: makeId(), label, note: "" }]);
    setNewRoutineLabel("");
  }

  function toggleRoutineChoice(label: string) {
    setRoutine((items) => items.some((item) => item.label === label)
      ? items.filter((item) => item.label !== label)
      : [...items, { id: makeId(), label, note: "" }]);
  }

  const shareText = useMemo(() => {
    const lines = ["Stillwell journal summary", "Prepared locally to review with a clinician", ""];
    if (includeBaseline) {
      lines.push("Starting snapshot");
      lines.push("Feelings and symptoms: " + (Object.entries(baseline).length
        ? Object.entries(baseline).map(([key, value]) => `${symptomList.find((item) => item.id === key)?.label ?? key}: ${value}/4 (${scaleLabels[value]})`).join("; ")
        : "Not recorded"));
      lines.push(`Current diet pattern: ${dietPattern || "Not recorded"}`);
      lines.push(`Exercise before injury: ${preInjuryExercise || "Not recorded"}${preInjuryPreference ? `; preferences: ${preInjuryPreference}` : ""}`);
      lines.push("");
    }
    if (includeRoutine) {
      lines.push("My chosen routine");
      lines.push(`Protocol start: ${protocolStart}; current logging cadence: ${cadenceLabel}`);
      lines.push(...(routine.length ? routine.map((item) => `- ${item.label}${item.note ? `: ${item.note}` : ""}`) : ["- No routine choices recorded"]));
      lines.push(`Supplements recorded: ${supplements || "Not recorded"}`);
      lines.push(`Questions for clinician or pharmacist: ${clinicianQuestions || "Not recorded"}`);
      lines.push("");
    }
    if (includeMilestone) {
      lines.push("Exercise milestone");
      lines.push(`${movementPaused ? "Paused / rest" : milestoneLabels[milestone]} (self-paced; not a return-to-sport protocol or medical clearance)`);
      lines.push("");
    }
    if (includeEntries) {
      lines.push("Journal entries");
      if (!orderedEntries.length) lines.push("No check-ins recorded");
      orderedEntries.forEach((entry) => {
        lines.push(`${entry.cadence === "weekly" ? "Past week" : "Daily"} · ${formatDate(entry.date)}`);
        if (entry.audioUrl) lines.push("Audio reflection is retained in the preview only, not included in this text file. No transcript.");
        const values = Object.entries(entry.symptoms);
        lines.push(values.length ? values.map(([key, value]) => `${symptomList.find((item) => item.id === key)?.label ?? key}: ${value}/4 (${scaleLabels[value]})`).join("; ") : "Symptoms: Not recorded");
        Object.entries(entry.statuses).forEach(([id, status]) => {
          lines.push(`${entry.routineLabels[id] ?? routine.find((candidate) => candidate.id === id)?.label ?? "Routine"}: ${status === "did" ? "Did" : status === "did_not" ? "Did not" : status === "not_planned" ? "Not planned" : "Not recorded"}${entry.notes[id] ? ` · ${entry.notes[id]}` : ""}`);
        });
        Object.entries(entry.notes).filter(([id]) => !entry.statuses[id]).forEach(([id, note]) => {
          if (note) lines.push(`${entry.routineLabels[id] ?? routine.find((candidate) => candidate.id === id)?.label ?? "Routine"}: ${note}`);
        });
        if (entry.reflection) lines.push(`Reflection: ${entry.reflection}`);
      });
      lines.push("");
    }
    lines.push("This is a personal journal, not a diagnosis or treatment recommendation.");
    return lines.join("\n");
  }, [baseline, cadenceLabel, clinicianQuestions, dietPattern, includeBaseline, includeEntries, includeMilestone, includeRoutine, milestone, movementPaused, orderedEntries, preInjuryExercise, preInjuryPreference, protocolStart, routine, supplements]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareMessage("Summary copied on this device. Nothing was sent.");
    } catch {
      setShareMessage("Copy is not available in this preview. Use Download summary instead.");
    }
  }

  function downloadSummary() {
    const file = new Blob([shareText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stillwell-journal-summary.txt";
    link.click();
    URL.revokeObjectURL(url);
    setShareMessage("Summary downloaded to this device. Nothing was sent.");
  }

  function comparisonText(entry: Entry, symptom: SymptomId) {
    const current = entry.symptoms[symptom];
    const currentIndex = orderedEntries.findIndex((candidate) => candidate.id === entry.id);
    const previous = orderedEntries.slice(currentIndex + 1).find((candidate) => candidate.symptoms[symptom] !== undefined)?.symptoms[symptom];
    const base = baseline[symptom];
    const starting = base !== undefined ? `${base}/4 · ${scaleLabels[base]}` : "Not recorded";
    const earlier = previous !== undefined ? `${previous}/4 · ${scaleLabels[previous]}` : "Not recorded";
    const recorded = current !== undefined ? `${current}/4 · ${scaleLabels[current]}` : "Not recorded";
    return `Recorded ${recorded} · Starting snapshot ${starting} · Earlier recorded rating ${earlier}`;
  }

  const screens: { id: Screen; label: string }[] = [
    { id: "baseline", label: "Starting snapshot" },
    { id: "protocol", label: "My routine" },
    { id: "checkin", label: "Check in" },
    { id: "history", label: "History" },
    { id: "share", label: "Share summary" },
  ];

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/__mockup/images/stillwell-logo.png" alt="Stillwell" className="h-9 w-auto" />
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">Private journal prototype</span>
          </div>
          <p className="text-xs text-muted-foreground">No authentication or server saving · entries disappear on reload</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <section className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your space, your pace</p>
          <h1 className="max-w-3xl font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">Make room for what today is.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">A quiet place to notice what matters to you and bring useful observations to a clinician. Your choices are yours; nothing here diagnoses or prescribes treatment.</p>
        </section>

        <nav aria-label="Journal stages" className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {screens.map((item, index) => (
            <Button key={item.id} size="sm" variant={screen === item.id ? "default" : "outline"} onClick={() => setScreen(item.id)} aria-current={screen === item.id ? "step" : undefined}>
              <span className="hidden sm:inline">{index + 1}. </span>{item.label}
            </Button>
          ))}
        </nav>

        {screen === "baseline" && <Card>
            <CardHeader><CardTitle><SectionTitle eyebrow="After account creation · optional" title="A starting snapshot" detail="This prototype assumes an account was created. These notes help compare later check-ins; every question is optional, and this is not a test." /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">How you feel today</h3>
              {symptomList.map((symptom) => <SymptomScale key={symptom.id} label={symptom.label} value={baseline[symptom.id]} onChange={(value) => setBaseline((state) => updateAnswer(state, symptom.id, value))} />)}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Diet today and exercise before the injury</h3>
              <p className="text-sm text-muted-foreground">What is your current diet pattern?</p>
              <div className="flex flex-wrap gap-2">{["Varied", "Regular meals", "Changes day to day", "Prefer not to say"].map((item) => <ChoiceRow key={item} label={item} selected={dietPattern === item} onClick={() => setDietPattern(dietPattern === item ? "" : item)} />)}</div>
              <Input aria-label="Current diet details" value={dietPattern} onChange={(event) => setDietPattern(event.target.value)} placeholder="Or describe your current diet in your own words" />
              <p className="pt-2 text-sm text-muted-foreground">How often did you exercise before the injury?</p>
              <div className="flex flex-wrap gap-2">{["Rarely", "1–2 days a week", "3–4 days a week", "5 or more days a week", "Varied"].map((item) => <ChoiceRow key={item} label={item} selected={preInjuryExercise === item} onClick={() => setPreInjuryExercise(preInjuryExercise === item ? "" : item)} />)}</div>
              <label className="block space-y-2 text-sm font-medium text-foreground" htmlFor="exercise-preference">What kinds of movement did you enjoy or prefer? <span className="font-normal text-muted-foreground">Optional</span></label>
              <Input id="exercise-preference" value={preInjuryPreference} onChange={(event) => setPreInjuryPreference(event.target.value)} placeholder="For example, walking, dance, or team sports" />
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setScreen("protocol")}>Skip snapshot</Button>
              <Button type="button" onClick={() => setScreen("protocol")}>Continue to my routine</Button>
            </div>
          </CardContent>
        </Card>}

        {screen === "protocol" && <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle><SectionTitle eyebrow="Chosen by you" title="A routine that can change" detail="Diet and movement are starting points for your own reflections, not treatment instructions. Add, edit, remove, pause, or skip anything." /></CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium" htmlFor="protocol-start">Protocol start date <Input id="protocol-start" type="date" required max={localDate()} value={protocolStart} aria-invalid={!hasValidStart} onChange={(event) => setProtocolStart(event.target.value)} />{!hasValidStart && <span role="alert" className="text-sm text-destructive">Choose a valid date, no later than today, for the default schedule.</span>}</label>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Check-in cadence</p>
                  <p className="text-sm text-muted-foreground">{elapsedDays === null ? "Start date needed for the default schedule" : `Day ${elapsedDays}: ${cadenceLabel}`}. The default is daily on days 1–30, then weekly from day 31. This is a logging schedule, not a recovery timeline.</p>
                  <div className="flex flex-wrap gap-2">
                    {([{ value: "automatic", label: "Use default" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "paused", label: "Pause" }] as const).map((option) => <ChoiceRow key={option.value} label={option.label} selected={cadenceOverride === option.value} onClick={() => setCadenceOverride(option.value)} />)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">My diet and exercise choices</h3>
                <p className="text-sm text-muted-foreground">Choose what feels useful to notice. Rest is a valid choice.</p>
                <p className="text-sm text-muted-foreground">Pick items to track, not treatment recommendations. Movement choices depend on what your clinician has cleared.</p>
                <div className="flex flex-wrap gap-2">{[...dietChoices, ...movementChoices].map((label) => <ChoiceRow key={label} label={label} selected={routine.some((item) => item.label === label)} onClick={() => toggleRoutineChoice(label)} />)}</div>
                {routine.map((item) => <div key={item.id} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input aria-label="Routine choice name" value={item.label} onChange={(event) => updateRoutine(item.id, { label: event.target.value })} />
                    <Button type="button" variant="outline" onClick={() => setRoutine((items) => items.filter((candidate) => candidate.id !== item.id))}>Remove</Button>
                  </div>
                  <Textarea aria-label={`Notes about ${item.label}`} value={item.note} onChange={(event) => updateRoutine(item.id, { note: event.target.value })} placeholder="Optional note about how you want to approach it" />
                </div>)}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={newRoutineLabel} onChange={(event) => setNewRoutineLabel(event.target.value)} placeholder="Add a choice, such as a familiar meal or rest" aria-label="New routine choice" />
                  <Button type="button" variant="outline" onClick={addRoutine} disabled={!newRoutineLabel.trim()}>Add choice</Button>
                </div>
              </div>
              <div className="space-y-4 border-t border-border pt-5">
                <SectionTitle eyebrow="Three self-paced milestones" title="Movement, without a prescribed progression" detail="Choose, pause, go back, or skip. None of these milestones gives automatic medical clearance. Rest is valid." />
                <div className="space-y-2">{(Object.entries(milestoneLabels) as [Milestone, string][]).map(([id, label], index) => <ChoiceRow key={id} label={`${index + 1}. ${label}`} description={id === "observe" ? "Notice what feels manageable now, including rest." : id === "repeat-cleared" ? "Only if a clinician has already cleared the routine for you." : "Ask a clinician about any next step that feels relevant."} selected={!movementPaused && milestone === id} onClick={() => { setMilestone(id); setMovementPaused(false); }} />)}</div>
                {movementPaused && <p role="status" className="text-sm text-muted-foreground">Movement is paused. Choose any milestone when you want to revisit it; rest is valid.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => { setMilestone("observe"); setMovementPaused(false); }}>Go back to observe</Button>
                  <Button type="button" variant="outline" onClick={() => setMovementPaused(true)}>Pause / rest</Button>
                  <Button type="button" variant="ghost" onClick={() => { setMilestone("review-next"); setMovementPaused(false); }}>Skip ahead to clinician review</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle><SectionTitle eyebrow="For a clinician or pharmacist" title="Supplements and questions" detail="Record what you currently take and any questions to review. This prototype does not recommend a supplement or dose as concussion therapy." /></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-sm font-medium" htmlFor="supplements">Current supplements or products <span className="font-normal text-muted-foreground">Optional</span><Textarea id="supplements" value={supplements} onChange={(event) => setSupplements(event.target.value)} placeholder="You can note product names or leave this blank." /></label>
              <label className="block space-y-2 text-sm font-medium" htmlFor="clinician-questions">Questions to review with a clinician or pharmacist <Textarea id="clinician-questions" value={clinicianQuestions} onChange={(event) => setClinicianQuestions(event.target.value)} placeholder="For example: Could these products interact with medicines I take?" /></label>
              <p className="text-sm text-muted-foreground">Possible discussion topics—not recommendations:</p>
              <div className="flex flex-wrap gap-2">{["Do I need a supplement at all?", "Could my products interact with medicines?", "Would food choices meet my needs instead?"].map((question) => <Button key={question} variant="outline" type="button" className="h-auto whitespace-normal" onClick={() => setClinicianQuestions((current) => current ? current + "\n" + question : question)}>{question}</Button>)}</div>
              <Button variant="link" size="sm" asChild className="h-auto whitespace-normal justify-start"><a href="https://www.nccih.nih.gov/health/know-science/how-medications-and-supplements-can-interact/talk-with-your-health-care-providers" target="_blank" rel="noreferrer noopener">NIH: Talk with your health care providers about supplement interactions</a></Button>
            </CardContent>
          </Card>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => setScreen("baseline")}>Back</Button><Button type="button" onClick={() => setScreen("checkin")}>Continue to check-in</Button></div>
        </div>}

        {screen === "checkin" && <Card>
          <CardHeader><CardTitle><SectionTitle eyebrow={`${cadenceLabel} · optional`} title={checkinTitle} detail={isPaused ? "Your cadence is paused. You can still create an entry whenever it feels useful." : cadence === "not_set" ? "Choose a valid start date for the default schedule. You may still make a one-off daily check-in." : cadence === "weekly" ? "Reflect on the past week, in your own words. You can skip any question." : "A small reflection for today. You can skip any question."} /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={checkinMode === "manual" ? "default" : "outline"} onClick={() => setCheckinMode("manual")}>Manual quiz</Button>
              <Button type="button" variant={checkinMode === "audio" ? "default" : "outline"} onClick={() => setCheckinMode("audio")}>Audio or typed note</Button>
            </div>
            {checkinMode === "manual" && <>
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">How have you been feeling {cadence === "weekly" ? "over the past week" : "today"}?</h3>
                <p className="text-sm text-muted-foreground">Use the same scale as your starting snapshot. Each answer stands on its own; no score or severity category is calculated.</p>
                {symptomList.map((symptom) => <SymptomScale key={symptom.id} label={symptom.label} value={checkinSymptoms[symptom.id]} onChange={(value) => setCheckinSymptoms((state) => updateAnswer(state, symptom.id, value))} />)}
              </section>
              <section className="space-y-4 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Your chosen routine</h3>
                <p className="text-sm text-muted-foreground">For each item, choose Did, Did not, or Not planned. There are no targets.</p>
                {routine.map((item) => <div key={item.id} className="space-y-3 rounded-lg border border-border p-4">
                  <h4 className="text-sm font-medium">{item.label}</h4>
                  <div className="flex flex-wrap gap-2">{statusOptions.map((option) => <ChoiceRow key={option.value} label={option.label} selected={checkinStatuses[item.id] === option.value} onClick={() => setCheckinStatuses((statuses) => toggleStatus(statuses, item.id, option.value))} />)}</div>
                  <Textarea value={checkinNotes[item.id] ?? ""} onChange={(event) => setCheckinNotes((notes) => ({ ...notes, [item.id]: event.target.value }))} placeholder="Optional note" aria-label={`Optional note for ${item.label}`} />
                </div>)}
              </section>
              <label className="block space-y-2 text-sm font-medium" htmlFor="daily-reflection">Anything else you want to remember? <span className="font-normal text-muted-foreground">Optional</span><Textarea id="daily-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="A quiet place for your own observations." /></label>
              <Button type="button" disabled={recording || requestingAudio} onClick={() => addEntry("manual")}>Add check-in to this preview</Button>
            </>}
            {checkinMode === "audio" && <section className="space-y-5">
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <h3 className="text-sm font-semibold">A private audio note</h3>
                <p className="text-sm leading-6 text-muted-foreground">Audio stays in this browser tab and is never uploaded or sent to speech services. No transcript is generated. Entries and audio disappear when you reload.</p>
                <p className="text-sm leading-6 text-muted-foreground">You can describe what feels different from your starting snapshot, and what you did or did not do through food, movement, or rest. Optional structured ratings can be added in the manual quiz before returning here.</p>
              </div>
              <label className="flex items-start gap-3 text-sm leading-6">
                <Checkbox checked={microphoneConsent} onCheckedChange={(checked) => setMicrophoneConsent(checked === true)} />
                <span>I understand microphone access is requested only after I press Start recording, and this prototype does not upload audio.</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {!recording && <Button type="button" onClick={startRecording} disabled={!microphoneConsent || requestingAudio}>{requestingAudio ? "Waiting for microphone permission…" : audioUrl ? "Record a replacement draft" : "Start recording"}</Button>}
                {recording && <Button type="button" onClick={stopRecording}>Stop recording</Button>}
                {(audioUrl || recording || requestingAudio) && <Button type="button" variant="outline" onClick={() => releaseAudio()}>{requestingAudio ? "Cancel microphone request" : "Discard recording"}</Button>}
              </div>
              {audioError && <p role="alert" className="text-sm text-destructive">{audioError}</p>}
              {audioUrl && <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Recording ready to review</p>
                <audio controls src={audioUrl} className="w-full">Audio playback is not supported in this browser.</audio>
                <p className="text-xs leading-5 text-muted-foreground">Listen before adding. Audio remains in this preview’s temporary history until removed or reloaded. Changing views stops recording and keeps a reviewable draft.</p>
              </div>}
              <label className="block space-y-2 text-sm font-medium" htmlFor="audio-summary">Optional typed summary <span className="font-normal text-muted-foreground">No transcription is connected</span><Textarea id="audio-summary" value={audioSummary} onChange={(event) => setAudioSummary(event.target.value)} placeholder="Type a brief note in your own words, if useful." /></label>
              {audioUrl && <Button type="button" disabled={recording || requestingAudio} onClick={() => addEntry("audio")}>Add reviewed note to this preview</Button>}
              {!audioUrl && audioSummary.trim() && <Button type="button" disabled={recording || requestingAudio} onClick={() => addEntry("audio")}>Add typed note to this preview</Button>}
              <Button type="button" variant="outline" onClick={() => setCheckinMode("manual")}>Use manual quiz instead</Button>
            </section>}
            <p className="text-xs leading-5 text-muted-foreground">Only this page’s React memory holds entries. No health text or audio is saved in browser storage or sent to an API.</p>
          </CardContent>
        </Card>}

        {screen === "history" && <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle><SectionTitle eyebrow="Your own history" title="Observations you chose to keep" detail="Entries shown here are from this preview session only. Comparisons use actual values you recorded in the starting snapshot or an earlier check-in." /></CardTitle></CardHeader>
            <CardContent>
              {!orderedEntries.length ? <div className="space-y-3 rounded-lg bg-muted p-5">
                <h3 className="text-sm font-semibold">Your history starts when you do.</h3>
                <p className="text-sm leading-6 text-muted-foreground">No dates, symptoms, or progress are pre-filled. When you are ready, add a check-in.</p>
                <Button type="button" onClick={() => setScreen("checkin")}>Start a check-in</Button>
              </div> : <div className="space-y-4">
                {orderedEntries.map((entry, index) => <article key={entry.id} className="space-y-4 rounded-lg border border-border p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{entry.cadence === "weekly" ? "Past week" : "Daily entry"}{index === 0 ? " · Most recent" : ""}</p>
                    <h3 className="mt-1 text-lg font-semibold">{formatDate(entry.date)}</h3>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(entry.symptoms).length ? symptomList.filter((symptom) => entry.symptoms[symptom.id] !== undefined).map((symptom) => <div key={symptom.id} className="grid gap-1 border-b border-border py-2 text-sm sm:grid-cols-2">
                      <span>{symptom.label}</span><span className="text-muted-foreground">{comparisonText(entry, symptom.id)}</span>
                    </div>) : <p className="text-sm text-muted-foreground">Symptoms: Not recorded</p>}
                  </div>
                  {Array.from(new Set([...Object.keys(entry.statuses), ...Object.keys(entry.notes)])).map((id) => {
                    const status = entry.statuses[id];
                    const note = entry.notes[id];
                    return <p key={id} className="text-sm text-muted-foreground">{entry.routineLabels[id] ?? routine.find((candidate) => candidate.id === id)?.label ?? "Routine"}: {status === "did" ? "Did" : status === "did_not" ? "Did not" : status === "not_planned" ? "Not planned" : "Not recorded"}{note ? ` · ${note}` : ""}</p>;
                  })}
                  {entry.audioUrl && <div className="space-y-2"><p className="text-sm font-medium">Audio reflection · only in this preview session</p><audio controls src={entry.audioUrl} className="w-full">Audio playback is not supported in this browser.</audio></div>}
                  {entry.reflection && <p className="whitespace-pre-wrap text-sm leading-6">{entry.reflection}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (entry.audioUrl) {
                      URL.revokeObjectURL(entry.audioUrl);
                      audioUrlsRef.current.delete(entry.audioUrl);
                      if (audioUrlRef.current === entry.audioUrl) audioUrlRef.current = "";
                    }
                    setEntries((items) => items.filter((candidate) => candidate.id !== entry.id));
                  }}>Remove this entry</Button>
                </article>)}
              </div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle><SectionTitle eyebrow="Helpful places to start" title="Clinician and adult resources" detail="These links are independent resources. No clinician is connected to this prototype, and no appointments are booked here." /></CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <p>Possible clinician types to ask about include primary care, a concussion or sports medicine clinic, vestibular physical therapy, or mental health support.</p>
              <ul className="space-y-3">
                <li><Button variant="link" size="sm" asChild className="h-auto whitespace-normal justify-start"><a href="https://www.choosept.com/find-a-pt" target="_blank" rel="noreferrer noopener">Find a physical therapist through ChoosePT (US)</a></Button></li>
                <li><Button variant="link" size="sm" asChild className="h-auto whitespace-normal justify-start"><a href="https://www.cdc.gov/traumaticbraininjury/pdf/tbi_patient_instructions-a.pdf" target="_blank" rel="noreferrer noopener">CDC adult traumatic brain injury patient instructions (PDF)</a></Button></li>
                <li><Button variant="link" size="sm" asChild className="h-auto whitespace-normal justify-start"><a href="https://www.cdc.gov/heads-up/index.html" target="_blank" rel="noreferrer noopener">CDC HEADS UP background (youth-oriented)</a></Button></li>
              </ul>
            </CardContent>
          </Card>
          <Button type="button" onClick={() => setScreen("share")}>Review a summary for my clinician</Button>
        </div>}

        {screen === "share" && <Card>
          <CardHeader><CardTitle><SectionTitle eyebrow="You decide what leaves this page" title="Review before sharing" detail="Choose what to include, inspect the plain-text summary, then copy or download it yourself. Nothing is sent and no clinician account is connected." /></CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {([
                [includeBaseline, setIncludeBaseline, "Starting snapshot and pre-injury context"],
                [includeRoutine, setIncludeRoutine, "Chosen routine, supplements and questions"],
                [includeMilestone, setIncludeMilestone, "Current exercise milestone"],
                [includeEntries, setIncludeEntries, `Journal entries (${orderedEntries.length})`],
              ] as const).map(([checked, setChecked, label]) => <label key={label} className="flex items-center gap-3 text-sm">
                <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
                <span>{label}</span>
              </label>)}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Plain-text preview</h3>
              <Textarea readOnly value={shareText} className="min-h-80 w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={copySummary}>Copy summary</Button>
              <Button type="button" variant="outline" onClick={downloadSummary}>Download .txt</Button>
            </div>
            {shareMessage && <p role="status" className="text-sm text-muted-foreground">{shareMessage}</p>}
            <p className="text-xs leading-5 text-muted-foreground">Nothing is shared automatically. Review local files and clipboard contents before choosing to share them with anyone.</p>
            <p className="text-xs leading-5 text-muted-foreground">The text summary does not contain audio files. Include a typed reflection if you want the content of an audio note in the summary.</p>
          </CardContent>
        </Card>}

        <SafetyNote />
        <footer className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Independent journaling is available without medical advice. Questions about symptoms or movement are separate from access to this tracker.</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setScreen("history")}>Your journal history</Button>
        </footer>
      </div>
    </main>
  );
}
