import { useState } from "react";
import type { ActivityStatus, RecoveryLogInput } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { activityChoices } from "@workspace/recovery-journal";

type Props = {
  initial: RecoveryLogInput;
  onSave?: (log: RecoveryLogInput) => Promise<void>;
  onChange?: (log: RecoveryLogInput) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  saveLabel?: string;
  cancelLabel?: string;
};

type StatusPickerProps = {
  label: string;
  value: ActivityStatus;
  onChange: (status: ActivityStatus) => void;
};

function StatusPicker({ label, value, onChange }: StatusPickerProps) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">{label}</legend>
    <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} status`}>
      {activityChoices.map((choice) => <Button
        key={choice.value}
        size="sm"
        variant={value === choice.value ? "default" : "outline"}
        aria-pressed={value === choice.value}
        onClick={() => onChange(choice.value)}
      >{choice.label}</Button>)}
    </div>
  </fieldset>;
}

export function ActivitiesEditor({
  initial,
  onSave,
  onChange,
  onCancel,
  title = "Log food, movement and pacing",
  description = "A record of your day, at your pace. This is not a treatment plan.",
  saveLabel = "Save food, movement and pacing",
  cancelLabel = "Cancel",
}: Props) {
  const [log, setLog] = useState<RecoveryLogInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch<K extends keyof RecoveryLogInput>(key: K, value: RecoveryLogInput[K]) {
    const next = { ...log, [key]: value };
    setLog(next);
    onChange?.(next);
  }

  async function submit() {
    if (!onSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave(log);
    } catch {
      setError("Your activities could not be saved. Your changes are still here; try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-5">
    <header className="space-y-2">
      <h2 className="font-serif text-3xl font-medium">{title}</h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </header>

    <Card className="space-y-5 p-5">
      <div className="space-y-2">
        <h3 className="font-serif text-2xl font-medium">What did you choose today?</h3>
        <p className="text-sm leading-6 text-muted-foreground">Record what you did, did not do, or did not plan. No targets are set here.</p>
      </div>
      <StatusPicker label="Food & hydration" value={log.dietStatus} onChange={(value) => patch("dietStatus", value)} />
      <div className="space-y-2">
        <label htmlFor="food-note" className="text-sm font-medium">Food or drink notes</label>
        <Textarea id="food-note" value={log.dietNote} onChange={(event) => patch("dietNote", event.target.value)} placeholder="What felt manageable, or what did you skip?" maxLength={2000} />
      </div>
      <StatusPicker label="Movement & rest" value={log.exerciseStatus} onChange={(value) => patch("exerciseStatus", value)} />
      <div className="space-y-2">
        <label htmlFor="movement-note" className="text-sm font-medium">Movement or rest notes</label>
        <Textarea id="movement-note" value={log.exerciseNote} onChange={(event) => patch("exerciseNote", event.target.value)} placeholder="Record the activity or rest you chose." maxLength={2000} />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">Ask a clinician what activity is appropriate for you. This journal does not set exercise intensity or progression.</p>
      <StatusPicker label="Meditation or a quiet pause" value={log.meditationStatus} onChange={(value) => patch("meditationStatus", value)} />
      <div className="space-y-2">
        <label htmlFor="pause-minutes" className="text-sm font-medium">Minutes (optional)</label>
        <Input
          id="pause-minutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={240}
          value={String(log.meditationMinutes)}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            patch("meditationMinutes", Number.isFinite(parsed) ? Math.max(0, Math.min(240, parsed)) : 0);
          }}
          maxLength={3}
          aria-label="Meditation minutes"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="pause-note" className="text-sm font-medium">Pause notes (optional)</label>
        <Textarea id="pause-note" value={log.meditationNote} onChange={(event) => patch("meditationNote", event.target.value)} placeholder="Anything you want to remember about the pause?" maxLength={2000} />
      </div>
    </Card>

    <Card className="space-y-4 bg-secondary p-5">
      <h3 className="font-serif text-2xl font-medium">Pacing and the rest of the day</h3>
      <div className="space-y-2">
        <label htmlFor="pacing-note" className="text-sm font-medium">Breaks, changes, or things you chose to leave for later</label>
        <Textarea id="pacing-note" value={log.note} onChange={(event) => patch("note", event.target.value)} placeholder="Write a short note, or leave this blank." maxLength={2000} />
      </div>
      <p className="text-sm text-muted-foreground">Entry date: {log.date}</p>
    </Card>

    {error && <Card role="alert" className="border-destructive p-4 text-sm text-destructive">{error}</Card>}
    {(onSave || onCancel) && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onCancel && <Button variant="outline" onClick={onCancel} disabled={saving}>{cancelLabel}</Button>}
      {onSave && <Button onClick={() => void submit()} disabled={saving}>{saving ? "Saving…" : saveLabel}</Button>}
    </div>}
  </div>;
}
