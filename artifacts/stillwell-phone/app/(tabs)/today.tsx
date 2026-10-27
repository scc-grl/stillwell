import { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSaveRecoveryLog,
  type RecoveryLogInput,
} from "@workspace/api-client-react";
import { sleepSummary, type SleepLog } from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { nativeTheme } from "@workspace/stillwell-design-system/lib/native-theme";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { RecoveryLogEditor } from "@/components/RecoveryLogEditor";
import { RecoveryLogSummary } from "@/components/RecoveryLogSummary";
import { SafetyNotice } from "@/components/SafetyNotice";
import { SleepEditor } from "@/components/SleepEditor";
import { SleepDetails, SleepTipsCard, SleepWeek } from "@/components/SleepDetails";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import {
  emptyLog,
  formatDate,
  localDate,
  priorityChoices,
  recoveryQueryKey,
  routinePrompts,
  supportModeLabel,
  upsertLog,
} from "@/lib/journal";
import { spacing } from "@/lib/layout";

type DashboardMode = "dashboard" | "checkin" | "details" | "sleep";

function dateHeading(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function routineStatus(
  id: (typeof priorityChoices)[number]["id"],
  log: ReturnType<typeof emptyLog> | undefined,
) {
  if (id === "food_hydration") {
    return log?.dietStatus === "done"
      ? "Logged: done"
      : log?.dietStatus === "not_done"
        ? "Logged: Not today"
        : "Not planned";
  }
  if (id === "movement") {
    return log?.exerciseStatus === "done"
        ? "Logged: done"
      : log?.exerciseStatus === "not_done"
        ? "Logged: Not today"
        : "Not planned";
  }
  if (id === "meditation") {
    return log?.meditationStatus === "done"
      ? "Logged: done"
      : log?.meditationStatus === "not_done"
        ? "Logged: Not today"
        : "Not planned";
  }
  return log?.note ? "Logged" : "Not planned";
}

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, recovery, recoveryLoading, recoveryError, refreshRecovery } =
    usePatientData();
  const saveLog = useSaveRecoveryLog();
  const [mode, setMode] = useState<DashboardMode>("dashboard");
  const today = localDate();
  const logs = [...(recovery?.logs ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const currentLog = logs.find((log) => log.date === today);
  const recentLogs = logs.slice(0, 3);

  async function saveToday(log: RecoveryLogInput, section: "check_in" | "activities" = "check_in") {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({ data: { ...log, section } });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    return saved;
  }

  async function saveSleep(sleep: SleepLog | null) {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({
      data: { ...emptyLog(today), sleep, section: "sleep" },
    });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    return saved;
  }

  function confirmDeleteSleep() {
    Alert.alert(
      "Delete sleep for this day?",
      "This removes only the sleep entry. Your check-in and activities stay.",
      [
        { text: "Keep sleep", style: "cancel" },
        {
          text: "Delete sleep",
          style: "destructive",
          onPress: () => {
            void saveSleep(null)
              .then(() => setMode("dashboard"))
              .catch(() => Alert.alert("Sleep could not be deleted. Try again."));
          },
        },
      ],
    );
  }

  if (recoveryLoading) {
    return (
      <Screen bottomTabs>
        <View style={styles.loadingBlock} accessibilityLabel="Loading your journal">
          <View style={[styles.skeletonTitle, { backgroundColor: colors.muted }]} />
          <View style={[styles.skeletonHero, { backgroundColor: colors.secondary }]} />
          <View style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
        </View>
      </Screen>
    );
  }

  if (recoveryError || !recovery) {
    return (
      <Screen bottomTabs>
        <Card>
          <Text variant="label">YOUR PRIVATE JOURNAL</Text>
          <Text variant="heading">Your journal isn’t available right now</Text>
          <Text variant="caption">
            Check your connection, then try loading the private journal again.
          </Text>
          <Button tone="outline" onPress={refreshRecovery} testID="retry-journal">
            Try again
          </Button>
        </Card>
        <SafetyNotice />
      </Screen>
    );
  }

  if (mode === "details") {
    return (
      <Screen bottomTabs>
        <Button
          tone="outline"
          onPress={() => setMode("dashboard")}
          testID="back-to-journal"
        >
          Back to your journal
        </Button>
        <RecoveryLogEditor
          key={`${today}-details`}
          initial={currentLog ?? emptyLog(today)}
          onSave={async (log) => {
            await saveToday(log, "activities");
            setMode("dashboard");
          }}
          onCancel={() => setMode("dashboard")}
          title="Log food, movement and pacing"
        />
        <SafetyNotice />
      </Screen>
    );
  }

  if (mode === "sleep") {
    return (
      <Screen bottomTabs>
        <SleepEditor
          key={`${today}-sleep`}
          date={today}
          initial={currentLog?.sleep}
          onSave={async (sleep) => {
            await saveSleep(sleep);
            setMode("dashboard");
          }}
          onDelete={currentLog?.sleep ? confirmDeleteSleep : undefined}
          deleting={saveLog.isPending}
          onCancel={() => setMode("dashboard")}
        />
      </Screen>
    );
  }

  if (mode === "checkin") {
    return (
      <Screen bottomTabs>
        <DailyCheckInFlow
          key={today}
          initial={currentLog ?? emptyLog(today)}
          logs={recovery.logs}
          today={today}
          startAt={currentLog?.dailyCheckIn ? "saved" : "home"}
          onPersist={saveToday}
          onEditJournal={() => setMode("details")}
          onExit={() => setMode("dashboard")}
          exitLabel="Back to journal"
        />
      </Screen>
    );
  }

  if (!recovery.profile) {
    return (
      <Screen bottomTabs>
        <JournalHeader onPrivacy={() => router.push("/(tabs)/account")} />
        <View style={styles.heading}>
          <Text variant="label">YOUR PRIVATE JOURNAL</Text>
          <Text variant="display">Your space, your pace</Text>
          <Text variant="body">
            A personal journal for noticing patterns and choosing gentle
            routines. Nothing here is a diagnosis or a treatment prescription.
          </Text>
        </View>
        <SafetyNotice />
        <Card tone="sage">
          <Text variant="label">A beginning, not a blank template</Text>
          <Text variant="heading">Choose what you want this space to hold.</Text>
          <Text variant="body">
            You decide what belongs here. Your profile and recovery history stay
            empty until you choose to create them.
          </Text>
          <Button onPress={() => router.replace("/quiz")}>
            Set up my journal
          </Button>
        </Card>
        <ClinicianSupportNote />
      </Screen>
    );
  }

  return (
    <Screen bottomTabs>
      <JournalHeader onPrivacy={() => router.push("/(tabs)/account")} />
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text variant="label" color={colors.primaryForeground}>
          YOUR SPACE, YOUR PACE
        </Text>
        <Text variant="display" color={colors.primaryForeground}>
          Make room for what today is.
        </Text>
        <Text variant="body" color={colors.primaryForeground}>
          A personal journal for noticing patterns and choosing gentle routines.
          Nothing here is a diagnosis or a treatment prescription.
        </Text>
        <Button
          tone="secondary"
          onPress={() => setMode("checkin")}
          testID="today-check-in"
        >
          Today’s check-in
        </Button>
      </View>

      <SafetyNotice />
      <ClinicianSupportNote />

      <Card>
        <View style={styles.cardHeading}>
          <View style={styles.flexCopy}>
            <Text variant="label">YOUR CHOSEN ROUTINE</Text>
            <Text variant="heading">
              {supportModeLabel(recovery.profile.supportMode)}
            </Text>
          </View>
          <Button
            fullWidth={false}
            tone="outline"
            onPress={() => router.push("/(tabs)/account")}
            testID="edit-routine"
          >
            Edit routine
          </Button>
        </View>
        <View style={styles.priorityChips}>
          {recovery.profile.priorities.map((priority) => {
            const choice = priorityChoices.find((item) => item.id === priority);
            return choice ? (
              <View
                key={priority}
                style={[styles.priorityChip, { backgroundColor: colors.secondary }]}
              >
                <Text variant="caption" color={colors.secondaryForeground}>
                  {choice.title}
                </Text>
              </View>
            ) : null;
          })}
        </View>
        <Text variant="caption">Your personalized daily routine</Text>
        {recovery.profile.priorities.map((priority, index) => {
          const choice = priorityChoices.find((item) => item.id === priority);
          if (!choice) return null;
          return (
            <View
              key={priority}
              style={[styles.routineItem, { backgroundColor: colors.secondary }]}
            >
              <View style={styles.cardHeading}>
                <Text variant="label">
                  {index + 1}. {choice.title}
                </Text>
                <Text variant="caption">{routineStatus(priority, currentLog)}</Text>
              </View>
              <Text variant="caption">{routinePrompts[priority]}</Text>
            </View>
          );
        })}
        <Text variant="caption">
          {recovery.profile.supportMode === "clinician_supported"
            ? "Bring these reflections to your clinician to review together."
            : "You can journal independently. Ask a clinician about symptoms or exercise safety whenever you need guidance."}{" "}
          Adapt or skip any routine; use today’s check-in to document what
          happened.
        </Text>
      </Card>

      <Card>
        <View style={styles.cardHeading}>
          <View style={styles.flexCopy}>
            <Text variant="label">A SMALL CHECK-IN</Text>
            <Text variant="heading">
              {currentLog ? "Today, in your own words" : "Today can be an entry"}
            </Text>
          </View>
          <Button
            fullWidth={false}
            tone="outline"
            onPress={() => setMode("checkin")}
            testID={currentLog ? "edit-today" : "start-today"}
          >
            {currentLog ? "Edit today" : "Start today"}
          </Button>
        </View>
        {currentLog ? (
          <View style={styles.todaySummary}>
            <Text variant="caption">{dateHeading(today)}</Text>
            <RecoveryLogSummary log={currentLog} />
            <Text variant="caption">
              Editing replaces today’s entry; there is one entry per calendar
              day.
            </Text>
            <Button
              tone="outline"
              onPress={() => setMode("details")}
              testID="edit-journal-details"
            >
              Edit food, movement and pacing
            </Button>
          </View>
        ) : (
          <View style={[styles.emptyPrompt, { backgroundColor: colors.muted }]}>
            <Text variant="body">
              Nothing to catch up on. Begin when it feels useful.
            </Text>
            <Text variant="caption">
              No streaks. No missing-day reminders. Just your own record.
            </Text>
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.cardHeading}>
          <View style={styles.flexCopy}>
            <Text variant="label">LAST NIGHT</Text>
            <Text variant="heading">{sleepSummary(currentLog?.sleep)}</Text>
          </View>
          <Button
            fullWidth={false}
            tone="outline"
            onPress={() => setMode("sleep")}
            testID={currentLog?.sleep ? "edit-sleep" : "log-sleep"}
          >
            {currentLog?.sleep ? "Edit sleep" : "Log sleep"}
          </Button>
        </View>
        {currentLog?.sleep ? <SleepDetails sleep={currentLog.sleep} /> : (
          <Text variant="caption">
            Optional. Record bedtime, wake time, or how the night felt. Skip anything.
          </Text>
        )}
        <SleepWeek logs={recovery.logs} ending={today} />
      </Card>
      <SleepTipsCard />

      <Card>
        <View style={styles.cardHeading}>
          <View style={styles.flexCopy}>
            <Text variant="label">YOUR OWN HISTORY</Text>
            <Text variant="heading">Days you chose to keep</Text>
          </View>
          <Text variant="caption">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </Text>
        </View>
        {recentLogs.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text variant="label">Your history starts when you do.</Text>
            <Text variant="caption">No days are pre-filled or assumed.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {recentLogs.map((log, index) => (
              <View
                key={log.date}
                style={[styles.historyEntry, { borderColor: colors.border }]}
              >
                <Text variant="label">
                  {formatDate(log.date)}
                  {index === 0 ? " · Most recent" : ""}
                </Text>
                <RecoveryLogSummary log={log} />
              </View>
            ))}
          </View>
        )}
        <Button
          tone="outline"
          onPress={() => router.push("/(tabs)/history")}
          testID="open-history"
        >
          View all history
        </Button>
      </Card>

      <Text variant="caption" style={styles.footer}>
        No streaks. No prescribed progression. Your reflections are yours.
      </Text>
      <Button
        tone="outline"
        onPress={() => router.push("/(tabs)/account")}
        testID="privacy-data-controls"
      >
        Privacy and data controls
      </Button>
    </Screen>
  );
}

function ClinicianSupportNote() {
  return (
    <Card>
      <Text variant="label">CLINICIAN SUPPORT</Text>
      <Text variant="heading">Your journal stays yours.</Text>
      <Text variant="body">
        Patient invitations and in-app journal sharing are planned, but not
        available yet. You can bring your own reflections to a clinician outside
        Stillwell if you choose.
      </Text>
      <Text variant="caption">
        Nothing is shared with a clinician through Stillwell today.
      </Text>
    </Card>
  );
}

function JournalHeader({ onPrivacy }: { onPrivacy: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.brandHeader}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.brandMark}
        resizeMode="contain"
        accessibilityLabel="Stillwell brand mark"
      />
      <View style={styles.brandCopy}>
        <Text variant="heading">stillwell</Text>
        <Text variant="caption" color={colors.mutedForeground}>
          Your private journal
        </Text>
      </View>
      <Button
        fullWidth={false}
        tone="outline"
        onPress={onPrivacy}
        testID="header-privacy"
      >
        Privacy
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBlock: {
    gap: spacing * 4,
    paddingTop: spacing * 4,
  },
  skeletonTitle: {
    width: "58%",
    height: spacing * 3,
    borderRadius: nativeTheme.radius,
  },
  skeletonHero: {
    width: "100%",
    height: spacing * 38,
    borderRadius: nativeTheme.radius,
  },
  skeletonCard: {
    width: "100%",
    height: spacing * 30,
    borderRadius: nativeTheme.radius,
  },
  heading: {
    gap: spacing * 2,
  },
  brandHeader: {
    minHeight: spacing * 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing * 2,
  },
  brandMark: {
    width: spacing * 9,
    height: spacing * 9,
    borderRadius: nativeTheme.radius,
  },
  brandCopy: {
    flex: 1,
    gap: spacing,
  },
  hero: {
    gap: spacing * 3,
    padding: spacing * 5,
    borderRadius: nativeTheme.radius,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  flexCopy: {
    flex: 1,
    gap: spacing,
  },
  priorityChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing,
  },
  priorityChip: {
    borderRadius: nativeTheme.radius,
    paddingHorizontal: spacing * 3,
    paddingVertical: spacing * 2,
  },
  routineItem: {
    gap: spacing * 2,
    borderRadius: nativeTheme.radius,
    padding: spacing * 4,
  },
  todaySummary: {
    gap: spacing * 3,
  },
  emptyPrompt: {
    gap: spacing * 2,
    padding: spacing * 4,
    borderRadius: nativeTheme.radius,
  },
  emptyHistory: {
    alignItems: "center",
    gap: spacing,
    paddingVertical: spacing * 6,
  },
  historyList: {
    gap: spacing * 3,
  },
  historyEntry: {
    gap: spacing * 2,
    paddingTop: spacing * 3,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    textAlign: "center",
  },
});
