import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";
import { Text } from "./text";

type Props = Omit<PressableProps, "children"> & {
  checked: boolean;
  label: string;
  detail?: string;
};

export function Checkbox({
  checked,
  label,
  detail,
  style,
  ...props
}: Props) {
  const colors = useColors();

  return (
    <Pressable
      {...props}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(props.disabled) }}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.78 : 1 },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      <View
        style={[
          styles.mark,
          {
            borderColor: checked ? colors.primary : colors.border,
            borderRadius: colors.radius / 4,
            backgroundColor: checked ? colors.primary : colors.card,
          },
        ]}
      >
        {checked ? (
          <Text variant="label" color={colors.primaryForeground}>
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text variant="label">
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color={colors.mutedForeground}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTheme.spacing * 3,
    paddingVertical: nativeTheme.spacing * 2,
  },
  mark: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: nativeTheme.spacing,
  },
});
