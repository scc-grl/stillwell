import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type {
  ActivityStatus,
  RecoveryLogInput,
  SymptomEntry,
} from "@workspace/api-client-react";
import { SaveRecoveryLogBody } from "@workspace/api-zod";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { Textarea } from "@workspace/stillwell-design-system/components/native/textarea";
import { localDate, symptomChoices } from "@/lib/journal";
import { SeverityStepper } from "@/components/SeverityStepper";
import { StatusPicker } from "@/components/StatusPicker";

type Props = {
  initial: RecoveryLogInput;
  onSave?: (log: RecoveryLogInput) => Promise<void>;
  onChange?: (log: RecoveryLogInput) => void;
  onCancel?: () => void;
  saveLabel?: string;
  title?: string;
  description?: string;
};

export function RecoveryLogEditor({
  initial,
  onSave,
  onChange,
  onCancel,
  saveLabel = "Save this check-in",
  title = "Daily check-in",
  description = "A record of your day, at your pace. This is not a treatment plan.",
}: Props) {
  const colors = useColors();
  const [log, setLog] = useState<RecoveryLogInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patchLog<K extends keyof RecoveryLogInput>(
    key: K,
    value: RecoveryLogInput[K],
  ) {
    const next = { ...log, [key]: value };
    setLog(next);
    onChange?.(next);
  }

  function patchSymptom(name: SymptomEntry["name"], severity: number) {
    const next = {
      ...log,
      symptoms: [
        ...log.symptoms.filter((entry) => entry.name !== name),
        { name, severity },
      ].sort(
        (a, b) =>
          symptomChoices.findIndex((item) => item.name === a.name) -
          symptomChoices.findIndex((item) => item.name === b.name),
      ),
    };
    setLog(next);
    onChange?.(next);
  }

  async function submit() {
    setError("");
    if (!onSave) return;
    const parsed = SaveRecoveryLogBody.safeParse(log);
    if (!parsed.success) {
      setError("Please check the entry and try saving again.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data);
    } catch {
      setError("Your check-in could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text variant="display">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>

      <Card>
        <Text variant="heading">How are you feeling?</Text>
        <Text variant="caption">
          Rate only what you want to record. Leave a symptom unselected to skip
          it.
        </Text>
        {symptomChoices.map((choice) => (
          <SeverityStepper
            key={choice.name}
            label={choice.label}
            value={
              log.symptoms.find((item) => item.name === choice.name)?.severity
            }
            onChange={(severity) => patchSymptom(choice.name, severity)}
          />
        ))}
      </Card>

      <Card>
        <Text variant="heading">What did you choose today?</Text>
        <Text variant="caption">
          Record what you did, did not do, or did not plan. No targets are set
          here.
        </Text>
        <StatusPicker
          label="Food & hydration"
          value={log.dietStatus}
          onChange={(value: ActivityStatus) => patchLog("dietStatus", value)}
        />
        <Textarea
          label="Food or drink notes"
          value={log.dietNote}
          onChangeText={(value) => patchLog("dietNote", value)}
          placeholder="What felt manageable, or what did you skip?"
          maxLength={2000}
          accessibilityLabel="Food and hydration notes"
        />
        <StatusPicker
          label="Movement & rest"
          value={log.exerciseStatus}
          onChange={(value: ActivityStatus) =>
            patchLog("exerciseStatus", value)
          }
        />
        <Textarea
          label="Movement or rest notes"
          value={log.exerciseNote}
          onChangeText={(value) => patchLog("exerciseNote", value)}
          placeholder="Record the activity or rest you chose."
          maxLength={2000}
          accessibilityLabel="Movement and rest notes"
        />
        <Text variant="caption">
          Ask a clinician what activity is appropriate for you. This journal
          does not set exercise intensity or progression.
        </Text>
        <StatusPicker
          label="Meditation or a quiet pause"
          value={log.meditationStatus}
          onChange={(value: ActivityStatus) =>
            patchLog("meditationStatus", value)
          }
        />
        <Input
          label="Minutes (optional)"
          value={String(log.meditationMinutes)}
          onChangeText={(value) => {
            const parsed = Number.parseInt(value, 10);
            patchLog(
              "meditationMinutes",
              Number.isFinite(parsed) ? Math.max(0, Math.min(240, parsed)) : 0,
            );
          }}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Meditation minutes"
        />
        <Textarea
          label="Pause notes (optional)"
          value={log.meditationNote}
          onChangeText={(value) => patchLog("meditationNote", value)}
          placeholder="Anything you want to remember about the pause?"
          maxLength={2000}
          accessibilityLabel="Meditation notes"
        />
      </Card>

      <Card tone="sage">
        <Text variant="heading">Pacing and the rest of the day</Text>
        <Textarea
          label="Breaks, changes, or things you chose to leave for later"
          value={log.note}
          onChangeText={(value) => patchLog("note", value)}
          placeholder="Write a short note, or leave this blank."
          maxLength={2000}
          accessibilityLabel="Pacing notes"
        />
        <Text variant="caption">Entry date: {log.date || localDate()}</Text>
      </Card>

      {error ? (
        <Text
          variant="caption"
          color={colors.destructive}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
      {onSave ? (
        <Button
          testID="save-recovery-log"
          onPress={() => void submit()}
          disabled={saving}
        >
          {saving ? "Saving…" : saveLabel}
        </Button>
      ) : null}
      {onCancel ? (
        <Button
          tone="outline"
          onPress={onCancel}
          disabled={saving}
          testID="cancel-recovery-log"
        >
          Cancel
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing * 4,
  },
  heading: {
    gap: spacing,
  },
});
