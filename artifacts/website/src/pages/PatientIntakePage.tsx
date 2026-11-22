import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  getGetRecoveryIntakeStatusQueryKey,
  getGetRecoveryStagesQueryKey,
  useConsentRecoveryIntake,
  useGetRecoveryIntakeStatus,
  useGetRecoveryStages,
  useRunRecoveryIntake,
} from "@workspace/api-client-react";
import type { PatientIntakeResult } from "@workspace/api-client-react";
import { buildQuestions, INTAKE_CONSENT_VERSION, PLACEMENT_REASONS, STAGES } from "@workspace/intake-ai";
import type { Decision } from "@workspace/intake-ai";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Brand } from "@/components/PublicSite";
import { BoundaryNotice } from "@/components/SiteComponents";
import { CrisisScreen, EmergencyScreen, ReadingScreen } from "@/components/demo-intake/StoryScreens";
import { IntakeStoryEditor } from "@/components/IntakeStoryEditor";

const ratings = Array.from({ length: 11 }, (_, value) => value);
const tapQuestionAnswers = [
  { label: "Yes", value: 1 },
  { label: "No", value: 0 },
  { label: "Not sure", value: 0.5 },
] as const;
type IntakeView = "story" | "reading" | "summary" | "tap-questions" | "stage" | "doctor";
type IntakeOutcome = { data: PatientIntakeResult; decision: Decision };

function intakeOutcome(data: PatientIntakeResult): IntakeOutcome {
  return { data, decision: data.decision as Decision };
}

