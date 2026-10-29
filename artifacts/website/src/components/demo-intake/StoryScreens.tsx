import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Mic, MicOff, ShieldAlert } from "lucide-react";
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
}: {
  story: string;
  setStory: Dispatch<SetStateAction<string>>;
  selectedSample: string;
  setSelectedSample: (value: string) => void;
  onSave: () => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
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
      if (transcript) setStory((current) => `${current.trimEnd()}${current.trim() ? " " : ""}${transcript.trim()}`);
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
                className="min-h-11 whitespace-normal text-left"
                aria-pressed={selectedSample === sample.label}
                onClick={() => {
                  setSelectedSample(sample.label);
                  setStory(sample.story);
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
              {listening ? <><MicOff aria-hidden="true" /> Stop talking</> : <><Mic aria-hidden="true" /> Tap to talk</>}
            </Button>
          )}
        </Card>
        {listening && <p role="status" className="text-sm text-primary" data-testid="dictation-status">Listening. Your device is turning speech into text.</p>}
        {speechError && <p role="alert" className="text-sm text-destructive" data-testid="dictation-error">{speechError}</p>}

        <label className="block space-y-2" htmlFor="demo-story">
          <span className="text-sm font-semibold">Your story</span>
          <Textarea
            id="demo-story"
            value={story}
            onChange={(event) => {
              setStory(event.target.value);
              setSelectedSample("");
            }}
            rows={8}
            maxLength={4000}
            className="min-h-48 bg-background text-base leading-7"
            aria-describedby="story-privacy"
            data-testid="textarea-demo-story"
          />
        </label>
        <p id="story-privacy" className="text-xs text-muted-foreground">This story stays in this browser tab's temporary memory and is cleared when you refresh.</p>

        <Card className="space-y-3 bg-background p-4" data-testid="helpful-to-mention">
          <h2 className="font-semibold">Helpful to mention</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {["when and how it happened", "how you feel today", "what feels okay right now"].map((tip) => <li key={tip} className="flex items-center gap-2"><Check className="size-4 text-primary" aria-hidden="true" />{tip}</li>)}
          </ul>
        </Card>
        <div className="flex justify-end">
          <Button type="button" className="min-h-11" onClick={onSave} disabled={!story.trim()} data-testid="button-save-response">Save response</Button>
        </div>
      </Card>
      <CareBoundary />
    </>
  );
}

export function ReadingScreen({ progress, checks }: { progress: number; checks: boolean[] }) {
  const labels = ["checked for anything urgent", "noted how you feel today", "finding your place on the recovery roadmap"];
  return (
    <>
      <section className="mx-auto max-w-2xl space-y-7 py-8 sm:py-16" aria-live="polite" data-testid="reading-screen">
        <p className="eyebrow">Part 1 of 2 · Your story</p>
        <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Stillwell is reading your story</h1>
        <div className="space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Local demo progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} data-testid="reading-progress">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">A short, local demo transition. No AI or server is involved.</p>
        </div>
        <ul className="space-y-4">
          {labels.map((label, index) => (
            <li key={label} className="flex items-center gap-3 text-base" data-testid={`reading-check-${index + 1}`}>
              <span className={`flex size-8 items-center justify-center rounded-full ${checks[index] ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}>
                {checks[index] ? <Check className="size-4" aria-hidden="true" /> : <span className="size-2 rounded-full bg-current" />}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>
      <CareBoundary />
    </>
  );
}

export function EmergencyScreen({ story }: { story: string }) {
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
        <blockquote className="rounded-lg bg-secondary p-4 text-base leading-7" data-testid="emergency-story-quote">“{story}”</blockquote>
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
