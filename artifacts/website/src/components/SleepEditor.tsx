import { useState } from "react";
import {
  emptySleep,
  formatDate,
  sleepDurationLabel,
  sleepDurationMinutes,
  sleepNapChoices,
  sleepQualityChoices,
  sleepWakingChoices,
  validHoursSlept,
  type SleepLog,
} from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";

type Props = {
  date: string;
  initial?: SleepLog | null;
  onSave: (sleep: SleepLog) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
  deleting?: boolean;
};

function ChoiceGroup<T extends string | number>({ label, choices, value, onChange }: {
  label: string;
  choices: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
}) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">{label}</legend>
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return <Button
          key={String(choice.value)}
          size="sm"
          variant={selected ? "default" : "outline"}
          aria-pressed={selected}
          title={selected ? "Select again to clear" : undefined}
          onClick={() => onChange(selected ? null : choice.value)}
        >{choice.label}</Button>;
      })}
    </div>
  </fieldset>;
}

export function SleepEditor({ date, initial, onSave, onDelete, onCancel, deleting }: Props) {
  const [sleep, setSleep] = useState<SleepLog>({ ...emptySleep(), ...(initial ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch<K extends keyof SleepLog>(key: K, value: SleepLog[K]) {
    setSleep((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...sleep,
        hoursSlept: validHoursSlept(sleep.hoursSlept) ? sleep.hoursSlept : null,
        bedtime: sleep.hoursSlept == null ? sleep.bedtime ?? null : null,
        wakeTime: sleep.hoursSlept == null ? sleep.wakeTime ?? null : null,
        note: (sleep.note ?? "").slice(0, 280),
      });
    } catch {
      setError("Your sleep entry could not be saved. Your changes are still here; try again.");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || Boolean(deleting);

  return <div className="space-y-5">
    <header className="space-y-2">
      <h2 className="font-serif text-3xl font-medium">Log sleep</h2>
      <p className="text-sm leading-6 text-muted-foreground">The night ending {formatDate(date)}. Every field is optional; skip anything.</p>
    </header>

    <Card className="space-y-5 p-5">
      <div className="space-y-2">
        <label htmlFor="sleep-hours" className="text-sm font-medium">Hours slept (approximate)</label>
        <Input
          id="sleep-hours"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{1,2}"
          maxLength={2}
          value={sleep.hoursSlept == null ? "" : String(sleep.hoursSlept)}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") patch("hoursSlept", null);
            else if (/^\d{1,2}$/.test(value) && Number(value) <= 24) {
              patch("hoursSlept", Number(value));
              patch("bedtime", null);
              patch("wakeTime", null);
            }
          }}
          aria-describedby="sleep-hours-help"
          data-testid="input-sleep-hours"
        />
        <p id="sleep-hours-help" className="text-xs text-muted-foreground">Enter a whole number from 0 to 24. This is optional.</p>
      </div>
      <ChoiceGroup label="Sleep quality" choices={sleepQualityChoices} value={sleep.quality} onChange={(value) => patch("quality", value)} />
      <ChoiceGroup label="Times woke up" choices={sleepWakingChoices} value={sleep.wakings} onChange={(value) => patch("wakings", value)} />
      <ChoiceGroup label="Daytime nap" choices={sleepNapChoices} value={sleep.nap} onChange={(value) => patch("nap", value)} />
      <div className="space-y-2">
        <label htmlFor="sleep-note" className="text-sm font-medium">Sleep note (optional)</label>
        <Textarea id="sleep-note" value={sleep.note ?? ""} onChange={(event) => patch("note", event.target.value.slice(0, 280))} placeholder="Anything you want to remember about the night?" maxLength={280} />
        <p className="text-xs text-muted-foreground">{(sleep.note ?? "").length}/280</p>
      </div>
    </Card>

    {error && <Card role="alert" className="border-destructive p-4 text-sm text-destructive">{error}</Card>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onDelete && <Button variant="destructive" onClick={onDelete} disabled={busy} data-testid="button-delete-sleep">Delete sleep for this day</Button>}
      <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button onClick={() => void submit()} disabled={busy} data-testid="button-save-sleep">{saving ? "Saving…" : "Save sleep"}</Button>
    </div>
  </div>;
}
