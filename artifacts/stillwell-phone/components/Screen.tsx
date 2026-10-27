import type { ReactNode } from "react";
import { usePathname } from "expo-router";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ClinicianProofOfConcept } from "@/components/ClinicianProofOfConcept";

type Props = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  bottomTabs?: boolean;
  clinician?: boolean;
};

export function Screen({ children, contentStyle, bottomTabs = false, clinician }: Props) {
  const colors = useColors();
  const pathname = usePathname();
  const clinicianScreen = clinician ?? /^\/clinician(?:-|\/)/.test(pathname);
  const insets = useSafeAreaInsets();
  const topInset =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomInset =
    Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {clinicianScreen && (
        <View style={{
          paddingTop: topInset + spacing * 2,
          paddingHorizontal: spacing * 5,
          paddingBottom: spacing * 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <ClinicianProofOfConcept />
        </View>
      )}
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: clinicianScreen ? spacing * 5 : topInset + spacing * 6,
            paddingBottom: bottomInset + (bottomTabs ? spacing * 28 : spacing * 7),
          },
          contentStyle,
        ]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    flexGrow: 1,
    paddingHorizontal: spacing * 5,
    gap: spacing * 5,
  },
});
