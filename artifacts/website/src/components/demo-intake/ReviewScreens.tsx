import { useState } from "react";
import { ArrowRight, Check, CircleHelp, LockKeyhole, Plus, PencilLine } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { CARE_BOUNDARY, FOUR_LEVELS, STAGES, type AnswerField, type Symptom } from "./demo-data";

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
    setFields(fields.map((field) => field.label === label ? { ...field, quote: draft.trim() ? `“${draft.trim()}”` : "" } : field));
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
        <p className="text-xs text-muted-foreground">Fictional sample details shown for this demo.</p>
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
                  <dd className="text-sm leading-6 text-muted-foreground">{present ? field.quote : "Not mentioned"}{field.uncertain && <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-accent-foreground"><CircleHelp className="size-3" />Please check</span>}</dd>
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
                      <h3 className="font-semibold">{symptom.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {hasQuote ? symptom.quote : <span className="italic">Not recorded</span>}
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
                      {present ? <><PencilLine aria-hidden="true" />Change</> : <><Plus aria-hidden="true" />Add</>}
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
                            onClick={() => updateSymptom(symptom.name, { level: levelIndex })}
                            data-testid={`button-level-${index + 1}-${levelIndex + 1}`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                      <Button type="button" variant="secondary" className="min-h-11" onClick={() => {
                        updateSymptom(symptom.name, { quote: draft.trim() ? `“${draft.trim()}”` : "" });
                        setEditingSymptom(null);
                      }} data-testid={`button-save-symptom-${index + 1}`}>Save</Button>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2" aria-label={`${symptom.name}: ${present ? FOUR_LEVELS[symptom.level ?? 0] : "Not recorded"}`}>
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
      <p className="mt-10 border-t border-border pt-5 text-xs leading-5 text-muted-foreground" data-testid="care-boundary">{CARE_BOUNDARY}</p>
    </>
  );
}

export function RoadmapScreen({
  symptoms,
  onStartJournal,
}: {
  symptoms: Symptom[];
  onStartJournal: () => void;
}) {
  const noticeableCount = symptoms.filter((symptom) => symptom.level !== null && symptom.level >= 2).length;
  return (
    <>
      <header className="mb-7 space-y-3">
        <p className="eyebrow">Part 2 of 2 · Protocol roadmap</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Where you might be today</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">Based on what you've shared, Stillwell compared your details with the current international concussion consensus (Amsterdam 2022), the latest guidance on returning to activity.</p>
      </header>

      <Card className="mb-5 border-primary/30 bg-secondary p-5 sm:p-7" data-testid="suggested-stage">
        <p className="text-sm text-muted-foreground">Suggested starting stage</p>
        <p className="mt-2 text-xl font-semibold" data-testid="suggested-stage-name"><strong>Stage 1 · Symptom-limited daily life</strong></p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This is a fictional illustration based on the sample story, not a diagnosis or prescription.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2" aria-label="Six stages of the roadmap">
        {STAGES.map((stage, index) => {
          const number = index + 1;
          const locked = number >= 4;
          return (
            <Card key={stage} className={`relative min-h-36 p-5 ${number === 1 ? "border-primary bg-secondary" : ""} ${locked ? "opacity-80" : ""}`} data-testid={`roadmap-stage-${number}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage {number}</p>
                  <h2 className="mt-2 text-lg font-semibold">{stage}</h2>
                </div>
                {locked && <LockKeyhole className="size-5 text-muted-foreground" aria-label="Locked stage" />}
              </div>
              {number === 1 && <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary" data-testid="you-start-here"><Check className="size-4" />You start here</p>}
              {number === 4 && <p className="mt-4 text-sm leading-5 text-muted-foreground">Opens when symptoms are gone even with exercise.</p>}
              {(number === 5 || number === 6) && <p className="mt-4 text-sm leading-5 text-muted-foreground">Opens with a clinician's okay.</p>}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {noticeableCount >= 3 && (
          <Card className="space-y-2 p-5" data-testid="also-doctor-card">
            <h2 className="display text-xl font-medium">Also worth a doctor's visit</h2>
            <p className="text-sm leading-6 text-muted-foreground">Several symptoms in this made-up story are marked Noticeable or above. This is an example summary, not a diagnosis.</p>
          </Card>
        )}
        <Card className="space-y-2 p-5" data-testid="path-card">
          <h2 className="display text-xl font-medium">A path, not a dark room</h2>
          <p className="text-sm leading-6 text-muted-foreground">The roadmap offers a view of stages and their gates. This made-up demo does not prescribe activity or replace a clinician.</p>
        </Card>
      </div>

      <p className="mt-5 rounded-lg border border-border p-4 text-sm leading-6 text-muted-foreground" data-testid="roadmap-view-only">Your starting stage can't be changed here yet. A clinician can adjust it with you.</p>
      <div className="mt-6 flex justify-end">
        <Button type="button" className="min-h-11" onClick={onStartJournal} data-testid="button-start-journal">Start my journal <ArrowRight aria-hidden="true" /></Button>
      </div>
      <p className="mt-10 border-t border-border pt-5 text-xs leading-5 text-muted-foreground" data-testid="care-boundary">{CARE_BOUNDARY}</p>
    </>
  );
}
