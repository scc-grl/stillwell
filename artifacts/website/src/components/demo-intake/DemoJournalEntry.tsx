import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import {
  checkInSymptoms,
  overallChoices,
  ratingChoices,
  type CheckInSymptomName,
} from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import {
  formatMayaDate,
  MAYA_DEMO_DATE,
  type DemoEntry,
  type DemoNap,
  type DemoRating,
  type DemoSleepQuality,
} from "@/components/demo-intake/demo-patient-data";

type OpenSection = "symptoms" | "sleep" | "note" | null;

function ChoiceButtons<T extends string | number>({
  choices,
  value,
  onChange,
  label,
}: {
  choices: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  label: string;
}) {
  return <div role="group" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {choices.map((choice) => {
      const active = value === choice.value;
      return <Button
        key={String(choice.value)}
        type="button"
        variant={active ? "secondary" : "outline"}
        className="min-h-12 justify-center whitespace-normal px-2 text-center"
        aria-pressed={active}
        onClick={() => onChange(active ? null : choice.value)}
      >
        {active && <Check aria-hidden="true" />}{choice.label}
      </Button>;
    })}
  </div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm">
    <span>{label}</span><span className={`text-muted-foreground ${value === "Not recorded" ? "italic" : ""}`}>{value}</span>
  </div>;
}

