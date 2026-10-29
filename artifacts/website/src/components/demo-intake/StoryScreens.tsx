import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CircleDot, Mic, MicOff, ShieldAlert } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { CARE_BOUNDARY, STORY_SAMPLES } from "./demo-data";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function CareBoundary() {
  return <p className="mt-10 border-t border-border pt-5 text-xs leading-5 text-muted-foreground" data-testid="care-boundary">{CARE_BOUNDARY}</p>;
}

export function StoryScreen({
  story,
  setStory,
  selectedSample,
  setSelectedSample,
  onSave,
  inputMode,
  setInputMode,
  pending = false,
}: {
  story: string;
  setStory: Dispatch<SetStateAction<string>>;
  selectedSample: string;
  setSelectedSample: (value: string) => void;
  onSave: () => void;
  inputMode: "typed" | "voice";
  setInputMode: (mode: "typed" | "voice") => void;
  pending?: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const canTalk = getSpeechRecognition() !== null;
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleTalk = () => {
    setSpeechError("");
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognizer = new Recognition();
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = "en-US";
    recognizer.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index]?.isFinal) transcript += event.results[index][0].transcript;
      }
      if (transcript) {
        setInputMode("voice");
        setStory((current) => `${current.trimEnd()}${current.trim() ? " " : ""}${transcript.trim()}`);
      }
    };
    recognizer.onerror = (event) => {
      setSpeechError(event.error === "not-allowed"
        ? "Microphone access isn't available. You can type instead, or allow microphone access and try again."
        : "Talking stopped. You can try again or type instead.");
    };
    recognizer.onend = () => setListening(false);
    recognitionRef.current = recognizer;
    recognizer.start();
    setListening(true);
  };

  return (
    <>
      <header className="mb-7 space-y-3">
        <p className="eyebrow" data-testid="story-eyebrow">Part 1 of 2 · Your story</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl" data-testid="story-heading">Tell us your story</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">In your own words, at your own pace. Pause whenever you need to.</p>
      </header>

      <Card className="space-y-6 p-5 sm:p-8" data-testid="story-form-card">
        <section className="space-y-3" aria-labelledby="sample-stories-label">
          <h2 id="sample-stories-label" className="text-sm font-semibold">Start from a sample story · or write or talk your own</h2>
          <div className="flex flex-wrap gap-2">
            {STORY_SAMPLES.map((sample) => (
              <Button
                key={sample.label}
                type="button"
                variant={selectedSample === sample.label ? "secondary" : "outline"}
                className={`min-h-11 whitespace-normal text-left ${selectedSample === sample.label ? "border-2 border-primary bg-background" : ""}`}
                aria-pressed={selectedSample === sample.label}
                onClick={() => {
                  setSelectedSample(sample.label);
                  setStory(sample.story);
                  setInputMode("typed");
                  window.requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                data-testid={`sample-${sample.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
              >
                {sample.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground" data-testid="fictional-story-note">Every sample story is fictional and made up for this demo.</p>
        </section>

        <Card className="flex flex-col gap-3 border-primary/20 bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="talk-card">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-primary">
              <Mic className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Tap to talk</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Your device turns speech into text. Stillwell doesn't keep audio.</p>
              {!canTalk && <p className="mt-2 text-sm text-muted-foreground" data-testid="speech-unavailable">Speech recognition isn't available in this browser. You can type your story or use your keyboard's microphone.</p>}
            </div>
          </div>
          {canTalk && (
            <Button
              type="button"
              variant={listening ? "secondary" : "outline"}
              className="min-h-11 shrink-0"
              aria-pressed={listening}
              onClick={toggleTalk}
              data-testid="button-toggle-dictation"
            >
              {listening ? <><MicOff aria-hidden="true" /> Listening… tap to stop</> : <><Mic aria-hidden="true" /> Tap to talk</>}
            </Button>
          )}
        </Card>
        {listening && <p role="status" className="text-sm text-primary" data-testid="dictation-status">Listening. Your device is turning speech into text.</p>}
        {speechError && <p role="alert" className="text-sm text-destructive" data-testid="dictation-error">{speechError}</p>}

        <label className="block space-y-2" htmlFor="demo-story">
          <span className="text-sm font-semibold">Your story</span>
          <Textarea
            ref={textareaRef}
            id="demo-story"
            value={story}
            onChange={(event) => {
              setStory(event.target.value);
              setSelectedSample("");
              setInputMode("typed");
            }}
            rows={8}
            maxLength={4000}
            className="min-h-48 bg-background text-base leading-7"
            aria-describedby="story-privacy"
            data-testid="textarea-demo-story"
          />
        </label>
        <p id="story-privacy" className="text-xs leading-5 text-muted-foreground">Your story is sent to this demo's intake service to be read. It isn't saved to an account or recovery record, and refreshing clears the text from this tab.</p>

        <Card className="space-y-3 bg-background p-4" data-testid="helpful-to-mention">
          <h2 className="font-semibold">Helpful to mention</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-1">
            <li><strong>When and how it happened.</strong> For example: two weeks ago, at practice.</li>
            <li><strong>How you feel today.</strong> For example: headaches, fog, tiredness.</li>
            <li><strong>What feels okay right now.</strong> For example: walking, screens, a workout.</li>
          </ul>
          <p className="text-sm leading-6 text-muted-foreground">Anything you leave out, you can add when you check your answers.</p>
        </Card>
        <div className="flex justify-end">
          <Button type="button" className="min-h-11" onClick={onSave} disabled={!story.trim() || pending} data-testid="button-save-response">{pending ? "Reading…" : "Save response"}</Button>
        </div>
      </Card>
      <CareBoundary />
    </>
  );
}

export function ReadingScreen() {
  const labels = ["Checked for anything urgent", "Noted how you feel today", "Finding your place on the recovery roadmap"];
  return (
    <>
      <section className="mx-auto max-w-2xl space-y-7 py-8 sm:py-16" aria-live="polite" data-testid="reading-screen">
        <p className="eyebrow">One moment</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Stillwell is reading your story</h1>
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Reading your story" aria-valuemin={0} aria-valuemax={100} data-testid="reading-progress">
            <div className="h-full w-1/3 rounded-full bg-primary" />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">This takes a few seconds. If anything sounds urgent, Stillwell will tell you right away.</p>
        </div>
        <ul className="space-y-4">
          {labels.map((label) => (
            <li key={label} className="flex items-center gap-3 text-base">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary"><CircleDot className="size-4" aria-hidden="true" /></span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mx-auto max-w-2xl text-center text-sm leading-6 text-muted-foreground">Stillwell uses AI only to read what you said. Its suggestions come from fixed rules based on the Amsterdam 2022 concussion consensus.</p>
      <CareBoundary />
    </>
  );
}

export function EmergencyScreen({ quotes }: { quotes: string[] }) {
  return (
    <>
      <Card className="mx-auto max-w-3xl space-y-6 border-destructive/40 p-5 sm:p-8" role="alert" data-testid="emergency-screen">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><ShieldAlert className="size-6" aria-hidden="true" /></span>
          <div>
            <p className="eyebrow text-destructive">Immediate care</p>
            <h1 className="display mt-2 text-3xl font-medium sm:text-4xl" data-testid="emergency-heading">Please get emergency care now</h1>
          </div>
        </div>
        <p className="rounded-lg bg-secondary p-4 text-base leading-7" data-testid="emergency-story-quote">
          {quotes.length ? <>You mentioned {quotes.map((quote, index) => <span key={`${quote}-${index}`}>{index > 0 ? " and " : ""}<q>{quote}</q></span>)}. After a head injury, these can be signs of something serious.</> : "After a head injury, these can be signs of something serious."}
        </p>
        <p className="text-lg font-semibold">Please go to your nearest emergency center now, or call 911.</p>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7">
          <li>Don't drive yourself. Ask someone to take you.</li>
          <li>If someone is with you, show them this screen.</li>
        </ul>
        <p className="text-sm leading-6 text-muted-foreground">Stillwell has paused your intake. You can come back to it after you've been seen.</p>
      </Card>
      <CareBoundary />
    </>
  );
}

export function CrisisScreen({ onExit }: { onExit: () => void }) {
  return (
    <>
      <Card className="mx-auto max-w-3xl space-y-6 border-destructive/40 p-6 sm:p-9" role="alert" data-testid="crisis-screen">
        <p className="eyebrow text-destructive">Support comes first</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Please reach out now.</h1>
        <p className="text-lg leading-7">If you may hurt yourself or feel unsafe, call or text <strong>988</strong> in the U.S. or Canada for immediate crisis support. If you are in immediate danger, call your local emergency number or go to an emergency department.</p>
        <p className="text-sm leading-6 text-muted-foreground">If you can, tell someone you trust and ask them to stay with you. Stillwell has stopped this intake; your safety comes first.</p>
        <Button type="button" variant="outline" className="min-h-11 w-fit" onClick={onExit}>Exit demo</Button>
      </Card>
      <CareBoundary />
    </>
  );
}

export function TapQuestionsScreen({
  message,
  onSafety,
  onContinue,
  onRetry,
  retrying = false,
}: {
  message: string;
  onSafety: (outcome: "go_to_er" | "crisis_support") => void;
  onContinue: () => void;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const [danger, setDanger] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<string | null>(null);
  return (
    <>
      <header className="mb-7 space-y-3">
        <p className="eyebrow">A few quick questions</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Let's check what you shared.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">{message}</p>
      </header>
      <Card className="space-y-6 p-5 sm:p-8">
        <fieldset className="space-y-3">
          <legend className="font-semibold">Are you having a severe or urgent symptom right now, such as repeated vomiting, a seizure, double vision, or a worsening severe headache?</legend>
          <div className="flex flex-wrap gap-2">
            {["Yes", "No", "Not sure"].map((answer) => <Button key={answer} type="button" variant={danger === answer ? "secondary" : "outline"} className="min-h-11" aria-pressed={danger === answer} onClick={() => {
              setDanger(answer);
              if (answer === "Yes") onSafety("go_to_er");
            }}>{answer}</Button>)}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-semibold">Are you having thoughts of hurting yourself or not wanting to be here?</legend>
          <div className="flex flex-wrap gap-2">
            {["Yes", "No", "Not sure"].map((answer) => <Button key={answer} type="button" variant={crisis === answer ? "secondary" : "outline"} className="min-h-11" aria-pressed={crisis === answer} onClick={() => {
              setCrisis(answer);
              if (answer === "Yes") onSafety("crisis_support");
            }}>{answer}</Button>)}
          </div>
        </fieldset>
        <p className="text-sm leading-6 text-muted-foreground">Stillwell couldn't read this just now, so no answers have been inferred. You can still review the story and add details yourself.</p>
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" onClick={onRetry} disabled={retrying}>{retrying ? "Trying again…" : "Try again"}</Button>
          <Button type="button" className="min-h-11" onClick={onContinue} disabled={danger === null || crisis === null}>Review my story</Button>
        </div>
      </Card>
      <CareBoundary />
    </>
  );
}
