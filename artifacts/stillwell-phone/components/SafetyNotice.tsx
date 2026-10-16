import { StyleSheet, View } from "react-native";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";

export function SafetyNotice() {
  return (
    <Card tone="sage" inset="compact" accessibilityLabel="Care boundary">
      <View style={styles.copy}>
        <Text variant="label">A note on care</Text>
        <Text variant="caption">
          Not for a new injury or an emergency. If symptoms are worsening,
          contact a clinician. Severe or urgent symptoms need emergency care
          now.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: spacing,
  },
});
