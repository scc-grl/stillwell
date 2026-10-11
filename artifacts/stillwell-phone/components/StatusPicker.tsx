import { StyleSheet, View } from "react-native";
import type { ActivityStatus } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";

const choices: ReadonlyArray<{ value: ActivityStatus; label: string }> = [
  { value: "done", label: "Done" },
  { value: "not_done", label: "Not done" },
  { value: "not_planned", label: "Not planned" },
];

type Props = {
  label: string;
  value: ActivityStatus;
  onChange: (value: ActivityStatus) => void;
};

export function StatusPicker({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        {choices.map((choice) => (
          <Button
            key={choice.value}
            fullWidth={false}
            tone={choice.value === value ? "primary" : "outline"}
            accessibilityLabel={`${label}: ${choice.label}`}
            accessibilityState={{ selected: choice.value === value }}
            onPress={() => onChange(choice.value)}
            style={styles.choice}
          >
            {choice.label}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing * 2,
  },
  row: {
    flexDirection: "row",
    gap: spacing * 2,
  },
  choice: {
    flex: 1,
    minHeight: spacing * 11,
    paddingHorizontal: spacing * 2,
  },
});
