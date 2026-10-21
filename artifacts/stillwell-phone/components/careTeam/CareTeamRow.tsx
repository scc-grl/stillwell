import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { formatLong, formatShort, sentLabel } from "@/lib/care-team";

export type CareTeamEntry =
  | { kind: "pending"; id: string; name: string; email: string; sentAt: string; expiresAt: string; lastResendAt: string | null }
  | { kind: "expired"; id: string; name: string; email: string; sentAt: string; expiresAt: string; lastResendAt: string | null }
  | { kind: "active"; id: string; name: string; connectedAt: string };

export function statusLine(entry: CareTeamEntry, now: number) {
  if (entry.kind === "pending") {
    return `${sentLabel(entry.sentAt, now)} · expires ${formatShort(entry.expiresAt)}`;
  }
  if (entry.kind === "active") return `Connected since ${formatShort(entry.connectedAt)}`;
  return "Not accepted within 14 days";
}

export function CareTeamRow({
  entry,
  now,
  onOptions,
}: {
  entry: CareTeamEntry;
  now: number;
  onOptions: (entry: CareTeamEntry) => void;
}) {
  const colors = useColors();

  const chip =
    entry.kind === "pending"
      ? {
          icon: "mail-outline" as const,
          text: "Invite sent",
          a11y: `Invite sent, expires ${formatLong(entry.expiresAt)}`,
          line: statusLine(entry, now),
          bg: "transparent",
          border: colors.primary,
          fg: colors.primary,
        }
      : entry.kind === "active"
        ? {
            icon: "checkmark" as const,
            text: "Connected",
            a11y: `Connected since ${formatLong(entry.connectedAt)}`,
            line: statusLine(entry, now),
            bg: colors.secondary,
            border: colors.secondary,
            fg: colors.primary,
          }
        : {
            icon: "time-outline" as const,
            text: "Expired",
            a11y: "Expired, not accepted within 14 days",
            line: statusLine(entry, now),
            bg: colors.muted,
            border: colors.muted,
            fg: colors.mutedForeground,
          };

  return (
    <View
      style={[styles.row, { borderTopColor: colors.border }]}
      testID={`care-team-row-${entry.id}`}
    >
      <View style={styles.copy}>
        <Text variant="label">{entry.name}</Text>
        <Text variant="caption" color={colors.mutedForeground}>
          {chip.line}
        </Text>
        <View
          accessible
          accessibilityLabel={chip.a11y}
          testID={`care-team-status-${entry.id}`}
          style={[
            styles.chip,
            { backgroundColor: chip.bg, borderColor: chip.border },
          ]}
        >
          <Ionicons name={chip.icon} size={14} color={chip.fg} />
          <Text variant="caption" color={chip.fg}>
            {chip.text}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Options for ${entry.name}`}
        onPress={() => onOptions(entry)}
        testID={`care-team-options-${entry.id}`}
        style={({ pressed }) => [styles.options, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing * 2,
    paddingVertical: spacing * 3,
    borderTopWidth: 1,
  },
  copy: { flex: 1, gap: spacing, alignItems: "flex-start" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing * 2.5,
    paddingVertical: spacing * 0.5,
  },
  options: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
