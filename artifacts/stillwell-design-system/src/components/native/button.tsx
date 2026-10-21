import { useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import {
  Pressable,
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  findNodeHandle,
  type PressableProps,
} from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";
import { Text } from "./text";

export type ButtonHandle = { focus: () => void };

type Props = Omit<PressableProps, "children"> & {
  ref?: Ref<ButtonHandle>;
  children: ReactNode;
  tone?: "primary" | "secondary" | "outline" | "destructive";
  leading?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  ref,
  children,
  tone = "primary",
  leading,
  fullWidth = true,
  disabled,
  style,
  ...props
}: Props) {
  const nativeRef = useRef<View>(null);
  // A portable handle avoids leaking platform-specific View types to consumers.
  useImperativeHandle(ref, () => ({
    focus() {
      if (Platform.OS === "web") nativeRef.current?.focus();
      else if (nativeRef.current) {
        const handle = findNodeHandle(nativeRef.current);
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      }
    },
  }), []);
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
      ref={nativeRef}
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
