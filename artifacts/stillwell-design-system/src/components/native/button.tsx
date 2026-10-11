import type { ReactNode } from "react";
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
  children: ReactNode;
  tone?: "primary" | "secondary" | "outline" | "destructive";
  leading?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  children,
  tone = "primary",
  leading,
  fullWidth = true,
  disabled,
  style,
  ...props
}: Props) {
  const colors = useColors();
  const backgroundColor =
    tone === "primary"
      ? colors.primary
      : tone === "destructive"
        ? colors.destructive
        : tone === "secondary"
          ? colors.secondary
          : "transparent";
  const foreground =
    tone === "primary"
      ? colors.primaryForeground
      : tone === "destructive"
        ? colors.destructiveForeground
        : colors.secondaryForeground;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: tone === "outline" ? colors.border : backgroundColor,
          borderRadius: colors.radius,
          opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <Text
        variant="label"
        color={foreground}
        style={styles.buttonText}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: nativeTheme.spacing * 4,
    paddingVertical: nativeTheme.spacing * 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  leading: {
    marginRight: nativeTheme.spacing * 2,
  },
  buttonText: {
    textAlign: "center",
  },
});
