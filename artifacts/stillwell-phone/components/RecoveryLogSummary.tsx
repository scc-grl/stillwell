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
  const recordedCount = dailyCheckIn.symptoms.filter((answer) => answer.status === "recorded").length;

  return (
    <View style={styles.container}>
      <Card tone="sage" inset="compact">
        <View style={styles.checkInHeader}>
          <View style={styles.checkInTitle}>
            <Text variant="label">SYMPTOM CHECK-IN</Text>
            <Text variant="caption">{recordedCount} of {checkInSymptoms.length} recorded</Text>
          </View>
          <Text variant="caption">
            Overall · {overallChoices.find((choice) => choice.value === dailyCheckIn.overallFeeling)?.label ?? "Not recorded"}
          </Text>
        </View>
        <View style={styles.symptoms}>
          {dailyCheckIn.symptoms.map((answer) => {
            const label = checkInSymptoms.find((symptom) => symptom.name === answer.name)?.label ?? answer.name;
            const value = ratingLabel(answer);
            const level = answer.status === "recorded"
              ? ratingChoices.findIndex((choice) => choice.value === answer.rating) + 1
              : 0;
            return (
              <View
                key={answer.name}
                style={[
                  styles.symptom,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.symptomHeading}>
                  <View style={styles.symptomName}>
                    <View style={[styles.symptomDot, { backgroundColor: colors.primary }]} />
                    <Text variant="caption">{label}</Text>
                  </View>
                  <Text variant="caption" style={styles.ratingText}>{value}</Text>
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
                <View style={styles.scaleLabels}>
                  <Text variant="caption">Not noticeable</Text>
                  <Text variant="caption">More noticeable</Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text variant="caption">
          {activityQuestion} {activityAnswerChoices.find((choice) => choice.value === dailyCheckIn.worseWithActivity)?.label ?? "Not recorded"}
        </Text>
      </Card>
      <Card>
        <Text variant="label">YOUR NOTE</Text>
        <Text variant="body">{dailyCheckIn.summary.trim() || "No note was recorded for this day."}</Text>
      </Card>
      <Card inset="compact">
        <Text variant="label">FOOD, MOVEMENT AND PACING</Text>
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
  checkInHeader: {
    gap: spacing * 2,
  },
  checkInTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  detail: {
    gap: spacing,
    paddingVertical: spacing,
  },
  symptoms: {
    gap: spacing * 2,
  },
  symptom: {
    gap: spacing * 1.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: spacing * 3,
    padding: spacing * 3,
  },
  symptomHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  symptomName: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing * 2,
  },
  symptomDot: {
    width: spacing * 2,
    height: spacing * 2,
    borderRadius: spacing,
  },
  ratingText: {
    flexShrink: 1,
    textAlign: "right",
  },
  ratingBar: {
    flexDirection: "row",
    gap: spacing,
  },
  ratingSegment: {
    height: spacing * 2,
    flex: 1,
    borderRadius: spacing,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  date: {
    textAlign: "right",
  },
});
