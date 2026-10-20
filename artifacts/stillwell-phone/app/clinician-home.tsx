import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";
import {
  getGetClinicianProfileQueryKey,
  useGetClinicianProfile,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import { spacing } from "@/lib/layout";

export default function ClinicianHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [signOutError, setSignOutError] = useState("");
  const {
    isLoaded,
    isSignedIn,
    userId,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
  } = usePatientData();
  const profileQuery = useGetClinicianProfile({
    query: {
      queryKey: [...getGetClinicianProfileQueryKey(), userId ?? "signed-out"],
      enabled: Boolean(isLoaded && isSignedIn && userId && accountType === "clinician"),
      retry: false,
    },
  });

  if (!isLoaded || accountTypeLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
        <Text variant="caption">Loading your account…</Text>
      </Screen>
    );
  }
  if (!isSignedIn) {
    return (
      <Redirect
        href={{ pathname: "/auth", params: { mode: "sign-in", role: "clinician" } }}
      />
    );
  }
  if (accountTypeError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t check your account</Text>
          <Button tone="outline" onPress={refreshAccountType}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (accountType !== "clinician") return <Redirect href="/" />;
  if (profileQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
        <Text variant="caption">Loading your profile…</Text>
      </Screen>
    );
  }
  if (profileQuery.isError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t load your clinician profile</Text>
          <Text variant="body">Your saved details have not been changed.</Text>
          <Button tone="outline" onPress={() => void profileQuery.refetch()}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }

  const profile = profileQuery.data?.profile ?? null;
  const details = [
    Boolean(profile?.profession),
    Boolean(profile?.licenseNumber && profile.licenseRegion),
    Boolean(profile?.practiceName),
    Boolean(profile?.location),
    Boolean(profile?.areas.length),
    Boolean(profile?.phone || profile?.website),
  ];
  const completedDetails = details.filter(Boolean).length;
  const completion = Math.round((completedDetails / details.length) * 100);
  const greeting = profile?.displayName || user?.firstName || "there";

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      router.replace("/");
    } catch {
      setSignOutError("You couldn’t be signed out right now. Please try again.");
    }
  }

  return (
    <Screen>
      <Text variant="label" color={colors.secondaryForeground}>
        STEP 4 OF 4 · YOUR CLINICIAN HOME
      </Text>
      <Text variant="display">Welcome, {greeting}</Text>
      <Text variant="body">
        Review your professional profile and account details here.
      </Text>

      <Card tone="sage">
        <View style={styles.cardHeading}>
          <Text variant="heading">Your profile</Text>
          <Text variant="label">{completion}% complete</Text>
        </View>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.border, borderRadius: colors.radius },
          ]}
          accessibilityRole="progressbar"
          accessibilityLabel="Profile completion"
          accessibilityValue={{ min: 0, max: 100, now: completion }}
        >
            <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${completion}%` },
            ]}
          />
        </View>
        <Text variant="body">
          {profile
            ? `${profile.practiceType === "clinic" ? "Clinic or practice" : "Individual clinician"}${profile.profession ? ` · ${profile.profession}` : ""}`
            : "Add your professional details when you’re ready."}
        </Text>
        {profile?.practiceName ? (
          <Text variant="caption">{profile.practiceName}</Text>
        ) : null}
        {profile?.location ? <Text variant="caption">{profile.location}</Text> : null}
        {profile?.licenseNumber || profile?.licenseRegion ? (
          <Text variant="caption">
            Licence information · Not verified
          </Text>
        ) : null}
        <Button
          tone="outline"
          onPress={() =>
            router.push({
              pathname: "/clinician-profile",
              params: { practiceType: profile?.practiceType ?? "individual" },
            })
          }
        >
          {profile ? "Edit profile" : "Complete profile"}
        </Button>
      </Card>

      <Card>
        <Text variant="heading">No patient journals are connected</Text>
        <Text variant="body">
          Patient invitations and journal sharing are planned, not active. This
          clinician account cannot access patient recovery entries.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Account</Text>
        <Text variant="label">Clinician account</Text>
        <Text variant="body">
          {user?.primaryEmailAddress?.emailAddress ?? "Email address unavailable"}
        </Text>
        <Button tone="outline" onPress={() => void handleSignOut()}>
          Sign out
        </Button>
      </Card>

      {signOutError ? (
        <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
          {signOutError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing * 3,
  },
  progressTrack: {
    width: "100%",
    height: spacing * 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
