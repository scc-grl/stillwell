import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  getGetRecoveryStagesQueryKey,
  useConsentRecoveryIntake,
  useGetRecoveryStages,
  useRunRecoveryIntake,
} from "@workspace/api-client-react";
import type { PatientIntakeResult, RecoveryStage } from "@workspace/api-client-react";
import { buildQuestions, INTAKE_CONSENT_VERSION, PLACEMENT_REASONS, STAGES, SYNTHETIC_INTAKE_SAMPLES } from "@workspace/intake-ai";
import type { Decision } from "@workspace/intake-ai";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { Brand } from "@/components/PublicSite";
import { BoundaryNotice, StageIndicator } from "@/components/SiteComponents";
import { CrisisScreen, EmergencyScreen, ReadingScreen } from "@/components/demo-intake/StoryScreens";

const ratings = Array.from({ length: 11 }, (_, value) => value);
const tapQuestionAnswers = [
  { label: "Yes", value: 1 },
  { label: "No", value: 0 },
  { label: "Not sure", value: 0.5 },
] as const;
type IntakeView = "samples" | "reading" | "summary" | "tap-questions" | "stage" | "doctor";
type IntakeOutcome = { data: PatientIntakeResult; decision: Decision };

function intakeOutcome(data: PatientIntakeResult): IntakeOutcome {
  return { data, decision: data.decision as Decision };
}

function storedStageName(stage: RecoveryStage | null | undefined) {
  if (!stage || !stage.syntheticOnly) return null;
  const stageNumber = Number(stage.stage);
  return Number.isInteger(stageNumber) ? STAGES[stageNumber as keyof typeof STAGES] ?? null : null;
}

