import type { RecoveryLogSaveInput } from "@workspace/api-zod";
import { dailyCheckInFromLog } from "@workspace/recovery-journal";

const activityFields = [
  "dietStatus", "dietNote", "exerciseStatus", "exerciseNote",
  "meditationStatus", "meditationMinutes", "meditationNote", "note",
] as const;

/** The patch is applied atomically to the latest row, not a client's stale snapshot. */
export function recoveryLogWrite(input: RecoveryLogSaveInput) {
  const { section, ...initial } = input;
  // Older clients/drafts carry unversioned 0–3 values; newer entries are explicit.
  if (initial.dailyCheckIn) initial.dailyCheckIn = dailyCheckInFromLog(initial);
  const patch: Record<string, unknown> = {};
  const fields = section === "check_in"
    ? ["symptoms", "dailyCheckIn"] as const
    : section === "activities"
      ? activityFields
      : section === "sleep"
        ? ["sleep"] as const
        : section === "journal"
          ? ["symptoms", "dailyCheckIn", "sleep"] as const
        : Object.keys(initial) as (keyof typeof initial)[];
  for (const field of fields) {
    if (initial[field] !== undefined) patch[field] = initial[field];
  }
  return { initial, patch };
}
