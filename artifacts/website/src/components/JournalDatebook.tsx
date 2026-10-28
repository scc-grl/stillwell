import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import type {
  DailyCheckIn,
  DailyCheckInSymptomAnswer,
  RecoveryLog,
  RecoveryLogInput,
} from "@workspace/api-client-react";
import {
  checkInSymptoms,
  defaultSymptoms,
  dailyCheckInFromLog,
  formatDate,
  overallChoices,
  ratingChoices,
  ratingLabel,
  sleepDurationLabel,
  sleepDurationMinutes,
  symptomsForRecoveryLog,
  type CheckInSymptomName,
} from "@workspace/recovery-journal";
import {
  Root as DialogRoot,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Title as DialogTitle,
  Description as DialogDescription,
} from "@radix-ui/react-dialog";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Plus, X } from "lucide-react";

type JournalDraft = {
  date: string;
  updatedAt: string;
  startedAt?: string;
  dailyCheckIn: DailyCheckIn;
  sleep: NonNullable<RecoveryLogInput["sleep"]>;
};

type Props = {
  logs: readonly RecoveryLog[];
  today: string;
  ownerId: string;
  selectedSymptoms: readonly CheckInSymptomName[];
  onSave: (input: RecoveryLogInput) => Promise<RecoveryLog>;
  onUpdateTrackedSymptoms: (names: CheckInSymptomName[]) => Promise<void>;
};

const addableSymptoms: { label: string; name: CheckInSymptomName }[] = [
  { label: "Noise sensitivity", name: "noise" },
  { label: "Dizziness or balance", name: "dizziness" },
  { label: "Nausea", name: "nausea" },
  { label: "Blurry or double vision", name: "vision" },
  { label: "Mood", name: "mood" },
  { label: "Neck pain", name: "neck" },
];

function storageKey(ownerId: string, date: string) {
  return `stillwell.journal-draft:${encodeURIComponent(ownerId)}:${date}`;
}

function readJournalDraft(ownerId: string, date: string): JournalDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(ownerId, date));
    if (!raw) return null;
    const draft = JSON.parse(raw) as JournalDraft;
    return draft.date === date ? draft : null;
  } catch {
    return null;
  }
}

function readJournalDraftDates(ownerId: string): string[] {
  if (!ownerId || typeof window === "undefined") return [];
  const prefix = `stillwell.journal-draft:${encodeURIComponent(ownerId)}:`;
  const dates: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      const value = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<JournalDraft> | null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && value?.date === date) dates.push(date);
    }
  } catch {
    return dates;
  }
  return dates;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function ChoiceButtons<T extends string | number>({
  choices,
  value,
  onChange,
  label,
}: {
  choices: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (next: T | null) => void;
  label: string;
}) {
  return <div role="group" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {choices.map((choice) => {
      const active = choice.value === value;
      return <Button
        key={String(choice.value)}
        type="button"
        variant={active ? "secondary" : "outline"}
        className={`min-h-[52px] justify-center ${active ? "border border-primary/40" : ""} motion-reduce:transition-none`}
        aria-pressed={active}
        onClick={() => onChange(active ? null : choice.value)}
      >{active && <Check aria-hidden="true" />}{choice.label}</Button>;
    })}
  </div>;
}

