import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Clock3, HeartHandshake, Keyboard, LayoutDashboard, NotebookPen, ShieldCheck } from "lucide-react";

type View = "dashboard" | "journal";
type Rating = "Not noticeable" | "Less noticeable" | "Noticeable" | "More noticeable";
type Support = "Self-guided" | "With clinician support";

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

export default function PatientDashboardJournal() {
  const [view, setView] = useState<View>("dashboard");
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
    setSelectedRoutine((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
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
          <nav aria-label="Main navigation" className="flex w-full gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" variant={view === "dashboard" ? "secondary" : "ghost"} aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setView("dashboard")}><LayoutDashboard />Dashboard</Button>
            <Button className="flex-1 sm:flex-none" variant={view === "journal" ? "secondary" : "ghost"} aria-current={view === "journal" ? "page" : undefined} onClick={() => setView("journal")}><NotebookPen />Journal</Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-8 sm:py-9">
        {view === "dashboard" ? (
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
                    <p className="text-sm font-medium">Care team details aren’t connected in this design preview.</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">You can keep your reflections private, or bring them to a clinician outside Stillwell if you choose.</p>
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
        ) : (
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
        )}
      </div>
    </main>
  );
}
