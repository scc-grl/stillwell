import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
  useDeleteRecoveryLog,
  useGetRecovery,
  useSaveRecoveryLog,
  useStartRecovery,
  useUpdateRecoveryProfile,
} from "@workspace/api-client-react";
import type {
  RecoveryLog,
  RecoveryLogInput,
  RecoveryPreferences,
  RecoveryState,
} from "@workspace/api-client-react";
import { careLinkPath } from "@workspace/recovery-journal/care-link-handoff";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { CareTeamPanel } from "@/components/CareTeamPanel";
import { pendingLink } from "@/lib/care-link";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { ActivitiesEditor } from "@/components/ActivitiesEditor";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { SymptomPreferences } from "@/components/SymptomPreferences";
import { activityQuestion, activityAnswerChoices } from "@workspace/recovery-journal";
import { PatientProgressChart } from "@/components/PatientProgressChart";
import { SleepEditor } from "@/components/SleepEditor";
import { SleepDetailList, SleepWeekTable } from "@/components/SleepDetails";
import { clearDraft, emptyLog, localDate, priorityChoices, readDraft, routinePrompts, type DraftEnvelope } from "@/lib/recovery";
import {
  activityChoices,
  dailyCheckInFromLog,
  formatDate,
  checkInSymptoms,
  overallChoices,
  ratingLabel,
  ratingChoices,
  sleepSummary,
  supportModes,
  type SleepLog,
} from "@workspace/recovery-journal";

type SelectedHistory = { log: RecoveryLog; view: "summary" | "check_in" | "activities" | "sleep" };

function Brand() {
  return <Link href="/" className="flex items-center gap-3 text-foreground" aria-label="Stillwell home">
    <span className="brand-mark" aria-hidden="true" />
    <span className="font-serif text-xl font-semibold tracking-tight">stillwell</span>
  </Link>;
}

type PatientSection = "dashboard" | "journal" | "care-team" | "account";
const patientNavigation: { id: "dashboard" | "journal"; label: string; path: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { id: "journal", label: "Journal", path: "/dashboard/journal", icon: NotebookPen },
];

function sectionForPath(path: string): PatientSection {
  if (path.startsWith("/dashboard/journal")) return "journal";
  if (path.startsWith("/dashboard/care-team")) return "care-team";
  if (path.startsWith("/dashboard/account")) return "account";
  return "dashboard";
}

function PatientDashboardNav({ section }: { section: PatientSection }) {
  return <header className="sticky top-0 z-20 border-b border-border bg-background/95 shadow-sm backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-8 md:flex-row md:items-center md:justify-between">
      <Brand />
      <div className="grid w-full grid-cols-[1fr_auto] gap-2 md:w-auto md:flex md:items-center">
        <nav aria-label="Main navigation" className="grid grid-cols-2 gap-1 md:flex md:items-center">
          {patientNavigation.map(({ id, label, path, icon: Icon }) => <Button
            key={id}
            variant={section === id ? "secondary" : "ghost"}
            size="sm"
            className="min-h-11 justify-start"
            asChild
          >
            <Link href={path} aria-current={section === id ? "page" : undefined} data-testid={`link-patient-${id}`}>
              <Icon className="size-4" />{label}
            </Link>
          </Button>)}
        </nav>
        <Button variant={section === "account" ? "secondary" : "ghost"} size="sm" className="min-h-11" asChild>
          <Link href="/dashboard/account" aria-current={section === "account" ? "page" : undefined} data-testid="link-patient-account">
            <Settings2 className="size-4" />Account
          </Link>
        </Button>
      </div>
    </div>
  </header>;
}

function activityStatusLabel(status: RecoveryLog["dietStatus"]) {
  return activityChoices.find((choice) => choice.value === status)?.label ?? "Not planned";
}

function formatHistoryDate(date: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, options);
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{children}</span>;
}