export default function PatientIntakePage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const statusQuery = useGetRecoveryIntakeStatus({
    query: { enabled: Boolean(userId), queryKey: [...getGetRecoveryIntakeStatusQueryKey(), userId], retry: false, refetchInterval: 30000 },
  });
  const stagesQuery = useGetRecoveryStages({
    query: { enabled: Boolean(userId), queryKey: [...getGetRecoveryStagesQueryKey(), userId], retry: false },
  });
  const consentMutation = useConsentRecoveryIntake();
  const runMutation = useRunRecoveryIntake();
  const [agreed, setAgreed] = useState(false);
  const [consent, setConsent] = useState<{ id: string } | null>(null);
  const [story, setStory] = useState("");
  const [result, setResult] = useState<IntakeOutcome | null>(null);
  const [tapAnswers, setTapAnswers] = useState<Record<string, unknown>>({});
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState<IntakeView>("story");
  const [editingSymptom, setEditingSymptom] = useState<string | null>(null);
  const [summaryAnswersChanged, setSummaryAnswersChanged] = useState(false);
  const decision = result?.decision;
  const storedStage = result?.data.stage;
  const numericStage = storedStage && !storedStage.syntheticOnly ? Number(storedStage.stage) : null;
  const stageNumber = numericStage !== null && Number.isInteger(numericStage) && numericStage >= 1 && numericStage <= 6 ? numericStage : null;
  const stageName = stageNumber ? STAGES[stageNumber as keyof typeof STAGES] ?? null : null;
  const tapQuestions = buildQuestions();
  useEffect(() => {
    setStory(""); setConsent(null); setResult(null); setTapAnswers({});
    setAgreed(false); setActionError(""); setView("story"); setEditingSymptom(null); setSummaryAnswersChanged(false);
  }, [userId]);

  function acceptConsent() {
    if (!agreed || consentMutation.isPending || statusQuery.data?.enabled !== true) return;
    const requestUser = userId;
    setActionError("");
    consentMutation.mutate({ data: { consentAccepted: true } }, {
      onSuccess: (savedConsent) => {
        if (requestUser !== currentUser.current) return;
        setConsent({ id: savedConsent.id });
        setView("story");
      },
      onError: () => { if (requestUser === currentUser.current) setActionError("We couldn’t save your consent. Your story has not been sent. Please try again."); },
    });
  }

  function readStory(answered: Record<string, unknown> = tapAnswers, returnTo: IntakeView = view) {
    if (!consent || statusQuery.data?.enabled !== true || !story.trim() || runMutation.isPending) return;
    const requestUser = userId;
    setActionError("");
    setView("reading");
    runMutation.mutate({ data: { consentId: consent.id, story: story.trim(), ...(Object.keys(answered).length ? { answered } : {}) } }, {
      onSuccess: (data) => {
        if (requestUser !== currentUser.current) return;
        const next = intakeOutcome(data);
        setResult(next);
        setEditingSymptom(null);
        setSummaryAnswersChanged(false);
        setView(next.decision.outcome === "start_journal" ? "summary"
          : next.decision.outcome === "use_tap_questions" ? "tap-questions"
            : next.decision.outcome === "find_doctor" ? "doctor" : returnTo);
        void queryClient.invalidateQueries({ queryKey: getGetRecoveryStagesQueryKey() });
      },
      onError: () => {
        if (requestUser !== currentUser.current) return;
        setView(returnTo);
        setActionError("Stillwell couldn’t review your story just now. Your story and answers are still here; please try again.");
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
    readStory(nextAnswers, "summary");
  }

  function clearRating(name: string) {
    const nextAnswers = {
      ...tapAnswers,
      [`mentioned_${name}`]: { noul: 0 },
      [`symptom_${name}`]: { score: 0 },
    };
    setTapAnswers(nextAnswers);
    readStory(nextAnswers, "summary");
  }

  function backToStory() {
    setView("story");
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
    return <main className="stillwell patient-intake min-h-[100dvh] bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl"><Brand journal/><div className="mt-8"><EmergencyScreen quotes={[story]}/></div></div>
    </main>;
  }
  if (decision?.outcome === "crisis_support") {
    return <main className="stillwell patient-intake min-h-[100dvh] bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl"><Brand journal/><div className="mt-8"><CrisisScreen onExit={() => setLocation("/dashboard")} exitLabel="Return to dashboard"/></div></div>
    </main>;
  }

  return <main className="stillwell patient-intake min-h-[100dvh] bg-background pb-12">
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Brand journal/>
        <Button asChild variant="outline" className="min-h-12"><Link href="/dashboard">Not now · Dashboard</Link></Button>
      </div>
    </header>
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-7 sm:px-8 sm:pt-10">
      <header className="space-y-3">
        <p className="eyebrow">Patient intake</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">A place for your story</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">Share what you choose after reviewing how your story and intake answers are used. You can keep using your journal whether or not intake is available.</p>
      </header>

      {statusQuery.isLoading && <Card aria-label="Checking intake availability" className="animate-pulse space-y-4 p-6" data-testid="card-intake-status-loading">
        <div className="h-4 w-40 rounded bg-muted"/><div className="h-20 rounded-xl bg-muted"/><div className="h-11 w-40 rounded-full bg-muted"/>
      </Card>}
      {statusQuery.isError && <Card className="space-y-4 p-5 sm:p-7" role="alert" data-testid="card-intake-status-error">
        <h2 className="display text-2xl font-medium">Intake availability could not be checked</h2>
        <p className="text-sm leading-6 text-muted-foreground">Your story field remains unavailable until Stillwell can confirm intake is enabled. Your journal is still available.</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="min-h-12" onClick={() => void statusQuery.refetch()} data-testid="button-retry-intake-status">Try again</Button>
          <Button variant="outline" className="min-h-12" asChild><Link href="/dashboard">Return to dashboard</Link></Button>
        </div>
      </Card>}
      {!statusQuery.isLoading && !statusQuery.isError && statusQuery.data?.enabled === false && <Card className="space-y-4 p-5 sm:p-7" data-testid="card-intake-disabled">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Patient intake</p>
        <h2 className="display text-2xl font-medium">Patient intake is not enabled right now</h2>
        <p className="text-sm leading-6 text-muted-foreground">You can continue using your private journal. No consent or story is needed to return to it.</p>
        <Button variant="outline" className="min-h-12 w-fit" asChild><Link href="/dashboard">Return to dashboard <ArrowRight aria-hidden="true"/></Link></Button>
      </Card>}

      {!consent && !statusQuery.isLoading && !statusQuery.isError && statusQuery.data?.enabled === true && <Card className="space-y-5 p-5 sm:p-7" data-testid="card-intake-consent">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><LockKeyhole aria-hidden="true" className="size-5"/></span>
          <div>
            <h2 className="display text-2xl font-medium">Before you continue</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your story and intake answers are sent to TypeSafe for reading. They are not saved or traced by Stillwell as raw story text; the intake result is saved privately to your account.</p>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">01 · What is sent</span><p className="mt-2 text-sm leading-6">TypeSafe reads the story and intake answers. Your account profile, name, email, and ID are not sent with the request.</p></li>
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">02 · What is saved</span><p className="mt-2 text-sm leading-6">Stillwell saves the intake result privately to your account, not the raw story. Your numeric stage/result may be shared with a doctor you invite and who accepts; your raw story is never shared.</p></li>
          <li className="rounded-xl border border-border bg-background p-4"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">03 · Your choice</span><p className="mt-2 text-sm leading-6">You decide whether to continue. You can leave now and return to your journal without sending anything.</p></li>
        </ol>
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">Please leave out identifying details</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Avoid names and contact details. A basic email and phone filter is not full de-identification, so do not include information you do not want processed.</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Checkbox id="patient-intake-consent" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} data-testid="checkbox-intake-consent"/>
          <label htmlFor="patient-intake-consent" className="min-h-12 cursor-pointer pt-2 text-sm font-semibold leading-6">I agree to this</label>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Consent version: {INTAKE_CONSENT_VERSION}. This is not a promise of anonymity or medical care.</p>
        {actionError && <p role="alert" className="text-sm leading-6 text-destructive">{actionError}</p>}
        <Button className="min-h-12" disabled={!agreed || consentMutation.isPending} onClick={acceptConsent} data-testid="button-accept-intake-consent">
          {consentMutation.isPending ? "Saving consent…" : "Start"} <ArrowRight aria-hidden="true"/>
        </Button>
        {consentMutation.isError && <Button variant="outline" className="min-h-12" disabled={!agreed || consentMutation.isPending} onClick={acceptConsent}>Retry consent</Button>}
      </Card>}

      {consent && statusQuery.data?.enabled === true && view === "story" && <IntakeStoryEditor story={story} setStory={setStory} onSubmit={() => readStory(tapAnswers, "story")} pending={runMutation.isPending}/>}
      {consent && view === "reading" && <ReadingScreen/>}

      {consent && view === "tap-questions" && decision?.outcome === "use_tap_questions" && <Card className="space-y-5 p-5 sm:p-7" data-testid="card-structured-tap-fallback">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Structured fallback</p>
          <h2 className="display text-2xl font-medium">Let’s check what you shared</h2>
          <p className="text-sm leading-6 text-muted-foreground">We couldn’t confirm every answer from your story. No answers are assumed. Respond to each question below; only your structured taps and story are sent for another review.</p>
          <p className="rounded-lg border border-border bg-background p-3 text-sm leading-6"><strong>Your story:</strong> <span className="mt-1 block">{story}</span></p>
          <p className="text-sm font-semibold" role="status">{Object.keys(tapAnswers).length} structured answers recorded</p>
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
                  className="min-h-12"
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
                  className="min-h-12 justify-start whitespace-normal text-left"
                  aria-pressed={chosen?.choice === value}
                  disabled={runMutation.isPending}
                  onClick={() => answerQuestion(key, { choice: value })}
                  data-testid={`tap-answer-${key}-${value}`}
                ><span className="font-semibold">{value.replaceAll("_", " ")}</span><span className="ml-1 text-sm text-muted-foreground">{detail}</span></Button>)}
              </div>}
              {question.type === "score" && <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-11" role="group" aria-label={`${question.instructions} Rate from 0 None to 10 Worst`}>
                  {ratings.map((rating) => <Button
                    key={rating}
                    type="button"
                    variant={chosen?.score === rating ? "secondary" : "outline"}
                    className="min-h-12 min-w-12 px-2"
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
        {runMutation.isError && <Button variant="outline" className="min-h-12" disabled={runMutation.isPending} onClick={() => readStory(tapAnswers, "tap-questions")}>Retry structured review</Button>}
        <div className="flex flex-wrap gap-3">
          <Button className="min-h-12" disabled={unansweredQuestionCount > 0 || runMutation.isPending} onClick={() => readStory(tapAnswers, "tap-questions")} data-testid="button-submit-tap-answers">
            {runMutation.isPending ? "Reviewing answers…" : "Review these answers"} <ArrowRight aria-hidden="true"/>
          </Button>
          <Button variant="outline" className="min-h-12" onClick={backToStory}>Back to my story</Button>
        </div>
      </Card>}

      {consent && result && decision?.outcome === "start_journal" && view === "summary" && <div className="space-y-5" data-testid="patient-intake-summary">
        <header className="space-y-2">
          <p className="eyebrow">Review</p>
          <h2 className="display text-3xl font-medium">Summary</h2>
            <p className="text-sm leading-6 text-muted-foreground">Review the details and structured answers before viewing your starting stage. Your answers are editable.</p>
        </header>
        <Card className="space-y-3 p-5 sm:p-7" data-testid="summary-patient-injury">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your story</p><h3 className="display mt-2 text-xl font-medium">Injury details</h3></div>
            <Button variant="outline" className="min-h-12" onClick={backToStory} data-testid="button-edit-patient-story"><ArrowLeft aria-hidden="true"/>Edit story</Button>
          </div>
          <p className="rounded-xl border border-border bg-background p-4 text-sm leading-6 whitespace-pre-wrap" data-testid="summary-patient-story">{story}</p>
        </Card>

        <Card className="space-y-4 p-5 sm:p-7">
          <div><h3 className="display text-2xl font-medium">Your answers</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose Change to edit any structured answer. Changes are reviewed together when you continue.</p></div>
          <div className="space-y-3">
            {Object.entries(tapQuestions).map(([key, question], index) => {
              const chosen = tapAnswers[key] as { noul?: number; choice?: string; score?: number } | undefined;
              const inferredName = key.startsWith("symptom_") ? key.slice("symptom_".length) : "";
              const inferredSymptom = decision.symptoms.find(symptom => symptom.name === inferredName);
              const displayValue = chosen?.score !== undefined ? `${chosen.score}/10`
                : inferredSymptom?.level !== null && inferredSymptom?.level !== undefined ? `${inferredSymptom.level}/10`
                : chosen?.choice ? chosen.choice.replaceAll("_", " ")
                  : chosen?.noul === 1 ? "Yes" : chosen?.noul === 0 ? "No" : chosen?.noul === 0.5 ? "Not sure" : "Not recorded";
              return <section key={key} className="space-y-3 rounded-xl border border-border p-4" data-testid={`summary-answer-${index + 1}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div><h4 className="font-semibold">{question.instructions}</h4><p className="text-sm text-muted-foreground">{displayValue}</p></div>
                  <Button type="button" variant="outline" className="min-h-12" aria-expanded={editingSymptom === key} onClick={() => setEditingSymptom(current => current === key ? null : key)} data-testid={`button-change-answer-${key}`}>{editingSymptom === key ? "Close" : "Change"}</Button>
                </div>
                {editingSymptom === key && question.type === "score" && <>
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-11" role="group" aria-label={`${question.instructions}, rate from 0 to 10`}>
                    {ratings.map(rating => <Button key={rating} type="button" variant={(chosen?.score ?? inferredSymptom?.level) === rating ? "secondary" : "outline"} className="min-h-12 min-w-12 px-2" aria-pressed={(chosen?.score ?? inferredSymptom?.level) === rating} disabled={runMutation.isPending} onClick={() => { setTapAnswers(current => ({ ...current, [key]: { score: rating } })); setSummaryAnswersChanged(true); }}>{rating}</Button>)}
                  </div>
                  <Button type="button" variant="ghost" className="min-h-12" disabled={runMutation.isPending} onClick={() => { setTapAnswers(current => { const next = { ...current }; delete next[key]; return next; }); setSummaryAnswersChanged(true); }}>Leave not recorded</Button>
                </>}
                {editingSymptom === key && question.type === "noul" && <div className="flex flex-wrap gap-2">{tapQuestionAnswers.map(answer => <Button key={answer.label} type="button" variant={chosen?.noul === answer.value ? "secondary" : "outline"} className="min-h-12" aria-pressed={chosen?.noul === answer.value} disabled={runMutation.isPending} onClick={() => { answerNoul(key, answer.value); setSummaryAnswersChanged(true); }}>{answer.label}</Button>)}</div>}
                {editingSymptom === key && question.type === "choice" && <div className="grid gap-2 sm:grid-cols-2">{Object.entries(question.criteria).map(([value, description]) => <Button key={value} type="button" variant={chosen?.choice === value ? "secondary" : "outline"} className="min-h-12 justify-start whitespace-normal text-left" aria-pressed={chosen?.choice === value} disabled={runMutation.isPending} onClick={() => { answerQuestion(key, { choice: value }); setSummaryAnswersChanged(true); }}>{value.replaceAll("_", " ")} · {description}</Button>)}</div>}
              </section>;
            })}
          </div>
          {runMutation.isPending && <p role="status" className="text-sm text-muted-foreground">Reviewing your updated answers…</p>}
          {actionError && <p role="alert" className="text-sm leading-6 text-destructive">{actionError}</p>}
          {runMutation.isError && <Button variant="outline" className="min-h-12" disabled={runMutation.isPending} onClick={() => readStory(tapAnswers, "summary")}>Retry summary update</Button>}
        </Card>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" className="min-h-12" onClick={backToStory}>Back to my story</Button>
          <Button className="min-h-12" disabled={runMutation.isPending} onClick={() => summaryAnswersChanged ? readStory(tapAnswers, "summary") : setView("stage")} data-testid="button-summary-confirm">{summaryAnswersChanged ? "Review updated answers" : "This looks right"} <ArrowRight aria-hidden="true"/></Button>
        </div>
      </div>}

      {consent && result && decision?.outcome === "start_journal" && view === "stage" && <div className="space-y-5" data-testid="patient-intake-stage">
        {stagesQuery.isError && <Card className="flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
          <p className="text-sm leading-6 text-muted-foreground">Your saved stage history could not be refreshed. This intake result remains available.</p>
          <Button variant="outline" className="min-h-12" onClick={() => void stagesQuery.refetch()}>Retry stage history</Button>
        </Card>}
        <Card className="space-y-4 border-primary/30 bg-secondary p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary"><ShieldCheck aria-hidden="true" className="size-5"/></span>
            <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your live starting stage</p>
              <h2 className="display mt-1 text-2xl font-medium">A place to begin</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Your starting stage is live now and can change with weekly reviews or an optional doctor review. This is general information, not a diagnosis or medical advice.</p>
            </div>
          </div>
          {stageNumber && stageName && !storedStage?.syntheticOnly ? <>
            <div className="grid grid-cols-6 gap-2" role="img" aria-label={`Stage ${stageNumber} of six`}>
              {Object.keys(STAGES).map(stage => <span key={stage} className={`h-2 rounded-full ${Number(stage) <= stageNumber ? "bg-primary" : "bg-muted"}`}/>)}
            </div>
            <p className="text-lg font-semibold">Stage {stageNumber} · {stageName}</p>
            <section className="space-y-3" aria-labelledby="why-stage-title">
              <h3 id="why-stage-title" className="font-semibold">Why stage {stageNumber}</h3>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {decision.stage?.reasons.map((reason) => <li key={`${reason.rule}-${reason.text}`}>{PLACEMENT_REASONS[reason.rule] ?? reason.text}</li>)}
              </ul>
            </section>
          </> : <div className="space-y-3" role="alert">
            <p className="text-sm leading-6 text-destructive">No live stage was returned yet.</p>
            <Button variant="outline" className="min-h-12" disabled={runMutation.isPending} onClick={() => readStory(tapAnswers, "stage")}>Retry this intake</Button>
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
            <p className="text-sm leading-6 text-muted-foreground">Your stage is saved and live. This is general information, not a diagnosis or treatment advice. Follow guidance from your clinician and seek urgent help for emergencies.</p>
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-12" onClick={() => setLocation("/dashboard")} data-testid="button-intake-dashboard">Go to dashboard <ArrowRight aria-hidden="true"/></Button>
            <Button variant="outline" className="min-h-12" asChild><Link href="/dashboard/invite-doctor">Invite your doctor</Link></Button>
            <Button variant="outline" className="min-h-12" onClick={() => setView("summary")} data-testid="button-back-to-summary"><ArrowLeft aria-hidden="true"/>Back to summary</Button>
          </div>
        </Card>
      </div>}

      {consent && result && decision?.outcome === "find_doctor" && view === "doctor" && <Card className="space-y-4 border-notice-border bg-notice p-5 sm:p-7" role="status">
        <p className="eyebrow">No stage suggested</p><h2 className="display text-3xl font-medium">Please check in with a clinician first</h2>
        <p className="text-sm leading-6">{decision.stageNote ?? decision.headline}</p>
        <Button className="min-h-12" onClick={() => setLocation("/dashboard")}>Return to dashboard <ArrowRight aria-hidden="true"/></Button>
        <Button variant="outline" className="min-h-12" onClick={backToStory}>Back to my story</Button>
      </Card>}

      {consent && actionError && view === "story" && <p role="alert" className="text-sm leading-6 text-destructive" data-testid="alert-intake-error">{actionError}</p>}
      <BoundaryNotice/>
    </div>
  </main>;
}
