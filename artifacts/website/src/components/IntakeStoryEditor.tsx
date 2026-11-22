import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";

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
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function IntakeStoryEditor({
  story,
  setStory,
  onSubmit,
  pending,
}: {
  story: string;
  setStory: (story: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const storyRef = useRef(story);
  storyRef.current = story;
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [limitNotice, setLimitNotice] = useState("");
  const canTalk = getSpeechRecognition() !== null;

  useEffect(() => () => detachRecognition(), []);

  function detachRecognition() {
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (!active) return;
    // stop() can emit a final result asynchronously. Do not alter the story
    // after submit/back/unmount, or expose a transcript on another screen.
    active.onresult = null;
    active.onerror = null;
    active.onend = null;
    try { active.stop(); } catch { /* Already ended; never log recognition events. */ }
  }

  function stopListening() {
    detachRecognition();
    setListening(false);
  }

  function toggleTalk() {
    setSpeechError("");
    setLimitNotice("");
    if (listening) {
      // An explicit stop lets the browser deliver its final transcript first.
      // Keep submission disabled until onend, so that text can be reviewed.
      try { recognitionRef.current?.stop(); } catch { stopListening(); }
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
      if (!transcript.trim()) return;
      const currentStory = storyRef.current;
      const addition = `${currentStory.trimEnd()}${currentStory.trim() ? " " : ""}${transcript.trim()}`;
      if (addition.length > 4000) {
        setLimitNotice("This dictation would exceed the 4,000-character limit, so it was not added. Your existing story is unchanged.");
        stopListening();
        return;
      }
      storyRef.current = addition;
      setStory(addition);
    };
    recognizer.onerror = (event) => {
      setSpeechError(event.error === "not-allowed"
        ? "Microphone access was not allowed. You can type instead or use your device keyboard’s dictation."
        : "Dictation stopped. You can try again, type instead, or use your device keyboard’s dictation.");
    };
    recognizer.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognizer;
    try {
      recognizer.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setSpeechError("Dictation could not start. You can type instead or use your device keyboard’s dictation.");
    }
  }

  function submit() {
    stopListening();
    onSubmit();
  }

  return <>
    <header className="space-y-3">
      <p className="eyebrow">Your story</p>
      <h1 className="display text-4xl font-medium leading-tight sm:text-5xl">Tell us your story</h1>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">In your own words, at your own pace. Pause whenever you need to.</p>
    </header>

    <Card className="space-y-5 p-5 sm:p-7" data-testid="card-patient-intake-story">
      <Card className="flex flex-col gap-3 border-primary/20 bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="card-patient-dictation">
        <div>
          <h2 className="font-semibold">Speak or type</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Your browser or operating system may handle speech recognition. Stillwell does not keep audio.</p>
          {!canTalk && <p className="mt-2 text-sm leading-6 text-muted-foreground" data-testid="text-dictation-unavailable">Speech recognition is not available in this browser. You can type or use your device keyboard’s dictation.</p>}
        </div>
        {canTalk && <Button
          type="button"
          variant={listening ? "secondary" : "outline"}
          className="min-h-11 shrink-0"
          aria-pressed={listening}
          onClick={toggleTalk}
          data-testid="button-toggle-intake-dictation"
        >{listening ? <><MicOff aria-hidden="true" /> Listening · tap to stop</> : <><Mic aria-hidden="true" /> Tap to talk</>}</Button>}
      </Card>
      {listening && <p role="status" className="text-sm text-primary" data-testid="status-intake-dictation">Your device is turning speech into text. Stop dictation and review your words before continuing.</p>}
      {speechError && <p role="alert" className="text-sm leading-6 text-destructive" data-testid="alert-intake-dictation">{speechError}</p>}
      {limitNotice && <p role="alert" className="text-sm leading-6 text-destructive" data-testid="alert-dictation-limit">{limitNotice}</p>}

      <label className="block space-y-2" htmlFor="patient-intake-story">
        <span className="text-sm font-semibold">Your story</span>
        <Textarea
          id="patient-intake-story"
          value={story}
          onChange={(event) => {
            setLimitNotice("");
            const nextStory = event.target.value.slice(0, 4000);
            storyRef.current = nextStory;
            setStory(nextStory);
          }}
          rows={8}
          maxLength={4000}
          className="min-h-48 bg-background text-base leading-7"
          aria-describedby="patient-intake-story-guidance patient-intake-character-count"
          data-testid="textarea-patient-intake-story"
        />
      </label>
      <div className="flex flex-wrap justify-between gap-2 text-xs leading-5 text-muted-foreground">
        <p id="patient-intake-story-guidance">Please avoid names and contact details. The server’s basic email and phone filter is not full de-identification.</p>
        <p id="patient-intake-character-count" aria-live="polite">{story.length}/4,000 characters</p>
      </div>
      <Card className="space-y-3 bg-background p-4">
        <h2 className="font-semibold">Helpful to mention</h2>
        <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
          <li><strong>When and how it happened.</strong></li>
          <li><strong>How you feel today.</strong></li>
          <li><strong>What feels okay right now.</strong></li>
        </ul>
        <p className="text-sm leading-6 text-muted-foreground">Anything you leave out can be added when you check your answers.</p>
      </Card>
      <div className="flex justify-end">
        <Button type="button" className="min-h-11" onClick={submit} disabled={!story.trim() || pending || listening} data-testid="button-review-patient-story">{pending ? "Reading…" : "Review my story"}</Button>
      </div>
    </Card>
  </>;
}