function HistorySummary({ log }: { log: RecoveryLog }) {
  const checkIn = dailyCheckInFromLog(log);
  const overall = overallChoices.find((choice) => choice.value === checkIn.overallFeeling)?.label;
  const recordedCount = checkIn.symptoms.filter((answer) => answer.status === "recorded").length;
  return <div className="space-y-4">
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-2xl font-medium">Symptom check-in</h3>
        <StatusPill>{recordedCount} of {checkInSymptoms.length} recorded</StatusPill>
      </div>
      {overall ? <StatusPill>Overall · {overall}</StatusPill> : <p className="text-sm text-muted-foreground">No overall feeling recorded.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {checkInSymptoms.map((symptom) => {
          const answer = checkIn.symptoms.find((item) => item.name === symptom.name);
          const label = answer ? ratingLabel(answer) : "Not recorded";
          const selectedLevel = answer?.status === "recorded"
            ? ratingChoices.findIndex((choice) => choice.value === answer.rating) + 1
            : 0;
          return <div key={symptom.name} className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />{symptom.label}</span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="mt-3 flex gap-1" role="img" aria-label={`${symptom.label}: ${label}`}>
                {ratingChoices.map((choice, index) => <span key={choice.value} className={`h-2 flex-1 rounded-full ${index < selectedLevel ? "bg-primary" : "bg-muted"}`} />)}
              </div>
              <div className="mt-1 flex justify-between gap-2 text-[10px] leading-4 text-muted-foreground">
                <span>{ratingChoices[0].label}</span>
                <span>{ratingChoices[ratingChoices.length - 1].label}</span>
              </div>
            </div>
          </div>;
        })}
      </div>
      <p className="text-sm">{activityQuestion} {activityAnswerChoices.find(choice => choice.value === checkIn.worseWithActivity)?.label ?? "Not recorded"}</p>
      {checkIn.summary.trim() && <p className="whitespace-pre-wrap border-t border-border pt-3 text-sm leading-6">{checkIn.summary}</p>}
    </Card>
    <Card className="space-y-3 p-5">
      <h3 className="font-serif text-2xl font-medium">Sleep</h3>
      <SleepDetailList sleep={log.sleep} />
    </Card>
    <Card className="space-y-4 p-5">
      <h3 className="font-serif text-2xl font-medium">Food, movement and pacing</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Food & hydration</p><StatusPill>{activityStatusLabel(log.dietStatus)}</StatusPill></div>{log.dietNote && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{log.dietNote}</p>}</div>
        <div><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Movement & rest</p><StatusPill>{activityStatusLabel(log.exerciseStatus)}</StatusPill></div>{log.exerciseNote && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{log.exerciseNote}</p>}</div>
        <div><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Meditation or a quiet pause</p><StatusPill>{activityStatusLabel(log.meditationStatus)}</StatusPill></div>{(log.meditationNote || log.meditationMinutes > 0) && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{log.meditationMinutes > 0 ? `${log.meditationMinutes} optional minutes. ` : ""}{log.meditationNote}</p>}</div>
        {log.note && <div><p className="text-sm font-medium">Pacing reflection</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{log.note}</p></div>}
      </div>
    </Card>
  </div>;
}

function SleepDeleteConfirm({ date, pending, onKeep, onDelete }: { date: string; pending: boolean; onKeep: () => void; onDelete: () => void }) {
  return <Card role="alertdialog" aria-labelledby="sleep-delete-heading" className="mt-4 space-y-3 border-destructive p-4">
    <h3 id="sleep-delete-heading" className="text-sm font-semibold">Delete sleep for this day?</h3>
    <p className="text-sm leading-6 text-muted-foreground">This removes only {formatDate(date)}’s sleep entry. Your check-in and activities stay. This cannot be undone.</p>
    <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" onClick={onKeep}>Keep sleep</Button><Button variant="destructive" disabled={pending} onClick={onDelete}>{pending ? "Deleting…" : "Delete sleep"}</Button></div>
  </Card>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const userId = user?.id ?? "";
  const recoveryKey = useMemo(() => [...getGetRecoveryQueryKey(), userId], [userId]);
  const recoveryQuery = useGetRecovery({ query: { enabled: Boolean(userId), queryKey: recoveryKey, retry: false } });
  const startRecovery = useStartRecovery();
  const updateProfile = useUpdateRecoveryProfile();
  const saveRecoveryLog = useSaveRecoveryLog();
  const deleteRecoveryLog = useDeleteRecoveryLog();
  const profile = recoveryQuery.data?.profile;
  const section = sectionForPath(location);
  const logs = useMemo(() => [...(recoveryQuery.data?.logs ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [recoveryQuery.data?.logs]);
  const today = localDate();
  const todayLog = logs.find((item) => item.date === today);
  const todayCheckIn = todayLog ? dailyCheckInFromLog(todayLog) : null;
  const hasTodayCheckIn = Boolean(todayCheckIn && (
    todayCheckIn.overallFeeling
    || todayCheckIn.summary.trim()
    || todayCheckIn.worseWithActivity
    || todayCheckIn.symptoms.some((answer) => answer.status === "recorded")
  ));
  const pastLogs = logs.filter((item) => item.date < today).sort((a, b) => a.date.localeCompare(b.date));
  const [routineOpen, setRoutineOpen] = useState(false);
  const [priorities, setPriorities] = useState<RecoveryPreferences["priorities"]>([]);
  const [supportMode, setSupportMode] = useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [activityInitial, setActivityInitial] = useState<RecoveryLogInput | null>(null);
  const [todayCheckInOpen, setTodayCheckInOpen] = useState(false);
  const [selectedHistoryState, setSelectedHistory] = useState<SelectedHistory | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<"30" | "all">("30");
  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [deleteSleepDate, setDeleteSleepDate] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const startedOnce = useRef(false);
  const historyCutoff = new Date(`${today}T12:00:00`);
  historyCutoff.setDate(historyCutoff.getDate() - 29);
  const historyCutoffDate = `${historyCutoff.getFullYear()}-${`${historyCutoff.getMonth() + 1}`.padStart(2, "0")}-${`${historyCutoff.getDate()}`.padStart(2, "0")}`;
  const recentPastLogs = pastLogs.filter((item) => item.date >= historyCutoffDate);
  const visiblePastLogs = historyPeriod === "all" ? pastLogs : recentPastLogs;
  const historyMonthGroups = visiblePastLogs.reduce<Record<string, RecoveryLog[]>>((groups, log) => {
    const month = formatHistoryDate(log.date, { month: "long", year: "numeric" });
    groups[month] = [...(groups[month] ?? []), log];
    return groups;
  }, {});
  const selectedHistory = selectedHistoryState ?? (visiblePastLogs.length
    ? { log: visiblePastLogs[visiblePastLogs.length - 1], view: "summary" as const }
    : null);

  useEffect(() => {
    startedOnce.current = false;
    setRoutineOpen(false);
    setActivitiesOpen(false);
    setActivityInitial(null);
    setTodayCheckInOpen(false);
    setSelectedHistory(null);
    setDeleteDate(null);
    setSleepOpen(false);
    setDeleteSleepDate(null);
    setMessage("");
  }, [userId]);

  useEffect(() => {
    if (!selectedHistoryState && visiblePastLogs.length > 0) {
      setSelectedHistory({ log: visiblePastLogs[visiblePastLogs.length - 1], view: "summary" });
    }
  }, [selectedHistoryState, visiblePastLogs]);

  function persistDraft(draft: DraftEnvelope) {
    startedOnce.current = true;
    startRecovery.mutate({ data: draft.payload }, {
      onSuccess: (state) => {
        queryClient.setQueryData(recoveryKey, state);
        clearDraft();
        setMessage("Your first daily summary is ready. You can edit it whenever you like.");
        const link = pendingLink.read();
        if (link?.kind === "request" && pendingLink.update(link.token, { ready: true })) setLocation(careLinkPath("request", link.token));
      },
      onError: () => setMessage("Your consented setup is still kept in this tab. We couldn’t save it yet; try again when you’re ready."),
    });
  }

  useEffect(() => {
    if (!userId) return;
    if (profile) {
      clearDraft();
      setPriorities([...profile.priorities]);
      setSupportMode(profile.supportMode);
      return;
    }
    const draft = readDraft();
    if (!draft) return;
    if (draft.ownerId && draft.ownerId !== userId) { clearDraft(); return; }
    if (!draft.ownerId) {
      try {
        sessionStorage.setItem("stillwell.consented-recovery-draft", JSON.stringify({ ...draft, ownerId: userId }));
      } catch {
        clearDraft();
        return;
      }
    }
    if (!recoveryQuery.isLoading && !recoveryQuery.isError && !startedOnce.current) persistDraft(draft);
  // Start mutation success is guarded by startedOnce and account ownership.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile, recoveryQuery.isLoading, recoveryQuery.isError, recoveryKey, queryClient]);

  async function saveRoutine() {
    if (!profile || priorities.length === 0) return;
    setMessage("");
    try {
      const next = await updateProfile.mutateAsync({ data: { supportMode, priorities } });
      queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old ? { ...old, profile: next } : { profile: next, logs: [] });
      setRoutineOpen(false);
      setMessage("Your routine preferences are saved.");
    } catch {
      setMessage("Your routine could not be saved. Your previous settings are unchanged.");
    }
  }

  async function saveCheckIn(input: RecoveryLogInput): Promise<RecoveryLog> {
    const saved = await saveRecoveryLog.mutateAsync({ data: { ...input, section: "check_in" } });
    queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old
      ? { ...old, logs: [...old.logs.filter((item) => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)) }
      : { profile: null, logs: [saved] });
    return saved;
  }

  async function saveActivities(input: RecoveryLogInput) {
    const saved = await saveRecoveryLog.mutateAsync({ data: { ...input, section: "activities" } });
    queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old
      ? { ...old, logs: [...old.logs.filter((item) => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)) }
      : { profile: null, logs: [saved] });
    setActivitiesOpen(false);
    setActivityInitial(null);
    setSelectedHistory((current) => current
      ? { ...current, log: saved, view: current.view === "activities" ? "summary" : current.view }
      : current);
    setMessage(`${formatDate(saved.date)} activities saved.`);
  }

  async function saveSleep(date: string, sleep: SleepLog | null) {
    const saved = await saveRecoveryLog.mutateAsync({ data: { ...emptyLog(date), sleep, section: "sleep" } });
    queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old
      ? { ...old, logs: [...old.logs.filter((item) => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)) }
      : { profile: null, logs: [saved] });
    setSleepOpen(false);
    setDeleteSleepDate(null);
    setSelectedHistory((current) => current && current.log.date === saved.date ? { log: saved, view: "summary" } : current);
    setMessage(sleep ? `${formatDate(saved.date)} sleep saved.` : `${formatDate(saved.date)} sleep was deleted.`);
    return saved;
  }

  async function deleteSleep(date: string) {
    setMessage("");
    try {
      await saveSleep(date, null);
    } catch {
      setMessage("Sleep could not be deleted. Please try again.");
    }
  }

  function beginActivities(log?: RecoveryLog) {
    setActivityInitial(log ? { ...log } : { ...(todayLog ?? emptyLog(today)) });
    setActivitiesOpen(true);
    setSelectedHistory(null);
    setMessage("");
  }

  async function deletePastDay(date: string) {
    setMessage("");
    try {
      await deleteRecoveryLog.mutateAsync({ date });
      queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old ? { ...old, logs: old.logs.filter((item) => item.date !== date) } : old);
      setDeleteDate(null);
      setSelectedHistory(null);
      setMessage(`${formatDate(date)} was deleted.`);
    } catch {
      setMessage("That entry could not be deleted. Please try again.");
    }
  }

  function togglePriority(id: RecoveryPreferences["priorities"][number]) {
    setPriorities((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function logout() {
    clearDraft();
    queryClient.clear();
    await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
    setLocation("/");
  }

  const openHistoryDay = (log: RecoveryLog) => {
    setSelectedHistory({ log, view: "summary" });
    setDeleteDate(null);
    setDeleteSleepDate(null);
    setMessage("");
  };

  return <main className="min-h-[100dvh] bg-background pb-12">
    <PatientDashboardNav section={section} />
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-7 sm:px-8 sm:pt-10">
      {section === "dashboard" && <section className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-9">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Your dashboard</p>
            <h1 className="max-w-2xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Your recovery, at your pace.</h1>
            <p className="max-w-xl text-sm leading-6 opacity-90">Review the check-ins you chose to save, your routine plan, and who can read your journal.</p>
          </div>
          {profile && <Button variant="secondary" onClick={() => setLocation("/dashboard/journal")} data-testid="button-open-journal">Open journal</Button>}
        </div>
      </section>}
      {section === "journal" && <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground"><span className="h-px w-6 bg-primary/50" aria-hidden="true" />Your private journal</p>
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">Your past check-ins</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Revisit the days you chose to record. No values are filled in between entries.</p>
        </div>
        {profile && <Button
          aria-expanded={todayCheckInOpen}
          aria-controls="today-check-in"
          onClick={() => setTodayCheckInOpen((open) => !open)}
          data-testid="button-toggle-today-check-in"
        >{todayCheckInOpen ? "Close today’s entry" : hasTodayCheckIn ? "Review today’s check-in" : "Start today’s check-in"} <ArrowRight /></Button>}
      </section>}
      {section === "account" && <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your settings</p>
        <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Account</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Your Stillwell sign-in and private data controls.</p>
      </section>}
      {section === "care-team" && <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your dashboard</p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Care team</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Choose who can read your journal. You can stop sharing at any time.</p>
        </div>
        <Button variant="outline" asChild><Link href="/dashboard">Back to dashboard</Link></Button>
      </section>}

      {section === "dashboard" && <Card className="flex gap-3 border-accent bg-accent/30 p-4 text-sm leading-6">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
        <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
      </Card>}
      {message && <Card role="status" className="border-secondary bg-secondary p-4 text-sm leading-6 text-secondary-foreground" data-testid="status-dashboard-feedback">{message}</Card>}
      {(section === "dashboard" || section === "journal") && recoveryQuery.isLoading && <Card aria-label="Loading your journal" className="animate-pulse space-y-4 p-6"><div className="h-4 w-40 rounded bg-muted" /><div className="h-24 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /></Card>}
      {(section === "dashboard" || section === "journal") && recoveryQuery.isError && <Card className="space-y-4 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">We couldn’t open your journal</p><h2 className="font-serif text-3xl">Your notes haven’t gone anywhere.</h2><p className="text-sm leading-6 text-muted-foreground">Check your connection, then try loading the private journal again.</p><Button variant="outline" onClick={() => void recoveryQuery.refetch()} data-testid="button-retry-journal">Try again <ArrowRight /></Button></Card>}
      {(section === "dashboard" || section === "journal") && !recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !readDraft() && <Card className="space-y-4 p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A beginning, not a blank template</p>
        <h2 className="max-w-xl font-serif text-4xl font-medium">Choose what you want this space to hold.</h2>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">Start with a few optional preferences and a first daily reflection. You decide what belongs here. Your setup is not sent until you consent and sign in.</p>
        <Button className="w-fit" onClick={() => setLocation("/quiz")}>Set up my journal <ArrowRight /></Button>
        <p className="text-xs text-muted-foreground">No profile or recovery history is displayed until you create it.</p>
      </Card>}
      {(section === "dashboard" || section === "journal") && !recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !!readDraft() && <Card className="space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saved setup, ready to retry</p>
        <h2 className="font-serif text-3xl">Your first summary is waiting.</h2>
        <p className="text-sm leading-6 text-muted-foreground">We couldn’t finish saving the setup yet. It remains in this tab temporarily, and your existing preferences have not been replaced.</p>
        <Button className="w-fit" disabled={startRecovery.isPending} onClick={() => { const draft = readDraft(); if (draft) persistDraft(draft); else setMessage("This setup has expired. Start a new quiz to continue."); }}>{startRecovery.isPending ? "Trying…" : "Try again"} <ArrowRight /></Button>
      </Card>}

      {section === "care-team" && <>
        {recoveryQuery.isError && <Card role="status" className="p-4 text-sm text-muted-foreground">Your journal profile could not be checked right now. Try again before inviting a clinician.</Card>}
        <CareTeamPanel hasJournal={Boolean(profile)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Planned</p>
            <h2 className="font-serif text-2xl font-medium">Find a clinician</h2>
            <p className="text-sm leading-6 text-muted-foreground">A clinician directory and matching are not available yet. You can invite a clinician you already know to read your journal.</p>
            <Button variant="outline" asChild data-testid="button-find-clinician-planned"><Link href="/find-your-clinician">About future matching <ArrowRight /></Link></Button>
          </Card>
          <Card className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Planned</p>
            <h2 className="font-serif text-2xl font-medium">Clinician feedback</h2>
            <p className="text-sm leading-6 text-muted-foreground">Clinicians can read only what you choose to share. Leaving feedback in Stillwell is not available yet; you can bring your journal to a visit.</p>
          </Card>
        </div>
      </>}

      {!recoveryQuery.isLoading && !recoveryQuery.isError && profile && (section === "dashboard" || section === "journal") && <>
        {section === "dashboard" && <PatientProgressChart logs={logs} today={today} />}
        {section === "dashboard" && <details className="space-y-4"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Journal settings · symptoms to track</summary><SymptomPreferences /></details>}
        <div className="space-y-5">
          {section === "dashboard" && <Card className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care protocol</p><h2 className="mt-2 font-serif text-2xl font-medium">{supportModes.find((mode) => mode.value === profile.supportMode)?.title}</h2></div>
              <Button variant="outline" size="sm" onClick={() => { setRoutineOpen((value) => !value); setActivitiesOpen(false); }}>{routineOpen ? "Close" : "Edit routine"}</Button>
            </div>
            <div className="flex flex-wrap gap-2">{profile.priorities.map((id) => <StatusPill key={id}>{priorityChoices.find((choice) => choice.id === id)?.title ?? id}</StatusPill>)}</div>
            <ol className="space-y-3" aria-label="Your chosen routine">
              {profile.priorities.map((id, index) => {
                const current = logs.find((item) => item.date === today);
                const status = id === "food_hydration" ? current?.dietStatus : id === "movement" ? current?.exerciseStatus : id === "meditation" ? current?.meditationStatus : current?.note ? "done" : "not_planned";
                return <li key={id} className="rounded-xl bg-secondary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{index + 1}. {priorityChoices.find((item) => item.id === id)?.title}</h3><span className="text-xs text-muted-foreground">{status ? `Logged: ${activityStatusLabel(status)}` : "Not planned"}</span></div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{routinePrompts[id]}</p>
                </li>;
              })}
            </ol>
            <p className="text-xs leading-5 text-muted-foreground">{profile.supportMode === "clinician_supported" ? "Bring these reflections to your clinician to review together." : "You can journal independently. Ask a clinician about symptoms or activity safety whenever you need guidance."} Adapt or skip any routine; use the separate activity log to document what happened.</p>
            {routineOpen && <div className="space-y-4 border-t border-border pt-4">
              <p className="text-sm leading-6 text-muted-foreground">Choose what you want to keep in your routine. These are reflections, not treatment instructions.</p>
              <div className="space-y-2">
                {priorityChoices.map((choice) => <label key={choice.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-muted/60">
                  <Checkbox checked={priorities.includes(choice.id)} onCheckedChange={() => togglePriority(choice.id)} aria-label={choice.title} />
                  <span><span className="block text-sm font-medium">{choice.title}</span><span className="text-xs leading-5 text-muted-foreground">{choice.detail}</span></span>
                </label>)}
              </div>
              <fieldset className="space-y-2"><legend className="text-sm font-medium">Support approach</legend><div className="flex flex-wrap gap-2">
                {supportModes.map((item) => <Button key={item.value} variant={supportMode === item.value ? "default" : "outline"} size="sm" aria-pressed={supportMode === item.value} onClick={() => setSupportMode(item.value)}>{item.title}</Button>)}
              </div></fieldset>
              <div className="flex flex-wrap gap-2"><Button disabled={priorities.length === 0 || updateProfile.isPending} onClick={() => void saveRoutine()}>{updateProfile.isPending ? "Saving…" : "Save routine"}</Button><Button variant="outline" onClick={() => { setPriorities([...profile.priorities]); setSupportMode(profile.supportMode); setRoutineOpen(false); }}>Cancel</Button></div>
            </div>}
          </Card>}

          {section === "dashboard" && <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <UsersRound className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-serif text-2xl font-medium">Your care team</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Manage invitations and decide who can read your journal. You can stop sharing at any time.</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setLocation("/dashboard/care-team")} data-testid="button-dashboard-care-team">View care team <ArrowRight /></Button>
          </Card>}

          {section === "journal" && todayCheckInOpen && <section id="today-check-in" className="space-y-4" aria-labelledby="today-check-in-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today</p>
                <h2 id="today-check-in-heading" className="mt-1 font-serif text-2xl font-medium">Today’s journal entry</h2>
              </div>
              <Button variant="outline" onClick={() => { setTodayCheckInOpen(false); setActivitiesOpen(false); setActivityInitial(null); setSleepOpen(false); }}>Close today’s entry</Button>
            </div>
            <Card id="daily-check-in" className="scroll-mt-28 space-y-5 p-5 sm:p-6">
              {activitiesOpen && activityInitial
                ? <ActivitiesEditor initial={activityInitial} onSave={saveActivities} onCancel={() => { setActivitiesOpen(false); setActivityInitial(null); }} />
                : <DailyCheckInFlow key={today} initial={{ ...(todayLog ?? emptyLog(today)) }} logs={logs} today={today} onPersist={saveCheckIn} onEditActivities={() => beginActivities()} />}
            </Card>

            <Card id="sleep" className="scroll-mt-28 space-y-5 p-5 sm:p-6" aria-labelledby="sleep-heading">
              {sleepOpen
                ? <SleepEditor key={`${today}-sleep`} date={today} initial={todayLog?.sleep} onSave={async (sleep) => { await saveSleep(today, sleep); }} onDelete={todayLog?.sleep ? () => setDeleteSleepDate(today) : undefined} deleting={saveRecoveryLog.isPending && deleteSleepDate === today} onCancel={() => { setSleepOpen(false); setDeleteSleepDate(null); }} />
                : <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Last night</p><h3 id="sleep-heading" className="mt-2 font-serif text-2xl font-medium">{sleepSummary(todayLog?.sleep)}</h3></div>
                    <Button variant="outline" size="sm" onClick={() => { setSleepOpen(true); setMessage(""); }} data-testid={todayLog?.sleep ? "button-edit-sleep" : "button-log-sleep"}>{todayLog?.sleep ? "Edit sleep" : "Log sleep"}</Button>
                  </div>
                  {todayLog?.sleep ? <SleepDetailList sleep={todayLog.sleep} /> : <p className="text-sm leading-6 text-muted-foreground">Optional. Record approximate hours slept or how the night felt. Skip anything.</p>}
                  <div className="border-t border-border pt-4"><h4 className="mb-2 text-sm font-semibold">Past seven nights</h4><SleepWeekTable logs={logs} ending={today} /></div>
                </>}
              {deleteSleepDate === today && <SleepDeleteConfirm date={today} pending={saveRecoveryLog.isPending} onKeep={() => setDeleteSleepDate(null)} onDelete={() => void deleteSleep(today)} />}
            </Card>
          </section>}
        </div>

        {section === "journal" && <section className="space-y-4" aria-labelledby="history-heading">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="h-fit space-y-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Journal index</p>
                  <h2 id="history-heading" className="mt-2 font-serif text-2xl font-medium">Choose a day</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a day to revisit the responses and words you recorded.</p>
                </div>
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="flex gap-1 rounded-full bg-muted p-1" aria-label="Filter journal dates">
                <Button size="sm" className="min-h-11 flex-1" variant={historyPeriod === "30" ? "secondary" : "ghost"} aria-pressed={historyPeriod === "30"} onClick={() => {
                  setHistoryPeriod("30");
                  if (selectedHistoryState && !recentPastLogs.some((log) => log.date === selectedHistoryState.log.date)) setSelectedHistory(null);
                }}>30 days</Button>
                <Button size="sm" className="min-h-11 flex-1" variant={historyPeriod === "all" ? "secondary" : "ghost"} aria-pressed={historyPeriod === "all"} onClick={() => setHistoryPeriod("all")}>All dates</Button>
              </div>
              <p className="text-xs text-muted-foreground">{visiblePastLogs.length} {visiblePastLogs.length === 1 ? "saved entry" : "saved entries"}</p>
              {visiblePastLogs.length === 0
                ? <div className="rounded-xl bg-secondary/50 px-4 py-6 text-center">
                  <p className="text-sm font-medium">{pastLogs.length === 0 ? "Your history starts when you do." : "No saved check-ins in this period."}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{pastLogs.length === 0 ? "Previous days will appear after you choose to save them. Today is shown above." : "Choose All dates to look further back."}</p>
                </div>
                : <div className="max-h-[34rem] space-y-5 overflow-y-auto pr-1">
                  {Object.entries(historyMonthGroups).map(([month, monthLogs]) => <section key={month} aria-label={month}>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</p>
                    <div className="space-y-2">
                      {monthLogs.map((log) => {
                        const checkIn = dailyCheckInFromLog(log);
                        const count = checkIn.symptoms.filter((answer) => answer.status === "recorded").length;
                        const isSelected = selectedHistory?.log.date === log.date;
                        return <article key={log.date} data-testid={`history-entry-${log.date}`}>
                          <Button type="button" variant={isSelected ? "secondary" : "ghost"} className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left" aria-current={isSelected ? "date" : undefined} onClick={() => openHistoryDay(log)} aria-label={`View ${formatDate(log.date)}`}>
                            <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                              <span className="text-xs uppercase leading-none">{formatHistoryDate(log.date, { weekday: "short" })}</span>
                              <span className="mt-1 text-lg font-semibold leading-none">{Number(log.date.split("-")[2])}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">{formatHistoryDate(log.date, { month: "short", day: "numeric" })}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">{checkIn.summary.trim() || log.note ? "Reflection saved" : `${count} responses recorded`}</span>
                              {log.sleep && <span className="mt-1 block text-xs text-muted-foreground">{sleepSummary(log.sleep)}</span>}
                            </span>
                            {(checkIn.summary.trim() || log.note) && <NotebookPen className="size-4 shrink-0 text-muted-foreground" aria-label="Reflection available" />}
                            {isSelected && <Check className="size-4 shrink-0 text-primary" aria-label="Selected day" />}
                          </Button>
                        </article>;
                      })}
                    </div>
                  </section>)}
                </div>}
              <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">No days or values are filled in between entries.</p>
            </Card>

            {selectedHistory ? <Card className="space-y-5 p-5 sm:p-6 lg:col-span-2">
              {selectedHistory.view !== "summary" && <Button variant="outline" size="sm" className="mb-1" onClick={() => { setSelectedHistory((current) => current ? { ...current, view: "summary" } : null); setDeleteDate(null); }}>Back to this day</Button>}
              {selectedHistory.view === "summary" && <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily check-in</p>
                    <h2 className="mt-2 font-serif text-3xl font-medium">{formatHistoryDate(selectedHistory.log.date, { month: "long", day: "numeric", year: "numeric" })}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Your recorded responses · no interpretation added</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" aria-label="Previous saved check-in" disabled={visiblePastLogs.findIndex((log) => log.date === selectedHistory.log.date) <= 0} onClick={() => {
                      const index = visiblePastLogs.findIndex((log) => log.date === selectedHistory.log.date);
                      if (index > 0) openHistoryDay(visiblePastLogs[index - 1]);
                    }}><ArrowLeft /></Button>
                    <Button variant="outline" size="icon" aria-label="Next saved check-in" disabled={visiblePastLogs.findIndex((log) => log.date === selectedHistory.log.date) >= visiblePastLogs.length - 1} onClick={() => {
                      const index = visiblePastLogs.findIndex((log) => log.date === selectedHistory.log.date);
                      if (index >= 0 && index < visiblePastLogs.length - 1) openHistoryDay(visiblePastLogs[index + 1]);
                    }}><ArrowRight /></Button>
                  </div>
                </div>
                <HistorySummary log={selectedHistory.log} />
                <div className="flex items-start gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button onClick={() => setSelectedHistory((current) => current ? { ...current, view: "check_in" } : null)}>Edit this day</Button>
                  <Button variant="outline" onClick={() => setSelectedHistory((current) => current ? { ...current, view: "activities" } : null)}>Edit food, movement and pacing</Button>
                  <Button variant="outline" onClick={() => setSelectedHistory((current) => current ? { ...current, view: "sleep" } : null)} data-testid="button-edit-history-sleep">{selectedHistory.log.sleep ? "Edit sleep" : "Log sleep"}</Button>
                  <Button variant="destructive" onClick={() => setDeleteDate(selectedHistory.log.date)} disabled={deleteRecoveryLog.isPending}><Trash2 />Delete this day</Button>
                </div>
                {deleteDate === selectedHistory.log.date && <Card className="space-y-3 border-destructive p-4">
                  <h3 className="text-sm font-semibold">Delete this day?</h3>
                  <p className="text-sm leading-6 text-muted-foreground">This removes only {formatDate(selectedHistory.log.date)}’s recovery entry. This cannot be undone.</p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" onClick={() => setDeleteDate(null)}>Keep entry</Button><Button variant="destructive" disabled={deleteRecoveryLog.isPending} onClick={() => void deletePastDay(selectedHistory.log.date)}>{deleteRecoveryLog.isPending ? "Deleting…" : "Delete day"}</Button></div>
                </Card>}
              </>}
              {selectedHistory.view === "check_in" && <DailyCheckInFlow key={`${selectedHistory.log.date}-checkin`} initial={{ ...selectedHistory.log }} logs={logs} today={today} startAt="edit" onPersist={async (input) => {
                const saved = await saveCheckIn(input);
                setSelectedHistory({ log: saved, view: "check_in" });
                setMessage(`${formatDate(saved.date)} check-in saved.`);
                return saved;
              }} onEditActivities={() => setSelectedHistory((current) => current ? { ...current, view: "activities" } : null)} onExit={() => setSelectedHistory((current) => current ? { ...current, view: "summary" } : null)} exitLabel="Back to this day" />}
              {selectedHistory.view === "sleep" && <SleepEditor key={`${selectedHistory.log.date}-sleep`} date={selectedHistory.log.date} initial={selectedHistory.log.sleep} onSave={async (sleep) => { await saveSleep(selectedHistory.log.date, sleep); }} onDelete={selectedHistory.log.sleep ? () => setDeleteSleepDate(selectedHistory.log.date) : undefined} deleting={saveRecoveryLog.isPending && deleteSleepDate === selectedHistory.log.date} onCancel={() => { setDeleteSleepDate(null); setSelectedHistory((current) => current ? { ...current, view: "summary" } : null); }} />}
              {selectedHistory.view === "sleep" && deleteSleepDate === selectedHistory.log.date && <SleepDeleteConfirm date={selectedHistory.log.date} pending={saveRecoveryLog.isPending} onKeep={() => setDeleteSleepDate(null)} onDelete={() => void deleteSleep(selectedHistory.log.date)} />}
              {selectedHistory.view === "activities" && <ActivitiesEditor initial={{ ...selectedHistory.log }} onSave={saveActivities} onCancel={() => setSelectedHistory((current) => current ? { ...current, view: "summary" } : null)} />}
            </Card> : <Card className="flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center lg:col-span-2">
              <CalendarDays className="size-7 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-2xl font-medium">Choose a saved day</h2>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">Your past check-ins will appear here after you save them.</p>
            </Card>}
          </div>
        </section>}

        {section === "journal" && profile && <Card className="space-y-2 p-5 sm:p-6" aria-labelledby="clinician-support-note">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Clinician support</p>
          <h2 id="clinician-support-note" className="font-serif text-2xl font-medium">Your journal stays yours.</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">You decide who can read your journal. A clinician can only see it after you share it with them, and you can stop sharing at any time. You can also bring your own reflections to a clinician outside Stillwell if you choose.</p>
        </Card>}
      </>}
      {section === "account" && <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account details</p>
            <h2 className="mt-2 font-serif text-2xl font-medium">{user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your Stillwell account"}</h2>
          </div>
          <dl className="space-y-4">
            <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1 break-all text-sm font-medium">{user?.primaryEmailAddress?.emailAddress ?? "No email address on file"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Account type</dt><dd className="mt-1 text-sm font-medium">Patient</dd></div>
          </dl>
          <Button variant="outline" onClick={() => void logout()} data-testid="button-account-sign-out"><LogOut />Sign out</Button>
        </Card>
        <Card className="space-y-4 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Privacy and data</p>
          <h2 className="font-serif text-2xl font-medium">Your data stays under your control.</h2>
          <p className="text-sm leading-6 text-muted-foreground">Review the privacy details, manage sharing, or permanently delete your recovery data. Your sign-in account remains if you delete recovery data.</p>
          <Button variant="outline" asChild data-testid="button-account-privacy"><Link href="/privacy"><ShieldCheck />Privacy and data controls <ArrowRight /></Link></Button>
        </Card>
      </div>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><Clock3 className="size-4" />No streaks. No prescribed progression.</span>
        <Link href="/privacy" className="underline underline-offset-4">Privacy &amp; data controls</Link>
      </footer>
    </div>
  </main>;
}
