import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
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
  ArrowRight,
  BookOpen,
  ClipboardList,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { SymptomPreferences } from "@/components/SymptomPreferences";
import { PatientProgressChart } from "@/components/PatientProgressChart";
import { JournalDatebook } from "@/components/JournalDatebook";
import { clearDraft, localDate, priorityChoices, readDraft, routinePrompts, type DraftEnvelope } from "@/lib/recovery";
import {
  activityChoices,
  formatDate,
  checkInSymptoms,
  supportModes,
} from "@workspace/recovery-journal";
import type { CheckInSymptomName } from "@workspace/recovery-journal";

function Brand() {
  return <Link href="/" className="flex items-center gap-3 text-foreground" aria-label="Stillwell home">
    <span className="brand-mark" aria-hidden="true" />
    <span className="font-serif text-xl font-semibold tracking-tight">stillwell</span>
  </Link>;
}

type PatientSection = "dashboard" | "journal" | "care-protocol" | "care-team" | "account";
const patientNavigation: { id: Exclude<PatientSection, "account">; label: string; path: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { id: "journal", label: "Journal", path: "/dashboard/journal", icon: NotebookPen },
  { id: "care-protocol", label: "Care protocol", path: "/dashboard/care-protocol", icon: ClipboardList },
  { id: "care-team", label: "Care team", path: "/dashboard/care-team", icon: UsersRound },
];

function sectionForPath(path: string): PatientSection {
  if (path.startsWith("/dashboard/journal")) return "journal";
  if (path.startsWith("/dashboard/care-protocol")) return "care-protocol";
  if (path.startsWith("/dashboard/care-team")) return "care-team";
  if (path.startsWith("/dashboard/account")) return "account";
  return "dashboard";
}

function PatientDashboardNav({ section }: { section: PatientSection }) {
  return <header className="sticky top-0 z-20 border-b border-border bg-background/95 shadow-sm backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-8 md:flex-row md:items-center md:justify-between">
      <Brand />
      <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:flex md:items-center">
        <nav aria-label="Main navigation" className="col-span-2 grid grid-cols-2 gap-1 md:flex md:items-center">
          {patientNavigation.map(({ id, label, path, icon: Icon }) => <Button
            key={id}
            variant={section === id ? "secondary" : "ghost"}
            size="sm"
            className="min-h-11 w-full justify-start md:w-auto"
            asChild
          >
            <Link href={path} aria-current={section === id ? "page" : undefined} data-testid={`link-patient-${id}`}>
              <Icon className="size-4" />{label}
            </Link>
          </Button>)}
        </nav>
        <Button variant={section === "account" ? "secondary" : "ghost"} size="sm" className="col-span-2 min-h-11 w-full md:col-span-1 md:w-auto" asChild>
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

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{children}</span>;
}

const protocolRoadmap = [
  { number: "01", title: "Notice what matters", text: "Use your check-ins to note symptoms and daily experiences that you want to understand over time." },
  { number: "02", title: "Choose a few supports", text: "Pick optional routines—such as food reflections, movement, quiet pauses, or pacing—that fit your day." },
  { number: "03", title: "Review and adjust", text: "Keep what feels workable, change what does not, and bring questions to a clinician if you choose." },
] as const;

