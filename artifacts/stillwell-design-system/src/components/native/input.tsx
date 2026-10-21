import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";
import { Text } from "./text";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.input,
            borderRadius: colors.radius,
            color: colors.foreground,
            fontFamily: colors.fonts.body,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.destructive} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: nativeTheme.spacing * 2,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: nativeTheme.spacing * 4,
    paddingVertical: nativeTheme.spacing * 3,
    fontSize: nativeTheme.typography.body.fontSize,
    lineHeight: nativeTheme.typography.body.lineHeight,
  },
});
