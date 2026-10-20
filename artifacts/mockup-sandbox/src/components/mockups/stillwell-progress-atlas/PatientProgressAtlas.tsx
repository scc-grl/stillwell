import { useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleHelp, ClipboardList, LockKeyhole, ShieldCheck } from "lucide-react";

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
  { date: "2025-01-06", ratings: { headache: 3, fatigue: 2, focus: 2, sleep: 3, mood: 1, light: 2 } },
  { date: "2025-01-14", ratings: { headache: 2, fatigue: 5, focus: 2, sleep: 3, mood: 1, light: 2 }, reflection: "I had a quieter afternoon and still felt tired by evening." },
  { date: "2025-01-28", ratings: { headache: 2, fatigue: 2, focus: 1, sleep: 2, mood: 2, light: 1 } },
  { date: "2025-02-12", ratings: { headache: 0, fatigue: 2, focus: 1, sleep: 2, mood: 1, light: 2 }, reflection: "A short walk felt manageable. I needed a quiet hour afterward." },
  { date: "2025-02-20", ratings: { headache: 1, fatigue: 2, focus: 2, sleep: 3, mood: 1, light: 0 }, reflection: "The week had a mix of easier and harder moments." },
];

function shortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function longDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function ratingText(value: number) {
  if (value === 0) return "Not supplied";
  if (value === 1) return "Not noticeable";
  if (value === 2) return "Less noticeable";
  if (value === 3) return "Noticeable";
  if (value === 4) return "Quite noticeable";
  return "More noticeable";
}

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#b7c9bd] bg-[#e6eee7]" aria-hidden="true">
      <span className="absolute h-[18px] w-[18px] rounded-full border border-[#537566]" />
      <span className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full bg-[#bd705c]" />
    </span>
  );
}

