export const JOURNAL_SHARE_AREAS = [
  "symptoms",
  "food_hydration",
  "movement",
  "quiet_pause",
  "pacing",
] as const;

export type JournalShareArea = (typeof JOURNAL_SHARE_AREAS)[number];
export type ConnectionStatus = "pending" | "accepted" | "revoked";
export type ConnectionAction = "invite" | "accept" | "revoke";

export function transitionConnection(
  current: ConnectionStatus | "none",
  action: ConnectionAction,
): ConnectionStatus | null {
  if (action === "invite") return current === "accepted" ? "accepted" : "pending";
  if (action === "accept") return current === "pending" ? "accepted" : null;
  return current === "pending" || current === "accepted" ? "revoked" : null;
}

export function canReadConnection(
  status: ConnectionStatus,
  assignedClinicianId: string,
  authenticatedClinicianId: string,
): boolean {
  return status === "accepted" && assignedClinicianId === authenticatedClinicianId;
}

export function canPatientManageConnection(
  status: ConnectionStatus,
  connectionPatientId: string,
  authenticatedPatientId: string,
): boolean {
  return (status === "pending" || status === "accepted") &&
    connectionPatientId === authenticatedPatientId;
}

type JournalLog = Record<string, unknown> & { date: string };

const AREA_FIELDS: Record<JournalShareArea, readonly string[]> = {
  symptoms: ["symptoms"],
  food_hydration: ["dietStatus", "dietNote"],
  movement: ["exerciseStatus", "exerciseNote"],
  quiet_pause: ["meditationStatus", "meditationMinutes", "meditationNote"],
  pacing: ["note"],
};

export function filterSharedJournalLog(
  log: JournalLog,
  areas: readonly JournalShareArea[],
): Record<string, unknown> | null {
  if (areas.length === 0) return null;
  const filtered: Record<string, unknown> = { date: log.date };
  for (const area of areas) {
    for (const field of AREA_FIELDS[area]) {
      if (Object.hasOwn(log, field)) filtered[field] = log[field];
    }
  }
  return filtered;
}
