import { pool } from "@workspace/db";
import { WebMvpService } from "./web-mvp";
import { patientWrite } from "./recovery-lock";
import { sendThroughResend } from "./care-team-runtime";
import { logger } from "./logger";
import { explainWeeklyNotes } from "./private-weekly-reason";

/** Runs on every API instance; patient locks + unique owner/week make checks idempotent. */
export function startMvpScheduler() {
  const service = new WebMvpService(pool, undefined, explainWeeklyNotes);
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const { rows } = await pool.query(`SELECT DISTINCT owner_id FROM recovery_stages
        WHERE synthetic_only=false AND owner_id NOT IN (SELECT owner_id FROM recovery_account_deletions)`);
      for (const row of rows) {
        try { await service.weekly(row.owner_id); } catch { logger.warn("Weekly check temporarily unavailable"); }
      }
      const { rows: emails } = await pool.query(`SELECT id,owner_id FROM recovery_stage_emails
        WHERE sent=false AND next_attempt_at<=now() ORDER BY created_at LIMIT 20`);
      for (const email of emails) {
        try {
          await patientWrite(pool, email.owner_id, async tx => {
            const { rows: [job] } = await tx.query(`SELECT * FROM recovery_stage_emails
              WHERE id=$1 AND sent=false AND next_attempt_at<=now() FOR UPDATE SKIP LOCKED`, [email.id]);
            if (!job) return;
            const { rows: [link] } = await tx.query(`SELECT id,clinician_email FROM care_team_links WHERE patient_id=$1
              AND clinician_id=$2 AND status='active'`, [job.owner_id, job.clinician_id]);
            if (!link) { await tx.query("DELETE FROM recovery_stage_emails WHERE id=$1", [job.id]); return; }
            const origin = process.env.CARE_TEAM_WEBSITE_URL;
            if (!origin || !process.env.EMAIL_FROM) {
              await tx.query("UPDATE recovery_stage_emails SET next_attempt_at=now()+interval '5 minutes' WHERE id=$1", [job.id]);
              return;
            }
            const url = new URL(origin);
            if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid email origin");
            const href = `${url.origin}/clinician/patients/${link.id}`;
            // No health data, stage, notes or patient identity in notification emails.
            const text = `A recovery stage in your Stillwell patient list has changed. Sign in to review the current stage and its reason.\n\n${href}\n\nStillwell is not for emergencies.`;
            const sent = await sendThroughResend({
              from: process.env.EMAIL_FROM!, to: [link.clinician_email],
              ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
              subject: "A shared Stillwell stage has changed", text,
              html: `<p>A recovery stage in your Stillwell patient list has changed.</p><p>Sign in to review the current stage and its reason.</p><p><a href="${href}">Open Stillwell</a></p><p>Stillwell is not for emergencies.</p>`,
            }, `stage-update-${job.id}`);
            if (!sent.ok) {
              await tx.query("UPDATE recovery_stage_emails SET next_attempt_at=now()+interval '5 minutes' WHERE id=$1", [job.id]);
              return;
            }
            await tx.query("UPDATE recovery_stage_emails SET sent=true WHERE id=$1", [job.id]);
          });
        } catch {
          await pool.query("UPDATE recovery_stage_emails SET next_attempt_at=now()+interval '5 minutes' WHERE id=$1", [email.id]);
          logger.warn("Stage notification will retry");
        }
      }
    } catch { logger.warn("Weekly worker temporarily unavailable"); }
    finally { running = false; }
  }
  const timer = setInterval(() => { void tick(); }, 60000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
