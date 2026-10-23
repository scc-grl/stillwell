import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleAlert, ClipboardList, Clock3, HeartHandshake, Keyboard, LayoutDashboard, LogOut, Mail, MessageSquareText, NotebookPen, Search, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";

type View = "dashboard" | "journal" | "care-protocol" | "care-team" | "account";
type Rating = "Not noticeable" | "Less noticeable" | "Noticeable" | "More noticeable";
type Support = "Self-guided" | "With clinician support";
type ProtocolMode = "custom" | "roadmap" | null;

const symptoms = ["Headache", "Fatigue", "Fog", "Sleep", "Mood", "Light"] as const;
const ratings: Rating[] = ["Not noticeable", "Less noticeable", "Noticeable", "More noticeable"];
const overallChoices = ["Rough", "Low", "Okay", "Good", "Great"] as const;
type JournalStep = "home" | "symptoms" | "voice" | "review" | "saved";
const routineOptions = [
  { id: "food", title: "Food & hydration", text: "Notice meals and fluids that felt manageable. No special diet or intake target." },
  { id: "movement", title: "Movement", text: "Record activity or rest. Ask a clinician what is appropriate for you." },
  { id: "pause", title: "Quiet pause", text: "Make space for a familiar meditation or a quiet moment, if comfortable." },
  { id: "pacing", title: "Pacing", text: "Reflect on pauses, energy, and room to adjust." },
] as const;
const protocolResources = [
  { id: "questions", title: "Questions to bring to a clinician", detail: "A reflection guide for noting what you want to ask about symptoms, daily routines, and returning to activities." },
  { id: "food-guide", title: "Food & hydration reflections", detail: "A simple way to notice what feels manageable for you, without targets or a prescribed diet." },
  { id: "movement-guide", title: "Movement & pacing notes", detail: "Track activity and pauses that are appropriate for you. Follow any guidance from your clinician." },
  { id: "quiet-guide", title: "Rest & quiet pauses", detail: "Optional prompts for noticing rest, sleep, and moments of quiet in your day." },
];

const exampleSeries: Record<string, number[]> = {
  "Overall feeling": [2, 3, 2, 4, 3, 4, 3],
  Headache: [3, 2, 3, 1, 2, 1, 2],
  Fatigue: [3, 3, 2, 3, 2, 1, 2],
  Fog: [2, 3, 2, 2, 3, 2, 1],
  Sleep: [1, 2, 3, 2, 3, 2, 3],
  Mood: [2, 2, 3, 2, 3, 4, 3],
  Light: [3, 2, 2, 3, 1, 2, 2],
};

