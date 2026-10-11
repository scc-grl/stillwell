import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
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
import { RecoveryLogEditor } from "@/components/RecoveryLogEditor";
import { RecoveryLogSummary } from "@/components/RecoveryLogSummary";
import { SafetyNotice } from "@/components/SafetyNotice";
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
  const [selected, setSelected] = useState<RecoveryLog | null>(null);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const entries =
    recovery?.logs.filter((log) => log.date < localDate()) ?? [];

  async function savePastDay(log: Parameters<typeof saveLog.mutateAsync>[0]["data"]) {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({ data: log });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    setSelected(saved);
    setEditing(false);
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
                setSelected(null);
                setEditing(false);
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
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
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
  if (selected && editing) {
    return (
      <Screen bottomTabs>
        <RecoveryLogEditor
          key={selected.date}
          initial={selected}
          onSave={savePastDay}
          onCancel={() => setEditing(false)}
          saveLabel="Save changes"
        />
        <SafetyNotice />
      </Screen>
    );
  }
  if (selected) {
    return (
      <Screen bottomTabs>
        <Button tone="outline" fullWidth={false} onPress={() => setSelected(null)}>
          Back to history
        </Button>
        <Text variant="display">{formatDate(selected.date)}</Text>
        <RecoveryLogSummary log={selected} />
        {actionError ? (
          <Text variant="caption" accessibilityRole="alert">
            {actionError}
          </Text>
        ) : null}
        <Button onPress={() => setEditing(true)}>Edit this day</Button>
        <Button
          tone="destructive"
          onPress={() => confirmDelete(selected)}
          disabled={deleteLog.isPending}
          testID="delete-past-entry"
        >
          Delete this day
        </Button>
        <SafetyNotice />
      </Screen>
    );
  }

  return (
    <Screen bottomTabs>
      <View style={styles.heading}>
        <Text variant="label">YOUR JOURNAL</Text>
        <Text variant="display">Past days</Text>
        <Text variant="body">
          Look back at what you chose to record. You can edit or remove any day.
        </Text>
      </View>
      {entries.length === 0 ? (
        <Card tone="sage">
          <Text variant="heading">Your history will grow at your pace</Text>
          <Text variant="caption">
            Previous daily entries will appear here after you save them.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {entries.map((log) => (
            <Card key={log.date} inset="compact">
              <View style={styles.entryRow}>
                <View style={styles.entryCopy}>
                  <Text variant="label">{formatDate(log.date)}</Text>
                  <Text variant="caption">
                    {log.symptoms.length} symptom rating
                    {log.symptoms.length === 1 ? "" : "s"} ·{" "}
                    {log.dietStatus === "done" ? "Food noted" : "Food not noted"}
                  </Text>
                </View>
                <Button
                  fullWidth={false}
                  tone="outline"
                  onPress={() => {
                    setActionError("");
                    setSelected(log);
                  }}
                  accessibilityLabel={`View entry for ${formatDate(log.date)}`}
                >
                  View
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}
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
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing * 3,
  },
  entryCopy: {
    flex: 1,
    gap: spacing,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