export function DemoJournalEntry({
  entry,
  trackedSymptoms,
  dates,
  onSelectDate,
  onBackToToday,
  onChange,
  onSave,
  onTrackedSymptomsChange,
}: {
  entry: DemoEntry;
  trackedSymptoms: CheckInSymptomName[];
  dates: string[];
  onSelectDate: (date: string) => void;
  onBackToToday: () => void;
  onChange: (entry: DemoEntry) => void;
  onSave: () => void;
  onTrackedSymptomsChange: (names: CheckInSymptomName[]) => void;
}) {
  const [editable, setEditable] = useState(entry.date === MAYA_DEMO_DATE && !entry.saved);
  const [openSection, setOpenSection] = useState<OpenSection>(editable ? "symptoms" : null);
  const [symptomDialogOpen, setSymptomDialogOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<CheckInSymptomName[]>([]);
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherNotePrompt, setOtherNotePrompt] = useState(false);
  const dateIndex = dates.indexOf(entry.date);
  const previousDate = dateIndex > 0 ? dates[dateIndex - 1] : undefined;
  const nextDate = dateIndex >= 0 && dateIndex < dates.length - 1 ? dates[dateIndex + 1] : undefined;
  const isToday = entry.date === MAYA_DEMO_DATE;
  const overallLabel = overallChoices.find((choice) => choice.value === entry.overall)?.label ?? "Not recorded";
  const symptomCount = trackedSymptoms.filter((name) => entry.symptoms[name] != null).length;
  const sleepSummary = [
    entry.sleep.hoursSlept == null ? "Not recorded" : `${entry.sleep.hoursSlept} h`,
    entry.sleep.quality ? `${entry.sleep.quality[0].toUpperCase()}${entry.sleep.quality.slice(1)}` : null,
  ].filter(Boolean).join(" · ");
  const addableSymptoms = checkInSymptoms.filter(({ name }) => !trackedSymptoms.includes(name));

  function updateEntry(update: Partial<DemoEntry>) {
    onChange({ ...entry, ...update });
  }

  function updateSymptom(name: CheckInSymptomName, rating: DemoRating | null) {
    updateEntry({ symptoms: { ...entry.symptoms, [name]: rating } });
  }

  function updateSleep(update: Partial<DemoEntry["sleep"]>) {
    updateEntry({ sleep: { ...entry.sleep, ...update } });
  }

  function saveNewSymptoms() {
    const next = [...new Set([...trackedSymptoms, ...selectedSymptoms])];
    onTrackedSymptomsChange(next);
    updateEntry({
      addedSymptoms: [...new Set([...entry.addedSymptoms, ...selectedSymptoms])],
      symptoms: {
        ...entry.symptoms,
        ...Object.fromEntries(selectedSymptoms.map((name) => [name, entry.symptoms[name] ?? null])) as Partial<DemoEntry["symptoms"]>,
      },
    });
    setSymptomDialogOpen(false);
    if (otherSelected) {
      setOpenSection("note");
      setOtherNotePrompt(true);
    }
  }

  function saveEntry() {
    onSave();
    setEditable(false);
  }

  const accordionButton = (id: Exclude<OpenSection, null>, title: string, summary: string) => (
    <Button
      type="button"
      variant="ghost"
      className="h-auto min-h-13 w-full justify-between px-0 text-left"
      aria-expanded={openSection === id}
      aria-controls={`demo-journal-${id}-content`}
      onClick={() => setOpenSection((current) => current === id ? null : id)}
      data-testid={`button-demo-journal-toggle-${id}`}
    >
      <span><span className="block text-base font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{summary}</span></span>
      <span aria-hidden="true" className="text-xl">{openSection === id ? "−" : "+"}</span>
    </Button>
  );

  return <Card className="min-w-0 space-y-5 p-5 sm:p-6" aria-label={`${isToday ? "Today" : "Past entry"} journal entry`} data-testid="demo-journal-entry">
    {isToday ? null : <Button type="button" variant="ghost" className="min-h-11 px-0" onClick={onBackToToday} data-testid="button-demo-back-today">
      <ArrowLeft aria-hidden="true" />Back to today
    </Button>}
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{isToday ? "Today" : "Past entry"}</p>
        <h2 className="mt-1 font-serif text-3xl font-medium">{formatMayaDate(entry.date)}</h2>
      </div>
      {isToday && !entry.saved && <span role="status" className="text-sm text-muted-foreground" data-testid="status-demo-draft-saved">Draft saved 8:42 AM</span>}
      {isToday && entry.saved && <span role="status" className="text-sm text-muted-foreground">Saved for today</span>}
    </div>

    {!isToday && <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" aria-label="Previous entry" disabled={!previousDate} onClick={() => previousDate && onSelectDate(previousDate)} data-testid="button-demo-previous-entry"><ArrowLeft aria-hidden="true" /></Button>
        <Button type="button" variant="outline" size="icon" aria-label="Next entry" disabled={!nextDate} onClick={() => nextDate && onSelectDate(nextDate)} data-testid="button-demo-next-entry"><ArrowRight aria-hidden="true" /></Button>
      </div>
    </div>}

    {!editable ? <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Your recorded responses · no interpretation added.</p>
      <Card className="space-y-4 p-4">
        <p className="font-semibold">Overall · {overallLabel}</p>
        {[...new Set([...trackedSymptoms, ...checkInSymptoms.filter(({ name }) => entry.symptoms[name] != null).map(({ name }) => name)])].map((name) => <SummaryLine
          key={name}
          label={checkInSymptoms.find((item) => item.name === name)?.label ?? name}
          value={entry.symptoms[name] == null ? "Not recorded" : ratingChoices.find((choice) => choice.value === entry.symptoms[name])?.label ?? "Not recorded"}
        />)}
        <div className="border-t border-border pt-3 text-sm">
          <p className="font-medium">Last night's sleep</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Hours slept</dt><dd>{entry.sleep.hoursSlept == null ? "Not recorded" : `${entry.sleep.hoursSlept} h`}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Sleep quality</dt><dd>{entry.sleep.quality ? `${entry.sleep.quality[0].toUpperCase()}${entry.sleep.quality.slice(1)}` : "Not recorded"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Times woke up</dt><dd>{entry.sleep.wakings == null ? "Not recorded" : entry.sleep.wakings === 0 ? "None" : entry.sleep.wakings >= 3 ? "3+" : "1–2"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Daytime nap</dt><dd>{entry.sleep.nap === "none" ? "None" : entry.sleep.nap === "under_30" ? "Short" : entry.sleep.nap === "30_or_more" ? "Long" : "Not recorded"}</dd></div>
          </dl>
        </div>
        <div className="border-t border-border pt-3 text-sm">
          <p className="font-medium">Note for yourself</p>
          <p className={`mt-1 whitespace-pre-wrap text-muted-foreground ${entry.note.trim() ? "" : "italic"}`}>{entry.note.trim() || "Not recorded"}</p>
        </div>
      </Card>
      <Button type="button" variant={isToday ? "outline" : "default"} onClick={() => setEditable(true)} data-testid={isToday ? "button-demo-edit-today" : "button-demo-edit-past"}>
        {isToday ? "Edit today's entry" : "Edit this day"}
      </Button>
    </div> : <>
      <div className="space-y-3">
        <div role="group" aria-label="Overall" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {overallChoices.map((choice) => {
            const active = entry.overall === choice.value;
            return <Button key={choice.value} type="button" variant={active ? "secondary" : "outline"} className="min-h-14 justify-center" aria-pressed={active} onClick={() => updateEntry({ overall: active ? null : choice.value })} data-testid={`demo-overall-${choice.value}`}>
              {active && <Check aria-hidden="true" />}{choice.label}
            </Button>;
          })}
        </div>
        <p className="text-sm leading-5 text-muted-foreground">One tap is a complete entry. Add more only if you have the energy.</p>
      </div>

      <Card className="divide-y divide-border p-0">
        <section className="p-4">
          {accordionButton("symptoms", "Symptoms", `${symptomCount} of ${trackedSymptoms.length} noted`)}
          {openSection === "symptoms" && <div id="demo-journal-symptoms-content" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-lg text-sm leading-5 text-muted-foreground">These are your own observations, not a diagnosis. Choose what feels useful to record.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setSelectedSymptoms([]);
                setOtherSelected(false);
                setSymptomDialogOpen(true);
              }} data-testid="button-demo-add-symptom"><Plus aria-hidden="true" />Something new today?</Button>
            </div>
            <Button type="button" variant="link" className="min-h-9 px-0" onClick={() => {
              setSelectedSymptoms([]);
              setOtherSelected(false);
              setSymptomDialogOpen(true);
            }} data-testid="button-demo-change-symptom-list">Change my list</Button>
            {trackedSymptoms.map((name) => {
              const symptom = checkInSymptoms.find((item) => item.name === name);
              return <div key={name} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-medium">{name === "light" ? "Light sensitivity" : symptom?.label ?? name}</p>
                  {entry.addedSymptoms.includes(name) && <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">New today</span>
                    <Button type="button" variant="ghost" className="min-h-11" aria-label={`Remove ${symptom?.label ?? name}`} onClick={() => {
                      onTrackedSymptomsChange(trackedSymptoms.filter((item) => item !== name));
                      const nextSymptoms = { ...entry.symptoms };
                      delete nextSymptoms[name];
                      updateEntry({ symptoms: nextSymptoms, addedSymptoms: entry.addedSymptoms.filter((item) => item !== name) });
                    }}>Remove</Button>
                  </div>}
                </div>
                <ChoiceButtons
                  label={symptom?.label ?? name}
                  choices={ratingChoices}
                  value={entry.symptoms[name] ?? null}
                  onChange={(rating) => updateSymptom(name, rating as DemoRating | null)}
                />
              </div>;
            })}
          </div>}
        </section>

        <section className="px-4 py-2">
          {accordionButton("sleep", "Last night's sleep", sleepSummary)}
          {openSection === "sleep" && <div id="demo-journal-sleep-content" className="mt-4 space-y-5 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Hours slept (optional)</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="icon" aria-label="Fewer hours" onClick={() => updateSleep({ hoursSlept: Math.max(0, (entry.sleep.hoursSlept ?? 0) - 0.5) })} data-testid="button-demo-sleep-less">−</Button>
                <output aria-live="polite" className="min-w-20 text-center text-lg font-semibold">{entry.sleep.hoursSlept == null ? "Not recorded" : `${entry.sleep.hoursSlept} h`}</output>
                <Button type="button" variant="outline" size="icon" aria-label="More hours" disabled={entry.sleep.hoursSlept != null && entry.sleep.hoursSlept >= 14} onClick={() => updateSleep({ hoursSlept: Math.min(14, (entry.sleep.hoursSlept ?? 0) + 0.5) })} data-testid="button-demo-sleep-more">+</Button>
                {entry.sleep.hoursSlept != null && <Button type="button" variant="ghost" onClick={() => updateSleep({ hoursSlept: null })} data-testid="button-demo-sleep-clear">Clear</Button>}
              </div>
              <p className="text-sm text-muted-foreground">Choose in half-hour steps, up to 14 hours.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sleep quality (optional)</p>
              <ChoiceButtons label="Sleep quality" choices={[
                { value: "poor" as const, label: "Poor" }, { value: "fair" as const, label: "Fair" },
                { value: "good" as const, label: "Good" },
              ]} value={entry.sleep.quality} onChange={(quality) => updateSleep({ quality: quality as DemoSleepQuality | null })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Times woke up (optional)</p>
              <ChoiceButtons label="Times woke up" choices={[{ value: 0, label: "None" }, { value: 2, label: "1–2" }, { value: 3, label: "3+" }]} value={entry.sleep.wakings === 1 ? 2 : entry.sleep.wakings} onChange={(wakings) => updateSleep({ wakings: wakings as DemoEntry["sleep"]["wakings"] })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Daytime nap (optional)</p>
              <ChoiceButtons label="Daytime nap" choices={[
                { value: "none" as const, label: "None" },
                { value: "under_30" as const, label: "Short" },
                { value: "30_or_more" as const, label: "Long" },
              ]} value={entry.sleep.nap} onChange={(nap) => updateSleep({ nap: nap as DemoNap | null })} />
            </div>
          </div>}
        </section>

        <section className="p-4">
          {accordionButton("note", "Note for yourself", entry.note.trim() || "Optional")}
          {openSection === "note" && <div id="demo-journal-note-content" className="mt-4 space-y-2">
            <label htmlFor="demo-journal-note" className="text-sm font-medium">Note for yourself (optional)</label>
            {otherNotePrompt && <p className="text-sm leading-5 text-muted-foreground">You chose Other. Describe it here in your own words.</p>}
            <Textarea id="demo-journal-note" value={entry.note} maxLength={500} placeholder="Other symptoms, anything else" onChange={(event) => updateEntry({ note: event.target.value.slice(0, 500) })} data-testid="textarea-demo-journal-note" />
            <p className="text-sm text-muted-foreground">{entry.note.length}/500</p>
          </div>}
        </section>
      </Card>

      <Card className="border-accent bg-accent/30 p-4 text-sm leading-6">
        <p>Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
      </Card>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Your draft saves as you go.</p>
        <Button type="button" className="min-h-14" disabled={!entry.overall} onClick={saveEntry} data-testid={isToday ? "button-demo-save-today" : "button-demo-save-past"}>
          {isToday ? "Save today's entry" : "Save this day"}<Check aria-hidden="true" />
        </Button>
        {!entry.overall && <p className="text-sm text-muted-foreground">Choose how this day feels to start your entry.</p>}
      </div>
    </>}

    <Dialog.Root open={symptomDialogOpen} onOpenChange={setSymptomDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <Dialog.Content className="fixed left-4 right-4 top-1/2 z-50 mx-auto grid max-h-96 max-w-lg -translate-y-1/2 gap-4 overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-lg font-semibold">Something new today?</Dialog.Title>
          <Dialog.Description className="text-sm leading-5 text-muted-foreground">Choose symptoms you want to add to today’s list. A new symptom is not a diagnosis. If a symptom is new, contact a clinician.</Dialog.Description>
          <div className="flex flex-wrap gap-2">
            {addableSymptoms.map(({ name, label }) => <Button
              key={name}
              type="button"
              variant={selectedSymptoms.includes(name) ? "secondary" : "outline"}
              aria-pressed={selectedSymptoms.includes(name)}
              onClick={() => setSelectedSymptoms((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
              data-testid={`button-demo-add-symptom-${name}`}
            >{label}</Button>)}
            <Button type="button" variant={otherSelected ? "secondary" : "outline"} aria-pressed={otherSelected} onClick={() => setOtherSelected((value) => !value)} data-testid="button-demo-add-symptom-other">Other</Button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSymptomDialogOpen(false)} data-testid="button-demo-cancel-add-symptom">Cancel</Button>
            <Button type="button" onClick={saveNewSymptoms} data-testid="button-demo-save-add-symptom">Save</Button>
          </div>
          <Dialog.Close asChild>
            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="Close symptom dialog">
              <X aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </Card>;
}
