import type { RecoveryLogSaveInput } from "@workspace/api-zod";

const activityFields = [
  "dietStatus", "dietNote", "exerciseStatus", "exerciseNote",
  "meditationStatus", "meditationMinutes", "meditationNote", "note",
] as const;

/** The patch is applied atomically to the latest row, not a client's stale snapshot. */
export function recoveryLogWrite(input: RecoveryLogSaveInput) {
  const { section, ...initial } = input;
  const patch: Record<string, unknown> = {};
  const fields = section === "check_in"
    ? ["symptoms", "dailyCheckIn"] as const
    : section === "activities"
      ? activityFields
      : Object.keys(initial) as (keyof typeof initial)[];
  for (const field of fields) {
    if (initial[field] !== undefined) patch[field] = initial[field];
  }
  return { initial, patch };
}
