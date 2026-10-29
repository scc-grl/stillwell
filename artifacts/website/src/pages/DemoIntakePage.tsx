import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Mic, MicOff, ShieldCheck } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";

// Demo only: free-form intake read by TypeSafe, decided by Stillwell's rules, recorded in Braintrust.
// Visitors use sample or made-up stories. Nothing here is saved to a journal or an account.

type Reason = { rule: string; text: string };
type Decision = {
  outcome: "go_to_er" | "crisis_support" | "find_doctor" | "start_journal" | "use_tap_questions";
  headline: string;
  crisisLineShown: boolean;
  reasons: Reason[];
  stage: { stage: number; name: string; amsterdamStep: number; reasons: Reason[] } | null;
  stageNote: string | null;
  followUps: string[];
  symptoms: { name: string; label: string; levelLabel: string; confidence: number | null; needsConfirm: boolean }[];
  resources: string[];
  rulesVersion: string;
};
type ChoiceAnswer = { choice: string; confidence: number };
type Scores = {
  danger: Record<string, number>;
  selfHarm: number;
  gettingWorse: number;
  priorConcussion: number;
  seenDoctor: ChoiceAnswer;
  injuryTiming: ChoiceAnswer;
  activity: Record<string, number>;
};
type Result = {
  decision: Decision;
  read: { source: "typesafe" | "keywords_only"; model: string | null; latencyMs: number; error: string | null; keywords: { danger: string[]; selfHarm: string[] }; scores: Scores | null };
  braintrustLogged: boolean;
};

const SAMPLES: { label: string; note: string }[] = [
  { label: "Maya, 2 weeks after a header", note: "I'm Maya and I play soccer for my college team. Two weeks ago I went up for a header and collided with another player. The team doctor checked me that night. Now I get headaches by mid-afternoon, I feel foggy in lectures, and I'm more tired than usual. Screens bother me a little. Walking to class is fine, but when I tried a spin class the headache came back." },
  { label: "Urgent signs", note: "I hit my head at practice yesterday and I've thrown up three times since. When I look at my phone I'm seeing double." },
  { label: "Hurt this morning", note: "I fell off my bike this morning and bumped my head on the curb. I have a mild headache but otherwise I feel okay." },
  { label: "Getting worse", note: "It's been ten days since I hit my head on a cabinet door. My brain fog and tiredness are getting worse every day, not better. I haven't seen anyone about it." },
  { label: "Nearly recovered", note: "Three weeks ago I got a mild concussion skiing and saw my doctor the next day. I feel mostly back to normal, just a little tired at the end of the day. I've been jogging and lifting on my own without any problems." },
];

const DANGER_LABELS: Record<string, string> = {
  neck_pain_or_tenderness: "Neck pain or tenderness", seizure: "Seizure", double_vision: "Double vision",
  loss_of_consciousness: "Loss of consciousness", weakness_or_tingling: "Weakness or tingling", getting_drowsier: "Getting drowsier",
  vomiting: "Vomiting", severe_or_increasing_headache: "Severe or increasing headache",
  increasing_restlessness_or_agitation: "Restlessness or agitation", visible_skull_deformity: "Visible skull deformity",
};
const ACTIVITY_LABELS: Record<string, string> = {
  daily_tasks: "Everyday tasks", walking: "Walking about 20 minutes", light_exercise: "Light to moderate exercise", harder_solo_exercise: "Harder solo exercise",
};
const pct = (p: number) => `${Math.round(p * 100)}%`;

