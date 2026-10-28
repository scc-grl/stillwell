import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  emptySleep,
  sleepNapChoices,
  sleepQualityChoices,
  sleepWakingChoices,
  validHoursSlept,
  type SleepLog,
} from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Textarea } from "@workspace/stillwell-design-system/components/native/textarea";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { formatDate } from "@/lib/journal";
import { spacing } from "@/lib/layout";

type Props = {
  date: string;
  initial?: SleepLog | null;
  onSave: (sleep: SleepLog) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
  deleting?: boolean;
};

function ChoiceRow<T extends string | number>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
}) {
  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Button
              key={String(choice.value)}
              fullWidth={false}
              tone={selected ? "primary" : "outline"}
              accessibilityLabel={`${label}: ${choice.label}`}
              accessibilityHint={selected ? "Tap again to clear" : undefined}
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : choice.value)}
            >
              {choice.label}
            </Button>
          );
        })}
      </View>
    </View>
  );
}

export function SleepEditor({ date, initial, onSave, onDelete, onCancel, deleting }: Props) {
  const colors = useColors();
  const [sleep, setSleep] = useState<SleepLog>({ ...emptySleep(), ...(initial ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const draft: SleepLog = {
    ...sleep,
    hoursSlept: validHoursSlept(sleep.hoursSlept) ? sleep.hoursSlept : null,
  };

  function patch<K extends keyof SleepLog>(key: K, value: SleepLog[K]) {
    setSleep((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setError("");
    setSaving(true);
    try {
      await onSave({ ...draft, note: (draft.note ?? "").slice(0, 280) });
    } catch {
      setError("Your sleep entry could not be saved. Your changes are still here; try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text variant="display">Log sleep</Text>
        <Text variant="caption">
          The night ending {formatDate(date)}. Every field is optional; skip anything.
        </Text>
      </View>

      <Card>
        <Input
          label="Hours slept (approximate)"
          keyboardType="number-pad"
          maxLength={2}
          value={sleep.hoursSlept == null ? "" : String(sleep.hoursSlept)}
          onChangeText={(value) => {
            if (value === "") patch("hoursSlept", null);
            else if (/^\d{1,2}$/.test(value) && Number(value) <= 24) {
              patch("hoursSlept", Number(value));
              patch("bedtime", null);
              patch("wakeTime", null);
            }
          }}
          placeholder="e.g. 7"
          accessibilityLabel="Hours slept, approximate, from 0 to 24"
          testID="sleep-hours"
        />
        <Text variant="caption">Enter a whole number from 0 to 24. This is optional.</Text>
        <ChoiceRow
          label="Sleep quality"
          choices={sleepQualityChoices}
          value={sleep.quality}
          onChange={(value) => patch("quality", value)}
        />
        <ChoiceRow
          label="Times woke up"
          choices={sleepWakingChoices}
          value={sleep.wakings}
          onChange={(value) => patch("wakings", value)}
        />
        <ChoiceRow
          label="Daytime nap"
          choices={sleepNapChoices}
          value={sleep.nap}
          onChange={(value) => patch("nap", value)}
        />
        <Textarea
          label="Sleep note (optional)"
          value={sleep.note ?? ""}
          onChangeText={(value) => patch("note", value.slice(0, 280))}
          placeholder="Anything you want to remember about the night?"
          maxLength={280}
          accessibilityLabel="Sleep note"
        />
        <Text variant="caption">{(sleep.note ?? "").length}/280</Text>
      </Card>

      {error ? (
        <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button onPress={() => void submit()} disabled={saving || deleting} testID="save-sleep">
        {saving ? "Saving…" : "Save sleep"}
      </Button>
      <Button tone="outline" onPress={onCancel} disabled={saving || deleting} testID="cancel-sleep">
        Cancel
      </Button>
      {onDelete ? (
        <Button tone="destructive" onPress={onDelete} disabled={saving || deleting} testID="delete-sleep">
          {deleting ? "Deleting…" : "Delete sleep for this day"}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing * 4 },
  heading: { gap: spacing },
  group: { gap: spacing * 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing * 2 },
});
