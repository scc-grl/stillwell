import { useState } from "react";
import { ArrowRight, CircleAlert, Pencil, Save } from "lucide-react";
import { checkInSymptoms, type CheckInSymptomName } from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { PatientProgressChart } from "@/components/PatientProgressChart";
import { DemoPatientNavigation } from "@/components/demo-intake/DemoPatientNavigation";
import {
  MAYA_DEMO_DATE,
  MAYA_DEMO_DATE_LABEL,
  type DemoEntry,
  type DemoRoutine,
  type MayaDemoState,
} from "@/components/demo-intake/demo-patient-data";

function chartLogs(state: MayaDemoState): Parameters<typeof PatientProgressChart>[0]["logs"] {
  return state.entries.map((entry) => ({
    date: entry.date,
    symptoms: [],
    dietStatus: "not_planned",
    dietNote: "",
    exerciseStatus: "not_planned",
    exerciseNote: "",
    meditationStatus: "not_planned",
    meditationMinutes: 0,
    meditationNote: "",
    note: entry.note,
    dailyCheckIn: {
      overallFeeling: entry.overall,
      worseWithActivity: null,
      selectedSymptoms: state.trackedSymptoms,
      summary: entry.note,
      symptoms: checkInSymptoms.map(({ name }) => {
        const rating = entry.symptoms[name];
        return {
          name,
          status: rating == null ? "not_recorded" : "recorded",
          rating: rating ?? null,
        };
      }),
    },
    sleep: entry.sleep,
    updatedAt: `${entry.date}T12:00:00.000Z`,
  }));
}

