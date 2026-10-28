import "@workspace/stillwell-design-system/styles.css";
import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  NotebookPen,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

type SymptomKey = "headache" | "fatigue" | "fog" | "sleep" | "mood" | "light";
type Rating = 0 | 1 | 2 | 3;
type CheckIn = {
  date: string;
  ratings: Record<SymptomKey, Rating | null>;
  reflection?: string;
};
export type PatientWorkspaceView = "dashboard" | "journal" | "care-protocol" | "care-team" | "account";

const navigationItems: { id: PatientWorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "journal", label: "Journal", icon: NotebookPen },
  { id: "account", label: "Account", icon: Settings },
];

const symptoms: { key: SymptomKey; label: string }[] = [
  { key: "headache", label: "Headache" },
  { key: "fatigue", label: "Fatigue" },
  { key: "fog", label: "Fog" },
  { key: "sleep", label: "Sleep" },
  { key: "mood", label: "Mood" },
  { key: "light", label: "Light" },
];

const ratingLabels = ["Not noticeable", "Less noticeable", "Noticeable", "More noticeable"] as const;

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const entries: CheckIn[] = [
  {
    date: dateDaysAgo(42),
    ratings: { headache: 2, fatigue: 1, fog: 1, sleep: 2, mood: 0, light: 1 },
  },
  {
    date: dateDaysAgo(30),
    ratings: { headache: 1, fatigue: 2, fog: 1, sleep: 2, mood: 0, light: 1 },
    reflection: "I had a quieter afternoon and still felt tired by evening.",
  },
  {
    date: dateDaysAgo(21),
    ratings: { headache: 1, fatigue: 1, fog: 0, sleep: 1, mood: 1, light: 0 },
  },
  {
    date: dateDaysAgo(14),
    ratings: { headache: 0, fatigue: 1, fog: 0, sleep: 1, mood: 0, light: 1 },
    reflection: "A short walk felt manageable. I needed a quiet hour afterward.",
  },
  {
    date: dateDaysAgo(7),
    ratings: { headache: 1, fatigue: 2, fog: null, sleep: 2, mood: 1, light: 0 },
    reflection: "The week had a mix of easier and harder moments.",
  },
  {
    date: dateDaysAgo(3),
    ratings: { headache: 0, fatigue: 1, fog: 1, sleep: 1, mood: 0, light: 0 },
  },
  {
    date: dateDaysAgo(1),
    ratings: { headache: 1, fatigue: 0, fog: 1, sleep: 2, mood: 1, light: null },
    reflection: "I paused between tasks and made room to adjust the afternoon.",
  },
];

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, options);
}

function ratingText(value: Rating | null) {
  return value === null ? "Not recorded" : ratingLabels[value];
}

export function PatientWorkspaceNavigation({
  active,
  onNavigate,
}: {
  active: PatientWorkspaceView;
  onNavigate: (view: PatientWorkspaceView) => void;
}) {
  const current = active === "care-protocol" || active === "care-team" ? "dashboard" : active;
  return <nav aria-label="Patient workspace navigation" className="flex w-full items-center gap-1 rounded-2xl border border-border bg-card p-1 sm:w-auto">
    <div className="grid flex-1 grid-cols-2 gap-1 sm:flex">
      {navigationItems.filter((item) => item.id !== "account").map(({ id, label, icon: Icon }) => <Button
        key={id}
        type="button"
        variant={current === id ? "secondary" : "ghost"}
        className="min-h-11 w-full justify-center sm:w-auto"
        aria-current={current === id ? "page" : undefined}
        onClick={() => onNavigate(id)}
        data-testid={`nav-patient-${id}`}
      >
        <Icon aria-hidden="true" className="size-4" />{label}
      </Button>)}
    </div>
    <Button
      type="button"
      variant={current === "account" ? "secondary" : "ghost"}
      className="min-h-11 shrink-0 justify-center"
      aria-current={current === "account" ? "page" : undefined}
      onClick={() => onNavigate("account")}
      data-testid="nav-patient-account"
    >
      <Settings aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Account</span><span className="sm:hidden">More</span>
    </Button>
  </nav>;
}

function SafetyNote() {
  return <Card>
    <CardContent className="flex gap-3 p-4 text-sm leading-6">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
      <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
    </CardContent>
  </Card>;
}