function TrendChart({
  visibleEntries,
  selectedSymptom,
  selectedDate,
}: {
  visibleEntries: CheckIn[];
  selectedSymptom: SymptomKey | "all";
  selectedDate: string;
}) {
  const chartWidth = 900;
  const chartHeight = 292;
  const left = 58;
  const right = 52;
  const top = 20;
  const bottom = 40;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const x = (index: number) =>
    left + (visibleEntries.length < 2 ? plotWidth / 2 : (index / (visibleEntries.length - 1)) * plotWidth);
  const y = (rating: number) => top + plotHeight - (rating / 5) * plotHeight;
  const activeSymptoms = selectedSymptom === "all" ? symptoms : symptoms.filter((item) => item.key === selectedSymptom);

  return (
    <div className="min-w-0">
      <div className="overflow-hidden">
        <svg
          className="h-64 w-full sm:h-72"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="Patient-reported symptom ratings across supplied check-in dates, on a scale from zero to five"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <g key={value}>
              <line x1={left} x2={chartWidth - right} y1={y(value)} y2={y(value)} stroke="#dfe5db" strokeDasharray={value === 0 ? "0" : "3 6"} />
              <text x={left - 18} y={y(value) + 4} textAnchor="end" fill="#727d70" fontSize="13" fontFamily="DM Sans, sans-serif">{value}</text>
            </g>
          ))}
          {visibleEntries.map((entry, index) => (
            <g key={entry.date}>
              <line x1={x(index)} x2={x(index)} y1={top} y2={chartHeight - bottom} stroke={entry.date === selectedDate ? "#b7c9bd" : "transparent"} strokeWidth="1.5" />
              <text x={x(index)} y={chartHeight - 12} textAnchor="middle" fill={entry.date === selectedDate ? "#315b49" : "#727d70"} fontSize="12" fontWeight={entry.date === selectedDate ? "700" : "500"} fontFamily="DM Sans, sans-serif">{shortDate(entry.date)}</text>
            </g>
          ))}
          {activeSymptoms.map((symptom) => {
            const points = visibleEntries.map((entry, index) => `${x(index)},${y(entry.ratings[symptom.key])}`).join(" ");
            return (
              <g key={symptom.key}>
                {visibleEntries.length > 1 && <polyline points={points} fill="none" stroke={symptom.color} strokeWidth={selectedSymptom === "all" ? "2.6" : "4"} strokeLinecap="round" strokeLinejoin="round" opacity={selectedSymptom === "all" ? ".86" : "1"} />}
                {visibleEntries.map((entry, index) => {
                  const value = entry.ratings[symptom.key];
                  return (
                    <circle key={`${symptom.key}-${entry.date}`} cx={x(index)} cy={y(value)} r={entry.date === selectedDate ? 6.5 : 4.5} fill={value === 0 ? "#fbfaf5" : symptom.color} stroke={symptom.color} strokeWidth={value === 0 ? "2" : "1.5"}>
                      <title>{`${symptom.label}, ${longDate(entry.date)}: ${value === 0 ? "0 · Not supplied" : `${value} · ${ratingText(value)}`}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Less noticeable <span className="mx-2 text-border">←</span> More noticeable</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border-2 border-[#697268] bg-card" />0 · Not supplied</span>
      </div>
    </div>
  );
}

export function PatientProgressAtlas() {
  const [selectedDate, setSelectedDate] = useState(entries[entries.length - 1].date);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomKey | "all">("all");
  const [period, setPeriod] = useState<"30" | "all">("all");
  const [showRoster, setShowRoster] = useState(false);
  const [showSharingDetails, setShowSharingDetails] = useState(false);

  const visibleEntries = useMemo(() => {
    if (period === "all") return entries;
    const lastDate = new Date(`${entries[entries.length - 1].date}T00:00:00`);
    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - 30);
    return entries.filter((entry) => new Date(`${entry.date}T00:00:00`) >= cutoff);
  }, [period]);
  const activeEntry = visibleEntries.find((entry) => entry.date === selectedDate) ?? visibleEntries[visibleEntries.length - 1];
  const selectedSymptomInfo = selectedSymptom === "all" ? null : symptoms.find((item) => item.key === selectedSymptom);

  function selectPeriod(next: "30" | "all") {
    setPeriod(next);
    if (next === "30") {
      const latest = entries[entries.length - 1].date;
      const cutoff = new Date(`${latest}T00:00:00`);
      cutoff.setDate(cutoff.getDate() - 30);
      const nextEntries = entries.filter((entry) => new Date(`${entry.date}T00:00:00`) >= cutoff);
      if (!nextEntries.some((entry) => entry.date === selectedDate)) setSelectedDate(nextEntries[nextEntries.length - 1].date);
    }
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
          <div className="flex items-center gap-3 text-foreground">
            <BrandMark />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Fraunces, Georgia, serif" }}>stillwell</span>
            <span className="hidden border-l border-border pl-3 text-xs text-muted-foreground sm:block">Clinician workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><LockKeyhole size={14} /> Simulated view</span>
            <Button variant="outline" size="sm" type="button" aria-label="Open patient list" aria-expanded={showRoster} onClick={() => setShowRoster((open) => !open)}><ArrowLeft /> <span className="hidden sm:inline">{showRoster ? "Close list" : "Patient list"}</span></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        {showRoster && (
          <section aria-label="Patient list" className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fictional workspace</p><h2 className="mt-1 text-xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Patient list</h2></div>
              <span className="text-xs text-muted-foreground">Sample profile only · no actual records</span>
            </div>
            <Button type="button" variant="secondary" className="mt-4 w-full justify-between sm:w-auto" onClick={() => setShowRoster(false)}>
              Taylor Bennett <span className="text-xs text-muted-foreground">Currently viewing</span><ArrowRight />
            </Button>
          </section>
        )}

        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary-foreground">
              <span className="h-px w-6 bg-[#a6b9aa]" />Patient-reported journey · fictional profile
            </p>
            <h1 className="text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Taylor Bennett</h1>
            <p className="mt-2 text-sm text-muted-foreground">ST-2041 <span className="mx-1">·</span> Existing <span className="mx-1">·</span> Fictional sample data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-2 text-xs text-secondary-foreground">Patient-selected sharing · simulated</span>
            <Button variant="outline" size="sm" type="button" aria-expanded={showSharingDetails} onClick={() => setShowSharingDetails((open) => !open)}><ShieldCheck /> Sharing details <span className="sr-only">{showSharingDetails ? "Hide" : "Show"} sharing details</span></Button>
          </div>
        </section>
        {showSharingDetails && (
          <section className="flex items-start gap-3 rounded-xl border border-border bg-secondary p-4" aria-label="Sharing details">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-secondary-foreground"><strong className="font-semibold">Simulated sharing scope.</strong> Symptom ratings and selected personal reflections are shown in this fictional preview. It does not establish consent, connect accounts, or grant access to real patient information.</p>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.8fr)]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress atlas</p>
                <CardTitle className="mt-1 text-2xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Notice what changes</CardTitle>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A visual record of supplied ratings across check-ins. Each line represents one symptom; no overall score or inferred trend is calculated.</p>
              </div>
              <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1" aria-label="Choose date range">
                <Button type="button" size="sm" variant={period === "30" ? "secondary" : "ghost"} aria-pressed={period === "30"} onClick={() => selectPeriod("30")}>30 days</Button>
                <Button type="button" size="sm" variant={period === "all" ? "secondary" : "ghost"} aria-pressed={period === "all"} onClick={() => selectPeriod("all")}>All dates</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CircleHelp size={14} />
                <span>0–5 noticeability scale · select a symptom to focus the chart</span>
              </div>
              <TrendChart visibleEntries={visibleEntries} selectedSymptom={selectedSymptom} selectedDate={activeEntry.date} />

              <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Focus symptom chart">
                <Button type="button" size="sm" variant={selectedSymptom === "all" ? "secondary" : "outline"} aria-pressed={selectedSymptom === "all"} onClick={() => setSelectedSymptom("all")}>All symptoms</Button>
                {symptoms.map((symptom) => (
                  <Button key={symptom.key} type="button" size="sm" variant={selectedSymptom === symptom.key ? "secondary" : "outline"} aria-pressed={selectedSymptom === symptom.key} onClick={() => setSelectedSymptom(symptom.key)}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: symptom.color }} />{symptom.label}
                  </Button>
                ))}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={15} className="text-primary" />Supplied check-ins</h3>
                  <span className="text-xs text-muted-foreground">{visibleEntries.length} dates shown</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Select a supplied check-in date">
                  {visibleEntries.map((entry) => (
                    <Button key={entry.date} type="button" variant={activeEntry.date === entry.date ? "default" : "outline"} size="sm" aria-pressed={activeEntry.date === entry.date} onClick={() => setSelectedDate(entry.date)} className="shrink-0">
                      {shortDate(entry.date)}{activeEntry.date === entry.date && <Check size={13} />}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected check-in</p>
                <CardTitle className="mt-1 text-xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{longDate(activeEntry.date)}</CardTitle>
                <p className="text-sm text-muted-foreground">{activeEntry.date === entries[0].date ? "Starting snapshot" : "Patient-supplied check-in"}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(selectedSymptomInfo ? [selectedSymptomInfo] : symptoms).map((symptom) => {
                  const value = activeEntry.ratings[symptom.key];
                  return (
                    <div key={symptom.key} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-0">
                      <span className="flex min-w-0 items-center gap-2 text-sm"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: symptom.color }} />{symptom.label}</span>
                      <span className="shrink-0 text-right text-xs text-muted-foreground">{value === 0 ? <span className="rounded-full bg-muted px-2.5 py-1">0 · Not supplied</span> : <><strong className="mr-1 text-sm text-foreground">{value}</strong>{ratingText(value)}</>}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient-chosen plan · example</p>
                <CardTitle className="mt-1 flex items-center gap-2 text-xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                  <ClipboardList size={19} className="text-primary" aria-hidden="true" />
                  Recovery protocol
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">Routines Taylor has chosen to keep track of between check-ins.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: "Food & hydration", detail: "Notice meals and fluids that felt manageable.", status: "Chosen" },
                  { title: "Movement", detail: "Note activity that fits current guidance and how it felt.", status: "Chosen" },
                  { title: "Meditation or quiet pause", detail: "Optional; note a familiar practice or pause if chosen.", status: "Optional" },
                  { title: "Pacing", detail: "Notice breaks, changed plans, or when a pause helped.", status: "Chosen" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start justify-between gap-3 border-t border-border py-3 first:border-0 first:pt-0">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">{item.status}</span>
                  </div>
                ))}
                <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                  This reflects Taylor’s choices, not a prescribed care plan. They can adjust or pause any part.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared reflection</p>
                <CardTitle className="mt-1 text-xl font-medium" style={{ fontFamily: "Fraunces, Georgia, serif" }}>A note from this day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeEntry.reflection ? (
                  <>
                    <blockquote className="border-l-2 border-accent pl-4 text-sm leading-6 text-foreground">“{activeEntry.reflection}”</blockquote>
                    <p className="text-xs leading-5 text-muted-foreground">Patient-entered reflection · included in this fictional sharing preview</p>
                  </>
                ) : (
                  <div className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">No reflection was supplied for this selected date.</div>
                )}
                <Button type="button" variant="outline" size="sm" className="w-full justify-between" onClick={() => {
                  const currentIndex = visibleEntries.findIndex((entry) => entry.date === activeEntry.date);
                  setSelectedDate(visibleEntries[(currentIndex + 1) % visibleEntries.length].date);
                }}>
                  Browse next supplied date <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          </aside>
        </section>

        <section className="grid gap-4 rounded-xl border border-accent bg-[#f3eee4] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#8a7057]" />
            <p className="text-xs leading-5 text-[#655e53]"><strong className="font-semibold">Reading this preview.</strong> Patient-reported ratings and personal words only. This fictional view does not provide a diagnosis, treatment recommendation, or claim that a routine caused a change.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={14} />No real records or access</div>
        </section>

        <section aria-label="Rating scale" className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-sm font-semibold">How to read the ratings</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Each value is the patient’s own response for that date. A 0 is shown only where no symptom value was supplied.</p></div>
            <div className="flex flex-wrap gap-2">
              {[
                ["0", "Not supplied"],
                ["1", "Not noticeable"],
                ["2", "Less noticeable"],
                ["3", "Noticeable"],
                ["4", "Quite noticeable"],
                ["5", "More noticeable"],
              ].map(([value, label]) => (
                <span key={value} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-[11px] text-secondary-foreground"><strong className="text-foreground">{value}</strong>{label}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
