import { createElement, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { nativeTheme } from "@workspace/stillwell-design-system/lib/native-theme";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  emptySleep,
  sleepDurationLabel,
  sleepDurationMinutes,
  sleepDurationNote,
  sleepNapChoices,
  sleepQualityChoices,
  sleepWakingChoices,
  validSleepTime,
  type SleepLog,
} from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
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

function toDate(value: string | null | undefined, fallback: string) {
  const time = validSleepTime(value) ? value : fallback;
  const date = new Date();
  date.setHours(Number(time.slice(0, 2)), Number(time.slice(3)), 0, 0);
  return date;
}

function toTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Native time picker on iOS/Android; browser time input on web preview. Clearable. */
function TimeField({
  label,
  value,
  fallback,
  onChange,
  testID,
}: {
  label: string;
  value: string | null | undefined;
  fallback: string;
  onChange: (value: string | null) => void;
  testID: string;
}) {
  const colors = useColors();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTime, setIosTime] = useState(() => toDate(value, fallback));
  const display = validSleepTime(value) ? value : "Not set";

  function open() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: toDate(value, fallback),
        mode: "time",
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(toTime(date));
        },
      });
      return;
    }
    setIosTime(toDate(value, fallback));
    setIosOpen((current) => !current);
  }

  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      {Platform.OS === "web" ? (
        createElement("input", {
          type: "time",
          value: value ?? "",
          "aria-label": label,
          "data-testid": testID,
          onChange: (event: { target: { value: string } }) =>
            onChange(event.target.value || null),
          style: {
            minHeight: spacing * 11,
            padding: spacing * 2,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: colors.input,
            borderRadius: nativeTheme.radius,
            backgroundColor: colors.card,
            color: colors.foreground,
            fontFamily: nativeTheme.fonts.body,
          },
        })
      ) : (
        <View style={styles.row}>
          <Button
            fullWidth={false}
            tone="outline"
            onPress={open}
            accessibilityLabel={`${label}: ${display}. Choose time`}
            accessibilityState={{ expanded: iosOpen }}
            testID={testID}
          >
            {display}
          </Button>
          {validSleepTime(value) ? (
            <Button
              fullWidth={false}
              tone="outline"
              onPress={() => {
                setIosOpen(false);
                onChange(null);
              }}
              accessibilityLabel={`Clear ${label.toLowerCase()}`}
            >
              Clear
            </Button>
          ) : null}
        </View>
      )}
      {Platform.OS === "ios" && iosOpen ? (
        <View style={styles.group}>
          <DateTimePicker
            value={iosTime}
            mode="time"
            display="spinner"
            textColor={colors.foreground}
            onChange={(_event, date) => {
              if (date) setIosTime(date);
            }}
          />
          <View style={styles.row}>
            <Button fullWidth={false} tone="outline" onPress={() => setIosOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth={false} onPress={() => {
              onChange(toTime(iosTime));
              setIosOpen(false);
            }}>
              Done
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

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
    bedtime: validSleepTime(sleep.bedtime) ? sleep.bedtime : null,
    wakeTime: validSleepTime(sleep.wakeTime) ? sleep.wakeTime : null,
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
        <TimeField
          label="Bedtime"
          value={sleep.bedtime}
          fallback="22:30"
          onChange={(value) => patch("bedtime", value)}
          testID="sleep-bedtime"
        />
        <TimeField
          label="Wake time"
          value={sleep.wakeTime}
          fallback="07:00"
          onChange={(value) => patch("wakeTime", value)}
          testID="sleep-wake-time"
        />
        <View style={[styles.derived, { backgroundColor: colors.muted }]}>
          <Text variant="label">
            Hours slept (calculated):{" "}
            {sleepDurationMinutes(draft) === null ? "Not recorded" : sleepDurationLabel(draft)}
          </Text>
          <Text variant="caption">{sleepDurationNote}</Text>
        </View>

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
  derived: { gap: spacing, padding: spacing * 3, borderRadius: spacing * 2 },
});
