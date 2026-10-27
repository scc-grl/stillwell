/** Shared, privacy-safe care-team copy. Never display raw API/provider errors. */
export const CLINICIAN_PROOF_LABEL = "Proof-of-concept";
export const CLINICIAN_PROOF_DESCRIPTION = "Clinician tools are an early proof-of-concept. Clinician identities aren't verified, and features may change.";

export type CareSender = "patient" | "clinician";
export type InviteField = "firstName" | "lastName" | "email";

export const INVITE_FIELD_ERRORS: Record<InviteField, string> = {
  firstName: "Enter their first name.",
  lastName: "Enter their last name.",
  email: "Enter an email like name@example.com.",
};
export const CARE_TEAM_FULL = "You can share with up to 5 clinicians. Remove one to invite someone new.";
export const DUPLICATE_INVITE = "You’ve already invited this email.";
export const RESEND_COOLDOWN = "You can resend in a few minutes.";

export function ownEmailMessage(sender: CareSender) {
  return sender === "patient"
    ? "This is your own email. Enter your clinician’s."
    : "This is your own email. Enter your patient’s.";
}
export function dailyLimitMessage(sender: CareSender) {
  return sender === "patient"
    ? "You’ve sent 10 invites today. Try again tomorrow."
    : "You’ve sent 20 requests today. Try again tomorrow.";
}
export function sendFailedMessage(sender: CareSender) {
  return `The ${sender === "patient" ? "invite" : "request"} didn’t send. Check your connection and try again. Nothing was shared.`;
}
export function notSentMessage(sender: CareSender) {
  return `Your ${sender === "patient" ? "invite" : "request"} was saved, but no email was sent. Try resending it later.`;
}
export function resendAvailableMessage(minutes: number) {
  return `Resend available in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
export function inviteFieldError(field: InviteField, value: string): string {
  const trimmed = value.trim();
  const valid = field === "email"
    ? trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    : trimmed.length > 0 && trimmed.length <= 100;
  return valid ? "" : INVITE_FIELD_ERRORS[field];
}

/** Known codes only; caller supplies operation-specific fallback for other errors. */
export function careTeamErrorMessage(
  code: string | null,
  sender: CareSender,
  fallback: string,
  firstName = "Your patient",
): string {
  switch (code) {
    case "first_name_required": return INVITE_FIELD_ERRORS.firstName;
    case "last_name_required": return INVITE_FIELD_ERRORS.lastName;
    case "invalid_email": return INVITE_FIELD_ERRORS.email;
    case "own_email": return ownEmailMessage(sender);
    case "care_team_full": return CARE_TEAM_FULL;
    case "resend_cooldown": return RESEND_COOLDOWN;
    case "daily_limit": return dailyLimitMessage(sender);
    case "already_invited": return sender === "patient" ? DUPLICATE_INVITE : `You’ve already sent ${firstName} a request.`;
    case "already_connected":
    case "already_sharing": return sender === "patient" ? DUPLICATE_INVITE : `${firstName} already shares their journal with you.`;
    case "email_failed": return sendFailedMessage(sender);
    default: return fallback;
  }
}
