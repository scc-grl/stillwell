import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { overallChoices, type CheckInSymptomName } from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { DemoPatientNavigation } from "@/components/demo-intake/DemoPatientNavigation";
import { DemoJournalEntry } from "@/components/demo-intake/DemoJournalEntry";
import {
  makeEmptyDemoEntry,
  MAYA_DEMO_DATE,
  MAYA_DEMO_DATE_LABEL,
  type DemoEntry,
  type MayaDemoState,
} from "@/components/demo-intake/demo-patient-data";

export function DemoPatientJournal({
  state,
  onNavigate,
  onEntryChange,
  onEntrySave,
  onTrackedSymptomsChange,
}: {
  state: MayaDemoState;
  onNavigate: (view: "dashboard" | "journal") => void;
  onEntryChange: (entry: DemoEntry) => void;
  onEntrySave: (entry: DemoEntry) => void;
  onTrackedSymptomsChange: (names: CheckInSymptomName[]) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(MAYA_DEMO_DATE);
  const [showAllDates, setShowAllDates] = useState(false);
  const pastDates = useMemo(
    () => state.entries.filter((entry) => entry.date < MAYA_DEMO_DATE && entry.saved).map((entry) => entry.date).sort((a, b) => b.localeCompare(a)),
    [state.entries],
  );
  const dates = useMemo(
    () => [...pastDates, MAYA_DEMO_DATE].sort((left, right) => left.localeCompare(right)),
    [pastDates],
  );
  const activeEntry = state.entries.find((entry) => entry.date === selectedDate) ?? makeEmptyDemoEntry(selectedDate);

  function selectDate(date: string) {
    setSelectedDate(date);
  }

  function saveActiveEntry() {
    onEntrySave({ ...activeEntry, saved: true });
  }

  return (
    <section className="space-y-6" data-testid="demo-journal">
      <DemoPatientNavigation section="journal" onNavigate={onNavigate} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pt-5">
        <header className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
            <span className="h-px w-6 bg-primary/50" aria-hidden="true" />{MAYA_DEMO_DATE_LABEL}
          </p>
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">How is today?</h1>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-3">
          <Card className="order-2 h-fit space-y-4 p-5 sm:p-6 lg:order-1 lg:col-start-1 lg:row-start-1" aria-labelledby="demo-past-entries-heading">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1"><h2 id="demo-past-entries-heading" className="font-serif text-2xl font-medium">Past entries</h2></div>
              <Button type="button" variant="link" className="min-h-11 px-1" onClick={() => setShowAllDates((current) => !current)} data-testid="button-demo-see-all-dates">
                {showAllDates ? "Show recent" : "See all dates"}
              </Button>
            </div>
            {pastDates.length === 0 ? (
              <div className="rounded-xl bg-secondary/50 px-4 py-6 text-center">
                <p className="text-sm font-medium">Your history starts when you do.</p>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">Previous days appear after you choose to save them. Today is ready here.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pastDates.map((date) => {
                  const entry = state.entries.find((item) => item.date === date)!;
                  const chosen = selectedDate === date;
                  const overall = overallChoices.find((choice) => choice.value === entry.overall)?.label ?? "Entry saved";
                  const day = new Date(`${date}T12:00:00`);
                  return <Button
                    key={date}
                    type="button"
                    variant={chosen ? "secondary" : "ghost"}
                    className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal text-left"
                    aria-current={chosen ? "date" : undefined}
                    onClick={() => selectDate(date)}
                    data-testid={`button-demo-past-date-${date}`}
                  >
                    <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-foreground">
                      <span className="text-xs uppercase leading-none">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</span>
                      <span className="mt-1 text-lg font-semibold leading-none">{Number(date.slice(-2))}</span>
                    </span>
                    <span><span className="block text-sm font-semibold">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day)}</span><span className="block text-sm text-muted-foreground">{overall}</span></span>
                  </Button>;
                })}
              </div>
            )}
            {showAllDates && pastDates.length > 0 && <p role="status" className="text-xs text-muted-foreground" data-testid="status-demo-all-dates">
              Showing all {pastDates.length} available sample dates.
            </p>}
            <p className="border-t border-border pt-3 text-sm leading-5 text-muted-foreground">Only days you recorded. Nothing is filled in.</p>
          </Card>

          <div className="order-1 min-w-0 lg:order-2 lg:col-span-2 lg:col-start-2 lg:row-start-1">
            <DemoJournalEntry
              key={selectedDate}
              entry={activeEntry}
              trackedSymptoms={state.trackedSymptoms}
              dates={dates}
              onSelectDate={selectDate}
              onBackToToday={() => selectDate(MAYA_DEMO_DATE)}
              onChange={onEntryChange}
              onSave={saveActiveEntry}
              onTrackedSymptomsChange={onTrackedSymptomsChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