const protocolResources = [
  { id: "questions", title: "Questions to bring to a clinician", detail: "A reflection guide for noting what you want to ask about symptoms, daily routines, and returning to activities." },
  { id: "food-guide", title: "Food & hydration reflections", detail: "A simple way to notice what feels manageable for you, without targets or a prescribed diet." },
  { id: "movement-guide", title: "Movement & pacing notes", detail: "Use your journal to record activity and pauses that felt appropriate for you. Follow any guidance from your clinician." },
  { id: "quiet-guide", title: "Rest & quiet pauses", detail: "Optional prompts for noticing rest and moments of quiet in your day." },
] as const;

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
  const profile = recoveryQuery.data?.profile;
  const section = sectionForPath(location);
  useEffect(() => {
    if (section !== "journal") return;
    const root = document.documentElement;
    const existingDark = root.classList.contains("dark");
    const existingScheme = root.style.colorScheme;
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const dark = existingDark || preference.matches;
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    applyTheme();
    preference.addEventListener("change", applyTheme);
    return () => {
      preference.removeEventListener("change", applyTheme);
      root.classList.toggle("dark", existingDark);
      root.style.colorScheme = existingScheme;
    };
  }, [section]);
  const logs = useMemo(() => [...(recoveryQuery.data?.logs ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [recoveryQuery.data?.logs]);
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDate = () => {
      setToday(localDate());
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refreshDate, midnight.getTime() - now.getTime() + 50);
    };
    refreshDate();
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);
  const defaultTrackedSymptoms = useMemo(() => checkInSymptoms.slice(0, 6).map((symptom) => symptom.name), []);
  const journalTrackedSymptoms = profile?.selectedSymptoms ?? defaultTrackedSymptoms;
  const [routineOpen, setRoutineOpen] = useState(false);
  const [priorities, setPriorities] = useState<RecoveryPreferences["priorities"]>([]);
  const [supportMode, setSupportMode] = useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [openProtocolResource, setOpenProtocolResource] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const startedOnce = useRef(false);

  useEffect(() => {
    startedOnce.current = false;
    setRoutineOpen(false);
    setMessage("");
  }, [userId]);

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

  async function saveCombinedJournal(input: RecoveryLogInput): Promise<RecoveryLog> {
    const saved = await saveRecoveryLog.mutateAsync({ data: { ...input, section: "journal" } });
    queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old
      ? { ...old, logs: [...old.logs.filter((item) => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)) }
      : { profile: null, logs: [saved] });
    return saved;
  }

  async function updateJournalTrackedSymptoms(names: CheckInSymptomName[]) {
    if (!profile) return;
    const next = await updateProfile.mutateAsync({
      data: { supportMode: profile.supportMode, priorities: profile.priorities, selectedSymptoms: names },
    });
    queryClient.setQueryData<RecoveryState>(recoveryKey, (old) => old
      ? { ...old, profile: next }
      : { profile: next, logs: [] });
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

  return <main className="min-h-[100dvh] bg-background pb-12">
    <PatientDashboardNav section={section} />
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-7 sm:px-8 sm:pt-10">
      {section === "dashboard" && <section className={`grid gap-5 ${profile && !recoveryQuery.isLoading && !recoveryQuery.isError ? "lg:grid-cols-[1.15fr_.85fr]" : ""}`} aria-label="Dashboard overview">
        <div className="flex min-h-56 flex-col justify-between gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Your space, your pace</p>
            <h1 className="max-w-xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Make room for what today is.</h1>
            <p className="max-w-xl text-sm leading-6 opacity-90">A personal journal for noticing patterns and choosing routines that fit your day.</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm opacity-80">{formatDate(today)}</p>
            {profile && <Button variant="secondary" onClick={() => setLocation("/dashboard/journal")} data-testid="button-open-journal">Today’s check-in <ArrowRight /></Button>}
          </div>
        </div>
        {profile && !recoveryQuery.isLoading && !recoveryQuery.isError && <PatientProgressChart logs={logs} today={today} />}
      </section>}
      {section === "account" && <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your settings</p>
        <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Account</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Your Stillwell sign-in and private data controls.</p>
      </section>}
      {section === "care-protocol" && <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground"><span className="h-px w-6 bg-primary/50" aria-hidden="true" />Care protocol</p>
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">A few steps to help you put a plan together.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Move through these in any order. This roadmap is a reflection aid, not a clinical protocol or medical recommendations.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/dashboard/journal")} data-testid="button-care-protocol-journal">Open journal <ArrowRight /></Button>
      </section>}
      {section === "care-team" && <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">Choose who can read your journal.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Only clinicians you invite and who accept can read what you share. Your journal remains yours to change.</p>
        </div>
        <Button variant="outline" asChild><Link href="/dashboard">Back to dashboard</Link></Button>
      </section>}

      {section === "dashboard" && <Card className="flex gap-3 border-accent bg-accent/30 p-4 text-sm leading-6">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
        <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
      </Card>}
      {message && <Card role="status" className="border-secondary bg-secondary p-4 text-sm leading-6 text-secondary-foreground" data-testid="status-dashboard-feedback">{message}</Card>}
      {(section === "dashboard" || section === "journal" || section === "care-protocol") && recoveryQuery.isLoading && <Card aria-label="Loading your journal" className="animate-pulse space-y-4 p-6"><div className="h-4 w-40 rounded bg-muted" /><div className="h-24 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /></Card>}
      {(section === "dashboard" || section === "journal" || section === "care-protocol") && recoveryQuery.isError && <Card className="space-y-4 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">We couldn’t open your journal</p><h2 className="font-serif text-3xl">Your notes haven’t gone anywhere.</h2><p className="text-sm leading-6 text-muted-foreground">Check your connection, then try loading the private journal again.</p><Button variant="outline" onClick={() => void recoveryQuery.refetch()} data-testid="button-retry-journal">Try again <ArrowRight /></Button></Card>}
      {(section === "dashboard" || section === "journal" || section === "care-protocol") && !recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !readDraft() && <Card className="space-y-4 p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A beginning, not a blank template</p>
        <h2 className="max-w-xl font-serif text-4xl font-medium">Choose what you want this space to hold.</h2>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">Start with a few optional preferences and a first daily reflection. You decide what belongs here. Your setup is not sent until you consent and sign in.</p>
        <Button className="w-fit" onClick={() => setLocation("/quiz")}>Set up my journal <ArrowRight /></Button>
        <p className="text-xs text-muted-foreground">No profile or recovery history is displayed until you create it.</p>
      </Card>}
      {(section === "dashboard" || section === "journal" || section === "care-protocol") && !recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !!readDraft() && <Card className="space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saved setup, ready to retry</p>
        <h2 className="font-serif text-3xl">Your first summary is waiting.</h2>
        <p className="text-sm leading-6 text-muted-foreground">We couldn’t finish saving the setup yet. It remains in this tab temporarily, and your existing preferences have not been replaced.</p>
        <Button className="w-fit" disabled={startRecovery.isPending} onClick={() => { const draft = readDraft(); if (draft) persistDraft(draft); else setMessage("This setup has expired. Start a new quiz to continue."); }}>{startRecovery.isPending ? "Trying…" : "Try again"} <ArrowRight /></Button>
      </Card>}

      {!recoveryQuery.isLoading && !recoveryQuery.isError && profile && section === "journal" && <JournalDatebook
        logs={logs}
        today={today}
        ownerId={userId}
        selectedSymptoms={journalTrackedSymptoms}
        onSave={saveCombinedJournal}
        onUpdateTrackedSymptoms={updateJournalTrackedSymptoms}
      />}

      {section === "care-team" && <>
        {recoveryQuery.isError && <Card role="status" className="p-4 text-sm text-muted-foreground">Your journal profile could not be checked right now. Try again before inviting a clinician.</Card>}
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <CareTeamPanel hasJournal={Boolean(profile)} />
          <div className="space-y-5">
            <Card className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Explore care options</p>
                  <h2 className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><UsersRound className="size-5 text-primary" aria-hidden="true" />Find a clinician</h2>
                </div>
                <StatusPill>Planned</StatusPill>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Clinician listings and matching are not available yet. Stillwell does not verify clinicians; for now, you can invite someone you already know.</p>
              <Button variant="outline" asChild data-testid="button-find-clinician-planned"><Link href="/find-your-clinician">About future matching <ArrowRight /></Link></Button>
            </Card>
            <Card className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feedback to keep in view</p>
                  <h2 className="mt-2 font-serif text-2xl font-medium">Clinician feedback</h2>
                </div>
                <StatusPill>Planned</StatusPill>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Clinician messages and feedback are not available in Stillwell yet. You can bring your journal to a visit if you choose.</p>
            </Card>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Your journal is read-only to clinicians you choose to share it with.</span>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>Back to dashboard</Button>
        </footer>
      </>}

      {!recoveryQuery.isLoading && !recoveryQuery.isError && profile && (section === "dashboard" || section === "journal" || section === "care-protocol") && <>
        {section === "dashboard" && <details className="space-y-4"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Journal settings · symptoms to track</summary><SymptomPreferences /></details>}
        <div className="space-y-5">
          {(section === "dashboard" || section === "care-protocol") && <Card id="care-protocol-routine" className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care protocol</p><h2 className="mt-2 font-serif text-2xl font-medium">{supportModes.find((mode) => mode.value === profile.supportMode)?.title}</h2></div>
              <Button variant="outline" size="sm" onClick={() => setRoutineOpen((value) => !value)}>{routineOpen ? "Close" : "Edit routine"}</Button>
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

          {section === "care-protocol" && <>
            <section className="space-y-4" aria-labelledby="care-protocol-roadmap-heading">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stillwell roadmap</p>
                <h2 id="care-protocol-roadmap-heading" className="mt-2 font-serif text-3xl font-medium">A reflection aid, at your pace.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Use these steps in any order. Your journal records what you choose; it does not set treatment or activity targets.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {protocolRoadmap.map((step) => <Card key={step.number} className="space-y-3 p-5">
                  <p className="text-xs font-semibold tracking-widest text-primary">{step.number} · ROADMAP</p>
                  <h3 className="font-serif text-xl font-medium">{step.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{step.text}</p>
                </Card>)}
              </div>
            </section>
            <Card className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reflection resources</p>
                <h2 className="mt-2 font-serif text-2xl font-medium">Ideas to help you build your own plan</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Optional educational prompts. These are not treatment directions or a substitute for clinical guidance.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {protocolResources.map((resource) => {
                  const isOpen = openProtocolResource === resource.id;
                  const detailId = `protocol-resource-${resource.id}`;
                  return <article key={resource.id} className="space-y-3 rounded-xl border border-border p-4">
                    <h3 className="font-medium">{resource.title}</h3>
                    <p id={detailId} className="text-sm leading-6 text-muted-foreground">{isOpen ? resource.detail : "A short, optional prompt to help you reflect and prepare your own plan."}</p>
                    <Button type="button" size="sm" variant="outline" aria-expanded={isOpen} aria-controls={detailId} onClick={() => setOpenProtocolResource(isOpen ? null : resource.id)} data-testid={`button-preview-resource-${resource.id}`}><BookOpen aria-hidden="true" />{isOpen ? "Close resource" : "Preview resource"}</Button>
                  </article>;
                })}
              </div>
            </Card>
          </>}

        </div>
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
