export type PartnerNotificationStatus = "not_configured" | "sent" | "failed";

/**
 * Notification adapter seam for partnership requests.
 *
 * No mail provider is connected yet, so requests remain available in the
 * admin list and this adapter intentionally reports `not_configured`.
 */
export async function notifyStillwellPartnershipTeam(): Promise<PartnerNotificationStatus> {
  return "not_configured";
}
