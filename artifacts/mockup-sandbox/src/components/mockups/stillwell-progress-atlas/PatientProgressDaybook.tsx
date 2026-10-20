import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

type SymptomKey = "headache" | "fatigue" | "focus" | "sleep" | "mood" | "light";
type CheckIn = {
  date: string;
  ratings: Record<SymptomKey, number>;
  reflection?: string;
};

const symptoms: { key: SymptomKey; label: string; color: string }[] = [
  { key: "headache", label: "Headache", color: "#315b49" },
  { key: "fatigue", label: "Fatigue", color: "#b67f60" },
  { key: "focus", label: "Concentration", color: "#697268" },
  { key: "sleep", label: "Sleep", color: "#82977c" },
  { key: "mood", label: "Mood", color: "#b69a75" },
  { key: "light", label: "Light sensitivity", color: "#bd705c" },
];

const entries: CheckIn[] = [
  {
    date: "2025-01-06",
    ratings: { headache: 3, fatigue: 2, focus: 2, sleep: 3, mood: 1, light: 2 },
  },
  {
    date: "2025-01-14",
    ratings: { headache: 2, fatigue: 5, focus: 2, sleep: 3, mood: 1, light: 2 },
    reflection: "I had a quieter afternoon and still felt tired by evening.",
  },
  {
    date: "2025-01-28",
    ratings: { headache: 2, fatigue: 2, focus: 1, sleep: 2, mood: 2, light: 1 },
  },
  {
    date: "2025-02-12",
    ratings: { headache: 0, fatigue: 2, focus: 1, sleep: 2, mood: 1, light: 2 },
    reflection: "A short walk felt manageable. I needed a quiet hour afterward.",
  },
  {
    date: "2025-02-20",
    ratings: { headache: 1, fatigue: 2, focus: 2, sleep: 3, mood: 1, light: 0 },
    reflection: "The week had a mix of easier and harder moments.",
  },
];

const patientProtocol = [
  { label: "Food & hydration", detail: "Notice what meals and fluids felt manageable." },
  { label: "Movement", detail: "Choose rest or activity consistent with clinician guidance." },
  { label: "Meditation or quiet pause", detail: "Leave space for a familiar, optional quiet moment." },
  { label: "Pacing", detail: "Make room for breaks or changing plans." },
];

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}

function dayNumber(date: string) {
  return Number(date.split("-")[2]);
}

function ratingText(value: number) {
  if (value === 0) return "Not supplied";
  if (value === 1) return "Not noticeable";
  if (value === 2) return "Less noticeable";
  if (value === 3) return "Noticeable";
  if (value === 4) return "Quite noticeable";
  return "More noticeable";
}

