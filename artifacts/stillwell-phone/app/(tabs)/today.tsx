import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey,
  useSaveRecoveryLog,
} from "@workspace/api-client-react";
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
import { emptyLog, formatDate, localDate, recoveryQueryKey, upsertLog } from "@/lib/journal";

export default function TodayScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { userId, recovery, recoveryLoading, recoveryError, refreshRecovery } =
    usePatientData();
  const saveLog = useSaveRecoveryLog();
  const [editing, setEditing] = useState(false);
  const today = localDate();
  const currentLog = recovery?.logs.find((log) => log.date === today);

  async function saveToday(log: Parameters<typeof saveLog.mutateAsync>[0]["data"]) {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({ data: log });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    setEditing(false);
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
  if (editing || !currentLog) {
    return (
      <Screen bottomTabs>
        <RecoveryLogEditor
          key={`${today}-${editing ? "edit" : "new"}`}
          initial={currentLog ?? emptyLog(today)}
          onSave={saveToday}
          onCancel={currentLog ? () => setEditing(false) : undefined}
        />
        <SafetyNotice />
      </Screen>
    );
  }

  return (
    <Screen bottomTabs>
      <View style={styles.heading}>
        <Text variant="label">TODAY</Text>
        <Text variant="display">Your journal</Text>
        <Text variant="body">{formatDate(today)}</Text>
      </View>
      <Card tone="sage">
        <Text variant="heading">A record, not a score</Text>
        <Text variant="caption">
          Notice changes over time without treating any single day as a result
          or a promise.
        </Text>
      </Card>
      <RecoveryLogSummary log={currentLog} />
      <Button
        onPress={() => setEditing(true)}
        testID="edit-today-entry"
      >
        Edit today’s check-in
      </Button>
      <SafetyNotice />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing * 2,
    paddingVertical: spacing,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
