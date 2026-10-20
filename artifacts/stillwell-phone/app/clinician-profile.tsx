import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClinicianArea,
  ClinicianPracticeType,
  ClinicianProfession,
  getGetClinicianProfileQueryKey,
  useGetClinicianProfile,
  useSaveClinicianProfile,
  type ClinicianArea as ClinicianAreaValue,
  type ClinicianPracticeType as ClinicianPracticeTypeValue,
  type ClinicianProfession as ClinicianProfessionValue,
  type ClinicianProfileInput,
  type ClinicianProfile,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import { spacing } from "@/lib/layout";

type ProfileForm = {
  firstName: string;
  lastName: string;
  practiceType: ClinicianPracticeTypeValue;
  profession: ClinicianProfessionValue | null;
  licenseNumber: string;
  licenseRegion: string;
  practiceName: string;
  location: string;
  areas: ClinicianAreaValue[];
  phone: string;
  website: string;
  listInDirectory: boolean;
  openToNewPatients: boolean;
};

const professionOptions = Object.values(ClinicianProfession) as ClinicianProfessionValue[];
const areaOptions = Object.values(ClinicianArea) as ClinicianAreaValue[];

function emptyProfile(practiceType: ClinicianPracticeTypeValue): ProfileForm {
  return {
    firstName: "",
    lastName: "",
    practiceType,
    profession: null,
    licenseNumber: "",
    licenseRegion: "",
    practiceName: "",
    location: "",
    areas: [],
    phone: "",
    website: "",
    listInDirectory: false,
    openToNewPatients: false,
  };
}

function formFromProfile(
  profile: ClinicianProfile | null | undefined,
  fallbackPracticeType: ClinicianPracticeTypeValue,
): ProfileForm {
  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    practiceType: profile?.practiceType ?? fallbackPracticeType,
    profession: profile?.profession ?? null,
    licenseNumber: profile?.licenseNumber ?? "",
    licenseRegion: profile?.licenseRegion ?? "",
    practiceName: profile?.practiceName ?? "",
    location: profile?.location ?? "",
    areas: profile?.areas ?? [],
    phone: profile?.phone ?? "",
    website: profile?.website ?? "",
    listInDirectory: profile?.listInDirectory ?? false,
    openToNewPatients: profile?.openToNewPatients ?? false,
  };
}

