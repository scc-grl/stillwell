import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSaveRecoveryLog,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { RecoveryLogEditor } from "@/components/RecoveryLogEditor";
import { SafetyNotice } from "@/components/SafetyNotice";
import { Screen } from "@/components/Screen";
import { usePatientData } from "@/contexts/PatientDataContext";
import { emptyLog, localDate, recoveryQueryKey, upsertLog } from "@/lib/journal";

export default function TodayScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { userId, recovery, recoveryLoading, recoveryError, refreshRecovery } =
    usePatientData();
  const saveLog = useSaveRecoveryLog();
  const [editingDetails, setEditingDetails] = useState(false);
  const today = localDate();
  const currentLog = recovery?.logs.find((log) => log.date === today);

  async function saveToday(log: Parameters<typeof saveLog.mutateAsync>[0]["data"]) {
    if (!userId) throw new Error("A signed-in patient account is required.");
    const saved = await saveLog.mutateAsync({ data: log });
    queryClient.setQueryData(
      recoveryQueryKey(userId),
      (current: typeof recovery) => upsertLog(current, saved),
    );
    setEditingDetails(false);
    return saved;
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
  if (editingDetails) {
    return (
      <Screen bottomTabs>
        <RecoveryLogEditor
          key={`${today}-details`}
          initial={currentLog ?? emptyLog(today)}
          onSave={async (log) => {
            await saveToday(log);
          }}
          onCancel={() => setEditingDetails(false)}
        />
        <SafetyNotice />
      </Screen>
    );
  }

  return (
    <Screen bottomTabs>
      <DailyCheckInFlow
        key={today}
        initial={currentLog ?? emptyLog(today)}
        logs={recovery.logs}
        today={today}
        startAt={currentLog?.dailyCheckIn ? "saved" : "home"}
        onPersist={saveToday}
        onEditJournal={() => setEditingDetails(true)}
      />
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
