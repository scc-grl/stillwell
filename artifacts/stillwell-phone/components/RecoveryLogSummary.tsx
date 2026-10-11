import { StyleSheet, View } from "react-native";
import type { RecoveryLog } from "@workspace/api-client-react";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";
import { formatDate, symptomChoices } from "@/lib/journal";

function statusText(value: string) {
  if (value === "done") return "Done";
  if (value === "not_done") return "Not done";
  return "Not planned";
}

function Detail({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="label">{title}</Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
}

export function RecoveryLogSummary({ log }: { log: RecoveryLog }) {
  const symptomText =
    log.symptoms.length === 0
      ? "No symptoms were rated."
      : log.symptoms
          .map((symptom) => {
            const label =
              symptomChoices.find((choice) => choice.name === symptom.name)
                ?.label ?? symptom.name;
            return `${label}: ${symptom.severity}/10`;
          })
          .join(" · ");

  return (
    <View style={styles.container}>
      <Card tone="sage" inset="compact">
        <Text variant="label">Symptoms</Text>
        <Text variant="caption">{symptomText}</Text>
      </Card>
      <Card inset="compact">
        <Detail
          title="Food & hydration"
          value={`${statusText(log.dietStatus)}${log.dietNote ? ` · ${log.dietNote}` : ""}`}
        />
        <Detail
          title="Movement & rest"
          value={`${statusText(log.exerciseStatus)}${log.exerciseNote ? ` · ${log.exerciseNote}` : ""}`}
        />
        <Detail
          title="Meditation or a quiet pause"
          value={`${statusText(log.meditationStatus)}${log.meditationMinutes ? ` · ${log.meditationMinutes} minutes` : ""}${log.meditationNote ? ` · ${log.meditationNote}` : ""}`}
        />
        <Detail
          title="Pacing and changes"
          value={log.note || "No note added."}
        />
      </Card>
      <Text variant="caption" style={styles.date}>
        Saved {formatDate(log.date)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing * 3,
  },
  detail: {
    gap: spacing,
    paddingVertical: spacing,
  },
  date: {
    textAlign: "right",
  },
});
