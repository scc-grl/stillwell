import { useFonts } from "expo-font";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";

export function useStillwellFonts() {
  return useFonts({
    StillwellSans: DMSans_400Regular,
    StillwellSansMedium: DMSans_500Medium,
    StillwellSansSemibold: DMSans_600SemiBold,
    StillwellSansBold: DMSans_700Bold,
    StillwellDisplay: Fraunces_600SemiBold,
  });
}