export function DemoPatientDashboard({
  state,
  onNavigate,
  onRoutineChange,
  onTrackedSymptomsChange,
}: {
  state: MayaDemoState;
  onNavigate: (view: "dashboard" | "journal") => void;
  onRoutineChange: (routine: DemoRoutine[]) => void;
  onTrackedSymptomsChange: (names: CheckInSymptomName[]) => void;
}) {
  const [routineEditing, setRoutineEditing] = useState(false);
  const [routineDraft, setRoutineDraft] = useState<DemoRoutine[]>(state.routine);
  const [routineMessage, setRoutineMessage] = useState("");
  const today = state.entries.find((entry) => entry.date === MAYA_DEMO_DATE) as DemoEntry;

  function toggleRoutine(id: DemoRoutine["id"]) {
    setRoutineDraft((items) => items.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function saveRoutine() {
    onRoutineChange(routineDraft);
    setRoutineEditing(false);
    setRoutineMessage("Your routine example is updated for this demo.");
  }

  function cancelRoutine() {
    setRoutineDraft(state.routine);
    setRoutineEditing(false);
  }

  return (
    <section className="space-y-6" data-testid="demo-dashboard">
      <DemoPatientNavigation section="dashboard" onNavigate={onNavigate} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pt-5">
        <section className="grid gap-5 lg:grid-cols-2" aria-label="Dashboard overview">
          <div className="flex min-h-56 flex-col justify-between gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Your space, your pace</p>
              <h1 className="max-w-xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Make room for what today is.</h1>
              <p className="max-w-xl text-sm leading-6 opacity-90">A personal journal for noticing patterns and choosing routines that fit your day.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm opacity-80">{MAYA_DEMO_DATE_LABEL}</p>
              <Button type="button" variant="secondary" onClick={() => onNavigate("journal")} data-testid="button-demo-todays-check-in">
                Today’s check-in <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
          <PatientProgressChart logs={chartLogs(state)} today={MAYA_DEMO_DATE} />
        </section>

        <Card className="flex gap-3 border-accent bg-accent/30 p-4 text-sm leading-6" data-testid="demo-dashboard-safety-note">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-accent-foreground" aria-hidden="true" />
          <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
        </Card>

        <details className="border-b border-border" data-testid="demo-dashboard-symptom-settings">
          <summary className="flex min-h-12 cursor-pointer items-center py-3 text-sm font-semibold">Journal settings · symptoms to track</summary>
          <div className="space-y-2 pb-4">
            <p className="text-sm leading-6 text-muted-foreground">Choose which of Maya’s sample symptoms appear in her journal.</p>
            {checkInSymptoms.map((symptom) => <label key={symptom.name} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted/60">
              <Checkbox
                checked={state.trackedSymptoms.includes(symptom.name)}
                onCheckedChange={() => onTrackedSymptomsChange(state.trackedSymptoms.includes(symptom.name)
                  ? state.trackedSymptoms.filter((name) => name !== symptom.name)
                  : [...state.trackedSymptoms, symptom.name])}
                aria-label={symptom.label}
                data-testid={`checkbox-demo-track-${symptom.name}`}
              />
              <span className="text-sm">{symptom.name === "light" ? "Light sensitivity" : symptom.label}</span>
            </label>)}
          </div>
        </details>

        <Card className="space-y-5 p-5 sm:p-6" data-testid="demo-dashboard-routine">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care protocol</p>
              <h2 className="mt-2 font-serif text-2xl font-medium">With clinician support</h2>
            </div>
            {!routineEditing ? (
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setRoutineDraft(state.routine);
                setRoutineMessage("");
                setRoutineEditing(true);
              }} data-testid="button-demo-edit-routine">
                <Pencil aria-hidden="true" />Edit routine
              </Button>
            ) : (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">Demo example</span>
            )}
          </div>
          <div className="rounded-xl border-2 border-dashed border-primary/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <strong className="text-sm">From your intake · Stage 2 of 6 · Light to moderate activity</strong>
              <span className="rounded-full border border-primary/40 bg-secondary px-3 py-1 text-xs text-secondary-foreground">Fictional example</span>
            </div>
            <div className="mt-3 flex gap-1.5" role="img" aria-label="Stage 2 of 6">
              {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index < 2 ? "bg-primary" : "bg-muted"}`} />)}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Easy walking or a stationary bike; study in short blocks. Fictional example: moved up on day 17 with Ray’s okay.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.routine.filter((item) => item.selected).map((item) => <span key={item.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{item.title}</span>)}
          </div>
          <ol className="space-y-3" aria-label="Your chosen routine">
            {state.routine.filter((item) => item.selected).map((item, index) => <li key={item.id} className="rounded-xl bg-secondary p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{index + 1}. {item.title}</h3>
                <span className="text-xs text-muted-foreground">Logged: {item.done ? "Done" : "Not done"}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </li>)}
          </ol>
          <p className="text-xs leading-5 text-muted-foreground">Bring these reflections to your clinician to review together. Adapt or skip any routine; use the separate activity log to document what happened.</p>
          {routineEditing && <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm leading-6 text-muted-foreground">Choose what you want to keep in this sample routine. These are reflections, not treatment instructions.</p>
            <div className="space-y-2">
              {routineDraft.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/60">
                <Checkbox checked={item.selected} onCheckedChange={() => toggleRoutine(item.id)} aria-label={item.title} data-testid={`checkbox-demo-routine-${item.id}`} />
                <span className="text-sm font-medium">{item.title}</span>
              </label>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveRoutine} data-testid="button-demo-save-routine"><Save aria-hidden="true" />Save routine</Button>
              <Button type="button" variant="outline" onClick={cancelRoutine} data-testid="button-demo-cancel-routine">Cancel</Button>
            </div>
          </div>}
          {routineMessage && <p role="status" className="text-sm text-muted-foreground" data-testid="status-demo-routine">{routineMessage}</p>}
        </Card>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>No streaks. No prescribed progression.</span>
          <span>Privacy &amp; data controls are not connected in this demo.</span>
        </footer>
      </div>
      <span className="sr-only" data-testid="demo-dashboard-day-28">Day 28 sample · {today.overall}</span>
    </section>
  );
}