type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null };
function speechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export default function DemoIntakePage() {
  const [note, setNote] = useState("");
  const [inputMode, setInputMode] = useState<"typed" | "voice">("typed");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<{ typesafe: boolean; braintrust: boolean } | null>(null);
  const recognizer = useRef<SpeechRecognitionLike | null>(null);
  const canTalk = typeof window !== "undefined" && speechRecognition() !== null;

  useEffect(() => {
    fetch("/api/demo/intake/status").then((r) => r.ok ? r.json() : null).then(setStatus).catch(() => setStatus(null));
    return () => recognizer.current?.stop();
  }, []);

  function toggleTalk() {
    setMicError("");
    if (listening) { recognizer.current?.stop(); return; }
    const Recognition = speechRecognition();
    if (!Recognition) return;
    const r = new Recognition();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) text += event.results[i][0].transcript;
      if (text) { setNote((prev) => (prev ? `${prev.trimEnd()} ${text.trim()}` : text.trim())); setInputMode("voice"); }
    };
    r.onerror = (event: any) => setMicError(event?.error === "not-allowed" ? "Your browser isn't letting Stillwell use the microphone. You can type instead, or allow the microphone and try again." : "Talking stopped. You can try again or type instead.");
    r.onend = () => setListening(false);
    recognizer.current = r;
    r.start();
    setListening(true);
  }

  async function submit() {
    setError("");
    setResult(null);
    if (!note.trim()) { setError("Tell Stillwell what happened first."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/demo/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note, inputMode }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Something went wrong. Please try again."); return; }
      setResult(data as Result);
    } catch {
      setError("Stillwell couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-[100dvh] bg-background px-4 pb-12 pt-5 sm:px-8">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-3 text-foreground" aria-label="Stillwell home"><span className="brand-mark" /><span className="font-serif text-xl font-semibold tracking-tight">stillwell</span></Link>
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />Demo · sample stories only</span>
    </header>

    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Onboarding intake demo</p>
        <h1 className="font-serif text-4xl font-medium leading-tight">Tell Stillwell what happened</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Type or talk in your own words: when and how it happened, how you feel today, and what you can do comfortably. Stillwell reads it with AI, then its rules suggest a next step and a starting stage.</p>
      </div>

      <Card className="space-y-2 border-destructive/40 bg-secondary p-4" aria-label="Demo notice">
        <p className="text-sm font-semibold">This is a demo. Use a sample story or make one up.</p>
        <p className="text-sm leading-6">Don't enter real health details. What you send is read by TypeSafe (an AI service) and recorded in Braintrust so the team can test how well it works. Nothing is saved to a journal.</p>
        <p className="text-sm leading-6"><strong>Stillwell is not a diagnosis tool.</strong> It can't diagnose or treat a concussion; please see a medical provider for that. Not for a new injury or an emergency. Severe or urgent symptoms need emergency care now.</p>
      </Card>

      {status && !status.typesafe && <Card role="status" className="p-3 text-sm">The TypeSafe key isn't set on the server yet, so only the backup word scan will run.</Card>}

      <Card className="space-y-4 p-5 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Try a sample story</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => <Button key={s.label} type="button" variant="outline" size="sm" onClick={() => { setNote(s.note); setInputMode("typed"); setResult(null); }} data-testid={`sample-${s.label}`}>{s.label}</Button>)}
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Your story (edit anything)</span>
          <Textarea value={note} onChange={(e) => { setNote(e.target.value); if (!listening) setInputMode("typed"); }} rows={7} maxLength={4000} placeholder="For example: Two weeks ago I took a hit at practice. Now I get headaches in the afternoon. Walking is fine." data-testid="intake-note" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {canTalk
            ? <Button type="button" variant="outline" onClick={toggleTalk} aria-pressed={listening} data-testid="button-talk">{listening ? <><MicOff className="size-4" />Stop talking</> : <><Mic className="size-4" />Talk</>}</Button>
            : <span className="text-xs text-muted-foreground">To talk, use your keyboard's microphone key.</span>}
          <span className="text-xs text-muted-foreground">{listening ? "Listening… your browser turns speech into text. Stillwell doesn't record audio." : "Your browser turns speech into text. Stillwell doesn't record audio."}</span>
        </div>
        {micError && <p role="alert" className="text-sm text-destructive">{micError}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={loading} data-testid="button-submit-intake">{loading ? "Reading…" : "See what Stillwell suggests"}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </Card>

      {result && <ResultView result={result} />}
    </div>
  </main>;
}

function ResultView({ result }: { result: Result }) {
  const { decision, read } = result;
  const urgent = decision.outcome === "go_to_er" || decision.outcome === "crisis_support";
  return <section aria-live="polite" aria-label="What Stillwell suggests" className="space-y-4">
    <Card className={`space-y-3 p-5 sm:p-6 ${urgent ? "border-2 border-destructive" : ""}`} data-testid="intake-outcome">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next step</p>
      <h2 className="font-serif text-3xl font-medium leading-tight">{decision.headline}</h2>
      {decision.outcome === "go_to_er" && <p className="text-sm">If you can't get there safely, call <a className="font-semibold underline" href="tel:911">911</a>.</p>}
      {decision.crisisLineShown && <p className="text-sm">You can call or text <a className="font-semibold underline" href="tel:988">988</a> (Suicide &amp; Crisis Lifeline) any time.</p>}
      <ul className="space-y-1 text-sm">
        {decision.reasons.map((r, i) => <li key={i}><span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.rule}</span>{r.text}</li>)}
      </ul>
      {decision.resources.map((r, i) => <p key={i} className="text-sm text-muted-foreground">{r}</p>)}
    </Card>

    {(decision.stage || decision.stageNote) && <Card className="space-y-2 p-5 sm:p-6" data-testid="intake-stage">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Protocol roadmap</p>
      {decision.stage
        ? <>
            <h3 className="font-serif text-2xl font-medium">Stillwell suggests starting at Stage {decision.stage.stage}</h3>
            <p className="text-sm">{decision.stage.name} · matches Amsterdam 2022 return-to-activity step {decision.stage.amsterdamStep}</p>
            <ul className="space-y-1 text-sm">{decision.stage.reasons.map((r, i) => <li key={i}><span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.rule}</span>{r.text}</li>)}</ul>
          </>
        : <p className="text-sm">{decision.stageNote}</p>}
    </Card>}

    {decision.followUps.length > 0 && <Card className="space-y-2 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stillwell would ask next</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{decision.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
    </Card>}

    <Card className="space-y-3 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How you feel today</p>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Symptom</th><th className="py-1 font-medium">Read as</th><th className="py-1 font-medium">AI confidence</th></tr></thead>
        <tbody>{decision.symptoms.map((s) => <tr key={s.name} className="border-t border-border">
          <td className="py-2">{s.label}</td>
          <td className="py-2">{s.levelLabel}{s.needsConfirm && <span className="ml-2 text-xs text-muted-foreground">(would ask you to confirm)</span>}</td>
          <td className="py-2">{s.confidence === null ? "–" : pct(s.confidence)}</td>
        </tr>)}</tbody>
      </table>
    </Card>

    {read.scores && <Card className="space-y-4 p-5 sm:p-6" data-testid="intake-scores">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI scores (chance each statement is true)</p>
      <ScoreGroup title="Safety: danger signs go to the ER, self-harm to 988 (0.2 or higher)" rows={[...Object.entries(read.scores.danger).map(([k, v]) => [DANGER_LABELS[k] ?? k, v] as [string, number]), ["Self-harm or hopelessness", read.scores.selfHarm]]} threshold={0.2} alarm />
      <ScoreGroup title="Other questions (0.7 or higher counts as yes)" rows={[["Symptoms getting worse", read.scores.gettingWorse], ["Earlier concussion", read.scores.priorConcussion]]} threshold={0.7} alarm />
      <ScoreGroup title="What they can do (0.7 or higher counts as yes)" rows={Object.entries(read.scores.activity).map(([k, v]) => [ACTIVITY_LABELS[k] ?? k, v])} threshold={0.7} />
      <div className="text-sm">
        <p>Seen a doctor: <strong>{read.scores.seenDoctor.choice.replaceAll("_", " ")}</strong> ({pct(read.scores.seenDoctor.confidence)} confident)</p>
        <p>When it happened: <strong>{read.scores.injuryTiming.choice.replaceAll("_", " ")}</strong> ({pct(read.scores.injuryTiming.confidence)} confident)</p>
      </div>
    </Card>}

    <p className="text-xs text-muted-foreground" data-testid="intake-meta">
      {read.source === "typesafe" ? `Read by TypeSafe (${read.model}) in ${read.latencyMs} ms` : `TypeSafe didn't answer (${read.error ?? "error"}); backup word scan only`}
      {" · "}{decision.rulesVersion}{" · "}{result.braintrustLogged ? "Sent to Braintrust" : "Not sent to Braintrust"}
    </p>
  </section>;
}

function ScoreGroup({ title, rows, threshold, alarm = false }: { title: string; rows: [string, number][]; threshold: number; alarm?: boolean }) {
  return <div className="space-y-2">
    <p className="text-sm font-medium">{title}</p>
    <ul className="space-y-1.5">
      {rows.map(([label, value]) => <li key={label} className="grid grid-cols-[minmax(0,1fr)_7rem_3rem] items-center gap-3 text-sm">
        <span className={value >= threshold ? "font-semibold" : ""}>{label}</span>
        <span className="h-2 rounded-full bg-muted" aria-hidden="true"><span className={`block h-2 rounded-full ${value >= threshold && alarm ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.max(2, Math.round(value * 100))}%` }} /></span>
        <span className="text-right tabular-nums">{pct(value)}</span>
      </li>)}
    </ul>
  </div>;
}