export function JournalDatebook({
  logs,
  today,
  ownerId,
  selectedSymptoms,
  onSave,
  onUpdateTrackedSymptoms,
}: Props) {
  const savedPastDates = logs.map((log) => log.date).filter((date) => date < today);
  const localDraftDates = readJournalDraftDates(ownerId).filter((date) => date < today);
  const pastDates = [...new Set([...savedPastDates, ...localDraftDates])].sort((a, b) => b.localeCompare(a));
  const savedToday = logs.find((log) => log.date === today);
  const [activeDate, setActiveDate] = useState(today);
  const [mode, setMode] = useState<"form" | "saved" | "readonly">("form");
  const [openSection, setOpenSection] = useState<"symptoms" | "sleep" | "note" | null>(null);
  const [showAllDates, setShowAllDates] = useState(false);
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(() => savedToday
    ? dailyCheckInFromLog(savedToday)
    : { overallFeeling: null, worseWithActivity: null, symptoms: checkInSymptoms.map(({ name }) => ({ name, status: "not_recorded", rating: null })), summary: "" });
  const [sleep, setSleep] = useState<NonNullable<RecoveryLogInput["sleep"]>>(
    () => savedToday?.sleep ?? { hoursSlept: null, bedtime: null, wakeTime: null, quality: null, wakings: null, nap: null, note: "" },
  );
  const [trackedNames, setTrackedNames] = useState<CheckInSymptomName[]>([...selectedSymptoms]);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftStartedAt, setDraftStartedAt] = useState<string | null>(null);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [symptomDialogOpen, setSymptomDialogOpen] = useState(false);
  const [modalSelection, setModalSelection] = useState<CheckInSymptomName[]>([]);
  const [otherSelected, setOtherSelected] = useState(false);
  const [symptomSaveError, setSymptomSaveError] = useState("");
  const [symptomSaving, setSymptomSaving] = useState(false);
  const [otherPrompt, setOtherPrompt] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const symptomRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const selectedSymptomsRef = useRef(selectedSymptoms);
  const undoSnapshot = useRef<{ names: CheckInSymptomName[]; checkIn: DailyCheckIn } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  const pendingDraft = useRef<{ ownerId: string; draft: JournalDraft } | null>(null);
  selectedSymptomsRef.current = selectedSymptoms;
  pendingDraft.current = mode === "form" && draftEnabled ? {
    ownerId,
    draft: { date: activeDate, updatedAt: new Date().toISOString(), startedAt: draftStartedAt ?? undefined, dailyCheckIn: { ...checkIn, selectedSymptoms: trackedNames }, sleep },
  } : null;
  const historyCutoff = new Date(`${today}T12:00:00`);
  historyCutoff.setDate(historyCutoff.getDate() - 29);
  const historyCutoffDate = `${historyCutoff.getFullYear()}-${`${historyCutoff.getMonth() + 1}`.padStart(2, "0")}-${`${historyCutoff.getDate()}`.padStart(2, "0")}`;
  const visiblePastDates = showAllDates ? pastDates : pastDates.filter((date) => date >= historyCutoffDate);

  const activeLog = logs.find((log) => log.date === activeDate);
  const isToday = activeDate === today;
  const listedSymptoms = useMemo(() => checkInSymptoms.filter((item) =>
    selectedSymptoms.includes(item.name) || trackedNames.includes(item.name) || checkIn.symptoms.some((answer) => answer.name === item.name && answer.status === "recorded"),
  ), [selectedSymptoms, trackedNames, checkIn.symptoms]);
  const selectedOnDate = checkIn.selectedSymptoms ?? activeLog?.dailyCheckIn?.selectedSymptoms ?? defaultSymptoms;
  const newTodayNames = listedSymptoms.filter((item) =>
    selectedOnDate.includes(item.name)
    && checkIn.symptoms.some((answer) => answer.name === item.name && answer.addedOn === activeDate),
  );

  useEffect(() => {
    const serverLog = logs.find((log) => log.date === activeDate);
    const persisted = readJournalDraft(ownerId, activeDate);
    if (persisted) {
      setCheckIn(persisted.dailyCheckIn);
      setSleep(persisted.sleep);
      setDraftSavedAt(persisted.updatedAt);
      setDraftStartedAt(persisted.startedAt ?? persisted.updatedAt);
      setResumedDraft(true);
      setMode("form");
      setDraftEnabled(true);
    } else {
      setCheckIn(serverLog
        ? dailyCheckInFromLog(serverLog)
        : { overallFeeling: null, worseWithActivity: null, symptoms: checkInSymptoms.map(({ name }) => ({ name, status: "not_recorded", rating: null })), summary: "" });
      setSleep(serverLog?.sleep ?? { hoursSlept: null, bedtime: null, wakeTime: null, quality: null, wakings: null, nap: null, note: "" });
      setDraftSavedAt(null);
      setDraftStartedAt(null);
      setResumedDraft(false);
      setDraftEnabled(false);
      setMode(activeDate === today ? serverLog?.dailyCheckIn?.overallFeeling ? "saved" : "form" : "readonly");
    }
    setTrackedNames([...new Set([...(serverLog?.dailyCheckIn?.selectedSymptoms ?? selectedSymptomsRef.current), ...selectedSymptomsRef.current])]);
    setOpenSection(null);
    setSaveError("");
  }, [activeDate, ownerId, today, logs]);

  useEffect(() => {
    if (mode !== "form" || !ownerId || !draftEnabled) return;
    const timeout = window.setTimeout(() => {
      const now = new Date().toISOString();
      const draft: JournalDraft = {
        date: activeDate,
        updatedAt: now,
        startedAt: draftStartedAt ?? now,
        dailyCheckIn: { ...checkIn, selectedSymptoms: trackedNames },
        sleep,
      };
      try {
        localStorage.setItem(storageKey(ownerId, activeDate), JSON.stringify(draft));
        setDraftSavedAt(now);
        setDraftStartedAt((started) => started ?? now);
      } catch {
        setDraftSavedAt(null);
      }
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [activeDate, checkIn, draftEnabled, draftStartedAt, mode, ownerId, sleep, trackedNames]);

  function keepPendingDraft() {
    const pending = pendingDraft.current;
    if (!pending) return;
    try {
      localStorage.setItem(storageKey(pending.ownerId, pending.draft.date), JSON.stringify(pending.draft));
    } catch { /* Do not log private journal drafts. */ }
  }

  useEffect(() => {
    const keepDraft = () => keepPendingDraft();
    window.addEventListener("pagehide", keepDraft);
    return () => {
      window.removeEventListener("pagehide", keepDraft);
      keepDraft();
    };
  }, []);

  useEffect(() => {
    if (otherPrompt && openSection === "note") {
      noteRef.current?.focus();
      setOtherPrompt(false);
    }
  }, [otherPrompt, openSection]);

  const shortDate = isToday ? "Today" : dayLabel(activeDate);
  const activeOverall = overallChoices.find((choice) => choice.value === checkIn.overallFeeling)?.label;
  const symptomSummary = `${checkIn.symptoms.filter((answer) => trackedNames.includes(answer.name) && answer.status === "recorded").length} of ${trackedNames.length} noted`;
  const sleepSummary = `${sleep.hoursSlept != null ? `${sleep.hoursSlept} h` : sleepDurationLabel(sleep)}${sleep.quality ? ` · ${sleep.quality[0].toUpperCase()}${sleep.quality.slice(1)}` : ""}`;

  function currentHours() {
    if (sleep.hoursSlept != null) return sleep.hoursSlept;
    const minutes = sleepDurationMinutes(sleep);
    return minutes == null ? null : Math.round(minutes / 30) / 2;
  }

  function adjustHours(change: number) {
    const current = currentHours() ?? 0;
    setDraftEnabled(true);
    setSleep((value) => ({
      ...value,
      hoursSlept: change > 0 ? Math.min(14, current + 0.5) : Math.max(0, current - 0.5),
      bedtime: null,
      wakeTime: null,
    }));
  }

  function patchAnswer(name: CheckInSymptomName, rating: DailyCheckInSymptomAnswer["rating"]) {
    setDraftEnabled(true);
    setCheckIn((current) => ({
      ...current,
      selectedSymptoms: trackedNames,
      symptoms: current.symptoms.map((answer) => answer.name === name
        ? { ...answer, status: rating === null ? "not_recorded" : "recorded", rating }
        : answer),
    }));
  }

  function selectPast(date: string) {
    keepPendingDraft();
    pendingDraft.current = null;
    setActiveDate(date);
  }

  async function saveEntry() {
    if (!checkIn.overallFeeling || saving) return;
    setSaving(true);
    setSaveError("");
    const current = activeLog;
    const nextCheckIn = { ...checkIn, selectedSymptoms: trackedNames };
    const input = {
      date: activeDate,
      symptoms: symptomsForRecoveryLog(nextCheckIn, current?.symptoms ?? []),
      dietStatus: current?.dietStatus ?? "not_planned",
      dietNote: current?.dietNote ?? "",
      exerciseStatus: current?.exerciseStatus ?? "not_planned",
      exerciseNote: current?.exerciseNote ?? "",
      meditationStatus: current?.meditationStatus ?? "not_planned",
      meditationMinutes: current?.meditationMinutes ?? 0,
      meditationNote: current?.meditationNote ?? "",
      note: current?.note ?? "",
      dailyCheckIn: nextCheckIn,
      sleep: {
        ...sleep,
        hoursSlept: sleep.hoursSlept == null ? null : sleep.hoursSlept,
        bedtime: sleep.hoursSlept == null ? sleep.bedtime ?? null : null,
        wakeTime: sleep.hoursSlept == null ? sleep.wakeTime ?? null : null,
      },
    } satisfies RecoveryLogInput;
    try {
      await onSave(input);
      pendingDraft.current = null;
      try { localStorage.removeItem(storageKey(ownerId, activeDate)); } catch { /* storage may be disabled */ }
      setDraftSavedAt(null);
      setDraftEnabled(false);
      setMode(isToday ? "saved" : "readonly");
    } catch {
      setSaveError("We couldn't save your entry just now. Your answers are kept on this device…");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!saveError || mode !== "form") return;
    const retry = () => { if (!saving) void saveEntry(); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [saveError, saving, mode, checkIn, sleep, trackedNames, activeDate]);

  function openAddSymptoms() {
    setModalSelection([]);
    setOtherSelected(false);
    setSymptomSaveError("");
    setSymptomDialogOpen(true);
  }

  async function saveAddedSymptoms() {
    const nextNames = [...new Set([...trackedNames, ...modalSelection])];
    if (nextNames.length > 11) return;
    setSymptomSaving(true);
    setSymptomSaveError("");
    try {
      if (nextNames.some((name) => !trackedNames.includes(name))) await onUpdateTrackedSymptoms(nextNames);
      setDraftEnabled(true);
      setTrackedNames(nextNames);
      setCheckIn((current) => ({
        ...current,
        selectedSymptoms: nextNames,
        symptoms: current.symptoms.map((answer) => modalSelection.includes(answer.name)
          ? { ...answer, addedOn: activeDate }
          : answer),
      }));
      setSymptomDialogOpen(false);
      if (otherSelected) {
        setOpenSection("note");
        setOtherPrompt(true);
      } else {
        const first = modalSelection[0];
        if (first) requestAnimationFrame(() => symptomRowRefs.current[first]?.focus());
      }
    } catch {
      setSymptomSaveError("Your symptom list could not be updated. Your current list is unchanged; try again.");
    } finally {
      setSymptomSaving(false);
    }
  }

  async function removeNewSymptom(name: CheckInSymptomName) {
    const nextNames = trackedNames.filter((item) => item !== name);
    undoSnapshot.current = { names: trackedNames, checkIn };
    try {
      await onUpdateTrackedSymptoms(nextNames);
    } catch {
      setSymptomSaveError("Your symptom list could not be updated. Your current list is unchanged; try again.");
      return;
    }
    setDraftEnabled(true);
    setTrackedNames(nextNames);
    setCheckIn((current) => ({
      ...current,
      selectedSymptoms: nextNames,
      symptoms: current.symptoms.map((answer) => answer.name === name ? { name, status: "not_recorded", rating: null } : answer),
    }));
    setUndoAvailable(true);
    setUndoMessage("Removed from future tracking. Today’s response is cleared for now.");
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      setUndoAvailable(false);
      setUndoMessage("");
      undoSnapshot.current = null;
    }, 5000);
  }

  const previousDate = pastDates.find((date) => date < activeDate);
  const nextDate = pastDates.find((date) => date > activeDate);

  return <section className="space-y-5 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-[3px] [&_button:focus-visible]:outline-ring [&_button:focus-visible]:outline-offset-[3px] [&_textarea:focus-visible]:outline [&_textarea:focus-visible]:outline-[3px] [&_textarea:focus-visible]:outline-ring [&_textarea:focus-visible]:outline-offset-[3px]" aria-labelledby="journal-title">
    <header className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground"><span className="h-px w-6 bg-primary/50" aria-hidden="true" />{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${today}T12:00:00`))}</p>
      <h1 id="journal-title" className="font-serif text-4xl font-medium leading-tight sm:text-5xl">How is today?</h1>
    </header>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="space-y-5 p-5 sm:p-6 lg:col-start-2 lg:col-span-2" aria-label={`${shortDate} journal entry`}>
        {activeDate !== today && <Button type="button" variant="ghost" className="min-h-11 px-0" onClick={() => selectPast(today)}><ArrowLeft aria-hidden="true" />Back to today</Button>}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{isToday ? "Today" : "Past entry"}</p>
            <h2 className="mt-1 font-serif text-3xl font-medium">{formatDate(activeDate)}</h2>
          </div>
          {mode === "form" && draftSavedAt && <span role="status" className="text-sm text-muted-foreground">Draft saved {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(draftSavedAt))}</span>}
        </div>

          {mode === "readonly" && <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
             <Button variant="outline" size="icon" className="min-h-[52px] min-w-[52px]" aria-label="Previous entry" disabled={!previousDate} onClick={() => previousDate && selectPast(previousDate)}><ArrowLeft /></Button>
             <Button variant="outline" size="icon" className="min-h-[52px] min-w-[52px]" aria-label="Next entry" disabled={!nextDate} onClick={() => nextDate && selectPast(nextDate)}><ArrowRight /></Button>
          </div>
          <Button type="button" onClick={() => setMode("form")}>Edit this day</Button>
        </div>}

        {mode === "saved" && <Card className="border-secondary bg-secondary p-4 text-base leading-6" role="status">
          <p className="font-semibold">Saved for today. That's all you need to do.</p>
        </Card>}

        {mode === "form" && <>
          <fieldset disabled={saving} className="m-0 min-w-0 space-y-5 border-0 p-0">
          {resumedDraft && draftStartedAt && <Card className="border-secondary bg-secondary p-4 text-sm leading-6">You started today’s entry at {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(draftStartedAt))}. Your draft is kept on this device.</Card>}
          <div className="space-y-3">
            <div role="group" aria-label="Overall" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {overallChoices.map((choice) => {
                const active = checkIn.overallFeeling === choice.value;
                return <Button key={choice.value} type="button" variant={active ? "secondary" : "outline"} className={`min-h-14 justify-center motion-reduce:transition-none ${active ? "border border-primary/40" : ""}`} aria-pressed={active} onClick={() => { setDraftEnabled(true); setCheckIn((current) => ({ ...current, overallFeeling: active ? null : choice.value })); }}>
                  {active && <Check aria-hidden="true" />}{choice.label}
                </Button>;
              })}
            </div>
            <p className="text-sm leading-5 text-muted-foreground">One tap is a complete entry. Add more only if you have the energy.</p>
          </div>

          <Card className="space-y-0 divide-y divide-border p-0">
            <section className="p-4">
              <Button type="button" variant="ghost" className="h-auto min-h-[52px] w-full justify-between px-0 text-left" aria-expanded={openSection === "symptoms"} aria-controls="journal-symptoms-content" onClick={() => setOpenSection((open) => open === "symptoms" ? null : "symptoms")}>
                <span><span className="block text-base font-semibold">Symptoms</span><span className="block text-sm text-muted-foreground">{symptomSummary}</span></span>
                <span aria-hidden="true">{openSection === "symptoms" ? "−" : "+"}</span>
              </Button>
              {openSection === "symptoms" && <div id="journal-symptoms-content" className="mt-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="max-w-xl text-sm leading-5 text-muted-foreground">These are your own observations, not a diagnosis. Choose what feels useful to record.</p>
                    <Link href="/quiz" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">Change my list</Link>
                  </div>
                  {symptomSaveError && <p role="alert" className="text-sm text-destructive">{symptomSaveError}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={openAddSymptoms}><Plus aria-hidden="true" />Something new today?</Button>
                </div>
                {listedSymptoms.map((symptom) => {
                  const answer = checkIn.symptoms.find((item) => item.name === symptom.name);
                  const newlyAdded = newTodayNames.some((item) => item.name === symptom.name);
                  return <div key={symptom.name} ref={(node) => { symptomRowRefs.current[symptom.name] = node; }} tabIndex={-1} className="space-y-2 rounded-xl border border-border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-medium">{symptom.label}{newlyAdded && <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">New today</span>}</p>
                      {newlyAdded && <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${symptom.label} from future tracking`} onClick={() => void removeNewSymptom(symptom.name)}><X aria-hidden="true" />Remove</Button>}
                    </div>
                    <ChoiceButtons
                      label={symptom.label}
                      choices={ratingChoices}
                      value={answer?.status === "recorded" ? answer.rating : null}
                      onChange={(value) => patchAnswer(symptom.name, value as DailyCheckInSymptomAnswer["rating"])}
                    />
                  </div>;
                })}
                {undoMessage && <p role="status" className="text-sm text-muted-foreground">{undoMessage}{undoAvailable && <Button type="button" variant="link" className="h-auto p-0" onClick={() => {
                  const snapshot = undoSnapshot.current;
                  if (snapshot) {
                    void onUpdateTrackedSymptoms(snapshot.names);
                    setTrackedNames(snapshot.names);
                    setCheckIn(snapshot.checkIn);
                    setDraftEnabled(true);
                  }
                  if (undoTimer.current) window.clearTimeout(undoTimer.current);
                  undoSnapshot.current = null;
                  setUndoAvailable(false);
                  setUndoMessage("");
                }}>Undo</Button>}</p>}
              </div>}
            </section>
            <section className="p-4">
              <Button type="button" variant="ghost" className="h-auto min-h-[52px] w-full justify-between px-0 text-left" aria-expanded={openSection === "sleep"} aria-controls="journal-sleep-content" onClick={() => setOpenSection((open) => open === "sleep" ? null : "sleep")}>
                <span><span className="block text-base font-semibold">Last night's sleep</span><span className="block text-sm text-muted-foreground">{sleepSummary}</span></span>
                <span aria-hidden="true">{openSection === "sleep" ? "−" : "+"}</span>
              </Button>
              {openSection === "sleep" && <div id="journal-sleep-content" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-base font-medium">Hours slept (optional)</p>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="min-h-[52px] min-w-[52px]" aria-label="Fewer hours" onClick={() => adjustHours(-0.5)}>−</Button>
                    <output aria-live="polite" className="min-w-20 text-center text-lg font-semibold">{sleep.hoursSlept == null ? sleepDurationLabel(sleep) : `${sleep.hoursSlept} h`}</output>
                    <Button type="button" variant="outline" size="icon" className="min-h-[52px] min-w-[52px]" aria-label="More hours" disabled={currentHours() != null && currentHours()! >= 14} onClick={() => adjustHours(0.5)}>+</Button>
                    {sleep.hoursSlept != null && <Button type="button" variant="ghost" onClick={() => { setDraftEnabled(true); setSleep((current) => ({ ...current, hoursSlept: null })); }}>Clear</Button>}
                  </div>
                  <p className="text-sm text-muted-foreground">Choose in half-hour steps, up to 14 hours.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium">Sleep quality (optional)</p>
                  <ChoiceButtons label="Sleep quality" choices={[{ value: "poor", label: "Poor" }, { value: "fair", label: "Fair" }, { value: "good", label: "Good" }, ...(sleep.quality === "great" ? [{ value: "great" as const, label: "Great" }] : [])]} value={sleep.quality} onChange={(value) => { setDraftEnabled(true); setSleep((current) => ({ ...current, quality: value })); }} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium">Times woke up (optional)</p>
                  <ChoiceButtons label="Times woke up" choices={[{ value: 0, label: "None" }, { value: 2, label: "1–2" }, { value: 3, label: "3+" }]} value={sleep.wakings === 1 ? 2 : sleep.wakings} onChange={(value) => { setDraftEnabled(true); setSleep((current) => ({ ...current, wakings: value })); }} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium">Daytime nap (optional)</p>
                  <ChoiceButtons label="Daytime nap" choices={[{ value: "none", label: "None" }, { value: "under_30", label: "Short" }, { value: "30_or_more", label: "Long" }]} value={sleep.nap} onChange={(value) => { setDraftEnabled(true); setSleep((current) => ({ ...current, nap: value })); }} />
                </div>
              </div>}
            </section>
            <section className="p-4">
              <Button type="button" variant="ghost" className="h-auto min-h-[52px] w-full justify-between px-0 text-left" aria-expanded={openSection === "note"} aria-controls="journal-note-content" onClick={() => setOpenSection((open) => open === "note" ? null : "note")}>
                <span><span className="block text-base font-semibold">Note for yourself</span><span className="block text-sm text-muted-foreground">{checkIn.summary.trim() || "Optional"}</span></span>
                <span aria-hidden="true">{openSection === "note" ? "−" : "+"}</span>
              </Button>
              {openSection === "note" && <div id="journal-note-content" className="mt-4 space-y-2">
                <label htmlFor="journal-note" className="text-base font-medium">Note for yourself (optional)</label>
                {otherSelected && <p className="text-sm leading-5 text-muted-foreground">You chose Other. Describe it here in your own words.</p>}
                <Textarea ref={noteRef} id="journal-note" value={checkIn.summary} maxLength={500} placeholder="Other symptoms, anything else" onChange={(event) => { setDraftEnabled(true); setCheckIn((current) => ({ ...current, summary: event.target.value.slice(0, 500) })); }} />
                <p className="text-sm text-muted-foreground">{checkIn.summary.length}/500</p>
              </div>}
            </section>
          </Card>

          <Card className="border-accent bg-accent/30 p-4 text-sm leading-6">
            <p>{newTodayNames.length > 0
              ? "If this is a new symptom, contact a clinician. Stillwell is not for a new injury or emergency. Severe or urgent symptoms need emergency care now."
              : "Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now."}</p>
          </Card>
          {saveError && <Card role="alert" className="border-destructive p-4 text-sm text-destructive">{saveError}</Card>}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your draft saves as you go.</p>
            <Button type="button" className="min-h-14 w-full sm:w-auto" disabled={!checkIn.overallFeeling || saving} onClick={() => void saveEntry()}>{saving ? "Saving…" : saveError ? "Try saving again" : isToday ? "Save today's entry" : "Save this day"}<Check aria-hidden="true" /></Button>
            {!checkIn.overallFeeling && <p className="text-sm text-muted-foreground">Choose how today feels to start your entry.</p>}
          </div>
          </fieldset>
        </>}

        {(mode === "saved" || mode === "readonly") && <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Your recorded responses · no interpretation added.</p>
          <Card className="space-y-4 p-4">
            <p className="font-semibold">Overall · {activeOverall ?? "Not recorded"}</p>
            {listedSymptoms.map((symptom) => {
              const answer = checkIn.symptoms.find((item) => item.name === symptom.name);
              const notTracked = !selectedOnDate.includes(symptom.name) && answer?.status !== "recorded";
              return <div key={symptom.name} className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm">
                <span>{symptom.label}{mode === "saved" && newTodayNames.some((item) => item.name === symptom.name) && <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">New today</span>}</span>
                <span className={!answer?.status || answer.status !== "recorded" ? "italic text-muted-foreground" : ""}>{notTracked ? "Not tracked yet" : answer?.status === "recorded" ? ratingLabel(answer) : "Not recorded"}</span>
              </div>;
            })}
            <div className="border-t border-border pt-3 text-sm">
              <p className="font-medium">Last night's sleep</p>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Hours slept</dt><dd className="italic">{sleep.hoursSlept == null ? sleepDurationLabel(sleep) : `${sleep.hoursSlept} h`}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Sleep quality</dt><dd className="italic">{sleep.quality ? ({ poor: "Poor", fair: "Fair", good: "Good", great: "Great" }[sleep.quality]) : "Not recorded"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Times woke up</dt><dd className="italic">{sleep.wakings == null ? "Not recorded" : sleep.wakings === 0 ? "None" : sleep.wakings === 3 ? "3+" : "1–2"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Daytime nap</dt><dd className="italic">{sleep.nap == null ? "Not recorded" : sleep.nap === "none" ? "None" : sleep.nap === "under_30" ? "Short" : "Long"}</dd></div>
              </dl>
            </div>
            <div className="border-t border-border pt-3 text-sm"><p className="font-medium">Note for yourself</p><p className={`mt-1 whitespace-pre-wrap text-muted-foreground ${checkIn.summary.trim() ? "" : "italic"}`}>{checkIn.summary.trim() || "Not recorded"}</p></div>
          </Card>
          <Card className="border-accent bg-accent/30 p-4 text-sm leading-6">
            <p>{newTodayNames.length > 0
              ? "If this is a new symptom, contact a clinician. Stillwell is not for a new injury or emergency. Severe or urgent symptoms need emergency care now."
              : "Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now."}</p>
          </Card>
          {mode === "saved" && <Button type="button" variant="outline" onClick={() => { setMode("form"); setDraftEnabled(true); }}>Edit today's entry</Button>}
        </div>}
      </Card>
      <Card className="order-2 h-fit space-y-4 p-5 sm:p-6 lg:order-1 lg:col-start-1 lg:row-start-1" aria-labelledby="past-entries-heading">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1"><h2 id="past-entries-heading" className="font-serif text-2xl font-medium">Past entries</h2></div>
          <Button type="button" variant="link" className="min-h-11 px-1" onClick={() => setShowAllDates((value) => !value)}>{showAllDates ? "Show recent" : "See all dates"}</Button>
        </div>
        {pastDates.length === 0
          ? <div className="rounded-xl bg-secondary/50 px-4 py-6 text-center">
            <p className="text-sm font-medium">Your history starts when you do.</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">Previous days appear after you choose to save them. Today is ready here.</p>
          </div>
          : visiblePastDates.length === 0
            ? <p className="rounded-xl bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground">No entries in the last 30 days.</p>
            : <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {visiblePastDates.map((date) => {
              const log = logs.find((item) => item.date === date)!;
              const chosen = date === activeDate;
              const overall = log
                ? overallChoices.find((choice) => choice.value === log.dailyCheckIn?.overallFeeling)?.label ?? "Entry saved"
                : "Draft in progress";
              return <Button key={date} type="button" variant={chosen ? "secondary" : "ghost"} className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal text-left" aria-current={chosen ? "date" : undefined} onClick={() => selectPast(date)}>
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-foreground">
                  <span className="text-xs uppercase leading-none">{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${date}T12:00:00`))}</span>
                  <span className="mt-1 text-lg font-semibold leading-none">{Number(date.slice(-2))}</span>
                </span>
                  <span><span className="block text-sm font-semibold">{dayLabel(date)}</span><span className="block text-sm text-muted-foreground">{localDraftDates.includes(date) ? "Draft in progress" : overall}</span></span>
              </Button>;
            })}
          </div>}
        <p className="border-t border-border pt-3 text-sm leading-5 text-muted-foreground">Only days you recorded. Nothing is filled in.</p>
      </Card>
    </div>

    <DialogRoot open={symptomDialogOpen} onOpenChange={setSymptomDialogOpen}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-foreground/40" />
        <DialogContent className="fixed left-1/2 top-1/2 z-50 grid max-h-[min(90dvh,36rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-[calc(var(--radius)*1.5)] border border-border bg-background p-6 shadow-lg focus:outline-none">
          <DialogTitle className="text-lg font-semibold">Something new today?</DialogTitle>
          <DialogDescription className="text-sm leading-5 text-muted-foreground">Choose symptoms you want to add to today’s list. A new symptom is not a diagnosis. If a symptom is new, contact a clinician.</DialogDescription>
        <div className="flex flex-wrap gap-2">
          {addableSymptoms.filter((item) => !trackedNames.includes(item.name)).map((item) => <Button key={item.name} type="button" className="min-h-[52px]" variant={modalSelection.includes(item.name) ? "secondary" : "outline"} aria-pressed={modalSelection.includes(item.name)} onClick={() => setModalSelection((current) => current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name])}>{item.label}</Button>)}
          <Button type="button" className="min-h-[52px]" variant={otherSelected ? "secondary" : "outline"} aria-pressed={otherSelected} onClick={() => setOtherSelected((value) => !value)}>Other</Button>
        </div>
        {symptomSaveError && <p role="alert" className="text-sm text-destructive">{symptomSaveError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-[52px]" disabled={symptomSaving} onClick={() => setSymptomDialogOpen(false)}>Cancel</Button>
          <Button type="button" className="min-h-[52px]" disabled={symptomSaving} onClick={() => void saveAddedSymptoms()}>{symptomSaving ? "Saving…" : "Save"}</Button>
        </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </section>;
}
