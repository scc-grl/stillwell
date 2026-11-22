import { scanKeywords } from "@workspace/intake-ai";
import { dailyCheckInFromLog, makeEmptyDailyCheckIn } from "@workspace/recovery-journal";
import { patientWrite, transaction, type SqlPool, type SqlClient } from "./recovery-lock";
import { deletionKeys } from "./account-deletion-key";
import { decideWeekly, emptyScores, localDay, mondayOf, MVP_SYMPTOMS, offsetDay, WEEKLY_RULES, type Scores } from "./weekly-rules";

export class MvpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function mvpStage(row: any) {
  return { id: row.id, stage: row.stage, source: row.source, reasons: row.reasons,
    ruleIds: row.rule_ids, rulesVersion: row.rules_version, createdAt: new Date(row.created_at).toISOString() };
}
export function mvpEntry(row: any) {
  const saved = row.data?.mvp;
  const checkIn = dailyCheckInFromLog({ symptoms: row.data?.symptoms ?? [], dailyCheckIn: row.data?.dailyCheckIn });
  const scores = emptyScores();
  for (const name of MVP_SYMPTOMS) {
    const answer = checkIn.symptoms.find(s => s.name === name);
    scores[name] = row.data?.dailyCheckIn || !saved
      ? answer?.status === "recorded" ? answer.rating : null
      : saved.scores[name] ?? null;
  }
  return { date: String(row.date), scores, planScore: saved?.planScore ?? null,
    note: saved?.note ?? row.data?.note ?? checkIn.summary ?? "",
    flagged: saved?.flagged === true, explainNotes: saved?.explanationConsent?.version === WEEKLY_RULES.notesConsentVersion,
    updatedAt: new Date(row.updated_at).toISOString() };
}
export const doctorDay = (row: any, previous?: any) => {
  const { date, scores, planScore, flagged } = mvpEntry(row);
  const prior = previous ? mvpEntry(previous).scores : emptyScores();
  const jumpSymptoms = MVP_SYMPTOMS.filter(k => scores[k] !== null && prior[k] !== null && scores[k]! - prior[k]! >= WEEKLY_RULES.journalJump);
  return { date, scores, planScore, flagged, jumpSymptoms }; // Explicit allowlist: patient notes can never cross this boundary.
};
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
const baselineScores = (scores: any): Scores => Object.fromEntries(MVP_SYMPTOMS.map(k => [k,
  typeof scores?.[k] === "number" && scores[k] >= 0 && scores[k] <= 10 ? scores[k] : null])) as Scores;

