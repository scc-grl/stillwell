import type {
  RecoveryLog,
  RecoveryState,
} from "@workspace/api-client-react";

export {
  priorityChoices, routinePrompts, supportModeLabel, localDate, formatDate, emptyLog,
} from "@workspace/recovery-journal";

export function recoveryQueryKey(userId: string) {
  return ["/api/recovery", userId] as const;
}

export function upsertLog(
  state: RecoveryState | undefined,
  saved: RecoveryLog,
): RecoveryState {
  const logs = state?.logs.filter((log) => log.date !== saved.date) ?? [];
  return {
    profile: state?.profile ?? null,
    logs: [saved, ...logs].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
