import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ClinicianPracticeType,
  type ClinicianPracticeType as ClinicianPracticeTypeValue,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { spacing } from "@/lib/layout";

const choices: {
  value: ClinicianPracticeTypeValue;
  title: string;
  description: string;
}[] = [
  {
    value: ClinicianPracticeType.individual,
    title: "Individual clinician",
    description: "I practise independently or as a solo professional.",
  },
  {
    value: ClinicianPracticeType.clinic,
    title: "Clinic or practice",
    description: "I work as part of a clinic, group, or practice.",
  },
];

export default function ClinicianJoinScreen() {
  const colors = useColors();
  const router = useRouter();
  const [practiceType, setPracticeType] =
    useState<ClinicianPracticeTypeValue>(ClinicianPracticeType.individual);

  return (
    <Screen>
      <Text variant="label" color={colors.secondaryForeground}>
        STEP 1 OF 4 · CHOOSE YOUR ACCOUNT
      </Text>
      <Text variant="display">How do you practise?</Text>
      <Text variant="body">
        We’ll tailor your private professional profile to your work. Both
        options create a clinician account.
      </Text>

      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.secondary, borderRadius: colors.radius },
        ]}
        accessibilityRole="progressbar"
        accessibilityLabel="Clinician setup progress"
        accessibilityValue={{ min: 1, max: 4, now: 1 }}
      >
        <View style={[styles.progressFill, { backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.choices}>
        {choices.map((choice) => {
          const selected = practiceType === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPracticeType(choice.value)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.82 : 1,
              })}
              testID={`practice-choice-${choice.value}`}
            >
              <Card
                tone={selected ? "sage" : "default"}
                style={[
                  styles.choiceCard,
                  { borderColor: selected ? colors.primary : colors.border },
                ]}
              >
                <Text variant="heading">{choice.title}</Text>
                <Text variant="body">{choice.description}</Text>
                {selected ? (
                  <Text variant="label" color={colors.primary}>
                    Selected
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card tone="sage">
        <Text variant="body">
          Patient invitations are not active yet. You can set up a private
          professional profile; patient journal sharing is not available.
        </Text>
      </Card>

      <Button
        onPress={() =>
          router.push({
            pathname: "/auth",
            params: {
              mode: "sign-up",
              role: "clinician",
              practiceType,
            },
          })
        }
        testID="continue-clinician-sign-up"
      >
        Continue to sign up
      </Button>
      <Button tone="outline" onPress={() => router.replace("/")}>
        Back to Stillwell
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: spacing * 1.5,
    overflow: "hidden",
  },
  progressFill: {
    width: "25%",
    height: "100%",
  },
  choices: {
    gap: spacing * 3,
  },
  choiceCard: {
    borderWidth: 2,
  },
});
