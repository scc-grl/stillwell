import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  NotebookPen,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

type ExampleEntry = {
  date: string;
  responses: string;
  reflection?: boolean;
};

const exampleEntries: ExampleEntry[] = [
  { date: "2026-09-15", responses: "6 responses recorded" },
  { date: "2026-09-27", responses: "Reflection saved", reflection: true },
  { date: "2026-10-06", responses: "6 responses recorded" },
  { date: "2026-10-13", responses: "Reflection saved", reflection: true },
  { date: "2026-10-26", responses: "5 of 6 recorded" },
];

const symptomExamples = [
  { label: "Headache", value: "Less noticeable", filled: 2 },
  { label: "Fatigue", value: "Not noticeable", filled: 1 },
  { label: "Fog", value: "Less noticeable", filled: 2 },
  { label: "Sleep", value: "Noticeable", filled: 3 },
  { label: "Mood", value: "Less noticeable", filled: 2 },
  { label: "Light", value: "Not recorded", filled: 0 },
];

const scaleLabels = [
  "Not noticeable",
  "Less noticeable",
  "Noticeable",
  "More noticeable",
];

function dateFromKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(dateFromKey(date));
}

export function JournalDatebookDemo() {
  const [period, setPeriod] = useState<"30" | "all">("30");
  const [selectedDate, setSelectedDate] = useState("2026-10-26");
  const recentEntries = exampleEntries.slice(-4);
  const visibleEntries = period === "30" ? recentEntries : exampleEntries;
  const activeEntry =
    visibleEntries.find((entry) => entry.date === selectedDate) ??
    visibleEntries[visibleEntries.length - 1];
  const selectedIndex = visibleEntries.findIndex(
    (entry) => entry.date === activeEntry?.date,
  );
  const monthGroups = visibleEntries.reduce<
    { month: string; entries: ExampleEntry[] }[]
  >((groups, entry) => {
    const month = formatDate(entry.date, { month: "long", year: "numeric" });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.month === month) lastGroup.entries.push(entry);
    else groups.push({ month, entries: [entry] });
    return groups;
  }, []);

  if (!activeEntry) return null;

  return (
    <div className="overflow-hidden rounded-[calc(var(--radius)*1.5)] border bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              className="size-9 shrink-0"
              src={`${import.meta.env.BASE_URL}brand/stillwell-mark.svg`}
              alt=""
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-serif text-base font-semibold leading-tight">
                stillwell
              </p>
              <p className="text-xs text-muted-foreground">
                Patient workspace · design preview
              </p>
            </div>
          </div>
          <nav
            className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 sm:flex"
            aria-label="Patient workspace preview"
          >
            <Button type="button" variant="ghost" size="sm">
              Dashboard
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-current="page"
            >
              Journal
            </Button>
            <Button type="button" variant="ghost" size="sm">
              Account
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-px w-6 bg-primary" aria-hidden="true" />
            Your private journal · design preview
          </p>
          <h1 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
            Your past check-ins
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Revisit the days you chose to record. No values are filled in between
            entries.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            Illustrative entries only · not connected to records
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit overflow-hidden">
            <CardHeader className="gap-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Journal index
                  </p>
                  <CardTitle className="mt-1 font-serif text-2xl font-medium">
                    Choose a day
                  </CardTitle>
                </div>
                <span
                  className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"
                  aria-hidden="true"
                >
                  <CalendarDays className="size-5" />
                </span>
              </div>
              <div
                className="flex gap-1 rounded-full bg-muted p-1"
                aria-label="Filter journal dates"
              >
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 flex-1"
                  variant={period === "30" ? "secondary" : "ghost"}
                  aria-pressed={period === "30"}
                  onClick={() => {
                    setPeriod("30");
                    if (!recentEntries.some((entry) => entry.date === selectedDate)) {
                      setSelectedDate(recentEntries[recentEntries.length - 1].date);
                    }
                  }}
                >
                  30 days
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 flex-1"
                  variant={period === "all" ? "secondary" : "ghost"}
                  aria-pressed={period === "all"}
                  onClick={() => setPeriod("all")}
                >
                  All dates
                </Button>
              </div>
              <CardDescription className="text-xs leading-5">
                Each entry opens one day of your recorded responses and words.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {monthGroups.map((group) => (
                <section key={group.month} aria-label={group.month}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.month}
                  </p>
                  <div className="space-y-2">
                    {group.entries.map((entry) => {
                      const isSelected = entry.date === activeEntry.date;
                      return (
                        <Button
                          key={entry.date}
                          type="button"
                          variant={isSelected ? "secondary" : "ghost"}
                          className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
                          aria-current={isSelected ? "date" : undefined}
                          onClick={() => setSelectedDate(entry.date)}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <span className="text-xs uppercase leading-none">
                              {formatDate(entry.date, { weekday: "short" })}
                            </span>
                            <span className="mt-1 text-lg font-semibold leading-none">
                              {Number(entry.date.split("-")[2])}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">
                              {formatDate(entry.date, { month: "short", day: "numeric" })}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {entry.responses}
                            </span>
                          </span>
                          {entry.reflection ? (
                            <NotebookPen
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-label="Reflection available"
                            />
                          ) : null}
                          {isSelected ? (
                            <Check
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                        </Button>
                      );
                    })}
                  </div>
                </section>
              ))}
              <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                <CircleHelp
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  Dates appear only when a check-in was saved. No days or values
                  are filled in between entries.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-4 border-b border-border bg-card pb-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Daily check-in
                  </p>
                  <CardTitle className="mt-1 font-serif text-2xl font-medium sm:text-3xl">
                    {formatDate(activeEntry.date, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Illustrative entry · fictional preview
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous saved check-in"
                    disabled={selectedIndex <= 0}
                    onClick={() =>
                      setSelectedDate(visibleEntries[selectedIndex - 1].date)
                    }
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next saved check-in"
                    disabled={selectedIndex >= visibleEntries.length - 1}
                    onClick={() =>
                      setSelectedDate(visibleEntries[selectedIndex + 1].date)
                    }
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Symptom check-in</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Four patient-reported choices, shown as words.
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-secondary-foreground">
                    5 of 6 recorded
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {symptomExamples.map((symptom) => (
                    <div
                      key={symptom.label}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <span
                            className="size-2.5 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                          {symptom.label}
                        </span>
                        <span
                          className={`text-right text-sm font-medium ${
                            symptom.value === "Not recorded"
                              ? "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                              : ""
                          }`}
                        >
                          {symptom.value}
                        </span>
                      </div>
                      <div
                        className="mt-3 flex gap-1.5"
                        role="img"
                        aria-label={`${symptom.label}: ${symptom.value}`}
                      >
                        {scaleLabels.map((label, index) => (
                          <span
                            key={label}
                            className={`h-2.5 flex-1 rounded-full ${
                              index < symptom.filled ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted-foreground">
                        <span>Not noticeable</span>
                        <span>More noticeable</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
                  <CircleHelp
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    An unanswered item stays blank as “Not recorded.”
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your note
                </p>
                <CardTitle className="font-serif text-xl font-medium">
                  A few words for this day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  No note was recorded for this illustrative day.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
