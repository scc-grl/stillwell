import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
  useDeleteRecovery,
  useUpdateRecoveryProfile,
  type RecoveryPreferences,
  type RecoveryState,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/native/checkbox";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { usePatientData } from "@/contexts/PatientDataContext";
import { SafetyNotice } from "@/components/SafetyNotice";
import { CareTeamCard } from "@/components/careTeam/CareTeamCard";
import { useConfirm } from "@/components/careTeam/feedback";
import { careTeamQueryKey } from "@/hooks/useCareTeam";
import { Screen } from "@/components/Screen";
import { requestHref, usePendingRequest } from "@/contexts/PendingRequestContext";
import { priorityChoices, recoveryQueryKey } from "@/lib/journal";
import { clearConsentedDraft, setPendingPatientSignup } from "@/lib/draft";
import { spacing } from "@/lib/layout";

export default function AccountScreen() {
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, recovery } = usePatientData();
  const deleteRecovery = useDeleteRecovery();
  const updateProfile = useUpdateRecoveryProfile();
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [priorities, setPriorities] =
    useState<RecoveryPreferences["priorities"] | null>(null);
  const [supportMode, setSupportMode] =
    useState<RecoveryPreferences["supportMode"] | null>(null);
  const [error, setError] = useState("");
  const { confirm, element: confirmElement } = useConfirm();
  const pendingRequest = usePendingRequest();

  const savedPriorities = priorities ?? recovery?.profile?.priorities ?? [];
  const savedSupportMode =
    supportMode ?? recovery?.profile?.supportMode ?? "self_guided";

  async function saveRoutine() {
    if (!userId || savedPriorities.length === 0) {
      setError("Choose at least one routine focus.");
      return;
    }
    setError("");
    try {
      const updated = await updateProfile.mutateAsync({
        data: {
          supportMode: savedSupportMode,
          priorities: savedPriorities,
        },
      });
      queryClient.setQueryData<RecoveryState>(
        recoveryQueryKey(userId),
        (current) =>
          current
            ? {
                ...current,
                profile: { ...current.profile!, ...updated },
              }
            : current,
      );
      setPriorities(null);
      setSupportMode(null);
      setEditingRoutine(false);
    } catch {
      setError("Your routine could not be updated. Please try again.");
    }
  }

  async function askDeleteAll() {
    const agreed = await confirm({
      title: "Delete all recovery data?",
      message:
        "This permanently removes your recovery profile and every daily entry. Your Stillwell sign-in account will remain. Clinicians you’ve shared with keep what you shared up to now, but they won’t see anything new.",
      cancelLabel: "Keep my data",
      confirmLabel: "Delete all recovery data",
      testID: "delete-all-dialog",
    });
    if (!agreed) return;
    setError("");
    try {
      await deleteRecovery.mutateAsync();
      await clearConsentedDraft();
      setPendingPatientSignup(false);
      if (userId) {
        queryClient.removeQueries({ queryKey: careTeamQueryKey(userId) });
        queryClient.setQueryData(recoveryQueryKey(userId), {
          profile: null,
          logs: [],
        });
      }
      router.replace("/quiz");
    } catch {
      setError("Your recovery data could not be deleted. Try again.");
    }
  }

  async function logout() {
    setError("");
    try {
      await clearConsentedDraft();
      setPendingPatientSignup(false);
      queryClient.clear();
      await signOut();
      router.replace("/");
    } catch {
      setError("You could not be signed out right now. Please try again.");
    }
  }

  function togglePriority(
    id: RecoveryPreferences["priorities"][number],
  ) {
    setPriorities((current) => {
      const base = current ?? recovery?.profile?.priorities ?? [];
      return base.includes(id)
        ? base.filter((item) => item !== id)
        : [...base, id];
    });
  }

  return (
    <Screen bottomTabs>
      <View style={styles.heading}>
        <Text variant="label">ACCOUNT</Text>
        <Text variant="display">Your preferences</Text>
        <Text variant="body">
          The routine you choose is for reflection, not a prescription.
        </Text>
      </View>

      {recovery?.profile ? (
        <Card>
          <Text variant="heading">Your routine</Text>
          {editingRoutine ? (
            <>
              <View style={styles.list}>
                {priorityChoices.map((choice) => (
                  <Checkbox
                    key={choice.id}
                    checked={savedPriorities.includes(choice.id)}
                    label={choice.title}
                    detail={choice.detail}
                    onPress={() => togglePriority(choice.id)}
                  />
                ))}
              </View>
              <Checkbox
                checked={savedSupportMode === "self_guided"}
                label="Self-guided"
                onPress={() => setSupportMode("self_guided")}
                accessibilityRole="radio"
              />
              <Checkbox
                checked={savedSupportMode === "clinician_supported"}
                label="With clinician support"
                onPress={() => setSupportMode("clinician_supported")}
                accessibilityRole="radio"
              />
              <Button
                onPress={() => void saveRoutine()}
                disabled={updateProfile.isPending || savedPriorities.length === 0}
              >
                {updateProfile.isPending ? "Saving…" : "Save my routine"}
              </Button>
              <Button
                tone="outline"
                onPress={() => {
                  setEditingRoutine(false);
                  setPriorities(null);
                  setSupportMode(null);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Text variant="caption">
                {savedPriorities
                  .map(
                    (id) =>
                      priorityChoices.find((choice) => choice.id === id)?.title,
                  )
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text variant="caption">
                Support approach:{" "}
                {savedSupportMode === "self_guided"
                  ? "Self-guided"
                  : "With clinician support"}
              </Text>
              <Button
                tone="outline"
                onPress={() => {
                  setPriorities(recovery.profile?.priorities ?? []);
                  setSupportMode(recovery.profile?.supportMode ?? "self_guided");
                  setEditingRoutine(true);
                }}
              >
                Edit my routine
              </Button>
            </>
          )}
        </Card>
      ) : (
        <Card tone="sage">
          <Text variant="heading">Finish setup to choose a routine</Text>
          <Text variant="caption">
            Create your starting summary before editing routine preferences.
          </Text>
          <Button onPress={() => router.replace("/quiz")}>
            Return to the starting quiz
          </Button>
        </Card>
      )}

      {pendingRequest.returnToRequest && pendingRequest.token ? (
        <Card tone="sage" testID="request-resume">
          <Text variant="label">SHARE REQUEST</Text>
          <Text variant="heading">A share request is waiting</Text>
          <Text variant="caption">
            Nothing has been shared. After you make room on your care team,
            return to review the request.
          </Text>
          <Button
            onPress={() => {
              const token = pendingRequest.token;
              pendingRequest.setReturnToRequest(false);
              if (token) router.push(requestHref(token));
            }}
          >
            Return to the request
          </Button>
        </Card>
      ) : null}

      {recovery?.profile && userId ? <CareTeamCard key={userId} /> : null}

      <Card tone="sage">
        <Text variant="heading">Your journal data</Text>
        <Text variant="caption">
          Recovery entries are associated with the account you sign into. You
          can permanently delete your recovery profile and entries below;
          deleting them does not delete your sign-in account.
        </Text>
        <Button
          tone="destructive"
          onPress={() => void askDeleteAll()}
          disabled={deleteRecovery.isPending}
          testID="delete-all-recovery-data"
        >
          {deleteRecovery.isPending
            ? "Deleting…"
            : "Delete all recovery data"}
        </Button>
      </Card>

      {error ? (
        <Text variant="caption" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <SafetyNotice />
      <Button tone="outline" onPress={() => void logout()} testID="sign-out">
        Sign out
      </Button>
      {confirmElement}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing * 2,
  },
  list: {
    gap: spacing * 2,
  },
});