function JournalContent({ audience = "patient" }: { audience?: "patient" | "clinician" }) {
  const isClinician = audience === "clinician";
  const [selectedDate, setSelectedDate] = useState(entries[entries.length - 1].date);
  const [period, setPeriod] = useState<"30" | "all">("all");

  const visibleEntries = useMemo(() => {
    if (period === "all") return entries;
    const latest = new Date(`${entries[entries.length - 1].date}T12:00:00`);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - 30);
    return entries.filter((entry) => new Date(`${entry.date}T12:00:00`) >= cutoff);
  }, [period]);

  const activeEntry = visibleEntries.find((entry) => entry.date === selectedDate) ?? visibleEntries[visibleEntries.length - 1];
  const selectedIndex = visibleEntries.findIndex((entry) => entry.date === activeEntry.date);
  const monthGroups = visibleEntries.reduce<Record<string, CheckIn[]>>((groups, entry) => {
    const month = formatDate(entry.date, { month: "long", year: "numeric" });
    groups[month] = [...(groups[month] ?? []), entry];
    return groups;
  }, {});

  function selectPeriod(next: "30" | "all") {
    setPeriod(next);
    if (next === "30") {
      const latest = new Date(`${entries[entries.length - 1].date}T12:00:00`);
      const cutoff = new Date(latest);
      cutoff.setDate(cutoff.getDate() - 30);
      const recent = entries.filter((entry) => new Date(`${entry.date}T12:00:00`) >= cutoff);
      if (!recent.some((entry) => entry.date === selectedDate)) setSelectedDate(recent[recent.length - 1].date);
    }
  }

  function moveDate(direction: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(visibleEntries.length - 1, selectedIndex + direction));
    setSelectedDate(visibleEntries[nextIndex].date);
  }

  return <section className="space-y-6" aria-label={isClinician ? "Jane Smith's shared journal entries" : "Journal entries"}>
    <section className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
        <span className="h-px w-6 bg-primary/50" />{isClinician ? "Shared journal · design preview" : "Your private journal · design preview"}
      </p>
      {isClinician ? <>
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">Jane Smith</h1>
        <p className="text-lg font-medium text-foreground">Past check-ins</p>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">A read-only view of Jane’s recorded responses. No values are filled in between entries.</p>
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-secondary-foreground"><ShieldCheck aria-hidden="true" className="size-4" />Fictional patient · illustrative preview</p>
      </> : <>
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">Your past check-ins</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Revisit the days you chose to record. No values are filled in between entries.</p>
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-secondary-foreground"><ShieldCheck aria-hidden="true" className="size-4" />Illustrative entries only · not connected to records</p>
      </>}
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <Card className="h-fit overflow-hidden">
        <CardHeader className="gap-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isClinician ? "Jane’s journal" : "Journal index"}</p>
              <CardTitle className="mt-1 font-serif text-2xl font-medium">Choose a day</CardTitle>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true"><CalendarDays size={19} /></span>
          </div>
          <div className="flex gap-1 rounded-full bg-muted p-1" aria-label="Filter journal dates">
            <Button type="button" size="sm" className="min-h-11 flex-1" variant={period === "30" ? "secondary" : "ghost"} aria-pressed={period === "30"} onClick={() => selectPeriod("30")} data-testid="filter-journal-30-days">30 days</Button>
            <Button type="button" size="sm" className="min-h-11 flex-1" variant={period === "all" ? "secondary" : "ghost"} aria-pressed={period === "all"} onClick={() => selectPeriod("all")} data-testid="filter-journal-all">All dates</Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{isClinician ? "Each entry opens one day of Jane’s recorded responses and words." : "Each entry opens one day of your recorded responses and words."}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {Object.entries(monthGroups).map(([month, monthEntries]) => <section key={month} aria-label={month}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</p>
            <div className="space-y-2">
              {monthEntries.map((entry) => {
                const isSelected = entry.date === activeEntry.date;
                const suppliedCount = Object.values(entry.ratings).filter((rating) => rating !== null).length;
                return <Button
                  key={entry.date}
                  type="button"
                  variant={isSelected ? "secondary" : "ghost"}
                  className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
                  aria-current={isSelected ? "date" : undefined}
                  onClick={() => setSelectedDate(entry.date)}
                  data-testid={`journal-day-${entry.date}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <span className="text-xs uppercase leading-none">{formatDate(entry.date, { weekday: "short" })}</span>
                    <span className="mt-1 text-lg font-semibold leading-none">{Number(entry.date.split("-")[2])}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{formatDate(entry.date, { month: "short", day: "numeric" })}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{entry.reflection ? "Reflection saved" : `${suppliedCount} responses recorded`}</span>
                  </span>
                  {entry.reflection && <NotebookPen size={15} className={isSelected ? "text-primary" : "text-muted-foreground"} aria-label="Reflection available" />}
                  {isSelected && <Check size={14} className="text-primary" aria-hidden="true" />}
                </Button>;
              })}
            </div>
          </section>)}
          <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>Dates appear only when a check-in was saved. No days or values are filled in between entries.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5 lg:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between gap-4 border-b border-border bg-card pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isClinician ? "Patient-reported check-in" : "Daily check-in"}</p>
              <CardTitle className="mt-1 font-serif text-3xl font-medium sm:text-4xl">{formatDate(activeEntry.date, { month: "long", day: "numeric", year: "numeric" })}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{isClinician ? "Jane’s recorded entry · fictional preview" : "Illustrative entry · fictional preview"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="icon" type="button" aria-label="Previous saved check-in" disabled={selectedIndex <= 0} onClick={() => moveDate(-1)} data-testid="button-journal-previous"><ArrowLeft /></Button>
              <Button variant="outline" size="icon" type="button" aria-label="Next saved check-in" disabled={selectedIndex >= visibleEntries.length - 1} onClick={() => moveDate(1)} data-testid="button-journal-next"><ArrowRight /></Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{isClinician ? "Symptom ratings" : "Symptom check-in"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{isClinician ? "Jane’s four patient-reported choices, shown as words." : "Four patient-reported choices, shown as words."}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-secondary-foreground">{Object.values(activeEntry.ratings).filter((rating) => rating !== null).length} of 6 recorded</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {symptoms.map((symptom) => {
                const value = activeEntry.ratings[symptom.key];
                const label = ratingText(value);
                const level = value === null ? 0 : value + 1;
                return <div key={symptom.key} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      {symptom.label}
                    </span>
                    <span className={value === null ? "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground" : "text-right text-sm font-medium"}>{label}</span>
                  </div>
                  <div className="mt-3 flex gap-1.5" role="img" aria-label={`${symptom.label}: ${label}`}>
                    {ratingLabels.map((item, index) => <span key={item} className={`h-2.5 flex-1 rounded-full ${index < level ? "bg-primary" : "bg-muted"}`} />)}
                  </div>
                  <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted-foreground"><span>Not noticeable</span><span>More noticeable</span></div>
                </div>;
              })}
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
              <CircleHelp size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>Choose one of four descriptions for each symptom. An unanswered item stays blank as “Not recorded.”</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isClinician ? "Note shared with you" : "Your note"}</p>
            <CardTitle className="font-serif text-xl font-medium">{isClinician ? "Jane’s note for this day" : "A few words for this day"}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeEntry.reflection
              ? <p className="text-sm leading-7 text-foreground">“{activeEntry.reflection}”</p>
              : <p className="text-sm text-muted-foreground">No note was recorded for this day.</p>}
          </CardContent>
        </Card>
      </div>
    </section>

    <SafetyNote />
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4" />{isClinician ? "Read-only view · no interpretation added." : "No streaks. No prescribed progression."}</span>
      <span>{isClinician ? "Patient-reported journal · not a clinical record" : "Sample interface only · not a clinical record"}</span>
    </div>
  </section>;
}

function DashboardOverview({ audience, onNavigate }: {
  audience: "patient" | "clinician";
  onNavigate: (view: PatientWorkspaceView) => void;
}) {
  if (audience === "clinician") {
    return <main className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CLINICIAN PORTAL · DESIGN PREVIEW</p>
        <h1 className="font-serif text-4xl font-medium">Your patients</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Choose a patient to review the journal they have shared with you.</p>
      </header>
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Jane Smith</p>
            <p className="mt-1 text-sm text-muted-foreground">Patient journal · illustrative preview</p>
          </div>
          <Button type="button" onClick={() => onNavigate("journal")} data-testid="button-open-jane-journal">
            <NotebookPen aria-hidden="true" className="size-4" />Open journal
          </Button>
        </CardContent>
      </Card>
    </main>;
  }

  const progress = entries.slice(-7).map((entry) => {
    const recorded = Object.values(entry.ratings).filter((value): value is Rating => value !== null);
    const average = recorded.length ? recorded.reduce((total, value) => total + value, 0) / recorded.length : 0;
    return { entry, height: recorded.length ? 30 + Math.round((average / 3) * 64) : 0 };
  });

  return <main className="mx-auto max-w-5xl space-y-6">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">YOUR PRIVATE SPACE</p>
      <h1 className="font-serif text-4xl font-medium">Your dashboard</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">A quick view of your saved check-ins, with your journal and support choices kept separate.</p>
    </header>
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ILLUSTRATIVE VIEW</p>
        <CardTitle className="font-serif text-2xl">Your check-in pattern</CardTitle>
        <p className="text-sm text-muted-foreground">A visual summary of recorded entries. No interpretation is added.</p>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end justify-between gap-2 border-b border-border px-1" role="img" aria-label="Illustrative check-in pattern across the seven most recent entries">
          {progress.map(({ entry, height }) => <div key={entry.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="w-full rounded-t-md bg-primary/80" style={{ height: `${height}%` }} />
            <span className="text-[10px] text-muted-foreground">{formatDate(entry.date, { month: "short", day: "numeric" })}</span>
          </div>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Illustrative check-in visualization · not a diagnosis</p>
      </CardContent>
    </Card>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">YOUR PLAN</p>
          <CardTitle className="font-serif text-2xl">Care protocol</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Review the self-guided plan and the parts you chose to focus on.</p>
        </CardHeader>
        <CardContent><Button type="button" variant="outline" onClick={() => onNavigate("care-protocol")}><CalendarDays aria-hidden="true" className="size-4" />View care protocol</Button></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">YOUR CHOICE</p>
          <CardTitle className="font-serif text-2xl">Care team</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Manage who you have chosen to share your journal with.</p>
        </CardHeader>
        <CardContent><Button type="button" variant="outline" onClick={() => onNavigate("care-team")}><UsersRound aria-hidden="true" className="size-4" />View care team</Button></CardContent>
      </Card>
    </div>
    <SafetyNote />
  </main>;
}

function PlaceholderView({ view, onNavigate }: { view: PatientWorkspaceView; onNavigate: (view: PatientWorkspaceView) => void }) {
  const messages: Record<Exclude<PatientWorkspaceView, "journal">, { title: string; description: string }> = {
    dashboard: { title: "Your dashboard", description: "A calm overview for your saved journal entries and the personal routine choices you want to keep." },
    "care-protocol": { title: "Care protocol", description: "Choose between a self-guided draft and Stillwell’s optional roadmap. This is a design preview, not treatment guidance." },
    "care-team": { title: "Your care team", description: "You decide whether to share your journal with a clinician. Sharing and clinician matching are not connected in this preview." },
    account: { title: "Account", description: "Account and privacy controls belong in the patient workspace; this preview does not connect to a sign-in session." },
  };
  const content = messages[view as Exclude<PatientWorkspaceView, "journal">];
  return <Card className="mx-auto max-w-3xl">
    <CardHeader className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Patient workspace · design preview</p>
      <CardTitle className="mt-2 font-serif text-3xl font-medium">{content.title}</CardTitle>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.description}</p>
    </CardHeader>
    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
      <Button type="button" variant="outline" onClick={() => onNavigate("dashboard")}><LayoutDashboard aria-hidden="true" />Back to dashboard</Button>
    </CardContent>
  </Card>;
}

export function PatientProgressDaybook({ embedded = false }: { embedded?: boolean }) {
  const [activeView, setActiveView] = useState<PatientWorkspaceView>("journal");
  const audience = embedded ? "patient" : "clinician";
  const content = activeView === "journal"
    ? <JournalContent audience={audience} />
    : activeView === "dashboard"
      ? <DashboardOverview audience={audience} onNavigate={setActiveView} />
      : <PlaceholderView view={activeView} onNavigate={setActiveView} />;

  if (embedded) return content;
  return <main className="min-h-[100dvh] bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <img src={stillwellMark} alt="" aria-hidden="true" className="size-9 shrink-0" />
          <span className="font-serif text-xl font-semibold tracking-tight">stillwell</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">Clinician portal · design preview</span>
        </div>
        <nav aria-label="Clinician navigation" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
          <Button type="button" size="sm" className="min-h-11" variant={activeView === "dashboard" ? "secondary" : "ghost"} aria-current={activeView === "dashboard" ? "page" : undefined} onClick={() => setActiveView("dashboard")} data-testid="nav-clinician-patients">Patients</Button>
          <Button type="button" size="sm" className="min-h-11" variant={activeView === "journal" ? "secondary" : "ghost"} aria-current={activeView === "journal" ? "page" : undefined} onClick={() => setActiveView("journal")} data-testid="nav-clinician-journal">Jane’s journal</Button>
          <Button type="button" size="sm" className="min-h-11" variant={activeView === "account" ? "secondary" : "ghost"} aria-current={activeView === "account" ? "page" : undefined} onClick={() => setActiveView("account")} data-testid="nav-clinician-profile">Profile</Button>
        </nav>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{content}</div>
  </main>;
}

export default PatientProgressDaybook;
