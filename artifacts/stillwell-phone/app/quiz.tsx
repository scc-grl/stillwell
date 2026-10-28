import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
  useStartRecovery,
  type RecoveryLogInput,
  type RecoveryPreferences,
  type RecoveryStartInput,
} from "@workspace/api-client-react";
import { StartRecoveryBody } from "@workspace/api-zod";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/native/checkbox";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { usePatientData } from "@/contexts/PatientDataContext";
import { spacing } from "@/lib/layout";
import { RecoveryLogEditor } from "@/components/RecoveryLogEditor";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { setupCopy, supportModes, localDate, defaultSymptoms, type CheckInSymptomName } from "@workspace/recovery-journal";
import { SafetyNotice } from "@/components/SafetyNotice";
import { Screen } from "@/components/Screen";
import {
  clearConsentedDraft,
  isPendingPatientSignup,
  readConsentedDraftForUser,
  saveConsentedDraft,
  setPendingPatientSignup,
} from "@/lib/draft";
import {
  emptyLog,
  priorityChoices,
} from "@/lib/journal";
import { requestHref, usePendingRequest } from "@/contexts/PendingRequestContext";

export default function StartingQuizScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const {
    isLoaded,
    isSignedIn,
    userId,
    accountType,
    accountTypeLoading,
    recovery,
    recoveryLoading,
    recoveryError,
    refreshRecovery,
  } = usePatientData();
  const startRecovery = useStartRecovery();
  const pendingRequest = usePendingRequest();
  const requestToken = pendingRequest.token;
  const setReadyHandoff = pendingRequest.setReadyHandoff;
  // After the first save, a pending share request opens its "ready" state;
  // nothing is accepted until the patient chooses.
  const hasInvitePrefill = Boolean(pendingRequest.invitePrefill);
  function afterFirstSave() {
    if (requestToken) {
      setReadyHandoff(true);
      router.replace(requestHref(requestToken));
    } else if (hasInvitePrefill) {
      // Expired request → "Invite Dr. X": the Account invite sheet opens
      // prefilled; nothing is sent until the patient taps Send.
      router.replace("/(tabs)/account");
    } else {
      router.replace("/(tabs)/today");
    }
  }
  const afterFirstSaveRef = useRef(afterFirstSave);
  afterFirstSaveRef.current = afterFirstSave;
  const handoffStarted = useRef(false);
  const [supportMode, setSupportMode] =
    useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [priorities, setPriorities] =
    useState<RecoveryPreferences["priorities"]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<CheckInSymptomName[]>(defaultSymptoms);
  const [firstLog, setFirstLog] =
    useState<RecoveryLogInput>(() => emptyLog());
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [editingActivities, setEditingActivities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [handoffError, setHandoffError] = useState(false);
  const [restoredDraft, setRestoredDraft] =
    useState<RecoveryStartInput | null>(null);

  useEffect(() => {
    if (
      !isSignedIn ||
      !userId ||
      accountType !== "patient" ||
      recoveryLoading ||
      handoffStarted.current
    ) {
      return;
    }
    handoffStarted.current = true;
    if (recovery?.profile) {
      if (isPendingPatientSignup()) {
        void clearConsentedDraft()
          .finally(() => setPendingPatientSignup(false))
          .catch(() => undefined);
      }
      return;
    }
    void readConsentedDraftForUser(userId, isPendingPatientSignup())
      .then(async (draft) => {
        if (!draft) {
          setPendingPatientSignup(false);
          return;
        }
        setRestoredDraft(draft);
        setSaving(true);
        try {
          const saved = await startRecovery.mutateAsync({ data: draft });
          await clearConsentedDraft();
          setPendingPatientSignup(false);
          queryClient.setQueryData(
            [...getGetRecoveryQueryKey(), userId],
            saved,
          );
          afterFirstSaveRef.current();
        } catch {
          setHandoffError(true);
          setError("Your saved setup could not be added to this journal yet.");
        } finally {
          setSaving(false);
        }
      })
      .catch(() => {
        setHandoffError(true);
        setError("We couldn’t open your saved setup securely.");
      });
  }, [
    accountType,
    isSignedIn,
    queryClient,
    recoveryLoading,
    recovery?.profile,
    router,
    startRecovery,
    userId,
    handoffError,
  ]);

  if (
    isLoaded &&
    isSignedIn &&
    (accountTypeLoading || (accountType === "patient" && recoveryLoading))
  ) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Checking your account…</Text>
        </View>
      </Screen>
    );
  }
  if (isSignedIn && accountType === "clinician") {
    return <Redirect href="/clinician-message" />;
  }
  if (isSignedIn && recoveryError) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">Your journal isn’t available right now</Text>
          <Button tone="outline" onPress={refreshRecovery}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (isSignedIn && recoveryLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (isSignedIn && recovery?.profile) {
    return (
      <Redirect
        href={
          requestToken
            ? requestHref(requestToken)
            : hasInvitePrefill
              ? "/(tabs)/account"
              : "/(tabs)/today"
        }
      />
    );
  }
  if (saving) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Saving your first summary…</Text>
        </View>
      </Screen>
    );
  }
  if (handoffError && restoredDraft) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">Your setup is saved securely</Text>
          <Text variant="body">
            We couldn’t add it to your journal yet. Try again, or clear the
            saved setup and start over.
          </Text>
          <Button
            onPress={() => {
              handoffStarted.current = false;
              setHandoffError(false);
              setError("");
            }}
          >
            Try again
          </Button>
          <Button
            tone="outline"
            onPress={async () => {
              await clearConsentedDraft();
              setPendingPatientSignup(false);
              setRestoredDraft(null);
              setHandoffError(false);
              setError("");
            }}
          >
            Clear saved setup
          </Button>
        </Card>
      </Screen>
    );
  }

  function togglePriority(
    id: RecoveryPreferences["priorities"][number],
  ) {
    setPriorities((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function saveStartingSummary() {
    setError("");
    const payload: RecoveryStartInput = {
      preferences: { supportMode, priorities, selectedSymptoms },
      consentAccepted: true,
      firstLog,
    };
    const parsed = StartRecoveryBody.safeParse(payload);
    if (!parsed.success) {
      setError("Choose at least one routine focus and review the answers.");
      return;
    }
    if (!consentAccepted) {
      setError("Please agree to store this setup in your private journal.");
      return;
    }

    setSaving(true);
    try {
      await saveConsentedDraft(parsed.data, isSignedIn ? userId : null);
      if (!isSignedIn || !userId) {
        setPendingPatientSignup(true);
        router.push("/auth?mode=sign-up");
        return;
      }

      const saved = await startRecovery.mutateAsync({ data: parsed.data });
      await clearConsentedDraft();
      setPendingPatientSignup(false);
      queryClient.setQueryData(
        [...getGetRecoveryQueryKey(), userId],
        saved,
      );
      afterFirstSave();
    } catch {
      setError(
        "Your setup could not be saved yet. It remains on this device so you can retry or clear it.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelSetup() {
    await clearConsentedDraft();
    setPendingPatientSignup(false);
    pendingRequest.clear();
    router.replace(isSignedIn ? "/(tabs)/account" : "/");
  }

  return (
    <Screen>
      <Text variant="display">{setupCopy.title}</Text>
      <Text variant="body">{setupCopy.intro}</Text>
      {hasInvitePrefill && !requestToken ? (
        <Card tone="sage" testID="quiz-invite-notice">
          <Text variant="heading">Set up your journal first</Text>
          <Text variant="body">
            Inviting a clinician needs a journal to share. After you save your
            first summary, we’ll open the invite in Account with her details
            filled in. Nothing is sent until you choose.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">Your first daily summary</Text>
        {editingActivities ? (
          <>
            <RecoveryLogEditor initial={firstLog} onChange={setFirstLog} />
            <Button tone="outline" onPress={() => setEditingActivities(false)}>
              Back to your first summary
            </Button>
          </>
        ) : (
          <DailyCheckInFlow
            initial={firstLog}
            logs={[]}
            today={localDate()}
            startAt={firstLog.dailyCheckIn ? "saved" : "home"}
            draftMode
            selectedSymptoms={selectedSymptoms}
            onSelectSymptoms={setSelectedSymptoms}
            onPersist={async (next) => {
              setFirstLog(next);
              return { ...next, updatedAt: new Date().toISOString() };
            }}
            onEditJournal={() => setEditingActivities(true)}
          />
        )}
      </Card>

      <Card tone="sage">
        <Text variant="heading">Choose what matters to track</Text>
        <Text variant="caption">
          Pick the parts of your day you want to notice. You can change these
          later.
        </Text>
        <View style={styles.choices}>
          {priorityChoices.map((choice) => (
            <Checkbox
              key={choice.id}
              checked={priorities.includes(choice.id)}
              label={choice.title}
              detail={choice.detail}
              onPress={() => togglePriority(choice.id)}
              testID={`priority-${choice.id}`}
            />
          ))}
        </View>
        {supportModes.map((choice) => (
          <Checkbox
            key={choice.value}
            checked={supportMode === choice.value}
            label={choice.title}
            detail={choice.detail}
            onPress={() => setSupportMode(choice.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: supportMode === choice.value }}
          />
        ))}
      </Card>

      <Card>
        <Checkbox
          checked={consentAccepted}
          label={setupCopy.consent}
          detail={setupCopy.consentDetail}
          onPress={() => setConsentAccepted((current) => !current)}
          testID="storage-consent"
        />
      </Card>

      {error ? (
        <Text variant="caption" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <SafetyNotice />
      <Button
        onPress={() => void saveStartingSummary()}
        disabled={saving || priorities.length === 0 || !consentAccepted}
        testID="save-starting-summary"
      >
        {saving
          ? "Saving…"
          : isSignedIn
            ? "Save my starting summary"
            : "Agree and create my account"}
      </Button>
      <Button tone="outline" onPress={() => void cancelSetup()}>
        Cancel and clear this setup
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing * 3,
  },
  choices: {
    gap: spacing * 2,
  },
});