export function PatientProgressDaybook() {
  const [selectedDate, setSelectedDate] = useState(entries[entries.length - 1].date);
  const [period, setPeriod] = useState<"30" | "all">("all");

  const visibleEntries = useMemo(() => {
    if (period === "all") return entries;
    const latest = new Date(`${entries[entries.length - 1].date}T00:00:00`);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - 30);
    return entries.filter((entry) => new Date(`${entry.date}T00:00:00`) >= cutoff);
  }, [period]);

  const activeEntry =
    visibleEntries.find((entry) => entry.date === selectedDate) ??
    visibleEntries[visibleEntries.length - 1];
  const selectedIndex = visibleEntries.findIndex((entry) => entry.date === activeEntry.date);
  const monthGroups = visibleEntries.reduce<Record<string, CheckIn[]>>((groups, entry) => {
    const month = formatDate(entry.date, { month: "long", year: "numeric" });
    groups[month] = [...(groups[month] ?? []), entry];
    return groups;
  }, {});

  function selectPeriod(next: "30" | "all") {
    setPeriod(next);
    if (next === "30") {
      const latest = new Date(`${entries[entries.length - 1].date}T00:00:00`);
      const cutoff = new Date(latest);
      cutoff.setDate(cutoff.getDate() - 30);
      const recent = entries.filter((entry) => new Date(`${entry.date}T00:00:00`) >= cutoff);
      if (!recent.some((entry) => entry.date === selectedDate)) setSelectedDate(recent[recent.length - 1].date);
    }
  }

  function moveDate(direction: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(visibleEntries.length - 1, selectedIndex + direction));
    setSelectedDate(visibleEntries[nextIndex].date);
  }

  return (
    <main
      className="min-h-[100dvh] bg-background text-foreground"
      style={{
        fontFamily: "DM Sans, sans-serif",
        ["--background" as string]: "55 25% 95%",
        ["--foreground" as string]: "153 21% 20%",
        ["--border" as string]: "105 15% 85%",
        ["--card" as string]: "50 33% 98%",
        ["--card-foreground" as string]: "153 21% 20%",
        ["--card-border" as string]: "105 15% 85%",
        ["--primary" as string]: "154 25% 31%",
        ["--primary-foreground" as string]: "50 33% 98%",
        ["--secondary" as string]: "105 23% 91%",
        ["--secondary-foreground" as string]: "153 21% 26%",
        ["--muted" as string]: "105 18% 92%",
        ["--muted-foreground" as string]: "137 9% 42%",
        ["--accent" as string]: "26 38% 83%",
        ["--accent-foreground" as string]: "153 21% 24%",
        ["--input" as string]: "105 15% 85%",
        ["--ring" as string]: "145 20% 42%",
      }}
    >
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#b7c9bd] bg-[#e6eee7]" aria-hidden="true">
              <span className="absolute h-[18px] w-[18px] rounded-full border border-[#537566]" />
              <span className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full bg-[#bd705c]" />
            </span>
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Fraunces, Georgia, serif" }}>stillwell</span>
            <span className="hidden border-l border-border pl-3 text-xs text-muted-foreground sm:block">Clinician workspace</span>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole size={14} /> Fictional sample view
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary-foreground">
              <span className="h-px w-6 bg-[#a6b9aa]" />Patient-reported journal · fictional profile
            </p>
            <h1 className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Taylor Bennett</h1>
            <p className="mt-2 text-sm text-muted-foreground">ST-2041 <span className="mx-1">·</span> Existing <span className="mx-1">·</span> Fictional sample data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-2 text-xs text-secondary-foreground">Patient-selected sharing · simulated</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-secondary-foreground"><ShieldCheck size={14} /> Shared journal</span>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(255px,0.72fr)_minmax(0,2fr)]">
          <Card className="h-fit overflow-hidden">
            <CardHeader className="gap-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journal index</p>
                  <CardTitle className="mt-1 text-2xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Choose a day</CardTitle>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary"><CalendarDays size={19} /></span>
              </div>
              <div className="flex gap-1 rounded-full bg-muted p-1" aria-label="Filter journal dates">
                <Button type="button" size="sm" className="flex-1" variant={period === "30" ? "secondary" : "ghost"} aria-pressed={period === "30"} onClick={() => selectPeriod("30")}>30 days</Button>
                <Button type="button" size="sm" className="flex-1" variant={period === "all" ? "secondary" : "ghost"} aria-pressed={period === "all"} onClick={() => selectPeriod("all")}>All dates</Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">Each entry opens one day of patient-supplied ratings and words.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(monthGroups).map(([month, monthEntries]) => (
                <section key={month} aria-label={month}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</p>
                  <div className="space-y-2">
                    {monthEntries.map((entry) => {
                      const isSelected = entry.date === activeEntry.date;
                      const suppliedCount = Object.values(entry.ratings).filter((rating) => rating > 0).length;
                      return (
                        <button
                          key={entry.date}
                          type="button"
                          aria-current={isSelected ? "date" : undefined}
                          onClick={() => setSelectedDate(entry.date)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-primary bg-secondary" : "border-transparent bg-background hover:border-border hover:bg-muted"}`}
                        >
                          <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
                            <span className="text-[10px] uppercase leading-none">{formatDate(entry.date, { weekday: "short" })}</span>
                            <span className="mt-1 text-lg font-semibold leading-none">{dayNumber(entry.date)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{formatDate(entry.date, { month: "short", day: "numeric" })}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{entry.reflection ? "Reflection shared" : `${suppliedCount} ratings supplied`}</span>
                          </span>
                          {entry.reflection && <MessageSquareText size={15} className={isSelected ? "text-primary" : "text-muted-foreground"} aria-label="Reflection available" />}
                          {isSelected && <Check size={14} className="text-primary" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
              <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                <CircleHelp size={15} className="mt-0.5 shrink-0" />
                <p>Dates appear only when a check-in was supplied. No days or values are filled in between entries.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-4 border-b border-border bg-card pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily snapshot</p>
                  <CardTitle className="mt-1 text-3xl font-medium sm:text-4xl" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                    {formatDate(activeEntry.date, { month: "long", day: "numeric", year: "numeric" })}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{activeEntry.date === entries[0].date ? "Starting snapshot" : "Patient-supplied check-in"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="icon" type="button" aria-label="Previous supplied check-in" disabled={selectedIndex <= 0} onClick={() => moveDate(-1)}><ArrowLeft /></Button>
                  <Button variant="outline" size="icon" type="button" aria-label="Next supplied check-in" disabled={selectedIndex >= visibleEntries.length - 1} onClick={() => moveDate(1)}><ArrowRight /></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Six symptom check-ins</h2>
                    <p className="mt-1 text-sm text-muted-foreground">One day at a time; no combined score or inferred trend.</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-secondary-foreground">{Object.values(activeEntry.ratings).filter((rating) => rating > 0).length} of 6 supplied</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {symptoms.map((symptom) => {
                    const value = activeEntry.ratings[symptom.key];
                    return (
                      <div key={symptom.key} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: symptom.color }} />
                            {symptom.label}
                          </span>
                          {value === 0 ? (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">0 · Not supplied</span>
                          ) : (
                            <span className="text-right"><strong className="mr-1 text-base">{value}</strong><span className="text-xs text-muted-foreground">{ratingText(value)}</span></span>
                          )}
                        </div>
                        <div className="mt-3 flex gap-1.5" role="img" aria-label={`${symptom.label}: ${value === 0 ? "not supplied" : `${value} out of 5, ${ratingText(value)}`}`}>
                          {[1, 2, 3, 4, 5].map((step) => (
                            <span
                              key={step}
                              className="h-2.5 flex-1 rounded-full"
                              style={{ backgroundColor: value >= step ? symptom.color : "#e5e9e1", opacity: value >= step ? 0.9 : 1 }}
                            />
                          ))}
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>Less noticeable</span><span>More noticeable</span></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
                  <CircleHelp size={14} className="mt-0.5 shrink-0" />
                  <p>Ratings are shown as Taylor supplied them: 1 means not noticeable and 5 means more noticeable. 0 means no value was supplied.</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </section>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient-chosen plan</p>
            <CardTitle className="text-2xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Recovery protocol</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">The patient’s selected routines—not a prescribed care plan. Daily journal notes above belong only to the selected date.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {patientProtocol.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3 rounded-xl border border-accent bg-[#f3eee4] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#8a7057]" />
            <p className="text-xs leading-5 text-[#655e53]"><strong className="font-semibold">Reading this preview.</strong> Patient-reported ratings and personal words only. This fictional view does not provide a diagnosis, treatment recommendation, or claim that a routine caused a change.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={14} />No real records or access</div>
        </section>
      </div>
    </main>
  );
}
