import { createHash } from "node:crypto";
import { INTAKE_CONSENT_VERSION, type Decision } from "@workspace/intake-ai";
import { provisionalStageFor, syntheticIntakeInput } from "./patient-intake-policy";
import type { SqlPool } from "./recovery-lock";
import { transaction } from "./recovery-lock";

export class IntakeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Run = (note: string, answered: Record<string, unknown>) => Promise<{ decision: Decision; source: string }>;
export class PatientIntakeService {
  constructor(private pool: SqlPool, private run: Run) {}
  async consent(ownerId: string) {
    const { rows: [row] } = await this.pool.query(
      "INSERT INTO recovery_intake_consents(owner_id,version,synthetic_only) VALUES($1,$2,true) RETURNING *",
      [ownerId, INTAKE_CONSENT_VERSION]);
    return { id: row.id, version: row.version, consentedAt: new Date(row.consented_at).toISOString() };
  }
  async history(ownerId: string) {
    const { rows } = await this.pool.query("SELECT * FROM recovery_stages WHERE owner_id=$1 ORDER BY created_at DESC", [ownerId]);
    return rows.map(stageDto);
  }
  async execute(ownerId: string, body: unknown) {
    let input;
    try { input = syntheticIntakeInput(body); } catch {
      throw new IntakeError(400, "Choose a sample story and use only the preview tap answers. Real patient text is not accepted.");
    }
    const { rows: [consent] } = await this.pool.query(
      "SELECT * FROM recovery_intake_consents WHERE id=$1 AND owner_id=$2", [input.consentId, ownerId]);
    if (!consent || consent.version !== INTAKE_CONSENT_VERSION || !consent.synthetic_only) {
      throw new IntakeError(403, "Start the intake and give consent before reading a story.");
    }
    if (Date.now() - new Date(consent.consented_at).getTime() > 86400000) {
      throw new IntakeError(403, "Your intake session expired. Please start again with consent.");
    }
    await transaction(this.pool, async tx => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`intake:${ownerId}`]);
      const { rows: [count] } = await tx.query("SELECT count(*)::int n FROM recovery_intake_attempts WHERE owner_id=$1 AND created_at > now() - interval '1 hour'", [ownerId]);
      if (count.n >= 10) throw new IntakeError(429, "You've tried the preview 10 times this hour. Try again later.");
      await tx.query("INSERT INTO recovery_intake_attempts(owner_id) VALUES($1)", [ownerId]);
    });
    const result = await this.run(input.sample.story, input.answered);
    const candidate = provisionalStageFor(result.decision);
    let stage = null;
    if (candidate) {
      stage = await transaction(this.pool, async tx => {
        // Match the delete-all lock and recheck consent AFTER the AI request.
        // A deleted journal/session must never be recreated by an in-flight result.
        await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`patient:${ownerId}`]);
        const { rows: stillConsented } = await tx.query("SELECT id FROM recovery_intake_consents WHERE id=$1 AND owner_id=$2", [consent.id, ownerId]);
        if (!stillConsented.length) throw new IntakeError(409, "This intake was removed. Start again with consent.");
        const key = createHash("sha256").update(JSON.stringify({ sample: input.sample.id, ...candidate })).digest("hex");
        const { rows } = await tx.query(
          `INSERT INTO recovery_stages(owner_id,stage,status,source,reasons,rule_ids,rules_version,synthetic_only,intake_consent_id,decision_key)
           VALUES($1,$2,'provisional','intake',$3,$4,$5,true,$6,$7)
           ON CONFLICT (intake_consent_id,decision_key) DO NOTHING RETURNING *`,
          [ownerId, candidate.stage, JSON.stringify(candidate.reasons), JSON.stringify(candidate.ruleIds), candidate.rulesVersion, consent.id, key]);
        const row = rows[0] ?? (await tx.query("SELECT * FROM recovery_stages WHERE intake_consent_id=$1 AND decision_key=$2 AND owner_id=$3", [consent.id, key, ownerId])).rows[0];
        return stageDto(row);
      });
    }
    // TODO #35: assigned-clinician safety alerts and review queue. Never send
    // a real clinician an alert from synthetic testing; safety outcomes store no stage.
    return { ...result, stage, syntheticOnly: true };
  }
}
function stageDto(row: any) {
  return {
    id: row.id, stage: row.stage, status: row.status, source: row.source,
    reasons: row.reasons, ruleIds: row.rule_ids, rulesVersion: row.rules_version,
    confirmedBy: row.confirmed_by, createdAt: new Date(row.created_at).toISOString(),
    syntheticOnly: row.synthetic_only,
  };
}
