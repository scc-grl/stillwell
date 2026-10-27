import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CLINICIAN_PROOF_DESCRIPTION, CLINICIAN_PROOF_LABEL } from "@workspace/recovery-journal/care-team-copy";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { nativeTheme } from "@workspace/stillwell-design-system/lib/native-theme";

/** Persistent clinician-only badge; the explanatory line is optional to open. */
export function ClinicianProofOfConcept() {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CLINICIAN_PROOF_LABEL}
        accessibilityHint={CLINICIAN_PROOF_DESCRIPTION}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(true)}
        onHoverIn={() => setExpanded(true)}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
        testID="clinician-proof-of-concept"
        style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.accent }]}
      >
        <Text variant="caption" color={colors.accentForeground} style={styles.label}>
          {CLINICIAN_PROOF_LABEL}
        </Text>
      </Pressable>
      {expanded && (
        <Text variant="caption" accessibilityLiveRegion="polite">
          {CLINICIAN_PROOF_DESCRIPTION}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: nativeTheme.spacing * 2 },
  badge: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: nativeTheme.spacing * 11,
    borderRadius: nativeTheme.radius * 4,
    borderWidth: 1,
    paddingHorizontal: nativeTheme.spacing * 3,
    paddingVertical: nativeTheme.spacing * 2,
  },
  label: { fontFamily: nativeTheme.fonts.bodySemibold },
});
