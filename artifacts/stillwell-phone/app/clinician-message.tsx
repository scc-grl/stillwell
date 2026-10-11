import { useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useClerk } from "@clerk/expo";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";

const websiteDomain = process.env.EXPO_PUBLIC_DOMAIN;
const clinicianPortalUrl = websiteDomain
  ? `https://${websiteDomain}/clinician/sign-in`
  : null;

export default function ClinicianMessageScreen() {
  const colors = useColors();
  const { signOut } = useClerk();
  const [error, setError] = useState("");
  const {
    isLoaded,
    isSignedIn,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
  } = usePatientData();

  if (!isLoaded || (isSignedIn && accountTypeLoading)) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (!isSignedIn) return <Redirect href="/" />;
  if (accountTypeError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t check this account</Text>
          <Button tone="outline" onPress={refreshAccountType}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (accountType !== "clinician") return <Redirect href="/" />;

  async function openPortal() {
    if (!clinicianPortalUrl) {
      setError("Open the Stillwell website and choose Clinician portal.");
      return;
    }
    try {
      await Linking.openURL(clinicianPortalUrl);
    } catch {
      setError("The website could not be opened. Try again from your browser.");
    }
  }

  return (
    <Screen>
      <Text variant="display">Clinician account</Text>
      <Card tone="sage">
        <Text variant="heading">Use the clinician portal on the website</Text>
        <Text variant="body">
          The phone app is for patients. Sign in to the Stillwell website to
          continue with a clinician account.
        </Text>
      </Card>
      {error ? <Text variant="caption">{error}</Text> : null}
      <Button onPress={() => void openPortal()}>Open clinician portal</Button>
      <Button
        tone="outline"
        onPress={async () => {
          try {
            await signOut();
          } catch {
            setError("You could not be signed out right now. Please try again.");
          }
        }}
      >
        Sign out
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
