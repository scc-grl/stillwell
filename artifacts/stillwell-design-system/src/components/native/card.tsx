import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";

type Props = ViewProps & {
  children: ReactNode;
  inset?: "compact" | "comfortable";
  tone?: "default" | "sage";
};

export function Card({
  children,
  inset = "comfortable",
  tone = "default",
  style,
  ...props
}: Props) {
  const colors = useColors();

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: tone === "sage" ? colors.secondary : colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          padding: inset === "comfortable" ? colors.spacing * 5 : colors.spacing * 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    gap: nativeTheme.spacing * 3,
  },
});