export default function ClinicianProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ practiceType?: string }>();
  const selectedPracticeType =
    params.practiceType === ClinicianPracticeType.clinic
      ? ClinicianPracticeType.clinic
      : ClinicianPracticeType.individual;
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
  const saveProfile = useSaveClinicianProfile();
  const [form, setForm] = useState(() => emptyProfile(selectedPracticeType));
  const [validationError, setValidationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const initializedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (
      accountType === "clinician" &&
      userId &&
      !profileQuery.isLoading &&
      !profileQuery.isError &&
      initializedUserId.current !== userId
    ) {
      setForm(formFromProfile(profileQuery.data?.profile ?? null, selectedPracticeType));
      initializedUserId.current = userId;
    }
  }, [
    accountType,
    profileQuery.data,
    profileQuery.isError,
    profileQuery.isLoading,
    selectedPracticeType,
    userId,
  ]);

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
          <Text variant="heading">We couldn’t confirm your account type</Text>
          <Text variant="body">Please try again before editing your profile.</Text>
          <Button tone="outline" onPress={refreshAccountType}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (accountType !== "clinician") return <Redirect href="/" />;
  if (profileQuery.isError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">We couldn’t load your profile</Text>
          <Text variant="body">Your information is unchanged. Please try again.</Text>
          <Button tone="outline" onPress={() => void profileQuery.refetch()}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (
    profileQuery.isLoading ||
    !userId ||
    initializedUserId.current !== userId
  ) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
        <Text variant="caption">Opening your professional profile…</Text>
      </Screen>
    );
  }

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleArea(area: ClinicianAreaValue) {
    setForm((current) => ({
      ...current,
      areas: current.areas.includes(area)
        ? current.areas.filter((item) => item !== area)
        : [...current.areas, area],
    }));
  }

  async function submit() {
    setValidationError("");
    setSaveError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setValidationError("Please add your first and last name to continue.");
      return;
    }

    const data: ClinicianProfileInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      practiceType: form.practiceType,
      profession: form.profession,
      licenseNumber: form.licenseNumber.trim() || null,
      licenseRegion: form.licenseRegion.trim() || null,
      practiceName: form.practiceName.trim() || null,
      location: form.location.trim() || null,
      areas: form.areas,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      inviteCode: null,
      listInDirectory: form.listInDirectory,
      openToNewPatients: form.openToNewPatients,
    };

    try {
      await saveProfile.mutateAsync({ data });
      await queryClient.invalidateQueries({
        queryKey: getGetClinicianProfileQueryKey(),
      });
      router.replace("/clinician-home");
    } catch {
      setSaveError("We couldn’t save your profile. Your changes are still on this screen.");
    }
  }

  return (
    <Screen>
      <Text variant="label" color={colors.secondaryForeground}>
        STEP 3 OF 4 · YOUR PROFESSIONAL PROFILE
      </Text>
      <Text variant="display">Tell patients about your practice</Text>
      <Text variant="body">
        Add the details you want to keep in your private Stillwell profile.
      </Text>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.secondary, borderRadius: colors.radius },
        ]}
      >
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: "75%" }]} />
      </View>

      <Card>
        <Text variant="heading">About you</Text>
        <Input
          label="First name *"
          value={form.firstName}
          onChangeText={(value) => update("firstName", value)}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          accessibilityLabel="First name"
        />
        <Input
          label="Last name *"
          value={form.lastName}
          onChangeText={(value) => update("lastName", value)}
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          accessibilityLabel="Last name"
        />
        <Text variant="label">Account type</Text>
        <View style={styles.practiceChoiceRow}>
          {[ClinicianPracticeType.individual, ClinicianPracticeType.clinic].map((type) => {
            const selected = form.practiceType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => update("practiceType", type)}
                style={({ pressed }) => [
                  styles.practiceChoice,
                  {
                    backgroundColor: selected ? colors.secondary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text variant="label">
                  {type === ClinicianPracticeType.clinic ? "Clinic / practice" : "Individual"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="label">Profession</Text>
        <View style={styles.chips}>
          {professionOptions.map((profession) => {
            const selected = form.profession === profession;
            return (
              <Button
                key={profession}
                tone={selected ? "secondary" : "outline"}
                fullWidth={false}
                style={styles.chip}
                onPress={() => update("profession", selected ? null : profession)}
                accessibilityLabel={`Profession: ${profession}`}
                accessibilityState={{ selected }}
              >
                {profession}
              </Button>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text variant="heading">Practice details</Text>
        <Input
          label="Licence or registration number"
          value={form.licenseNumber}
          onChangeText={(value) => update("licenseNumber", value)}
          autoCapitalize="characters"
          accessibilityLabel="Licence or registration number"
        />
        <Input
          label="Issued in (state or region)"
          value={form.licenseRegion}
          onChangeText={(value) => update("licenseRegion", value)}
          autoCapitalize="words"
          accessibilityLabel="Licence issuing state or region"
        />
        <Text variant="caption">
          Licence details are saved for your reference only and are not verified.
        </Text>
        <Input
          label="Practice name"
          value={form.practiceName}
          onChangeText={(value) => update("practiceName", value)}
          accessibilityLabel="Practice name"
        />
        <Input
          label="City or region"
          value={form.location}
          onChangeText={(value) => update("location", value)}
          accessibilityLabel="City or region"
        />
        <Input
          label="Phone (optional)"
          value={form.phone}
          onChangeText={(value) => update("phone", value)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          accessibilityLabel="Phone number, optional"
        />
        <Input
          label="Practice website (optional)"
          value={form.website}
          onChangeText={(value) => update("website", value)}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Practice website, optional"
        />
      </Card>

      <Card>
        <Text variant="heading">Areas you support</Text>
        <Text variant="body">Choose any that reflect your work.</Text>
        <View style={styles.chips}>
          {areaOptions.map((area) => {
            const selected = form.areas.includes(area);
            return (
              <Button
                key={area}
                tone={selected ? "secondary" : "outline"}
                fullWidth={false}
                style={styles.chip}
                onPress={() => toggleArea(area)}
                accessibilityLabel={`Area: ${area}`}
                accessibilityState={{ selected }}
              >
                {area}
              </Button>
            );
          })}
        </View>
      </Card>

      <Card tone="sage">
        <Text variant="heading">Private preferences for later</Text>
        <Text variant="body">
          These are saved to your profile only. Find your clinician listings
          aren’t active yet.
        </Text>
        <Button
          tone={form.listInDirectory ? "secondary" : "outline"}
          onPress={() => update("listInDirectory", !form.listInDirectory)}
          accessibilityState={{ checked: form.listInDirectory }}
        >
          {form.listInDirectory ? "✓ " : ""}Save my preference to be listed in Find your clinician
        </Button>
        <Button
          tone={form.openToNewPatients ? "secondary" : "outline"}
          onPress={() => update("openToNewPatients", !form.openToNewPatients)}
          accessibilityState={{ checked: form.openToNewPatients }}
        >
          {form.openToNewPatients ? "✓ " : ""}Open to new patients
        </Button>
      </Card>

      {validationError ? (
        <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
          {validationError}
        </Text>
      ) : null}
      {saveError ? (
        <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
          {saveError}
        </Text>
      ) : null}

      <Button onPress={() => void submit()} disabled={saveProfile.isPending}>
        {saveProfile.isPending ? "Saving…" : "Save and continue"}
      </Button>
      <Button tone="outline" onPress={() => router.replace("/clinician-home")}>
        Finish later
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: spacing * 1.5,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  practiceChoiceRow: {
    flexDirection: "row",
    gap: spacing * 2,
  },
  practiceChoice: {
    flex: 1,
    minHeight: spacing * 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing * 3,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  chip: {
    marginBottom: spacing * 2,
    marginRight: spacing * 2,
  },
});
