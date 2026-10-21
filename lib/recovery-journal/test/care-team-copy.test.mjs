import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CARE_TEAM_FULL, DUPLICATE_INVITE, INVITE_FIELD_ERRORS, RESEND_COOLDOWN,
  careTeamErrorMessage, dailyLimitMessage, inviteFieldError, notSentMessage,
  ownEmailMessage, resendAvailableMessage, sendFailedMessage,
} from "../src/care-team-copy.ts";

test("all invitation forms use the same validation and preserve length limits", () => {
  for (const [field, code, invalid] of [
    ["firstName", "first_name_required", ["", " ", "a".repeat(101)]],
    ["lastName", "last_name_required", ["", " ", "a".repeat(101)]],
    ["email", "invalid_email", ["", "person", "person@example", "a b@example.com", "a".repeat(243) + "@example.com"]],
  ]) {
    for (const value of invalid) assert.equal(inviteFieldError(field, value), INVITE_FIELD_ERRORS[field]);
    for (const sender of ["patient", "clinician"])
      assert.equal(careTeamErrorMessage(code, sender, "fallback"), INVITE_FIELD_ERRORS[field]);
  }
  assert.equal(inviteFieldError("firstName", " a "), "");
  assert.equal(inviteFieldError("lastName", "a".repeat(100)), "");
  assert.equal(inviteFieldError("email", " Person@Example.com "), "");
  assert.equal(inviteFieldError("email", "a".repeat(242) + "@example.com"), "");
});

test("patient and clinician copy retains the existing distinct daily caps and roles", () => {
  assert.equal(dailyLimitMessage("patient"), "You’ve sent 10 invites today. Try again tomorrow.");
  assert.equal(dailyLimitMessage("clinician"), "You’ve sent 20 requests today. Try again tomorrow.");
  assert.equal(ownEmailMessage("patient"), "This is your own email. Enter your clinician’s.");
  assert.equal(ownEmailMessage("clinician"), "This is your own email. Enter your patient’s.");
  for (const sender of ["patient", "clinician"]) {
    assert.equal(careTeamErrorMessage("daily_limit", sender, ""), dailyLimitMessage(sender));
    assert.equal(careTeamErrorMessage("own_email", sender, ""), ownEmailMessage(sender));
    assert.equal(careTeamErrorMessage("care_team_full", sender, ""), CARE_TEAM_FULL);
    assert.equal(careTeamErrorMessage("resend_cooldown", sender, ""), RESEND_COOLDOWN);
  }
  assert.equal(CARE_TEAM_FULL, "You can share with up to 5 clinicians. Remove one to invite someone new.");
  assert.equal(resendAvailableMessage(1), "Resend available in 1 minute.");
  assert.equal(resendAvailableMessage(10), "Resend available in 10 minutes.");
});

test("duplicate codes and the legacy sharing alias never fall back to a send failure", () => {
  for (const code of ["already_invited", "already_connected", "already_sharing"])
    assert.equal(careTeamErrorMessage(code, "patient", "fallback"), DUPLICATE_INVITE);
  assert.equal(careTeamErrorMessage("already_invited", "clinician", "", "Alex"), "You’ve already sent Alex a request.");
  assert.equal(careTeamErrorMessage("already_connected", "clinician", "", "Alex"), "Alex already shares their journal with you.");
});

test("failed sends and saved-but-not-emailed results are distinct and privacy safe", () => {
  for (const sender of ["patient", "clinician"]) {
    const noun = sender === "patient" ? "invite" : "request";
    assert.equal(sendFailedMessage(sender), `The ${noun} didn’t send. Check your connection and try again. Nothing was shared.`);
    assert.equal(careTeamErrorMessage("email_failed", sender, "fallback"), sendFailedMessage(sender));
    assert.equal(notSentMessage(sender), `Your ${noun} was saved, but no email was sent. Try resending it later.`);
    assert.equal(careTeamErrorMessage("provider error with private detail", sender, "Safe fallback"), "Safe fallback");
    assert.equal(careTeamErrorMessage(null, sender, "Safe fallback"), "Safe fallback");
  }
});

test("phone, website, clinician controls and API remain wired to shared copy", () => {
  const root = new URL("../../../", import.meta.url);
  for (const file of [
    "artifacts/stillwell-phone/components/careTeam/InviteSheet.tsx",
    "artifacts/stillwell-phone/components/careTeam/CareTeamCard.tsx",
    "artifacts/website/src/components/CareTeamPanel.tsx",
    "lib/clinician-care-portal/src/InviteDialog.tsx",
    "lib/clinician-care-portal/src/Sidebar.tsx",
    "artifacts/api-server/src/lib/care-team.ts",
  ]) {
    const source = readFileSync(new URL(file, root), "utf8");
    assert.match(source, /from ["']@workspace\/recovery-journal\/care-team-copy["']/);
    assert.match(source, /careTeamErrorMessage\(/);
    assert.match(source, /sendFailedMessage\(/);
    assert.doesNotMatch(source, /(?:console\.(?:log|error)|logger\.(?:info|error))\(/);
  }
});
