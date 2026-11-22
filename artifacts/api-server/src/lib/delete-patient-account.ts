import { patientWrite, type SqlPool } from "./recovery-lock";

export class LegacyCopyOwnershipError extends Error {}
/** Two durable phases. A provider failure leaves an explicit, retryable deletion marker. */
export async function deletePatientAccount(pool: SqlPool, owner: string, emails: string[], deleteSignIn: (id: string) => Promise<unknown>, accountCreatedAt = 0) {
  await patientWrite(pool, owner, async tx => {
    // Older disconnects deliberately discarded the owner. Never guess from names or
    // delete another patient's copy. An audited mapping is needed for these records.
    const { rows: unknownCopies } = await tx.query(`SELECT id FROM care_team_links l WHERE status='former'
      AND retained_owner_id IS NULL AND connected_at >= $1
      AND NOT EXISTS (SELECT 1 FROM care_team_invites i WHERE i.accepted_link_id=l.id)
      LIMIT 1`, [new Date(accountCreatedAt)]);
    if (unknownCopies.length) throw new LegacyCopyOwnershipError("Older shared-copy ownership needs review before account deletion can safely finish. No data was removed. Please contact Stillwell.");
    await tx.query("INSERT INTO recovery_account_deletions(owner_id) VALUES($1) ON CONFLICT DO NOTHING", [owner]);
    // Include disconnected links (retained_owner_id) and pre-MVP accepted invitations.
    // No clinician account is ever deleted.
    await tx.query(`DELETE FROM care_team_links WHERE patient_id=$1 OR retained_owner_id=$1 OR id IN
      (SELECT accepted_link_id FROM care_team_invites WHERE direction='patient_invites_clinician' AND inviter_id=$1
       OR direction='clinician_requests_patient' AND accepting_user_id=$1)`, [owner]);
    await tx.query(`DELETE FROM care_team_invites WHERE inviter_id=$1 OR accepting_user_id=$1
      OR direction='clinician_requests_patient' AND invitee_email=ANY($2::text[])`, [owner, emails]);
    await tx.query("DELETE FROM care_team_email_sends WHERE inviter_id=$1", [owner]);
    for (const table of ["recovery_stage_emails", "recovery_weekly_checks", "recovery_intake_baselines",
      "recovery_stages", "recovery_intake_consents", "recovery_intake_attempts", "recovery_logs", "recovery_profiles"]) {
      await tx.query(`DELETE FROM ${table} WHERE owner_id=$1`, [owner]);
    }
    await tx.query("DELETE FROM patient_clinician_connections WHERE patient_id=$1", [owner]);
    await tx.query("DELETE FROM newsletter_subscriptions WHERE lower(email)=ANY($1::text[])", [emails]);
    await tx.query("DELETE FROM partnership_requests WHERE lower(work_email)=ANY($1::text[])", [emails]);
    await tx.query("DELETE FROM account_roles WHERE user_id=$1 AND account_type='patient'", [owner]);
  });
  // Only after all database work committed. Never log Clerk exceptions or their bodies.
  await deleteSignIn(owner);
  await pool.query("DELETE FROM recovery_account_deletions WHERE owner_id=$1", [owner]);
}
