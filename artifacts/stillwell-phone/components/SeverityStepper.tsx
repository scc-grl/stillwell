import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";

type Props = {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
};

export function SeverityStepper({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text variant="label">{label}</Text>
        <Text variant="caption">
          {value === undefined ? "Not logged" : `${value} / 10`}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.choices}
        accessibilityLabel={`${label} rating`}
      >
        {Array.from({ length: 11 }, (_, rating) => (
          <Button
            key={rating}
            fullWidth={false}
            tone={value === rating ? "primary" : "outline"}
            accessibilityLabel={`Set ${label} rating to ${rating}`}
            accessibilityState={{ selected: value === rating }}
            onPress={() => onChange(rating)}
            style={styles.rating}
          >
            {rating}
          </Button>
        ))}
      </ScrollView>
      <Text variant="caption">0 = none · 10 = most intense</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  choices: {
    gap: spacing * 2,
    paddingVertical: spacing,
  },
  rating: {
    minWidth: spacing * 9,
    minHeight: spacing * 11,
    paddingHorizontal: spacing * 2,
  },
});