function ProgressGraph({ metric, onMetricChange }: { metric: string; onMetricChange: (metric: string) => void }) {
  const values = exampleSeries[metric];
  const metricNames = Object.keys(exampleSeries);
  const isOverall = metric === "Overall feeling";
  const pointY = (value: number) => isOverall
    ? 146 - ((value - 1) / 4) * 104
    : 146 - (value / 3) * 104;
  const points = values.map((value, index) => `${112 + index * 48},${pointY(value)}`).join(" ");
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const topScaleLabel = isOverall ? "Great" : "More noticeable";
  const bottomScaleLabel = isOverall ? "Rough" : "Not noticeable";
  return (
    <Card className="h-full">
      <CardHeader className="gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A little perspective</p>
            <CardTitle className="mt-2 font-serif text-2xl font-medium">Patterns, over time</CardTitle>
            <CardDescription className="mt-1">An illustrative example — not a real patient’s entries.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" aria-label={`Change graph example. Currently ${metric}`} onClick={() => onMetricChange(metricNames[(metricNames.indexOf(metric) + 1) % metricNames.length])}>
            {metric} <ChevronDown aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="rounded-xl bg-secondary/60 p-3 sm:p-4">
          <svg viewBox="0 0 450 190" className="h-48 w-full" role="img" aria-label={`Illustrative ${metric.toLowerCase()} entries across seven days. The scale runs from ${bottomScaleLabel} to ${topScaleLabel}.`}>
            {[42, 68, 94, 120, 146].map((y) => <line key={y} x1="106" x2="418" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 5" />)}
            <polyline points={points} fill="none" stroke="hsl(var(--chart-1))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {values.map((value, index) => <circle key={labels[index]} cx={112 + index * 48} cy={pointY(value)} r="5" fill="hsl(var(--card))" stroke="hsl(var(--chart-1))" strokeWidth="3" />)}
            <text x="2" y="45" fill="hsl(var(--muted-foreground))" fontSize="10">{topScaleLabel}</text>
            <text x="2" y="149" fill="hsl(var(--muted-foreground))" fontSize="10">{bottomScaleLabel}</text>
            {labels.map((label, index) => <text key={label} x={112 + index * 48} y="174" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{label}</text>)}
          </svg>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Illustrative example entries</span>
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-chart-1" />Daily reflection</span>
        </div>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">A pattern to notice, not a diagnosis. Entries can vary; direction is not a judgment.</p>
      </CardContent>
    </Card>
  );
}

function EmergencyNote() {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4 text-sm leading-6">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
        <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
      </CardContent>
    </Card>
  );
}

export default function PatientDashboardJournal({ initialView = "dashboard", initialProtocolMode = null }: { initialView?: View; initialProtocolMode?: ProtocolMode } = {}) {
  const [view, setView] = useState<View>(initialView);
  const [metric, setMetric] = useState("Overall feeling");
  const [support, setSupport] = useState<Support>("Self-guided");
  const [selectedRoutine, setSelectedRoutine] = useState<string[]>(["food", "movement"]);
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [ratingsByDay, setRatingsByDay] = useState<Record<string, Record<string, Rating>>>({});
  const [overall, setOverall] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [journalStep, setJournalStep] = useState<JournalStep>("home");
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [feedbackRead, setFeedbackRead] = useState(false);
  const [findClinicianOpen, setFindClinicianOpen] = useState(false);
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>(initialProtocolMode);
  const [protocolNote, setProtocolNote] = useState("");
  const [protocolSaved, setProtocolSaved] = useState(false);
  const [protocolFeedback, setProtocolFeedback] = useState("");
  const [openedResource, setOpenedResource] = useState<string | null>(null);

  const today = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);
  const week = useMemo(() => {
    const now = new Date();
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        day: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
        number: date.getDate(),
        isToday: index === 6,
      };
    });
    return dates;
  }, []);
  const todayRatings = ratingsByDay.today ?? {};
  const currentSymptom = symptoms[symptomIndex];
  const history = [
    { id: "example-1", day: "A past day · illustrative", overall: "Okay", responses: 4 },
    { id: "example-2", day: "Another past day · illustrative", overall: "Good", responses: 3 },
  ];

  function setSymptomRating(symptom: string, rating: Rating) {
    const nextRatings = { ...todayRatings, [symptom]: rating };
    setRatingsByDay((current) => ({ ...current, today: nextRatings }));
    setSaved(false);
    setFeedback("");
    if (symptomIndex < symptoms.length - 1) setSymptomIndex((index) => index + 1);
    else setJournalStep("review");
  }

  function skipCurrentSymptom() {
    if (symptomIndex < symptoms.length - 1) setSymptomIndex((index) => index + 1);
    else setJournalStep("review");
  }

  function saveCheckIn() {
    setSaved(true);
    setJournalStep("saved");
    setFeedback("Your check-in is saved in this design preview.");
  }

  function saveOverall(choice: string) {
    setOverall(choice);
    setSaved(true);
    setFeedback(`Today’s overall feeling is saved in this design preview.`);
  }

  function toggleRoutine(id: string) {
    setProtocolSaved(false);
    setSelectedRoutine((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function saveProtocol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProtocolSaved(true);
    setProtocolFeedback("Your protocol draft is saved in this design preview. You can adjust it anytime.");
  }

  function addRoadmapToProtocol() {
    setSelectedRoutine(routineOptions.map((item) => item.id));
    setProtocolMode("custom");
    setProtocolSaved(false);
    setProtocolFeedback("Roadmap starting points are ready to review. Keep only what feels useful to you.");
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteFirstName.trim()) {
      setInviteError("Enter their first name.");
      return;
    }
    if (!inviteLastName.trim()) {
      setInviteError("Enter their last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteError("Enter an email like name@example.com.");
      return;
    }
    setInviteError("");
    setInviteSent(true);
    setInviteOpen(false);
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <img src={stillwellMark} alt="" aria-hidden="true" className="size-9 shrink-0" />
            <span className="font-serif text-xl font-semibold tracking-tight">stillwell</span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">A quiet place for your own reflections</span>
          <nav aria-label="Main navigation" className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
            <Button className="min-h-11 w-full sm:w-auto" variant={view === "dashboard" ? "secondary" : "ghost"} aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setView("dashboard")}><LayoutDashboard />Dashboard</Button>
            <Button className="min-h-11 w-full sm:w-auto" variant={view === "journal" ? "secondary" : "ghost"} aria-current={view === "journal" ? "page" : undefined} onClick={() => setView("journal")}><NotebookPen />Journal</Button>
            <Button className="min-h-11 w-full sm:w-auto" variant={view === "care-protocol" ? "secondary" : "ghost"} aria-current={view === "care-protocol" ? "page" : undefined} onClick={() => setView("care-protocol")}><ClipboardList />Care protocol</Button>
            <Button className="min-h-11 w-full sm:w-auto" variant={view === "care-team" ? "secondary" : "ghost"} aria-current={view === "care-team" ? "page" : undefined} onClick={() => setView("care-team")}><UsersRound />Care team</Button>
            <Button className="min-h-11 w-full sm:w-auto" variant={view === "account" ? "secondary" : "ghost"} aria-current={view === "account" ? "page" : undefined} onClick={() => setView("account")}><Settings />Account</Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-8 sm:py-9">
        {signedOut ? (
          <section className="mx-auto max-w-2xl space-y-5 py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
            <h1 className="font-serif text-4xl font-medium">Signed out in this preview.</h1>
            <Card>
              <CardContent className="space-y-4 p-6">
                <p className="text-sm leading-6 text-muted-foreground">This only changes the preview. It does not end a real sign-in session or change your account or journal data.</p>
                <Button onClick={() => { setSignedOut(false); setView("account"); }}>Return to account preview</Button>
              </CardContent>
            </Card>
          </section>
        ) : view === "dashboard" ? (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <section className="flex min-h-56 flex-col justify-between gap-6 rounded-xl bg-primary p-6 text-primary-foreground sm:p-8" aria-labelledby="dashboard-heading">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Your space, your pace</p>
                    <h1 id="dashboard-heading" className="mt-3 max-w-xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Make room for what today is.</h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 opacity-90">A personal journal for noticing patterns and choosing gentle routines.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm opacity-80">{today}</p>
                    <Button variant="secondary" onClick={() => setView("journal")}>Today’s check-in <ArrowRight /></Button>
                  </div>
              </section>
              <ProgressGraph metric={metric} onMetricChange={setMetric} />
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your chosen routine</p>
                    <CardTitle className="mt-2 font-serif text-2xl font-medium">{support}</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" aria-expanded={editingRoutine} onClick={() => setEditingRoutine((open) => !open)}>{editingRoutine ? "Done" : "Edit routine"}</Button>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                  {selectedRoutine.length ? selectedRoutine.map((id, index) => {
                    const item = routineOptions.find((option) => option.id === id);
                    if (!item) return null;
                    return <div key={id} className="rounded-lg bg-secondary p-4">
                      <p className="text-sm font-semibold">{index + 1}. {item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                    </div>;
                  }) : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">No routine items selected. Your space, your choice.</p>}
                  <p className="text-xs leading-5 text-muted-foreground">Adapt or skip any routine. These are reflections, not treatment instructions.</p>
                  {editingRoutine && <div className="space-y-3 border-t border-border pt-4">
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">What would you like to keep in your routine?</legend>
                      {routineOptions.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                        <Checkbox className="mt-1" checked={selectedRoutine.includes(item.id)} onCheckedChange={() => toggleRoutine(item.id)} aria-label={item.title} />
                        <span><span className="block text-sm font-medium">{item.title}</span><span className="text-xs leading-5 text-muted-foreground">{item.text}</span></span>
                      </label>)}
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Support approach</legend>
                      <div className="flex flex-wrap gap-2">
                        {(["Self-guided", "With clinician support"] as Support[]).map((mode) => <Button key={mode} type="button" size="sm" variant={support === mode ? "default" : "outline"} aria-pressed={support === mode} onClick={() => setSupport(mode)}>{mode}</Button>)}
                      </div>
                    </fieldset>
                  </div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
                  <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><HeartHandshake aria-hidden="true" className="size-5 text-primary" />Your journal stays yours.</CardTitle>
                  <CardDescription className="mt-1 leading-6">You decide who can read your journal. A clinician can only see it after you choose to share it.</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm font-medium">No clinician is connected in this preview.</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">View how clinician feedback could appear, or invite a clinician you already see.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setView("care-team")}><UsersRound aria-hidden="true" />View care team</Button>
                    <Button variant="outline" onClick={() => setView("care-protocol")}><ClipboardList aria-hidden="true" />Care protocol</Button>
                    <Button variant="secondary" onClick={() => { setView("account"); setInviteOpen(true); }}><Mail aria-hidden="true" />Invite a clinician</Button>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4" />Your reflections belong to you.</p>
                </CardContent>
              </Card>
            </section>
            <EmergencyNote />
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4" />No streaks. No prescribed progression.</span>
              <span>Design preview only · not connected to records</span>
            </footer>
          </>
        ) : view === "journal" ? (
          <>
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your private journal</p>
              <h1 className="font-serif text-4xl font-medium leading-tight">Today, in your own words.</h1>
              <p className="text-sm leading-6 text-muted-foreground">{today} · Nothing to catch up on. Begin when it feels useful.</p>
            </section>
            <EmergencyNote />
            {journalStep === "home" && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily check-in</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">How is today, overall?</CardTitle>
                <CardDescription>One tap saves a check-in in this preview. Add detail now or later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                <section aria-label="Your last seven days">
                  <p className="mb-3 text-sm font-semibold">Your last seven days</p>
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((date) => {
                      const hasTodayEntry = date.isToday && (overall !== null || Object.keys(todayRatings).length > 0);
                      return <div key={date.key} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 ${date.isToday ? "bg-secondary" : "bg-muted/50"}`} aria-label={`${date.day} ${date.number}${hasTodayEntry ? ", check-in saved in preview" : ", no check-in"}`}>
                        <span className="text-[11px] text-muted-foreground">{date.day}</span>
                        <span className="text-sm font-semibold">{date.number}</span>
                        <span className={hasTodayEntry ? "text-primary" : "text-muted-foreground"} aria-hidden="true">{hasTodayEntry ? "•" : "—"}</span>
                      </div>;
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Only today’s preview entry can appear here. Past entries are shown as illustrative examples below.</p>
                </section>
                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex flex-wrap gap-2">
                    {overallChoices.map((choice) => <Button key={choice} type="button" size="sm" variant={overall === choice ? "default" : "outline"} aria-pressed={overall === choice} onClick={() => saveOverall(choice)}>{choice}</Button>)}
                  </div>
                  {feedback && <p className="text-sm text-primary" role="status">{feedback}</p>}
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
                  <Button type="button" onClick={() => { setSymptomIndex(0); setJournalStep("symptoms"); }}>Add symptoms <ArrowRight /></Button>
                  <Button type="button" variant="outline" onClick={() => setJournalStep("voice")}><Keyboard />Use voice-to-text</Button>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Dictation uses your device keyboard or browser. Stillwell does not create or upload an audio recording.</p>
              </CardContent>
            </Card>}

            {journalStep === "symptoms" && currentSymptom && <Card>
              <CardHeader className="space-y-3 p-5 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily check-in</p>
                  <CardTitle className="mt-2 font-serif text-2xl font-medium">Add symptoms</CardTitle>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Progress {symptomIndex + 1} of {symptoms.length}</div>
                  <div role="progressbar" aria-label="Symptom progress" aria-valuemin={1} aria-valuemax={symptoms.length} aria-valuenow={symptomIndex + 1} className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((symptomIndex + 1) / symptoms.length) * 100}%` }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                <div>
                  <h2 className="font-serif text-3xl font-medium">{currentSymptom}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Choose the description that fits today, or skip.</p>
                </div>
                <div className="grid gap-2">
                  {ratings.map((rating) => <Button key={rating} type="button" variant={todayRatings[currentSymptom] === rating ? "default" : "outline"} aria-pressed={todayRatings[currentSymptom] === rating} onClick={() => setSymptomRating(currentSymptom, rating)}>{rating}</Button>)}
                </div>
                <Button type="button" variant="outline" onClick={skipCurrentSymptom}>Skip this symptom</Button>
                <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => symptomIndex > 0 ? setSymptomIndex((index) => index - 1) : setJournalStep("home")}><ArrowLeft />Previous</Button>
                  <Button type="button" variant="secondary" onClick={saveCheckIn}>Save and stop here</Button>
                </div>
              </CardContent>
            </Card>}

            {journalStep === "voice" && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A separate way to reflect</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">Use voice-to-text</CardTitle>
                <CardDescription className="leading-6">Tap the text field, then use the microphone on your device’s keyboard or browser dictation. Your words appear here as editable text.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                <label htmlFor="journal-reflection" className="text-sm font-medium">Your words</label>
                <Textarea id="journal-reflection" maxLength={500} value={reflection} placeholder="Tap here to type, or use your keyboard’s microphone to dictate." onChange={(event) => { setReflection(event.target.value); setSaved(false); }} />
                <p className="text-xs leading-5 text-muted-foreground">Dictation depends on your device and browser settings. Stillwell does not create or upload an audio recording.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => setJournalStep("review")}>Review my check-in <ArrowRight /></Button>
                  <Button type="button" variant="outline" onClick={() => { setSymptomIndex(0); setJournalStep("symptoms"); }}>Rate symptoms instead</Button>
                  <Button type="button" variant="ghost" onClick={() => setJournalStep("home")}>Back</Button>
                </div>
              </CardContent>
            </Card>}

            {journalStep === "review" && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Review my check-in</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">A private summary for your own review</CardTitle>
                <CardDescription>Only answers you choose to record appear in this preview.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="flex flex-wrap gap-2">
                  {overall && <span className="rounded-full border border-border bg-secondary px-3 py-2 text-xs">Overall · {overall}</span>}
                  {symptoms.map((symptom) => <span key={symptom} className="rounded-full border border-border bg-card px-3 py-2 text-xs">{symptom} · {todayRatings[symptom] ?? "Not recorded"}</span>)}
                </div>
                <label htmlFor="review-reflection" className="text-sm font-medium">Short summary (optional)</label>
                <Textarea id="review-reflection" maxLength={500} value={reflection} placeholder="Add a few words about how today felt…" onChange={(event) => setReflection(event.target.value)} />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={saveCheckIn}>Save check-in <Check /></Button>
                  <Button type="button" variant="outline" onClick={() => { setSymptomIndex(0); setJournalStep("symptoms"); }}>Rate symptoms</Button>
                </div>
              </CardContent>
            </Card>}

            {journalStep === "saved" && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Check-in saved</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">{reflection.trim() || (overall ? `Today felt ${overall.toLowerCase()}.` : "Today’s check-in")}</CardTitle>
                <CardDescription>Saved for today in this design preview only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="flex flex-wrap gap-2">
                  {overall && <span className="rounded-full border border-border bg-secondary px-3 py-2 text-xs">Overall · {overall}</span>}
                  {symptoms.map((symptom) => <span key={symptom} className="rounded-full border border-border bg-card px-3 py-2 text-xs">{symptom} · {todayRatings[symptom] ?? "Not recorded"}</span>)}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => { setJournalStep("home"); setFeedback(""); }}>Back to today</Button>
                  <Button type="button" variant="outline" onClick={() => { setJournalStep("review"); setSaved(false); }}>Edit today</Button>
                </div>
              </CardContent>
            </Card>}

            <Card>
              <CardHeader className="flex flex-row items-end justify-between gap-3 border-b border-border p-5 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your own history</p>
                  <CardTitle className="mt-2 font-serif text-2xl font-medium">Past days you chose to keep</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">2 illustrative examples</span>
              </CardHeader>
              <CardContent className="divide-y divide-border px-5 sm:px-6">
                {history.map((day, index) => <article key={day.id} className="py-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">{day.day}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{day.responses} symptom responses · Overall {day.overall}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" aria-expanded={expandedHistory === day.id} onClick={() => setExpandedHistory((current) => current === day.id ? null : day.id)}>{expandedHistory === day.id ? "Close day" : "View day"} <ArrowRight /></Button>
                  </div>
                  {expandedHistory === day.id && <div className="mt-4 grid gap-2 rounded-lg bg-muted/60 p-4 sm:grid-cols-2">
                    {symptoms.slice(0, day.responses).map((symptom, itemIndex) => <p key={symptom} className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0"><span>{symptom}</span><span className="text-muted-foreground">{ratings[(itemIndex + index) % ratings.length]}</span></p>)}
                    <p className="col-span-full pt-2 text-xs text-muted-foreground">Illustrative example only — no actual journal entries are shown.</p>
                  </div>}
                </article>)}
              </CardContent>
            </Card>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>No streaks. No missing-day reminders.</span>
              <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>Back to Dashboard</Button>
            </footer>
          </>
        ) : view === "care-protocol" ? (
          <>
            <section className="space-y-3" aria-labelledby="care-protocol-heading">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care protocol</p>
              <h1 id="care-protocol-heading" className="max-w-3xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Build a plan that feels possible.</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Choose the parts you want to notice, or use a Stillwell roadmap and reflection resources to put a starting plan together. Keep what helps; change or skip the rest.</p>
            </section>

            <Card>
              <CardContent className="flex gap-3 p-4 text-sm leading-6">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <p><strong className="font-semibold">Self-guided, not a prescription.</strong> This space helps you organize reflections and routines. It does not diagnose, prescribe exercise, recommend supplements, or replace advice from a clinician.</p>
              </CardContent>
            </Card>

            <section className="grid gap-5 lg:grid-cols-2" aria-label="Choose how to build your protocol">
              <Card className={protocolMode === "custom" ? "border-primary ring-1 ring-primary/30" : ""}>
                <CardHeader className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Make it your own</p>
                  <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><ClipboardList aria-hidden="true" className="size-5 text-primary" />Create your protocol</CardTitle>
                  <CardDescription className="leading-6">Pick the routines you want to include and add a note in your own words. Your plan can stay simple.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedRoutine.map((id) => routineOptions.find((item) => item.id === id)).filter(Boolean).map((item) => <span key={item!.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{item!.title}</span>)}
                    {!selectedRoutine.length && <span className="text-sm text-muted-foreground">No routines selected yet.</span>}
                  </div>
                  <Button type="button" onClick={() => { setProtocolMode("custom"); setProtocolFeedback(""); setProtocolSaved(false); }}>Build my own protocol <ArrowRight aria-hidden="true" /></Button>
                </CardContent>
              </Card>

              <Card className={protocolMode === "roadmap" ? "border-primary ring-1 ring-primary/30" : ""}>
                <CardHeader className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A little structure, at your pace</p>
                  <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><BookOpen aria-hidden="true" className="size-5 text-primary" />Use the Stillwell roadmap</CardTitle>
                  <CardDescription className="leading-6">Explore a few gentle steps and practical reflection resources, then choose what belongs in your own plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                  <p className="text-sm leading-6 text-muted-foreground">No required pace or checklist. Start wherever feels useful, with or without a clinician.</p>
                  <Button type="button" variant="outline" onClick={() => { setProtocolMode("roadmap"); setProtocolFeedback(""); }}>Explore the roadmap <ArrowRight aria-hidden="true" /></Button>
                </CardContent>
              </Card>
            </section>

            {!protocolMode && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your starting points</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">A plan can be just one small thing.</CardTitle>
                <CardDescription className="leading-6">Choose a direction above to shape a personal protocol, or leave this page and return whenever you like.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
                {routineOptions.map((item) => <span key={item.id} className={`rounded-full px-3 py-2 text-xs ${selectedRoutine.includes(item.id) ? "bg-secondary text-secondary-foreground" : "border border-border text-muted-foreground"}`}>{item.title}{selectedRoutine.includes(item.id) ? " · selected" : ""}</span>)}
              </CardContent>
            </Card>}

            {protocolMode === "custom" && <Card>
              <CardHeader className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Build your plan</p>
                <CardTitle className="mt-2 font-serif text-2xl font-medium">What would you like in your protocol?</CardTitle>
                <CardDescription className="leading-6">Pick any combination. These are reflection prompts, not treatment instructions.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <form className="space-y-5" onSubmit={saveProtocol}>
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">Choose focus areas</legend>
                    {routineOptions.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3 hover:bg-muted/60">
                      <Checkbox className="mt-1" checked={selectedRoutine.includes(item.id)} onCheckedChange={() => toggleRoutine(item.id)} aria-label={item.title} />
                      <span><span className="block text-sm font-medium">{item.title}</span><span className="text-xs leading-5 text-muted-foreground">{item.text}</span></span>
                    </label>)}
                  </fieldset>
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">Support approach</legend>
                    <div className="flex flex-wrap gap-2">
                      {(["Self-guided", "With clinician support"] as Support[]).map((mode) => <Button key={mode} type="button" size="sm" variant={support === mode ? "default" : "outline"} aria-pressed={support === mode} onClick={() => { setSupport(mode); setProtocolSaved(false); }}>{mode}</Button>)}
                    </div>
                  </fieldset>
                  <div className="space-y-2">
                    <label htmlFor="protocol-note" className="text-sm font-semibold">Your note or personal step (optional)</label>
                    <Textarea id="protocol-note" maxLength={500} value={protocolNote} placeholder="What would make this plan feel useful for you?" onChange={(event) => { setProtocolNote(event.target.value); setProtocolSaved(false); }} />
                    <p className="text-xs text-muted-foreground">A private draft for this design preview. No information is sent or saved.</p>
                  </div>
                  {protocolFeedback && <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground" role="status">{protocolFeedback}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={!selectedRoutine.length && !protocolNote.trim()}><Check aria-hidden="true" />Save my protocol</Button>
                    <Button type="button" variant="outline" onClick={() => { setProtocolMode("roadmap"); setProtocolFeedback(""); }}>Explore Stillwell’s roadmap</Button>
                  </div>
                  {protocolSaved && <Card className="border-secondary bg-secondary/60">
                    <CardContent className="space-y-3 p-4">
                      <p className="text-sm font-semibold">Your protocol draft</p>
                      <p className="text-sm text-muted-foreground">Support approach · {support}</p>
                      <div className="flex flex-wrap gap-2">{selectedRoutine.map((id) => routineOptions.find((item) => item.id === id)).filter(Boolean).map((item) => <span key={item!.id} className="rounded-full bg-background px-3 py-1 text-xs">{item!.title}</span>)}</div>
                      {protocolNote.trim() && <p className="rounded-lg bg-background p-3 text-sm leading-6">{protocolNote}</p>}
                    </CardContent>
                  </Card>}
                </form>
              </CardContent>
            </Card>}

            {protocolMode === "roadmap" && <section className="space-y-5" aria-labelledby="roadmap-heading">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stillwell roadmap</p>
                <h2 id="roadmap-heading" className="mt-2 font-serif text-3xl font-medium">A few steps to help you put a plan together.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Move through these in any order. The roadmap is a reflection aid, not a clinical protocol or a set of medical recommendations.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { number: "01", title: "Notice what matters", text: "Use your check-ins to note symptoms and daily experiences that you want to understand over time." },
                  { number: "02", title: "Choose a few supports", text: "Pick optional routines—such as food reflections, cleared movement, quiet pauses, or pacing—that fit your day." },
                  { number: "03", title: "Review and adjust", text: "Keep what feels workable, change what does not, and bring questions to a clinician if you choose." },
                ].map((step) => <Card key={step.number}>
                  <CardHeader className="p-5">
                    <p className="text-xs font-semibold tracking-widest text-primary">{step.number} · ROADMAP</p>
                    <CardTitle className="mt-2 font-serif text-xl font-medium">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 text-sm leading-6 text-muted-foreground">{step.text}</CardContent>
                </Card>)}
              </div>
              <Card>
                <CardHeader className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reflection resources</p>
                  <CardTitle className="mt-2 font-serif text-2xl font-medium">Ideas to help you build your own plan</CardTitle>
                  <CardDescription className="leading-6">Educational prompts in this design preview. These are not treatment directions or a substitute for clinical guidance.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
                  {protocolResources.map((resource) => {
                    const isOpen = openedResource === resource.id;
                    return <article key={resource.id} className="space-y-3 rounded-xl border border-border p-4">
                      <h3 className="font-medium">{resource.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{isOpen ? resource.detail : "A short, optional prompt to help you reflect and prepare your own plan."}</p>
                      <Button type="button" size="sm" variant="outline" aria-expanded={isOpen} onClick={() => setOpenedResource(isOpen ? null : resource.id)}><BookOpen aria-hidden="true" />{isOpen ? "Close resource" : "Preview resource"}</Button>
                    </article>;
                  })}
                </CardContent>
              </Card>
              {protocolFeedback && <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground" role="status">{protocolFeedback}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={addRoadmapToProtocol}>Use these starting points <ArrowRight aria-hidden="true" /></Button>
                <Button type="button" variant="outline" onClick={() => { setProtocolMode("custom"); setProtocolFeedback(""); }}>Build from scratch</Button>
              </div>
            </section>}
            <EmergencyNote />
          </>
        ) : view === "care-team" ? (
          <>
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
              <h1 className="font-serif text-4xl font-medium leading-tight">Keep your clinician’s feedback in view.</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">See who you choose to share with and return to notes they leave for you. Your journal remains yours to change.</p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <Card>
                  <CardHeader className="p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Clinicians you share with</p>
                    <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><UsersRound aria-hidden="true" className="size-5 text-primary" />Your connections</CardTitle>
                    <CardDescription className="leading-6">Only clinicians you invite and who accept can read your shared journal. They cannot edit it.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="rounded-xl bg-secondary p-4">
                      <p className="font-medium">No clinicians connected yet.</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">This preview has no real connections. When you share your journal, clinician details will appear here.</p>
                    </div>
                    <Button onClick={() => { setView("account"); setInviteOpen(true); setInviteError(""); }}><Mail aria-hidden="true" />Invite a clinician</Button>
                    <p className="text-xs leading-5 text-muted-foreground">You can stop sharing anytime. A clinician keeps a read-only copy of what was shared up to then.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Explore care options</p>
                        <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><Search aria-hidden="true" className="size-5 text-primary" />Find a clinician</CardTitle>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">Planned</span>
                    </div>
                    <CardDescription className="leading-6">Explore clinician support by care area and location when listings are available.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                    <p className="text-sm leading-6 text-muted-foreground">Clinician listings are not available in this preview. Stillwell does not verify clinicians; only contact someone you know.</p>
                    <Button type="button" variant="outline" aria-expanded={findClinicianOpen} onClick={() => setFindClinicianOpen((open) => !open)}>
                      <Search aria-hidden="true" />{findClinicianOpen ? "Hide directory preview" : "Find a clinician"}
                    </Button>
                    {findClinicianOpen && (
                      <div className="space-y-3 rounded-xl bg-secondary p-4" role="status">
                        <p className="font-medium">The clinician directory is not live yet.</p>
                        <p className="text-sm leading-6 text-muted-foreground">For now, you can invite a clinician you already see. Nothing is shared unless they accept.</p>
                        <Button type="button" variant="secondary" onClick={() => { setView("account"); setInviteOpen(true); setInviteError(""); }}>
                          <Mail aria-hidden="true" />Invite a clinician
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feedback to keep in view</p>
                      <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><MessageSquareText aria-hidden="true" className="size-5 text-primary" />Feedback from your care team</CardTitle>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">Illustrative example</span>
                  </div>
                  <CardDescription className="leading-6">Notes a clinician chooses to share can be revisited here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                  <article className="rounded-xl border border-border bg-secondary p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">A note from your clinician</p>
                        <p className="mt-1 text-sm text-muted-foreground">Example only · Not from a real clinician</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{feedbackRead ? "Read in preview" : "Unread · example"}</span>
                    </div>
                    <p className="mt-4 text-base leading-7">“Your reflections are ready to discuss together at your next visit.”</p>
                    <p className="mt-2 text-xs text-muted-foreground">Illustrative entry · 2 days ago</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" aria-pressed={feedbackRead} onClick={() => setFeedbackRead((read) => !read)}>{feedbackRead ? "Mark as unread" : "Mark as read"}</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setView("journal")}>Open journal <ArrowRight /></Button>
                    </div>
                  </article>
                  <p className="text-xs leading-5 text-muted-foreground" role="note">This sample demonstrates the layout only. It is not real clinician feedback, and no clinician is connected in this design preview.</p>
                </CardContent>
              </Card>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>Your journal is read-only to clinicians you choose to share with.</span>
              <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>Back to Dashboard</Button>
            </footer>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your account</p>
              <h1 className="font-serif text-4xl font-medium leading-tight">Account settings</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Manage your Stillwell account, care-team access, and sign-in from one place.</p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-5">
                <Card>
                  <CardHeader className="p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account details</p>
                    <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><UserRound aria-hidden="true" className="size-5 text-primary" />Your Stillwell account</CardTitle>
                    <CardDescription>These settings are private to you.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <span className="text-sm text-muted-foreground">Account type</span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">Patient</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Sign-in details</span>
                      <span className="text-right text-sm">Managed by your secure account</span>
                    </div>
                    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />Your password and sign-in methods are not shown in your journal.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sign-in</p>
                    <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><LogOut aria-hidden="true" className="size-5 text-primary" />Sign out</CardTitle>
                    <CardDescription>Leave your Stillwell account on this device.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <Button variant="outline" onClick={() => setSignedOut(true)}><LogOut aria-hidden="true" />Sign out</Button>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">In this design preview, sign out only changes the preview screen. It does not affect a real account or journal.</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
                  <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><HeartHandshake aria-hidden="true" className="size-5 text-primary" />Invite a clinician to Stillwell</CardTitle>
                  <CardDescription className="leading-6">Invite a clinician you already see. They can read your journal after they accept; only you can change it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                  {inviteSent ? (
                    <div className="space-y-3 rounded-xl bg-secondary p-5" role="status">
                      <p className="flex items-center gap-2 font-medium"><Check aria-hidden="true" className="size-5 text-primary" />Invite preview created</p>
                      <p className="text-sm leading-6 text-muted-foreground">No email was sent and nothing was shared. This design preview does not save or send invitations.</p>
                      <Button variant="outline" onClick={() => { setInviteSent(false); setInviteOpen(true); setInviteError(""); }}>Invite another clinician</Button>
                    </div>
                  ) : inviteOpen ? (
                    <form className="space-y-4" onSubmit={submitInvite} noValidate>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="invite-first-name" className="text-sm font-medium">First name</label>
                          <Input id="invite-first-name" autoComplete="given-name" value={inviteFirstName} onChange={(event) => setInviteFirstName(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="invite-last-name" className="text-sm font-medium">Last name</label>
                          <Input id="invite-last-name" autoComplete="family-name" value={inviteLastName} onChange={(event) => setInviteLastName(event.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="invite-email" className="text-sm font-medium">Work email</label>
                        <Input id="invite-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@clinic.org" />
                        <p className="text-xs text-muted-foreground">Use the email they’ll sign in with.</p>
                      </div>
                      <div className="space-y-2 rounded-xl bg-secondary p-4 text-sm leading-6">
                        <p className="font-medium">{inviteFirstName.trim() ? `${inviteFirstName.trim()} will see your journal after accepting.` : "They’ll see your whole journal after accepting."}</p>
                        <p className="text-muted-foreground">Daily entries, symptom ratings, routine logs, notes, and your routine focus areas, including past entries. Read-only; remove access anytime.</p>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">Stillwell doesn’t verify clinicians, so only invite someone you know. Sending this preview does not send an email or share your journal.</p>
                      {inviteError && <p className="text-sm text-destructive" role="alert">{inviteError}</p>}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="submit" disabled={!inviteFirstName.trim() || !inviteLastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())}><Mail aria-hidden="true" />Send invite</Button>
                        <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); setInviteError(""); }}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4 rounded-xl bg-secondary p-5">
                      <p className="text-sm font-medium">No clinicians connected yet.</p>
                      <p className="text-sm leading-6 text-muted-foreground">Nothing is shared unless you invite a clinician and they accept. You can stop sharing anytime.</p>
                      <Button onClick={() => { setInviteOpen(true); setInviteError(""); }}><Mail aria-hidden="true" />Invite a clinician</Button>
                    </div>
                  )}
                  <p className="flex items-center gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />Your journal remains yours. Clinicians can’t edit it, and you can remove access at any time.</p>
                  <Button type="button" variant="ghost" onClick={() => setView("care-team")}>View care team <ArrowRight /></Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