export default function SyntheticIntakePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const consentMutation = useConsentRecoveryIntake();
  const runMutation = useRunRecoveryIntake();
  const stagesQuery = useGetRecoveryStages({
    query: { enabled: Boolean(consentMutation.data), queryKey: getGetRecoveryStagesQueryKey() },
  });
  const [agreed, setAgreed] = useState(false);
  const [sampleId, setSampleId] = useState<(typeof SYNTHETIC_INTAKE_SAMPLES)[number]["id"]>("maya");
  const [result, setResult] = useState<IntakeOutcome | null>(null);
  const [tapAnswers, setTapAnswers] = useState<Record<string, unknown>>({});
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState<IntakeView>("samples");
  const [editingSymptom, setEditingSymptom] = useState<string | null>(null);
  const consent = consentMutation.data;
  const selectedSample = SYNTHETIC_INTAKE_SAMPLES.find((sample) => sample.id === sampleId) ?? SYNTHETIC_INTAKE_SAMPLES[0];
  const tapQuestions = buildQuestions();
  const decision = result?.decision;
  const storedStage = result?.data.stage;
  const stageNumber = storedStage && storedStage.syntheticOnly ? Number(storedStage.stage) : null;
  const stageName = storedStageName(storedStage);

  function acceptConsent() {
    if (!agreed || consentMutation.isPending) return;
    setActionError("");
    consentMutation.mutate({ data: { consentAccepted: true, syntheticOnly: true } }, {
      onError: () => setActionError("We couldn’t save your preview consent. Nothing has been sent for AI review. Please try again."),
    });
  }

  function readSample(answered: Record<string, unknown> = {}, returnTo: IntakeView = view) {
    if (!consent || runMutation.isPending) return;
    setActionError("");
    setView("reading");
    runMutation.mutate({ data: { consentId: consent.id, sampleId, ...(Object.keys(answered).length ? { answered } : {}) } }, {
      onSuccess: (data) => {
        const next = intakeOutcome(data);
        setResult(next);
        setEditingSymptom(null);
        setView(next.decision.outcome === "start_journal" ? "summary"
          : next.decision.outcome === "use_tap_questions" ? "tap-questions"
            : next.decision.outcome === "find_doctor" ? "doctor" : returnTo);
        void queryClient.invalidateQueries({ queryKey: getGetRecoveryStagesQueryKey() });
      },
      onError: () => {
        setView(returnTo === "reading" ? "samples" : returnTo);
        setActionError("Stillwell couldn’t review this sample just now. Your selected sample and answers are still here; try again.");
      },
    });
  }

  function updateRating(name: string, rating: number) {
    const nextAnswers = {
      ...tapAnswers,
      [`mentioned_${name}`]: { noul: 1 },
      [`symptom_${name}`]: { score: rating },
    };
    setTapAnswers(nextAnswers);
    readSample(nextAnswers, "summary");
  }

  function clearRating(name: string) {
    const nextAnswers = {
      ...tapAnswers,
      [`mentioned_${name}`]: { noul: 0 },
      [`symptom_${name}`]: { score: 0 },
    };
    setTapAnswers(nextAnswers);
    readSample(nextAnswers, "summary");
  }

  function backToSamples() {
    setResult(null);
    setTapAnswers({});
    setView("samples");
    setEditingSymptom(null);
    setActionError("");
  }

  function answerNoul(key: string, probability: number) {
    const nextAnswers = { ...tapAnswers, [key]: { noul: probability } };
    const symptomName = key.startsWith("mentioned_") ? key.slice("mentioned_".length) : null;
    if (symptomName) {
      const scoreKey = `symptom_${symptomName}`;
      if (probability === 0) nextAnswers[scoreKey] = { score: 0 };
      else delete nextAnswers[scoreKey];
    }
    setTapAnswers(nextAnswers);
  }

  function answerQuestion(key: string, answer: unknown) {
    setTapAnswers((current) => ({ ...current, [key]: answer }));
  }

  const unansweredQuestionCount = Object.keys(tapQuestions).filter((key) => !Object.hasOwn(tapAnswers, key)).length;

  if (decision?.outcome === "go_to_er") {
    return <main className="stillwell synthetic-intake min-h-[100dvh] bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl"><Brand journal/><div className="mt-8"><EmergencyScreen quotes={[selectedSample.story]}/></div>
      </div>
    </main>;
  }
  if (decision?.outcome === "crisis_support") {
    return <main className="stillwell synthetic-intake min-h-[100dvh] bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl"><Brand journal/><div className="mt-8"><CrisisScreen onExit={() => setLocation("/dashboard")} exitLabel="Return to dashboard"/></div></div>
    </main>;
  }

  return <main className="stillwell synthetic-intake min-h-[100dvh] bg-background pb-12">
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Brand journal/>
        <Button asChild variant="outline" className="min-h-11"><Link href="/dashboard">Not now · Dashboard</Link></Button>
      </div>
    </header>
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-7 sm:px-8 sm:pt-10">
      <header className="space-y-3">
        <p className="eyebrow">Development preview · Synthetic samples only</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">A sample recovery intake</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Until a Business Associate Agreement is in place, this signed-in preview accepts only fabricated samples from a fixed list. It cannot send personal notes or dictation.
        </p>
      </header>

      {!consent && <Card className="space-y-5 p-5 sm:p-7" data-testid="card-intake-consent">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><LockKeyhole aria-hidden="true" className="size-5"/></span>
          <div>
            <h2 className="display text-2xl font-medium">Before you continue</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Read what this preview does before you consent. Nothing is sent to AI until you agree and then choose to review a sample.</p>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">01 · AI reading</span><p className="mt-2 text-sm leading-6">AI reads only the fabricated story you select. No personal text is accepted.</p></li>
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">02 · Private saving</span><p className="mt-2 text-sm leading-6">The consent and synthetic result are saved privately to your account for this preview.</p></li>
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">03 · Sharing and deletion</span><p className="mt-2 text-sm leading-6">Only clinicians you have already authorized may see shared information. You can remove recovery data in account privacy controls.</p></li>
        </ol>
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Checkbox id="synthetic-intake-consent" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} data-testid="checkbox-intake-consent"/>
          <label htmlFor="synthetic-intake-consent" className="min-h-11 cursor-pointer pt-2 text-sm font-semibold leading-6">I agree to this</label>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Consent version: {INTAKE_CONSENT_VERSION}. You can choose Not now and return to the dashboard without sending anything.</p>
        {actionError && <p role="alert" className="text-sm leading-6 text-destructive">{actionError}</p>}
        <Button className="min-h-11" disabled={!agreed || consentMutation.isPending} onClick={acceptConsent} data-testid="button-accept-intake-consent">
          {consentMutation.isPending ? "Saving consent…" : "Agree and continue"} <ArrowRight aria-hidden="true"/>
        </Button>
        {consentMutation.isError && <Button variant="outline" className="min-h-11" disabled={!agreed || consentMutation.isPending} onClick={acceptConsent}>Retry consent</Button>}
      </Card>}

      {consent && view === "samples" && <Card className="space-y-5 p-5 sm:p-7" data-testid="card-synthetic-samples">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Consent recorded · Synthetic data only</p>
          <h2 className="display mt-2 text-2xl font-medium">Choose a read-only sample</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">The server accepts a sample identifier, never arbitrary text. Select a sample to preview it. Writing and dictation are disabled for this preview until a BAA is in place.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Synthetic intake samples">
          {SYNTHETIC_INTAKE_SAMPLES.map((sample) => <Button
            key={sample.id}
            type="button"
            variant={sampleId === sample.id ? "secondary" : "outline"}
            aria-pressed={sampleId === sample.id}
            className="min-h-11 justify-start whitespace-normal text-left"
            onClick={() => { setSampleId(sample.id); setActionError(""); }}
            data-testid={`button-sample-${sample.id}`}
          >{sample.label}</Button>)}
        </div>
        <section aria-labelledby="sample-preview-title" className="space-y-3">
          <h3 id="sample-preview-title" className="font-semibold">{selectedSample.label} · read-only</h3>
          <p className="rounded-xl border border-border bg-background p-4 text-sm leading-6" data-testid="text-selected-sample">{selectedSample.story}</p>
          <label htmlFor="disabled-personal-note" className="block text-sm font-semibold">Personal note · unavailable in this preview</label>
          <Textarea id="disabled-personal-note" disabled aria-describedby="disabled-input-explanation" placeholder="Free typing is disabled until a BAA is in place." className="min-h-24 resize-none bg-muted text-muted-foreground" data-testid="textarea-personal-note-disabled"/>
          <p id="disabled-input-explanation" className="text-sm leading-6 text-muted-foreground">Dictation is disabled too. Only one of the six fabricated samples above can be sent.</p>
        </section>
        {actionError && <p role="alert" className="text-sm leading-6 text-destructive" data-testid="alert-intake-error">{actionError}</p>}
        {runMutation.isError && <Button variant="outline" className="min-h-11" disabled={runMutation.isPending} onClick={() => readSample()}>Retry sample review</Button>}
        <Button className="min-h-11" disabled={runMutation.isPending} onClick={() => readSample()} data-testid="button-read-sample">
          {runMutation.isPending ? "Reviewing sample…" : "Review this synthetic sample"} <ArrowRight aria-hidden="true"/>
        </Button>
        {stagesQuery.isError && <div className="rounded-xl border border-border p-4 text-sm leading-6" role="status">
          <p>Stored stage history is temporarily unavailable; your intake result is still here.</p>
          <Button variant="outline" className="mt-3 min-h-11" onClick={() => void stagesQuery.refetch()}>Retry stage history</Button>
        </div>}
      </Card>}

      {consent && view === "reading" && <ReadingScreen/>}

      {consent && view === "tap-questions" && decision?.outcome === "use_tap_questions" && <Card className="space-y-5 p-5 sm:p-7" data-testid="card-structured-tap-fallback">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Structured fallback · synthetic sample only</p>
          <h2 className="display text-2xl font-medium">Answer the sample questions with taps</h2>
          <p className="text-sm leading-6 text-muted-foreground">We couldn’t confirm every answer from the selected sample. No answers are assumed. Respond to each question below; these taps are sent as structured values only, then the server applies the shared intake rules again.</p>
          <p className="rounded-lg border border-border bg-background p-3 text-sm leading-6"><strong>Selected sample:</strong> {selectedSample.label}. <span className="block mt-1">{selectedSample.story}</span></p>
          <p className="text-sm font-semibold" role="status">{Object.keys(tapQuestions).length - unansweredQuestionCount} of {Object.keys(tapQuestions).length} questions answered</p>
        </header>
        <div className="space-y-3">
          {Object.entries(tapQuestions).map(([key, question]) => {
            const chosen = tapAnswers[key] as { noul?: number; choice?: string; score?: number } | undefined;
            const linkedMention = key.startsWith("symptom_")
              ? tapAnswers[`mentioned_${key.slice("symptom_".length)}`] as { noul?: number } | undefined
              : undefined;
            const symptomWasExplicitlyNotMentioned = linkedMention?.noul === 0;
            return <fieldset key={key} className="space-y-3 rounded-xl border border-border p-4" data-testid={`tap-question-${key}`}>
              <legend className="px-1 text-sm font-semibold leading-6">{question.instructions}</legend>
              {question.type === "noul" && <div className="flex flex-wrap gap-2" role="group" aria-label={question.instructions}>
                {tapQuestionAnswers.map(({ label, value }) => <Button
                  key={label}
                  type="button"
                  variant={chosen?.noul === value ? "secondary" : "outline"}
                  className="min-h-11"
                  aria-pressed={chosen?.noul === value}
                  disabled={runMutation.isPending}
                  onClick={() => answerNoul(key, value)}
                  data-testid={`tap-answer-${key}-${label.toLowerCase().replaceAll(" ", "-")}`}
                >{label}</Button>)}
              </div>}
              {question.type === "choice" && <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={question.instructions}>
                {Object.entries(question.criteria).map(([value, detail]) => <Button
                  key={value}
                  type="button"
                  variant={chosen?.choice === value ? "secondary" : "outline"}
                  className="min-h-11 justify-start whitespace-normal text-left"
                  aria-pressed={chosen?.choice === value}
                  disabled={runMutation.isPending}
                  onClick={() => answerQuestion(key, { choice: value })}
                  data-testid={`tap-answer-${key}-${value}`}
                ><span className="font-semibold">{value.replaceAll("_", " ")}</span><span className="ml-1 text-sm text-muted-foreground">{detail}</span></Button>)}
              </div>}
              {question.type === "score" && <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-11" role="group" aria-label={`${question.instructions} Rate from 0 None to 10 Worst`}>
                  {ratings.map((rating) => <Button
                    key={rating}
                    type="button"
                    variant={chosen?.score === rating ? "secondary" : "outline"}
                    className="min-h-11 min-w-11 px-2"
                    aria-label={`${rating}${rating === 0 ? " None" : rating === 5 ? " Moderate" : rating === 10 ? " Worst" : ""}`}
                    aria-pressed={chosen?.score === rating}
                    disabled={runMutation.isPending}
                    onClick={() => answerQuestion(key, { score: rating })}
                    data-testid={`tap-answer-${key}-${rating}`}
                  >{rating}</Button>)}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>0 None</span><span>5 Moderate</span><span>10 Worst</span></div>
                {symptomWasExplicitlyNotMentioned && <p className="text-sm leading-6 text-muted-foreground">Because you explicitly said this symptom was not mentioned, 0 is sent only as its required paired placeholder. The symptom stays unrecorded; 0 is not presented as a rating.</p>}
              </div>}
              {chosen && <p className="text-xs font-semibold text-primary">Answered</p>}
            </fieldset>;
          })}
        </div>
        {actionError && <p role="alert" className="text-sm leading-6 text-destructive">{actionError}</p>}
        {runMutation.isError && <Button variant="outline" className="min-h-11" disabled={runMutation.isPending} onClick={() => readSample(tapAnswers, "tap-questions")}>Retry structured review</Button>}
        <div className="flex flex-wrap gap-3">
          <Button className="min-h-11" disabled={unansweredQuestionCount > 0 || runMutation.isPending} onClick={() => readSample(tapAnswers, "tap-questions")} data-testid="button-submit-tap-answers">
            {runMutation.isPending ? "Reviewing answers…" : "Review these answers"} <ArrowRight aria-hidden="true"/>
          </Button>
          <Button variant="outline" className="min-h-11" onClick={backToSamples}>Choose another sample</Button>
        </div>
      </Card>}

      {consent && result && decision?.outcome === "start_journal" && view === "summary" && <div className="space-y-5" data-testid="synthetic-intake-summary">
        <header className="space-y-2">
          <p className="eyebrow">Review · Synthetic sample only</p>
          <h2 className="display text-3xl font-medium">Summary</h2>
          <p className="text-sm leading-6 text-muted-foreground">Review what the server read before opening the starting-stage view. Change actions use structured taps and rerun the server; no free text is sent.</p>
        </header>
        <Card className="space-y-3 p-5 sm:p-7" data-testid="summary-synthetic-injury">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Injury details · read-only synthetic sample</p><h3 className="display mt-2 text-xl font-medium">{selectedSample.label}</h3></div>
            <Button variant="outline" className="min-h-11" onClick={backToSamples} data-testid="button-change-synthetic-sample">Change sample</Button>
          </div>
          <p className="rounded-xl border border-border bg-background p-4 text-sm leading-6" data-testid="summary-sample-story">{selectedSample.story}</p>
          <p className="text-sm leading-6 text-muted-foreground">This fixed sample story is the only injury narrative the server received. It cannot be edited or replaced with personal text.</p>
        </Card>

        <Card className="space-y-4 p-5 sm:p-7">
          <div><h3 className="display text-2xl font-medium">Symptoms</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">All 11 symptoms are shown. Anything not mentioned stays not recorded. Choose Change to edit a rating; each tap reruns the server rules.</p></div>
          <div className="space-y-3">
            {decision.symptoms.map((symptom, index) => <section key={symptom.name} className="space-y-3 rounded-xl border border-border p-4" data-testid={`summary-symptom-${index + 1}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div><h4 className="font-semibold">{symptom.label}</h4><p className="text-sm text-muted-foreground">{symptom.level === null ? "Not recorded" : `Recorded: ${symptom.level}/10`}</p></div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  aria-expanded={editingSymptom === symptom.name}
                  onClick={() => setEditingSymptom((current) => current === symptom.name ? null : symptom.name)}
                  data-testid={`button-change-summary-${symptom.name}`}
                >{editingSymptom === symptom.name ? "Close" : "Change"}</Button>
              </div>
              {editingSymptom === symptom.name && <>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-11" role="group" aria-label={`Rate ${symptom.label} from 0 None to 10 Worst`}>
                  {ratings.map((rating) => <Button
                    key={rating}
                    type="button"
                    variant={symptom.level === rating ? "secondary" : "outline"}
                    className="min-h-11 min-w-11 px-2"
                    aria-pressed={symptom.level === rating}
                    disabled={runMutation.isPending}
                    onClick={() => updateRating(symptom.name, rating)}
                    data-testid={`button-rating-${symptom.name}-${rating}`}
                  >{rating}</Button>)}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>0 None</span><span>5 Moderate</span><span>10 Worst</span></div>
                <Button type="button" variant="ghost" className="min-h-11 px-3" disabled={runMutation.isPending} onClick={() => clearRating(symptom.name)} data-testid={`button-clear-rating-${symptom.name}`}>Leave this symptom not recorded</Button>
              </>}
            </section>)}
          </div>
          {runMutation.isPending && <p role="status" className="text-sm text-muted-foreground">Rerunning the sample with your structured tap answer…</p>}
          {actionError && <p role="alert" className="text-sm leading-6 text-destructive">{actionError}</p>}
          {runMutation.isError && <Button variant="outline" className="min-h-11" disabled={runMutation.isPending} onClick={() => readSample(tapAnswers, "summary")}>Retry summary update</Button>}
        </Card>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" className="min-h-11" onClick={backToSamples}>Choose another sample</Button>
          <Button className="min-h-11" disabled={runMutation.isPending} onClick={() => setView("stage")} data-testid="button-summary-confirm">This looks right <ArrowRight aria-hidden="true"/></Button>
        </div>
      </div>}

      {consent && result && decision?.outcome === "start_journal" && view === "stage" && <div className="space-y-5" data-testid="synthetic-intake-stage">
        {stagesQuery.isError && <Card className="flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
          <p className="text-sm leading-6 text-muted-foreground">Stored stage history could not be refreshed. Your current synthetic intake result remains available.</p>
          <Button variant="outline" className="min-h-11" onClick={() => void stagesQuery.refetch()}>Retry stage history</Button>
        </Card>}
        <Card className="space-y-4 border-primary/30 bg-secondary p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary"><ShieldCheck aria-hidden="true" className="size-5"/></span>
            <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Synthetic sample result · not your medical stage</p>
              <h2 className="display mt-1 text-2xl font-medium">A provisional starting point</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">This result was created from the selected fabricated sample and saved for this preview only.</p>
            </div>
          </div>
          {stageNumber && stageName && storedStage?.status === "provisional" ? <>
            <StageIndicator stage={stageNumber}/>
            <p className="text-sm font-semibold">Pending clinician review, within 24 hours</p>
            <p className="text-lg font-semibold">Stage {stageNumber} · {stageName}</p>
            <section className="space-y-3" aria-labelledby="why-stage-title">
              <h3 id="why-stage-title" className="font-semibold">Why stage {stageNumber}</h3>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {decision.stage?.reasons.map((reason) => <li key={`${reason.rule}-${reason.text}`}>{PLACEMENT_REASONS[reason.rule] ?? reason.text}</li>)}
              </ul>
            </section>
          </> : <div className="space-y-3" role="alert">
            <p className="text-sm leading-6 text-destructive">No provisional synthetic stage was returned.</p>
            <Button variant="outline" className="min-h-11" disabled={runMutation.isPending} onClick={() => readSample(tapAnswers, "stage")}>Retry this sample</Button>
          </div>}
        </Card>

        <section className="space-y-3" aria-label="Six recovery stages">
          {Object.entries(STAGES).map(([stage, name]) => {
            const current = Number(stage) === stageNumber;
            return <Card key={stage} className={`flex items-center gap-4 p-4 ${current ? "border-2 border-primary bg-secondary" : ""}`} aria-current={current ? "step" : undefined} data-testid={`preview-roadmap-stage-${stage}`}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${current ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                {current ? <Check aria-label={`You start here, Stage ${stage}`} className="size-4"/> : stage}
              </span>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage {stage}{current ? " · You start here" : ""}</p><h3 className="mt-1 font-semibold">{name}</h3></div>
            </Card>;
          })}
        </section>

        <Card className="space-y-3 p-5 sm:p-7">
          <h2 className="display text-2xl font-medium">What happens next</h2>
          <p className="text-sm leading-6 text-muted-foreground">This synthetic preview stores a provisional result. It is not a diagnosis or treatment advice. A clinician review is expected within 24 hours; seek urgent help for emergency symptoms.</p>
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-11" onClick={() => setLocation("/dashboard")} data-testid="button-intake-dashboard">Return to dashboard <ArrowRight aria-hidden="true"/></Button>
            <Button variant="outline" className="min-h-11" onClick={() => setView("summary")} data-testid="button-back-to-summary"><ArrowLeft aria-hidden="true"/>Back to summary</Button>
          </div>
        </Card>
      </div>}

      {consent && result && view === "doctor" && decision?.outcome === "find_doctor" && <Card className="space-y-4 border-notice-border bg-notice p-5 sm:p-7" role="status">
        <p className="eyebrow">No stage suggested</p><h2 className="display text-3xl font-medium">Please check in with a clinician first</h2>
        <p className="text-sm leading-6">{decision.stageNote ?? decision.headline}</p>
        <Button className="min-h-11" onClick={() => setLocation("/dashboard")}>Return to dashboard <ArrowRight aria-hidden="true"/></Button>
        <Button variant="outline" className="min-h-11" onClick={backToSamples}>Choose another sample</Button>
      </Card>}

      <BoundaryNotice/>
    </div>
  </main>;
}
