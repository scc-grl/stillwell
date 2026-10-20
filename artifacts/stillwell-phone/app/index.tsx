import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import {
  getGetClinicianProfileQueryKey,
  useGetClinicianProfile,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { spacing } from "@/lib/layout";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { AccountTypeSwitch, type AccountRole } from "@/components/AccountTypeSwitch";
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
  const [role, setRole] = useState<AccountRole>("patient");
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
        <Text variant="display">
          {role === "patient"
            ? "Make space to notice."
            : "A thoughtful space for your practice."}
        </Text>
        <Text variant="body">
          {role === "patient"
            ? "A private journal for the days of concussion recovery and beyond."
            : "A private professional space for clinicians and practices."}
        </Text>
      </View>

      <Text variant="label">I’m using Stillwell as a</Text>
      <AccountTypeSwitch value={role} onChange={setRole} />

      {role === "patient" ? (
        <>
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
                  ? "/auth?mode=sign-up&role=patient"
                  : "/quiz",
              )
            }
          >
            {hasDraft && draftChecked ? "Continue account setup" : "Begin my journal"}
          </Button>
          <Button
            tone="outline"
            onPress={() => router.push("/auth?mode=sign-in&role=patient")}
            testID="go-to-sign-in"
          >
            Sign in
          </Button>
          <Button
            tone="secondary"
            onPress={() => router.push("/auth?mode=sign-up&role=patient")}
            testID="go-to-sign-up"
          >
            Create a patient account
          </Button>
          <SafetyNotice />
        </>
      ) : (
        <>
          <Card tone="sage">
            <Text variant="heading">A professional space, at your pace</Text>
            <Text variant="body">
              Set up a private profile for your practice. Patient journal sharing
              is planned and is not active in Stillwell.
            </Text>
            <Text variant="caption">
              This account does not provide access to patient journals.
            </Text>
          </Card>
          <Button
            onPress={() => router.push("/clinician-join")}
            testID="go-to-clinician-sign-up"
          >
            Create a clinician account
          </Button>
          <Button
            tone="outline"
            onPress={() => router.push("/auth?mode=sign-in&role=clinician")}
            testID="go-to-clinician-sign-in"
          >
            Sign in as a clinician
          </Button>
        </>
      )}
    </Screen>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const {
    isLoaded,
    isSignedIn,
    userId,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
    recovery,
    recoveryLoading,
    recoveryError,
    refreshRecovery,
  } = usePatientData();
  const clinicianProfile = useGetClinicianProfile({
    query: {
      queryKey: [...getGetClinicianProfileQueryKey(), userId ?? "signed-out"],
      enabled: Boolean(isLoaded && isSignedIn && userId && accountType === "clinician"),
      retry: false,
    },
  });

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
    if (clinicianProfile.isError) {
      return (
        <Screen>
          <Card>
            <Text variant="heading">We couldn’t open your clinician profile</Text>
            <Text variant="body">Your account is safe. Please try again.</Text>
            <Button tone="outline" onPress={() => void clinicianProfile.refetch()}>
              Try again
            </Button>
          </Card>
        </Screen>
      );
    }
    if (clinicianProfile.isLoading || !clinicianProfile.data) {
      return (
        <Screen>
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="caption">Opening your clinician space…</Text>
          </View>
        </Screen>
      );
    }
    return (
      <Redirect
        href={clinicianProfile.data.profile ? "/clinician-home" : "/clinician-profile"}
      />
    );
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
