import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { RecoveryLog } from "@workspace/api-client-react";
import {
  sleepDetails,
  sleepDurationNote,
  sleepTips,
  sleepWeek,
  type SleepLog,
} from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { formatDate } from "@/lib/journal";
import { spacing } from "@/lib/layout";

/** Read-only sleep fields for one day, with "Not recorded" for skipped fields. */
export function SleepDetails({ sleep }: { sleep?: SleepLog | null }) {
  const colors = useColors();
  return (
    <Card inset="compact">
      <Text variant="label">Sleep</Text>
      {sleep ? (
        sleepDetails(sleep).map((item) => (
          <View key={item.label} style={[styles.detailRow, { borderColor: colors.border }]}>
            <Text variant="caption">{item.label}</Text>
            <Text variant="caption" color={colors.foreground} style={styles.value}>
              {item.value}
            </Text>
          </View>
        ))
      ) : (
        <Text variant="caption">Not recorded</Text>
      )}
      {sleep ? <Text variant="caption">{sleepDurationNote}</Text> : null}
    </Card>
  );
}

/** Seven calendar days of calculated hours and quality. No scores or targets. */
export function SleepWeek({ logs, ending }: { logs: readonly RecoveryLog[]; ending: string }) {
  const colors = useColors();
  const week = sleepWeek(logs, ending);
  return (
    <View accessibilityLabel="Sleep over the last seven days" style={styles.week}>
      <View style={styles.weekRow}>
        <Text variant="label" style={styles.weekDate}>Night ending</Text>
        <Text variant="label" style={styles.weekCell}>Hours</Text>
        <Text variant="label" style={styles.weekCell}>Quality</Text>
      </View>
      {week.map((day) => (
        <View
          key={day.date}
          style={[styles.weekRow, { borderColor: colors.border }, styles.weekBorder]}
          accessible
          accessibilityLabel={`${formatDate(day.date)}: hours ${day.duration}, quality ${day.quality}`}
        >
          <Text variant="caption" color={colors.foreground} style={styles.weekDate}>
            {formatDate(day.date)}
          </Text>
          <Text variant="caption" style={styles.weekCell}>{day.duration}</Text>
          <Text variant="caption" style={styles.weekCell}>{day.quality}</Text>
        </View>
      ))}
      <Text variant="caption">{sleepDurationNote}</Text>
    </View>
  );
}

/** Optional, collapsed-by-default general routine ideas. */
export function SleepTipsCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card tone="sage" inset="compact">
      <Text variant="label">GENERAL SLEEP ROUTINE IDEAS</Text>
      <Text variant="caption">
        General information, not medical advice. Ask a clinician about your sleep.
      </Text>
      {open
        ? sleepTips.map((tip) => (
            <Text key={tip} variant="caption">
              {"\u2022"} {tip}
            </Text>
          ))
        : null}
      <Button
        tone="outline"
        onPress={() => setOpen((value) => !value)}
        accessibilityState={{ expanded: open }}
        testID="toggle-sleep-tips"
      >
        {open ? "Hide routine ideas" : "Show routine ideas"}
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing * 3,
    paddingVertical: spacing,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  value: { flexShrink: 1, textAlign: "right" },
  week: { gap: spacing },
  weekRow: { flexDirection: "row", gap: spacing * 2, paddingVertical: spacing },
  weekBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  weekDate: { flex: 2 },
  weekCell: { flex: 1 },
});
