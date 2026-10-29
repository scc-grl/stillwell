import { useState } from "react";
import { ArrowRight, Check, LockKeyhole, Plus, PencilLine } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { FOUR_LEVELS, STAGES, type AnswerField, type Symptom } from "./demo-data";
import { CareBoundary } from "./StoryScreens";

export function SummaryScreen({
  fields,
  setFields,
  symptoms,
  setSymptoms,
  onContinue,
}: {
  fields: AnswerField[];
  setFields: (fields: AnswerField[]) => void;
  symptoms: Symptom[];
  setSymptoms: (symptoms: Symptom[]) => void;
  onContinue: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingSymptom, setEditingSymptom] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const updateField = (label: string) => {
    setFields(fields.map((field) => field.label === label ? { ...field, quote: draft.trim() ? `“${draft.trim()}”` : "", uncertain: false } : field));
    setEditingField(null);
  };
  const updateSymptom = (name: Symptom["name"], updates: Partial<Symptom>) => {
    setSymptoms(symptoms.map((symptom) => symptom.name === name ? { ...symptom, ...updates } : symptom));
  };

  return (
    <>
      <header className="mb-7 space-y-3">
        <p className="eyebrow">Part 1 of 2 · Your answers</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Summary</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">Your own words are beside each answer. Change anything that isn't right.</p>
        <p className="text-sm text-muted-foreground">Only details found in your story or answers you add are shown. Missing details stay unrecorded.</p>
      </header>

      <div className="space-y-5">
        <Card className="p-5 sm:p-7" data-testid="summary-injury-card">
          <h2 className="display mb-5 text-2xl font-medium">About the injury</h2>
          <dl className="divide-y divide-border">
            {fields.map((field, index) => {
              const present = Boolean(field.quote);
              const isEditing = editingField === field.label;
              return (
                <div key={field.label} className="grid gap-3 py-4 sm:grid-cols-[minmax(10rem,0.7fr)_1.3fr_auto] sm:items-center" data-testid={`answer-field-${index + 1}`}>
                  <dt className="text-sm font-semibold">{field.label}</dt>
                <dd className="text-sm leading-6 text-muted-foreground">{present ? field.quote : "Not mentioned"}{field.uncertain && <span className="ml-2 text-xs font-medium text-accent-foreground">Please check</span>}</dd>
                  {isEditing ? (
                    <div className="flex gap-2 sm:col-span-3 sm:justify-end">
                      <Input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`${field.label} answer`} className="min-h-11" data-testid={`input-edit-${index + 1}`} />
                      <Button type="button" variant="secondary" className="min-h-11" onClick={() => updateField(field.label)} data-testid={`button-save-field-${index + 1}`}>Save</Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 justify-self-start px-3"
                      onClick={() => { setDraft(field.quote.replace(/^“|”$/g, "")); setEditingField(field.label); }}
                      data-testid={`${present ? "button-change-field" : "button-add-field"}-${index + 1}`}
                    >
                      {present ? <><PencilLine aria-hidden="true" />Change</> : <><Plus aria-hidden="true" />Add</>}
                    </Button>
                  )}
                </div>
              );
            })}
          </dl>
        </Card>

        <Card className="p-5 sm:p-7" data-testid="summary-symptoms-card">
          <div className="mb-5">
            <h2 className="display text-2xl font-medium">Symptoms</h2>
            <p className="mt-2 text-sm text-muted-foreground">A four-step scale. The words are shown alongside each level.</p>
          </div>
          <div className="space-y-4">
            {symptoms.map((symptom, index) => {
              const present = symptom.level !== null;
              const hasQuote = Boolean(symptom.quote);
              const isEditing = editingSymptom === symptom.name;
              return (
                <section key={symptom.name} className="rounded-xl border border-border p-4" data-testid={`symptom-${index + 1}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{symptom.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {hasQuote ? symptom.quote : <span className="italic">{present ? "No quote added" : "Not recorded"}</span>}
                        {hasQuote && !present && <span className="ml-2 italic">Not recorded</span>}
                        {symptom.uncertain && <span className="ml-2 text-xs font-semibold text-accent-foreground">Please check</span>}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 px-3"
                      onClick={() => {
                        setDraft(symptom.quote.replace(/^“|”$/g, ""));
                        setEditingSymptom(isEditing ? null : symptom.name);
                      }}
                      data-testid={`${hasQuote || present ? "button-change-symptom" : "button-add-symptom"}-${index + 1}`}
                    >
                      {hasQuote || present ? <><PencilLine aria-hidden="true" />Change</> : <><Plus aria-hidden="true" />Add</>}
                    </Button>
                  </div>
                  {isEditing && (
                    <div className="mt-4 space-y-3">
                      <Input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        aria-label={`${symptom.name} direct quote`}
                        placeholder="Add a detail in your own words"
                        className="min-h-11"
                        data-testid={`input-symptom-quote-${index + 1}`}
                      />
                      <div className="flex flex-wrap gap-2" role="group" aria-label={`${symptom.name} level`}>
                        {FOUR_LEVELS.map((level, levelIndex) => (
                          <Button
                            key={level}
                            type="button"
                            variant={symptom.level === levelIndex ? "secondary" : "outline"}
                            aria-pressed={symptom.level === levelIndex}
                            className="min-h-11"
                            onClick={() => updateSymptom(symptom.name, { level: levelIndex, uncertain: false })}
                            data-testid={`button-level-${index + 1}-${levelIndex + 1}`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                        <Button type="button" variant="secondary" className="min-h-11" onClick={() => {
                        updateSymptom(symptom.name, { quote: draft.trim() ? `“${draft.trim()}”` : "" });
                        setEditingSymptom(null);
                        }} data-testid={`button-save-symptom-${index + 1}`}>Done</Button>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2" aria-label={`${symptom.label}: ${present ? FOUR_LEVELS[symptom.level ?? 0] : "Not recorded"}`}>
                    {FOUR_LEVELS.map((level, levelIndex) => (
                      <span key={level} className={`rounded-full px-3 py-1.5 text-xs ${symptom.level === levelIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} data-testid={`level-label-${index + 1}-${levelIndex + 1}`}>
                        {level}
                      </span>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground" data-testid="journal-symptom-note">Your journal tracks all six from day one. Turn any off in your journal settings.</p>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="button" className="min-h-11" onClick={onContinue} data-testid="button-summary-confirm">This looks right <ArrowRight aria-hidden="true" /></Button>
      </div>
      <CareBoundary />
    </>
  );
}

export function RoadmapScreen({
  stage,
  stageNote,
  needsDoctor,
  reasons,
  onStartJournal,
}: {
  stage: { stage: 1 | 2 | 3; name: string; amsterdamStep: 1 | 2 | 3; reasons: { rule: string; text: string }[] } | null;
  stageNote: string | null;
  needsDoctor: boolean;
  reasons: { rule: string; text: string }[];
  onStartJournal: () => void;
}) {
  const currentStage = stage?.stage ?? null;
  const doctorCopy: Record<string, string> = {
    T1: "Your injury was less than 48 hours ago. Stillwell suggests checking in with a doctor.",
    D1: "You haven't clearly said you've seen a doctor since this injury. Stillwell suggests checking in with one.",
    D2: "You said symptoms are getting worse. A doctor should see you before choosing a starting stage.",
    D3: "Several symptoms are Noticeable or above. Stillwell suggests checking in with a doctor.",
    D4: "You described symptoms lasting more than four weeks. Stillwell suggests checking in with a doctor.",
  };
  return (
    <>
      <header className="mb-7 space-y-3">
        <p className="eyebrow">Part 2 of 2 · Protocol roadmap</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Where you might be today</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Based on what you've shared, Stillwell compared your details with the current international concussion consensus (Amsterdam 2022), the latest guidance on returning to activity.
          {stage ? <> It suggests starting at <strong className="text-foreground">Stage {stage.stage}, {stage.name}</strong>.</> : stageNote ? <> No starting stage was suggested. {stageNote}</> : " A starting stage wasn't available from these details."}
        </p>
      </header>

      {stage ? <Card className="mb-5 border-primary/30 bg-secondary p-5 sm:p-7" data-testid="suggested-stage">
        <p className="text-sm text-muted-foreground">Suggested starting stage</p>
        <p className="mt-2 text-xl font-semibold" data-testid="suggested-stage-name"><strong>Stage {stage.stage} · {stage.name}</strong></p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Based on the details Stillwell read and the fixed rules. This is a suggestion, not a diagnosis or prescription.</p>
      </Card> : <Card className="mb-5 border-accent bg-accent/30 p-5 sm:p-7" data-testid="no-suggested-stage">
        <p className="font-semibold">No starting stage suggested</p>
        <p className="mt-2 text-sm leading-6">{stageNote ?? "A clinician should help with the next step."}</p>
      </Card>}

      <div className="grid gap-3" aria-label="Six stages of the roadmap">
        {STAGES.map((stage, index) => {
          const number = index + 1;
          const locked = number >= 4;
          const selected = number === currentStage;
          const gates = ["Everyday tasks that don't make symptoms worse; short walks · Amsterdam step 1", "Easy walking or a stationary bike; study in short blocks · Amsterdam step 2", "Solo exercise without head-impact risk · Amsterdam step 3", "Opens when symptoms are gone, even with exercise", "Opens with a clinician's okay", "Opens with a clinician's okay"];
          return (
            <Card key={stage} className={`relative flex items-center gap-4 p-4 sm:px-5 ${selected ? "border-2 border-primary bg-secondary" : ""} ${locked ? "text-muted-foreground" : ""}`} data-testid={`roadmap-stage-${number}`} aria-current={selected ? "step" : undefined}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{selected ? <Check className="size-4" aria-label={`You start here, Stage ${number}`} /> : number}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage {number}{selected ? " · You start here" : ""}</p>
                <h2 className="mt-1 text-base font-semibold">{stage}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{gates[index]}</p>
              </div>
              {locked && <LockKeyhole className="size-5 shrink-0" aria-label="Locked stage" />}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {needsDoctor && (
          <Card className="space-y-2 p-5" data-testid="also-doctor-card">
            <h2 className="display text-xl font-medium">Also worth a doctor's visit</h2>
            <p className="text-sm leading-6 text-muted-foreground">{[...new Set(reasons.flatMap((reason) => doctorCopy[reason.rule] ? [doctorCopy[reason.rule]] : []))].join(" ") || "Stillwell suggests checking in with a doctor."}</p>
          </Card>
        )}
        <Card className="space-y-2 p-5" data-testid="path-card">
          <h2 className="display text-xl font-medium">A path, not a dark room</h2>
          <p className="text-sm leading-6 text-muted-foreground">The consensus suggests a day or two of relative rest, then a gradual return to activity. Give each stage at least a day. A small rise in symptoms that settles within an hour is okay.</p>
        </Card>
      </div>

      <p className="mt-5 rounded-lg border border-border p-4 text-sm leading-6 text-muted-foreground" data-testid="roadmap-view-only">Your starting stage can't be changed here yet. A clinician can adjust it with you.</p>
      <div className="mt-6 flex justify-end">
        <Button type="button" className="min-h-11" onClick={onStartJournal} data-testid="button-start-journal">Start my journal <ArrowRight aria-hidden="true" /></Button>
      </div>
      <CareBoundary />
    </>
  );
}
