import { Pressable, StyleSheet, View } from "react-native";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";

export type AccountRole = "patient" | "clinician";

type Props = {
  value: AccountRole;
  onChange: (role: AccountRole) => void;
  disabled?: boolean;
};

const roles: { value: AccountRole; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "clinician", label: "Clinician" },
];

export function AccountTypeSwitch({ value, onChange, disabled = false }: Props) {
  const colors = useColors();

  return (
    <View
      accessibilityLabel="Choose account type"
      style={styles.row}
    >
      {roles.map((role) => {
        const selected = value === role.value;
        return (
          <Pressable
            key={role.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(role.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? colors.secondary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: colors.radius,
                opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
              },
            ]}
            testID={`account-role-${role.value}`}
          >
            <Text
              variant="label"
              style={styles.label}
              color={selected ? colors.foreground : colors.mutedForeground}
            >
              {role.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing * 2,
  },
  option: {
    flex: 1,
    minHeight: spacing * 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing * 3,
    paddingVertical: spacing * 3,
  },
  label: {
    textAlign: "center",
  },
});
