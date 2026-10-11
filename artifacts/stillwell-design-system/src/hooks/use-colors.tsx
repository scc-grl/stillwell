import { useColorScheme } from "react-native";
import { nativeTheme } from "../lib/native-theme";

export function useColors() {
  const scheme = useColorScheme();
  const colors =
    scheme === "dark" ? nativeTheme.colors.dark : nativeTheme.colors.light;

  return {
    ...colors,
    radius: nativeTheme.radius,
    spacing: nativeTheme.spacing,
    fonts: nativeTheme.fonts,
  };
}
