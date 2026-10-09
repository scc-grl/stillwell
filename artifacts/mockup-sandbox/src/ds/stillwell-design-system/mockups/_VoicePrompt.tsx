import { useEffect, useRef } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";

export type ResponseMode = "voice" | "manual";
export type VoiceStage = "prompt" | "speaking" | "review";

type VoicePromptProps = {
  prompt: string;
  mode: ResponseMode;
  onModeChange: (mode: ResponseMode) => void;
  draft: string;
  confirmed: string;
  onDraftChange: (value: string) => void;
  onConfirm: () => void;
  onClear: () => void;
  voiceStage: VoiceStage;
  onVoiceStageChange: (stage: VoiceStage) => void;
  noteOnly?: boolean;
};

const exampleReply =
  "A few things felt different. I took a quiet break and made a simple meal.";

export function VoicePrompt({
  prompt,
  mode,
  onModeChange,
  draft,
  confirmed,
  onDraftChange,
  onConfirm,
  onClear,
  voiceStage,
  onVoiceStageChange,
  noteOnly = false,
}: VoicePromptProps) {
  const stageChangeRef = useRef(onVoiceStageChange);
  const previousPrompt = useRef(prompt);
  stageChangeRef.current = onVoiceStageChange;

  useEffect(() => {
    if (previousPrompt.current === prompt) return;
    previousPrompt.current = prompt;
    stageChangeRef.current("prompt");
  }, [prompt]);

  const manualNote = <div className="space-y-2">
    <label htmlFor="manual-question-note" className="block text-sm font-medium">Your typed test note · optional</label>
    <Textarea id="manual-question-note" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="A few words, or leave blank…" />
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant={confirmed ? "outline" : "default"} disabled={!draft.trim()} onClick={onConfirm}>{confirmed ? "Update kept note" : "Keep this note"}</Button>
      {(draft || confirmed) && <Button type="button" size="sm" variant="ghost" onClick={onClear}>Clear this note</Button>}
    </div>
    <p className="text-xs leading-5 text-muted-foreground">Notes are kept only after confirmation. They do not choose a rating or routine status.</p>
  </div>;

  return (
    <section className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">This question</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={mode === "voice" ? "default" : "outline"} aria-pressed={mode === "voice"} onClick={() => onModeChange("voice")}>Voice-led</Button>
          <Button type="button" size="sm" variant={mode === "manual" ? "default" : "outline"} aria-pressed={mode === "manual"} onClick={() => onModeChange("manual")}>Type</Button>
        </div>
      </div>
      {mode === "voice" ? (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A gentle prompt</p>
          <p className="text-sm leading-5">{prompt}</p>
          <p className="text-xs leading-5 text-muted-foreground">Voice interaction concept only · microphone off · nothing is heard, recorded, transcribed, or sent.</p>
          {voiceStage === "prompt" && <Button type="button" size="sm" variant="secondary" onClick={() => onVoiceStageChange("speaking")}>Preview speaking screen</Button>}
          {voiceStage === "speaking" && <div className="space-y-2">
            <p role="status" className="text-sm font-medium">Speaking-screen concept · microphone off</p>
            <p className="text-xs leading-5 text-muted-foreground">No live timer or audio controls. You can use the manual answer below at any time.</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => { if (!draft.trim()) onDraftChange(exampleReply); onVoiceStageChange("review"); }}>Preview a typed example reply</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onVoiceStageChange("prompt")}>Back to prompt</Button>
          </div>}
          {voiceStage === "review" && <div className="space-y-2">
            <p className="text-sm font-medium">Review this text before keeping it</p>
              <p className="text-xs leading-5 text-muted-foreground">Typed test text—not captured speech or a transcript. Example replies are synthetic. Edit or clear it; it is kept only after confirmation.</p>
              <label htmlFor="voice-example-reply" className="block text-sm font-medium">Editable test reply</label>
            <Textarea id="voice-example-reply" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="Type a note in your own words, or leave blank…" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!draft.trim()} onClick={onConfirm}>{confirmed ? "Update kept note" : "Keep this note"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={onClear}>Clear this note</Button>
            </div>
          </div>}
        </div>
      ) : (
        noteOnly ? manualNote : <details className="space-y-2"><summary className="cursor-pointer text-sm font-medium">{draft || confirmed ? "Edit optional note" : "Add an optional note"}</summary>{manualNote}</details>
      )}
      {confirmed && <p className="text-xs leading-5 text-muted-foreground">Kept note: {confirmed}</p>}
    </section>
  );
}