async function stageEmails(tx: SqlClient, owner: string, stageId: string) {
  await tx.query(`INSERT INTO recovery_stage_emails(owner_id,clinician_id,stage_id)
    SELECT $1,clinician_id,$2 FROM care_team_links WHERE patient_id=$1 AND status='active'`, [owner, stageId]);
}
export class WebMvpService {
  constructor(private pool: SqlPool, private now = () => new Date(),
    private explain: (notes: string[]) => Promise<string | null> = async () => null) {}
  async patient(owner: string) {
    await this.weekly(owner);
    return transaction(this.pool, async tx => {
      await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      const { rows } = await tx.query("SELECT data,date::text AS date,updated_at FROM recovery_logs WHERE owner_id=$1 ORDER BY date DESC", [owner]);
      const { rows: stages } = await tx.query("SELECT * FROM recovery_stages WHERE owner_id=$1 AND synthetic_only=false ORDER BY created_at DESC,id DESC", [owner]);
      const timezone = await this.timezone(tx, owner);
      const monday = mondayOf(localDay(this.now(), timezone));
      return { entries: rows.map(mvpEntry), stages: stages.map(mvpStage), timezone,
        daysThisWeek: rows.filter(r => r.date >= monday && r.date < offsetDay(monday, 7)).length, nextCheck: offsetDay(monday, 7) };
    });
  }
  async save(owner: string, date: string, input: { scores: Scores; planScore: number | null; note: string; timezone: string; explainNotes?: boolean }) {
    if (!validDay(date)) throw new MvpError(400, "Choose a valid calendar date.");
    try { new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }); } catch { throw new MvpError(400, "Choose a valid time zone."); }
    if (date > localDay(this.now(), input.timezone)) throw new MvpError(400, "Choose today or a past day.");
    return patientWrite(this.pool, owner, async tx => {
      await this.assertNotDeleting(tx, owner);
      // Saving the journal explicitly records storage consent, without inventing a first entry.
      await tx.query(`INSERT INTO recovery_profiles(owner_id,preferences,consent_version)
        VALUES($1,$2,'web-mvp-2026-11-22') ON CONFLICT(owner_id) DO UPDATE
        SET preferences=recovery_profiles.preferences || $3::jsonb`,
      [owner, JSON.stringify({ supportMode: "self_guided", priorities: [], mvpTimezone: input.timezone }), JSON.stringify({ mvpTimezone: input.timezone })]);
      const { rows: [prior] } = await tx.query("SELECT data,date::text AS date,updated_at FROM recovery_logs WHERE owner_id=$1 AND date<$2 ORDER BY date DESC LIMIT 1", [owner, date]);
      const { rows: [existing] } = await tx.query("SELECT data FROM recovery_logs WHERE owner_id=$1 AND date=$2", [owner, date]);
      const previous = prior ? mvpEntry(prior).scores : emptyScores();
      const danger = scanKeywords(input.note);
      const flagged = existing?.data?.mvp?.flagged === true || danger.danger.length > 0 || danger.selfHarm.length > 0 ||
        MVP_SYMPTOMS.some(k => input.scores[k] !== null && previous[k] !== null && input.scores[k]! - previous[k]! >= WEEKLY_RULES.journalJump);
      const mvp = { scores: input.scores, planScore: input.planScore, note: input.note, flagged,
        explanationConsent: input.explainNotes === true ? { version: WEEKLY_RULES.notesConsentVersion, time: this.now().toISOString() } : null };
      // Also update the established check-in shape for other clients. Merge only the four MVP symptoms.
      const checkIn = existing?.data?.dailyCheckIn
        ? dailyCheckInFromLog({ symptoms: existing.data.symptoms ?? [], dailyCheckIn: existing.data.dailyCheckIn })
        : makeEmptyDailyCheckIn();
      checkIn.ratingScale = "ten_point_v1";
      checkIn.symptoms = checkIn.symptoms.map(s => MVP_SYMPTOMS.includes(s.name as any)
        ? { ...s, rating: input.scores[s.name as keyof Scores] as typeof s.rating, status: input.scores[s.name as keyof Scores] === null ? "not_recorded" : "recorded" } : s);
      const patch = JSON.stringify({ mvp, dailyCheckIn: checkIn });
      const initial = JSON.stringify({ date, symptoms: [], dietStatus: "not_planned", dietNote: "",
        exerciseStatus: "not_planned", exerciseNote: "", meditationStatus: "not_planned",
        meditationMinutes: 0, meditationNote: "", note: "", mvp, dailyCheckIn: checkIn });
      const { rows: [row] } = await tx.query(`INSERT INTO recovery_logs(owner_id,date,data) VALUES($1,$2,$4::jsonb)
        ON CONFLICT(owner_id,date) DO UPDATE SET data=recovery_logs.data || $3::jsonb,updated_at=now()
        RETURNING data,date::text AS date,updated_at`, [owner, date, patch, initial]);
      return mvpEntry(row);
    });
  }
  async doctor(clinician: string, id: string) {
    return transaction(this.pool, async tx => {
      await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      const { rows: [link] } = await tx.query("SELECT * FROM care_team_links WHERE id=$1 AND clinician_id=$2", [id, clinician]);
      if (!link) throw new MvpError(404, "This patient is not sharing with you.");
      let days: any[], stages: any[], periodEnd: string;
      if (link.status === "former") {
        const { rows: [snapshot] } = await tx.query("SELECT * FROM care_team_snapshots WHERE link_id=$1", [id]);
        if (!snapshot) throw new MvpError(404, "This saved copy is no longer available.");
        days = snapshot.entries.map((e: any) => ({ data: e, date: e.date, updated_at: e.updatedAt ?? snapshot.captured_at }));
        periodEnd = localDay(new Date(link.disconnected_at), snapshot.profile_summary?.mvpTimezone ?? "UTC");
        stages = snapshot.profile_summary?._mvpStages ?? [];
      } else {
        const today = localDay(this.now(), await this.timezone(tx, link.patient_id));
        periodEnd = today;
        ({ rows: days } = await tx.query(`SELECT data,date::text AS date,updated_at FROM recovery_logs WHERE owner_id=$1 AND date <= $3
          AND (date >= $2 OR date=(SELECT max(date) FROM recovery_logs WHERE owner_id=$1 AND date<$2)) ORDER BY date DESC`, [link.patient_id, offsetDay(today, -6), today]));
        ({ rows: stages } = await tx.query("SELECT * FROM recovery_stages WHERE owner_id=$1 AND synthetic_only=false ORDER BY created_at DESC,id DESC", [link.patient_id]));
      }
      days.sort((a, b) => b.date.localeCompare(a.date));
      const projected = days.filter(d => d.date >= offsetDay(periodEnd, -6) && d.date <= periodEnd)
        .map(d => doctorDay(d, days.find(p => p.date < d.date)));
      return { id, name: `${link.patient_first_name} ${link.patient_last_name}`.trim(), status: link.status,
        periodEnd, days: projected, stages: stages.map(mvpStage) };
    });
  }
  async override(clinician: string, id: string, stage: string, note: string) {
    if (!note.trim()) throw new MvpError(400, "Add a note explaining the stage change.");
    const { rows: [link] } = await this.pool.query("SELECT patient_id FROM care_team_links WHERE id=$1 AND clinician_id=$2 AND status='active'", [id, clinician]);
    if (!link) throw new MvpError(403, "Only an active patient's stage can be changed.");
    return patientWrite(this.pool, link.patient_id, async tx => {
      await this.assertNotDeleting(tx, link.patient_id);
      const { rows: authorized } = await tx.query("SELECT id FROM care_team_links WHERE id=$1 AND clinician_id=$2 AND patient_id=$3 AND status='active'", [id, clinician, link.patient_id]);
      if (!authorized.length) throw new MvpError(403, "Access has ended. The stage was not changed.");
      const { rows: [previous] } = await tx.query("SELECT stage FROM recovery_stages WHERE owner_id=$1 AND synthetic_only=false ORDER BY created_at DESC,id DESC LIMIT 1", [link.patient_id]);
      const { rows: [row] } = await tx.query(`INSERT INTO recovery_stages
        (owner_id,stage,status,source,reasons,rule_ids,rules_version,confirmed_by,confirmed_at,synthetic_only)
        VALUES($1,$2,'confirmed','clinician',$3,'["D_OVERRIDE"]',$4,$5,$6,false) RETURNING *`,
      [link.patient_id, stage, JSON.stringify([note.trim()]), WEEKLY_RULES.version, clinician, this.now()]);
      if (previous?.stage !== stage) await stageEmails(tx, link.patient_id, row.id);
      return mvpStage(row);
    });
  }
  private async timezone(tx: SqlClient, owner: string) {
    const { rows: [profile] } = await tx.query("SELECT preferences FROM recovery_profiles WHERE owner_id=$1", [owner]);
    const timezone = profile?.preferences?.mvpTimezone ?? "UTC";
    try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); return timezone as string; } catch { return "UTC"; }
  }
  async assertNotDeleting(tx: SqlClient, owner: string) {
    const { rows } = await tx.query("SELECT owner_id FROM recovery_account_deletions WHERE owner_id=ANY($1::text[])", [deletionKeys(owner)]);
    if (rows.length) throw new MvpError(409, "Account deletion is waiting to finish. Retry Delete account.");
  }
  async weekly(owner: string) {
    return patientWrite(this.pool, owner, async tx => {
      const { rows: deletion } = await tx.query("SELECT owner_id FROM recovery_account_deletions WHERE owner_id=$1", [owner]);
      if (deletion.length) return;
      const { rows: [current] } = await tx.query("SELECT * FROM recovery_stages WHERE owner_id=$1 AND synthetic_only=false ORDER BY created_at DESC,id DESC LIMIT 1", [owner]);
      if (!current) return;
      const timezone = await this.timezone(tx, owner);
      const monday = mondayOf(localDay(this.now(), timezone));
      // A Monday check evaluates the preceding Mon–Sun. No partial-week checks.
      if (localDay(new Date(current.created_at), timezone) >= monday) return;
      const { rows: checks } = await tx.query(`INSERT INTO recovery_weekly_checks(owner_id,week,rules_version)
        VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING week`, [owner, monday, WEEKLY_RULES.version]);
      if (!checks.length) return;
      const start = offsetDay(monday, -7), previousStart = offsetDay(monday, -14);
      const { rows: logs } = await tx.query("SELECT data,date::text AS date,updated_at FROM recovery_logs WHERE owner_id=$1 AND date >= $2 AND date < $3 ORDER BY date", [owner, previousStart, monday]);
      const { rows: [intake] } = await tx.query("SELECT scores FROM recovery_intake_baselines WHERE owner_id=$1", [owner]);
      const { rows: [firstStage] } = await tx.query("SELECT created_at FROM recovery_stages WHERE owner_id=$1 AND source='intake' AND synthetic_only=false ORDER BY created_at LIMIT 1", [owner]);
      const entries = logs.map(mvpEntry);
      const firstWeek = firstStage && localDay(new Date(firstStage.created_at), timezone) >= offsetDay(monday, -7);
      const result = decideWeekly(current.stage, entries.filter(e => e.date >= start), entries.filter(e => e.date < start), firstWeek ? baselineScores(intake?.scores) : emptyScores());
      // Only explicitly consented notes from this week. No account fields leave the server.
      const notes = logs.filter(r => r.date >= start && r.data?.mvp?.explanationConsent?.version === WEEKLY_RULES.notesConsentVersion)
        .map(r => r.data.mvp.note).filter((note): note is string => typeof note === "string" && Boolean(note.trim()));
      const context = notes.length ? await this.explain(notes) : null;
      if (context) result.reasons.push(context); // Never changes stage, rule IDs or composite.
      const { rows: [row] } = await tx.query(`INSERT INTO recovery_stages(owner_id,stage,status,source,reasons,rule_ids,rules_version,synthetic_only)
        VALUES($1,$2,'confirmed','weekly',$3,$4,$5,false) RETURNING *`,
      [owner, result.stage, JSON.stringify(result.reasons), JSON.stringify(result.ruleIds), result.rulesVersion]);
      if (result.stage !== current.stage) await stageEmails(tx, owner, row.id);
      return mvpStage(row);
    });
  }
}
