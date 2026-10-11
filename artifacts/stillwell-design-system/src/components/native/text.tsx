import type { ReactNode } from "react";
import {
  Text as ReactNativeText,
  type TextProps as ReactNativeTextProps,
  type TextStyle,
} from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";

export type TextVariant = "display" | "heading" | "body" | "label" | "caption";

type Props = ReactNativeTextProps & {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
};

export function Text({
  children,
  variant = "body",
  color,
  style,
  ...props
}: Props) {
  const colors = useColors();
  const fontFamily =
    variant === "display" || variant === "heading"
      ? colors.fonts.display
      : variant === "label"
        ? colors.fonts.bodySemibold
        : colors.fonts.body;

  const variantStyle: TextStyle = {
    color: color ?? colors.foreground,
    fontFamily,
    ...nativeTheme.typography[variant],
  };

  return (
    <ReactNativeText {...props} style={[variantStyle, style]}>
      {children}
    </ReactNativeText>
  );
}
