import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { SafetyNotice } from "@/components/SafetyNotice";
import {
  hasConsentedDraftForWelcome,
  isPendingPatientSignup,
} from "@/lib/draft";
import { usePatientData } from "@/contexts/PatientDataContext";

function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [hasDraft, setHasDraft] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void hasConsentedDraftForWelcome()
      .then((found) => {
        if (active) setHasDraft(found);
      })
      .catch(() => {
        if (active) setHasDraft(false);
      })
      .finally(() => {
        if (active) setDraftChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen>
      <View style={styles.brand}>
        <Text variant="label" color={colors.secondaryForeground}>
          STILLWELL
        </Text>
        <Text variant="display">Make space to notice.</Text>
        <Text variant="body">
          A private journal for the days of concussion recovery and beyond.
        </Text>
      </View>

      <Card tone="sage">
        <Text variant="heading">Your day, in your words</Text>
        <Text variant="body">
          Track symptoms and the routines you choose—food, movement, rest,
          meditation, and pacing. You can use it on your own or share it with a
          clinician.
        </Text>
        <Text variant="caption">
          Stillwell offers educational journaling, not diagnosis or treatment.
        </Text>
      </Card>

      <Button
        testID="begin-setup"
        onPress={() =>
          router.push(
            hasDraft && draftChecked
              ? "/auth?mode=sign-up"
              : "/quiz",
          )
        }
      >
        {hasDraft && draftChecked ? "Continue account setup" : "Begin my journal"}
      </Button>
      <Button
        tone="outline"
        onPress={() => router.push("/auth?mode=sign-in")}
        testID="go-to-sign-in"
      >
        Sign in
      </Button>
      <Button
        tone="secondary"
        onPress={() => router.push("/auth?mode=sign-up")}
        testID="go-to-sign-up"
      >
        Create a patient account
      </Button>

      <SafetyNotice />
    </Screen>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const {
    isLoaded,
    isSignedIn,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
    recovery,
    recoveryLoading,
    recoveryError,
    refreshRecovery,
  } = usePatientData();

  if (!isLoaded) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Opening Stillwell…</Text>
        </View>
      </Screen>
    );
  }

  if (!isSignedIn) return <WelcomeScreen />;
  if (accountTypeError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t load your account</Text>
          <Text variant="body">Your journal has not been opened.</Text>
          <Button tone="outline" onPress={refreshAccountType}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (accountTypeLoading || !accountType) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Loading your account…</Text>
        </View>
      </Screen>
    );
  }
  if (accountType === "clinician") {
    return <Redirect href="/clinician-message" />;
  }
  if (accountType === "patient" && isPendingPatientSignup()) {
    return <Redirect href="/quiz" />;
  }
  if (recoveryError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t load your journal</Text>
          <Text variant="body">Your saved entries have not been opened.</Text>
          <Button tone="outline" onPress={refreshRecovery}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (recoveryLoading || !recovery) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Checking your journal…</Text>
        </View>
      </Screen>
    );
  }
  return (
    <Redirect
      href={recovery.profile ? "/(tabs)/today" : "/quiz"}
    />
  );
}

const styles = StyleSheet.create({
  brand: {
    gap: spacing * 2,
    paddingVertical: spacing * 2,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing * 3,
  },
});
