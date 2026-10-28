import { StyleSheet, View } from "react-native";
import type { RecoveryLog } from "@workspace/api-client-react";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { checkInSymptoms, overallChoices, dailyCheckInFromLog, ratingChoices, ratingLabel } from "@workspace/recovery-journal";
import { activityQuestion, activityAnswerChoices } from "@workspace/recovery-journal";
import { formatDate } from "@/lib/journal";
import { SleepDetails } from "@/components/SleepDetails";

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
  const colors = useColors();
  const dailyCheckIn = dailyCheckInFromLog(log);

  return (
    <View style={styles.container}>
      <Card tone="sage" inset="compact">
        {dailyCheckIn ? (
          <>
            <Text variant="label">Daily symptom check-in</Text>
            <Text variant="caption">
              Overall: {overallChoices.find((choice) => choice.value === dailyCheckIn.overallFeeling)?.label ?? "Not recorded"}
            </Text>
            <View style={styles.symptoms}>
              {dailyCheckIn.symptoms.map((answer) => {
                const label = checkInSymptoms.find((symptom) => symptom.name === answer.name)?.label ?? answer.name;
                const value = ratingLabel(answer);
                const level = answer.status === "recorded"
                  ? ratingChoices.findIndex((choice) => choice.value === answer.rating) + 1
                  : 0;
                return (
                  <View key={answer.name} style={styles.symptom}>
                    <View style={styles.symptomHeading}>
                      <Text variant="caption">{label}</Text>
                      <Text variant="caption">{value}</Text>
                    </View>
                    <View
                      style={styles.ratingBar}
                      accessibilityRole="image"
                      accessibilityLabel={`${label}: ${value}`}
                    >
                      {ratingChoices.map((choice, index) => (
                        <View
                          key={choice.value}
                          style={[
                            styles.ratingSegment,
                            { backgroundColor: index < level ? colors.primary : colors.muted },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
            <Text variant="caption">
              {dailyCheckIn.summary || "No summary added."}
            </Text>
            <Text variant="caption">{activityQuestion} {activityAnswerChoices.find(choice => choice.value === dailyCheckIn.worseWithActivity)?.label ?? "Not recorded"}</Text>
          </>
        ) : (
          <>
            <Text variant="label">Symptoms</Text>
            <Text variant="caption">Not recorded</Text>
          </>
        )}
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
      <SleepDetails sleep={log.sleep} />
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
  symptoms: {
    gap: spacing * 2,
  },
  symptom: {
    gap: spacing,
  },
  symptomHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  ratingBar: {
    flexDirection: "row",
    gap: spacing,
  },
  ratingSegment: {
    height: spacing * 1.5,
    flex: 1,
    borderRadius: spacing,
  },
  date: {
    textAlign: "right",
  },
});
