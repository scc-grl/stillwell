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
          Stillwell is an educational journal, not medical advice or emergency
          care. For a new injury or an emergency, seek urgent medical attention.
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
