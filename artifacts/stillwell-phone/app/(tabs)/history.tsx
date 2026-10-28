import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
  useDeleteRecoveryLog,
  useSaveRecoveryLog,
} from "@workspace/api-client-react";
import type { RecoveryLog } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { RecoveryLogEditor } from "@/components/RecoveryLogEditor";
import { RecoveryLogSummary } from "@/components/RecoveryLogSummary";
import { SafetyNotice } from "@/components/SafetyNotice";
import { SleepEditor } from "@/components/SleepEditor";
import { emptyLog, sleepSummary, type SleepLog } from "@workspace/recovery-journal";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import { spacing } from "@/lib/layout";
import { formatDate, localDate, recoveryQueryKey, upsertLog } from "@/lib/journal";

export default function HistoryScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { userId, recovery, recoveryLoading, recoveryError, refreshRecovery } =
    usePatientData();
  const deleteLog = useDeleteRecoveryLog();
  const saveLog = useSaveRecoveryLog();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [period, setPeriod] = useState<"30" | "all">("30");
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingSleep, setEditingSleep] = useState(false);
  const [actionError, setActionError] = useState("");
  const today = localDate();
  const entries = (recovery?.logs ?? [])
    .filter((log) => log.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = new Date(`${today}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 29);
  const cutoffDate = `${cutoff.getFullYear()}-${`${cutoff.getMonth() + 1}`.padStart(2, "0")}-${`${cutoff.getDate()}`.padStart(2, "0")}`;
  const recentEntries = entries.filter((log) => log.date >= cutoffDate);
  const visibleEntries = period === "all" ? entries : recentEntries;
  const selected =
    visibleEntries.find((log) => log.date === selectedDate) ??
    visibleEntries[visibleEntries.length - 1] ??
    null;

  async function persistPastDay(log: Parameters<typeof saveLog.mutateAsync>[0]["data"], section: "check_in" | "activities" = "check_in") {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({ data: { ...log, section } });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    setSelectedDate(saved.date);
    return saved;
  }

  async function savePastDay(log: Parameters<typeof saveLog.mutateAsync>[0]["data"], section: "check_in" | "activities" = "check_in") {
    const saved = await persistPastDay(log, section);
    setEditing(false);
    return saved;
  }

  async function saveSleep(date: string, sleep: SleepLog | null) {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({
      data: { ...emptyLog(date), sleep, section: "sleep" },
    });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    setSelectedDate(saved.date);
    setEditingSleep(false);
    return saved;
  }

  function confirmDeleteSleep(log: RecoveryLog) {
    Alert.alert(
      "Delete sleep for this day?",
      "This removes only the sleep entry. Your check-in and activities stay.",
      [
        { text: "Keep sleep", style: "cancel" },
        {
          text: "Delete sleep",
          style: "destructive",
          onPress: () => {
            setActionError("");
            void saveSleep(log.date, null).catch(() => {
              setActionError("Sleep could not be deleted. Try again.");
            });
          },
        },
      ],
    );
  }

  function confirmDelete(log: RecoveryLog) {
    Alert.alert(
      "Delete this day?",
      "This removes only this day’s recovery entry.",
      [
        { text: "Keep entry", style: "cancel" },
        {
          text: "Delete day",
          style: "destructive",
          onPress: () => {
            setActionError("");
            void deleteLog
              .mutateAsync({ date: log.date })
              .then(async () => {
                await queryClient.invalidateQueries({
                  queryKey: [...getGetRecoveryQueryKey(), userId],
                });
                setSelectedDate(null);
                setEditing(false);
                setEditingDetails(false);
              })
              .catch(() => {
                setActionError("That entry could not be deleted. Try again.");
              });
          },
        },
      ],
    );
  }

  if (recoveryLoading) {
    return (
      <Screen bottomTabs>
        <View style={styles.loading} accessibilityLabel="Loading your history">
          <View style={[styles.skeleton, { backgroundColor: colors.muted }]} />
          <View style={[styles.skeleton, { backgroundColor: colors.muted }]} />
        </View>
      </Screen>
    );
  }
  if (recoveryError || !recovery) {
    return (
      <Screen bottomTabs>
        <Card>
          <Text variant="heading">Your journal isn’t available right now</Text>
          <Button tone="outline" onPress={refreshRecovery}>
            Try again
          </Button>
        </Card>
      </Screen>
    );
  }
  if (selected && editingSleep) {
    return (
      <Screen bottomTabs>
        <SleepEditor
          key={`${selected.date}-sleep`}
          date={selected.date}
          initial={selected.sleep}
          onSave={async (sleep) => {
            await saveSleep(selected.date, sleep);
          }}
          onDelete={selected.sleep ? () => confirmDeleteSleep(selected) : undefined}
          deleting={saveLog.isPending}
          onCancel={() => setEditingSleep(false)}
        />
        {actionError ? (
          <Text variant="caption" accessibilityRole="alert">
            {actionError}
          </Text>
        ) : null}
      </Screen>
    );
  }
  if (selected && editing) {
    return (
      <Screen bottomTabs>
        {editingDetails ? (
          <RecoveryLogEditor
            key={`${selected.date}-details`}
            initial={selected}
            onSave={async (log) => {
              await savePastDay(log, "activities");
            }}
            onCancel={() => {
              setEditingDetails(false);
              setEditing(false);
            }}
            saveLabel="Save changes"
          />
        ) : (
          <DailyCheckInFlow
            key={selected.date}
            initial={selected}
            logs={recovery.logs}
            today={localDate()}
            startAt="edit"
            onPersist={persistPastDay}
            onEditJournal={() => setEditingDetails(true)}
            onExit={() => {
              setEditingDetails(false);
              setEditing(false);
            }}
          />
        )}
        {editingDetails ? <SafetyNotice /> : null}
      </Screen>
    );
  }
  return (
    <Screen bottomTabs>
      <View style={styles.heading}>
        <Text variant="label">YOUR PRIVATE JOURNAL</Text>
        <Text variant="display">Your past check-ins</Text>
        <Text variant="body">
          Revisit the days you chose to record. No values are filled in between entries.
        </Text>
      </View>
      <Card>
        <Text variant="label">JOURNAL INDEX</Text>
        <Text variant="heading">Choose a day</Text>
        <Text variant="caption">Dates appear only when an entry was saved.</Text>
        <View style={styles.periodRow}>
          <Button
            tone={period === "30" ? "secondary" : "outline"}
            onPress={() => {
              setPeriod("30");
              if (selectedDate && !recentEntries.some((log) => log.date === selectedDate)) {
                setSelectedDate(null);
              }
            }}
            testID="history-filter-30-days"
          >
            Past 30 days
          </Button>
          <Button
            tone={period === "all" ? "secondary" : "outline"}
            onPress={() => setPeriod("all")}
            testID="history-filter-all"
          >
            All dates
          </Button>
        </View>
        {visibleEntries.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text variant="caption">
              {entries.length === 0
                ? "Your history will appear here after you save a check-in."
                : "No saved check-ins in this period. Choose All dates to look further back."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleEntries.map((log) => {
              const isSelected = log.date === selected?.date;
              const summary = log.dailyCheckIn?.summary?.trim();
              const count = log.dailyCheckIn?.symptoms?.filter((answer) => answer.status === "recorded").length ?? log.symptoms.length;
              return (
                <Button
                  key={log.date}
                  tone={isSelected ? "secondary" : "outline"}
                  onPress={() => {
                    setActionError("");
                    setEditing(false);
                    setEditingDetails(false);
                    setEditingSleep(false);
                    setSelectedDate(log.date);
                  }}
                  accessibilityLabel={`View check-in for ${formatDate(log.date)}`}
                  accessibilityState={{ selected: isSelected }}
                  testID={`history-day-${log.date}`}
                >
                  <View style={styles.entryCopy}>
                    <Text variant="label">{formatDate(log.date)}</Text>
                    <Text variant="caption">
                      {summary ? "Reflection saved" : `${count} symptom responses recorded`}
                    </Text>
                    <Text variant="caption">{sleepSummary(log.sleep)}</Text>
                  </View>
                </Button>
              );
            })}
          </View>
        )}
      </Card>

      {selected ? (
        <View style={styles.selectedDay}>
          <Card tone="sage">
            <View style={styles.dayHeader}>
              <View style={styles.dayTitle}>
                <Text variant="label">DAILY CHECK-IN</Text>
                <Text variant="heading">{formatDate(selected.date)}</Text>
              </View>
              <View style={styles.dayNavigation}>
                <Button
                  tone="outline"
                  fullWidth={false}
                  onPress={() => {
                    const index = visibleEntries.findIndex((log) => log.date === selected.date);
                    if (index > 0) setSelectedDate(visibleEntries[index - 1].date);
                  }}
                  disabled={visibleEntries.findIndex((log) => log.date === selected.date) <= 0}
                  accessibilityLabel="Previous saved check-in"
                >
                  Previous
                </Button>
                <Button
                  tone="outline"
                  fullWidth={false}
                  onPress={() => {
                    const index = visibleEntries.findIndex((log) => log.date === selected.date);
                    if (index < visibleEntries.length - 1) setSelectedDate(visibleEntries[index + 1].date);
                  }}
                  disabled={visibleEntries.findIndex((log) => log.date === selected.date) >= visibleEntries.length - 1}
                  accessibilityLabel="Next saved check-in"
                >
                  Next
                </Button>
              </View>
            </View>
            <RecoveryLogSummary log={selected} />
            {actionError ? (
              <Text variant="caption" accessibilityRole="alert">
                {actionError}
              </Text>
            ) : null}
          </Card>
          <Button
            onPress={() => {
              setEditingDetails(false);
              setEditing(true);
            }}
          >
            Edit this day
          </Button>
          <Button
            tone="outline"
            onPress={() => {
              setEditingDetails(true);
              setEditing(true);
            }}
          >
            Edit food, movement and pacing
          </Button>
          <Button
            tone="outline"
            onPress={() => {
              setActionError("");
              setEditingSleep(true);
            }}
            testID="edit-past-sleep"
          >
            {selected.sleep ? "Edit sleep" : "Log sleep"}
          </Button>
          <Button
            tone="destructive"
            onPress={() => confirmDelete(selected)}
            disabled={deleteLog.isPending}
            testID="delete-past-entry"
          >
            Delete this day
          </Button>
        </View>
      ) : null}
      <SafetyNotice />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing * 2,
  },
  list: {
    gap: spacing * 3,
    marginTop: spacing * 3,
  },
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing * 2,
    marginTop: spacing * 3,
  },
  emptyHistory: {
    marginTop: spacing * 3,
  },
  selectedDay: {
    gap: spacing * 2,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing * 2,
  },
  dayTitle: {
    flex: 1,
    gap: spacing,
  },
  dayNavigation: {
    flexDirection: "row",
    gap: spacing,
  },
  entryCopy: {
    flex: 1,
    gap: spacing,
  },
  loading: {
    gap: spacing * 3,
    paddingTop: spacing * 4,
  },
  skeleton: {
    width: "100%",
    height: spacing * 20,
    borderRadius: spacing * 2,
  },
});
