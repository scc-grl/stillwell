import { createHash, randomBytes } from "node:crypto";
import { freezeLink, lockPatient, patientWrite, transaction, type SqlClient, type SqlPool } from "./recovery-lock";
import type { CareEmail } from "./care-team-email";

export type Direction = CareEmail["direction"];
export const PATIENT_INVITE: Direction = "patient_invites_clinician";
export const CLINICIAN_REQUEST: Direction = "clinician_requests_patient";
export const CARE_CONSENT_VERSION = "care-team-v1";
export interface Identity {
  id: string; role: "patient" | "clinician"; firstName: string; lastName: string;
  displayName?: string;
  emails: { address: string; verified: boolean }[];
}
export class CareTeamError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
const fail = (code: string, message: string, status = 400): never => { throw new CareTeamError(code, message, status); };
export const hashCareToken = (token: string) => createHash("sha256").update(token).digest("hex");
const normalized = (email: string) => email.trim().toLowerCase();
const fullName = (u: Identity) => u.displayName || `${u.firstName} ${u.lastName}`.trim() || "A Stillwell clinician";
const publicInvite = (i: any) => ({
  id: i.id, direction: i.direction, firstName: i.invitee_first_name, lastName: i.invitee_last_name,
  email: i.invitee_email, status: i.status, sentAt: i.sent_at, expiresAt: i.expires_at,
  lastResendAt: i.last_resend_at, acceptedAt: i.accepted_at,
});
export function requireRole(user: Identity, role: Identity["role"]) {
  if (user.role !== role) fail(role === "clinician" ? "patient_account" : "clinician_account",
    role === "clinician" ? "Sign in with a clinician account to accept this invite." : "This request is for a patient account.", 403);
}
export function requireEmail(user: Identity, email: string) {
  const matches = user.emails.filter(e => normalized(e.address) === normalized(email));
  if (!matches.length) fail("different_email", "Sign in with the email address this invite was sent to.", 403);
  if (!matches.some(e => e.verified)) fail("unverified_email", "Verify this email address before continuing.", 403);
}
export function inviteInput(value: { firstName?: string; lastName?: string; email?: string }) {
  const firstName = value.firstName?.trim();
  const lastName = value.lastName?.trim();
  const email = normalized(value.email ?? "");
  if (!firstName || firstName.length > 100) fail("first_name_required", "Enter their first name.");
  if (!lastName || lastName.length > 100) fail("last_name_required", "Enter their last name.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("invalid_email", "Enter an email like name@example.com.");
  return { firstName: firstName!, lastName: lastName!, email };
}

export class CareTeamService {
  constructor(private deps: {
    pool: SqlPool;
    identity: (id: string) => Promise<Identity>;
    send: (mail: CareEmail) => Promise<{ suppressed: boolean }>;
    now?: () => Date;
  }) {}
  private now() { return this.deps.now?.() ?? new Date(); }
  private async inviterLock(tx: SqlClient, user: Identity) {
    if (user.role === "patient") await lockPatient(tx, user.id);
    else await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`clinician:${user.id}`]);
  }
  private async expire(tx: SqlClient, userId: string, now: Date) {
    await tx.query("UPDATE care_team_invites SET status='expired' WHERE inviter_id=$1 AND status='pending' AND expires_at <= $2", [userId, now]);
  }
  private async capacity(tx: SqlClient, patientId: string, now: Date, excludeInvite?: string, clinicianName?: string) {
    const { rows: [r] } = await tx.query(`SELECT
      (SELECT count(*) FROM care_team_links WHERE patient_id=$1 AND status='active') +
      (SELECT count(*) FROM care_team_invites WHERE inviter_id=$1 AND direction=$2 AND status='pending' AND expires_at>$3 AND ($4::uuid IS NULL OR id<>$4)) AS count`,
    [patientId, PATIENT_INVITE, now, excludeInvite ?? null]);
    if (Number(r.count) >= 5) fail("care_team_full", clinicianName
      ? `You share with 5 clinicians, the most Stillwell allows. Remove one to share with ${clinicianName}.`
      : "You can share with up to 5 clinicians. Remove one to invite someone new.", 409);
  }
  private async emailLimit(tx: SqlClient, user: Identity, direction: Direction, now: Date) {
    const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
    const { rows: [r] } = await tx.query("SELECT count(*) AS count FROM care_team_email_sends WHERE inviter_id=$1 AND direction=$2 AND sent_at >= $3 AND sent_at < $4",
      [user.id, direction, start, new Date(start.getTime() + 86400000)]);
    if (Number(r.count) >= (direction === PATIENT_INVITE ? 10 : 20)) fail("daily_limit",
      direction === PATIENT_INVITE ? "You've sent 10 invites today. Try again tomorrow." : "You've sent 20 requests today. Try again tomorrow.", 429);
  }
  async sendInvite(user: Identity, direction: Direction, input: { firstName?: string; lastName?: string; email?: string }, baseUrl: string, resendId?: string, consentAccepted?: boolean) {
    requireRole(user, direction === PATIENT_INVITE ? "patient" : "clinician");
    return transaction(this.deps.pool, async tx => {
      await this.inviterLock(tx, user);
      const now = this.now();
      await this.expire(tx, user.id, now);
      let previous: any;
      if (resendId) {
        const result = await tx.query("SELECT * FROM care_team_invites WHERE id=$1 AND inviter_id=$2 AND direction=$3 FOR UPDATE", [resendId, user.id, direction]);
        previous = result.rows[0];
        if (!previous || !["pending", "expired"].includes(previous.status)) fail("not_found", "This invite is no longer available.", 404);
        input = { firstName: previous.invitee_first_name, lastName: previous.invitee_last_name, email: previous.invitee_email };
        const remaining = 600000 - (now.getTime() - new Date(previous.last_resend_at ?? previous.sent_at).getTime());
        if (remaining > 0) fail("resend_cooldown", `Resend available in ${Math.ceil(remaining / 60000)} minutes`, 429);
      }
      const fields = inviteInput(input);
      if (user.emails.some(e => normalized(e.address) === fields.email)) fail("own_email",
        direction === PATIENT_INVITE ? "This is your own email. Enter your clinician's." : "This is your own email. Enter your patient's.");
      const { rows: duplicates } = await tx.query("SELECT id FROM care_team_invites WHERE inviter_id=$1 AND direction=$2 AND invitee_email=$3 AND status='pending' AND ($4::uuid IS NULL OR id<>$4)", [user.id, direction, fields.email, resendId ?? null]);
      const { rows: active } = await tx.query(direction === PATIENT_INVITE
        ? "SELECT id FROM care_team_links WHERE patient_id=$1 AND clinician_email=$2 AND status='active'"
        : "SELECT id FROM care_team_links WHERE clinician_id=$1 AND patient_email=$2 AND status='active'", [user.id, fields.email]);
      if (active.length) fail("already_connected", direction === PATIENT_INVITE ? "You've already invited this email." : `${fields.firstName} already shares their journal with you.`, 409);
      if (duplicates.length) fail("already_invited", direction === PATIENT_INVITE ? "You've already invited this email." : `You've already sent ${fields.firstName} a request.`, 409);
      if (direction === PATIENT_INVITE) {
        if (!previous && consentAccepted !== true) fail("consent_required", "Confirm that you want to share your journal with this clinician.");
        const { rows: profiles } = await tx.query("SELECT owner_id FROM recovery_profiles WHERE owner_id=$1", [user.id]);
        if (!profiles.length) fail("journal_required", "Set up your private journal first.", 409);
        await this.capacity(tx, user.id, now, resendId);
      }
      await this.emailLimit(tx, user, direction, now);
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(now.getTime() + 14 * 86400000);
      const link = `${baseUrl.replace(/\/$/, "")}/${direction === PATIENT_INVITE ? "invite" : "request"}/${token}`;
      let delivery;
      try {
        delivery = await this.deps.send({
          direction, recipient: fields.email, recipientFirstName: fields.firstName,
          patientFirstName: direction === PATIENT_INVITE ? user.firstName || "A Stillwell user" : fields.firstName,
          clinicianName: direction === CLINICIAN_REQUEST ? fullName(user) : fields.firstName,
          link, expiresAt,
        });
      } catch {
        fail("email_failed", "The invite didn't send. Check your connection and try again. Nothing was shared.", 502);
      }
      const consentVersion = direction === PATIENT_INVITE ? previous?.consent_version ?? CARE_CONSENT_VERSION : null;
      const consentedAt = direction === PATIENT_INVITE ? previous?.consented_at ?? now : null;
      const { rows: [saved] } = resendId
        ? await tx.query(`UPDATE care_team_invites SET status='pending',token_hash=$2,sent_at=$3,expires_at=$4,last_resend_at=$3,cancelled_at=NULL WHERE id=$1 RETURNING *`, [resendId, hashCareToken(token), now, expiresAt])
        : await tx.query(`INSERT INTO care_team_invites(direction,inviter_id,invitee_first_name,invitee_last_name,invitee_email,token_hash,sent_at,expires_at,consent_version,consented_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [direction, user.id, fields.firstName, fields.lastName, fields.email, hashCareToken(token), now, expiresAt, consentVersion, consentedAt]);
      await tx.query("INSERT INTO care_team_email_sends(inviter_id,direction,suppressed,sent_at) VALUES($1,$2,$3,$4)", [user.id, direction, delivery!.suppressed, now]);
      return { invite: publicInvite(saved), suppressed: delivery!.suppressed, link };
    });
  }
  async cancel(user: Identity, id: string, direction: Direction) {
    requireRole(user, direction === PATIENT_INVITE ? "patient" : "clinician");
    await transaction(this.deps.pool, async tx => {
      await this.inviterLock(tx, user);
      const now = this.now();
      const { rows: [invite] } = await tx.query("SELECT status,expires_at FROM care_team_invites WHERE id=$1 AND inviter_id=$2 AND direction=$3 AND status IN ('pending','expired') FOR UPDATE", [id, user.id, direction]);
      if (!invite) fail("not_found", "This pending invite was not found.", 404);
      if (invite.status === "expired" || new Date(invite.expires_at) <= now) {
        await tx.query("DELETE FROM care_team_invites WHERE id=$1", [id]);
      } else {
        await tx.query("UPDATE care_team_invites SET status='cancelled',cancelled_at=$2 WHERE id=$1", [id, now]);
      }
    });
  }
  async undoCancel(user: Identity, id: string) {
    requireRole(user, "patient");
    return patientWrite(this.deps.pool, user.id, async tx => {
      const now = this.now();
      await this.expire(tx, user.id, now);
      const { rows: [invite] } = await tx.query("SELECT * FROM care_team_invites WHERE id=$1 AND inviter_id=$2 AND direction=$3 AND status='cancelled' FOR UPDATE", [id, user.id, PATIENT_INVITE]);
      if (!invite) fail("not_found", "This cancelled invite was not found.", 404);
      // The UI offers Undo for 5 seconds; allow in-flight requests 5 more seconds.
      if (!invite.cancelled_at || now.getTime() - new Date(invite.cancelled_at).getTime() > 10000)
        fail("undo_expired", "The Undo window has closed. You can send a new invite.", 409);
      if (new Date(invite.expires_at) <= now) fail("expired", "This invite has expired.", 410);
      const { rows: duplicate } = await tx.query("SELECT id FROM care_team_invites WHERE inviter_id=$1 AND direction=$2 AND invitee_email=$3 AND status='pending'", [user.id, PATIENT_INVITE, invite.invitee_email]);
      const { rows: active } = await tx.query("SELECT id FROM care_team_links WHERE patient_id=$1 AND clinician_email=$2 AND status='active'", [user.id, invite.invitee_email]);
      if (duplicate.length || active.length) fail("already_invited", "You've already invited this email.", 409);
      await this.capacity(tx, user.id, now);
      const { rows: [restored] } = await tx.query("UPDATE care_team_invites SET status='pending',cancelled_at=NULL WHERE id=$1 RETURNING *", [id]);
      return publicInvite(restored);
    });
  }
  private async tokenInvite(tx: SqlClient, token: string, direction: Direction) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) fail("invalid_token", "This link is not available.", 404);
    const { rows: [invite] } = await tx.query("SELECT * FROM care_team_invites WHERE token_hash=$1 AND direction=$2 FOR UPDATE", [hashCareToken(token), direction]);
    if (!invite) fail("invalid_token", "This link is not available.", 404);
    if (invite.status === "cancelled") fail(direction === CLINICIAN_REQUEST ? "withdrawn" : "cancelled", "This invite was withdrawn.", 410);
    if (invite.status === "accepted") {
      if (direction === CLINICIAN_REQUEST) {
        const { rows } = await tx.query("SELECT id FROM care_team_links WHERE patient_id=$1 AND clinician_id=$2 AND status='active'", [invite.accepting_user_id, invite.inviter_id]);
        if (rows.length) fail("already_sharing", "You already share your journal with this clinician.", 409);
      }
      fail("already_accepted", "This invite has already been accepted.", 409);
    }
    if (invite.status === "expired" || new Date(invite.expires_at) <= this.now()) fail("expired", "This invite has expired.", 410);
    return invite;
  }
  async viewRequest(user: Identity, token: string) {
    requireRole(user, "patient");
    return patientWrite(this.deps.pool, user.id, async tx => {
      const invite = await this.tokenInvite(tx, token, CLINICIAN_REQUEST);
      requireEmail(user, invite.invitee_email);
      const clinician = await this.deps.identity(invite.inviter_id);
      const { rows } = await tx.query("SELECT id FROM care_team_links WHERE patient_id=$1 AND clinician_id=$2 AND status='active'", [user.id, clinician.id]);
      if (rows.length) fail("already_sharing", "You already share your journal with this clinician.", 409);
      await this.capacity(tx, user.id, this.now(), undefined, fullName(clinician));
      return { state: "pending", clinicianName: fullName(clinician), expiresAt: invite.expires_at };
    });
  }
  async accept(user: Identity, token: string, direction: Direction, consentAccepted = false, notNow = false) {
    requireRole(user, direction === PATIENT_INVITE ? "clinician" : "patient");
    // Resolve patient before acquiring locks; token is revalidated under the locks.
    const { rows: [candidate] } = await this.deps.pool.query("SELECT inviter_id FROM care_team_invites WHERE token_hash=$1 AND direction=$2", [hashCareToken(token), direction]);
    if (!candidate) fail("invalid_token", "This link is not available.", 404);
    const patientId = direction === PATIENT_INVITE ? candidate.inviter_id : user.id;
    return patientWrite(this.deps.pool, patientId, async tx => {
      const invite = await this.tokenInvite(tx, token, direction);
      requireEmail(user, invite.invitee_email);
      if (notNow) return { state: "not_now" }; // No mutation, email, or analytics.
      const inviter = await this.deps.identity(invite.inviter_id);
      requireRole(inviter, direction === PATIENT_INVITE ? "patient" : "clinician");
      const clinician = direction === PATIENT_INVITE ? user : inviter;
      const patient = direction === PATIENT_INVITE ? inviter : user;
      const { rows: existing } = await tx.query("SELECT id FROM care_team_links WHERE patient_id=$1 AND clinician_id=$2 AND status='active'", [patient.id, clinician.id]);
      if (existing.length) fail("already_sharing", "You already share this journal.", 409);
      const { rows: profiles } = await tx.query("SELECT owner_id FROM recovery_profiles WHERE owner_id=$1", [patient.id]);
      if (!profiles.length) fail("journal_required", "Set up your private journal first, then review this request.", 409);
      if (direction === CLINICIAN_REQUEST && !consentAccepted) fail("consent_required", "Choose Share to give this clinician read-only access.");
      const now = this.now();
      await this.capacity(tx, patient.id, now, direction === PATIENT_INVITE ? invite.id : undefined, direction === CLINICIAN_REQUEST ? fullName(clinician) : undefined);
      const { rows: [link] } = await tx.query(`INSERT INTO care_team_links(patient_id,clinician_id,patient_first_name,patient_last_name,patient_email,clinician_name,clinician_email,connected_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [patient.id, clinician.id, patient.firstName || (direction === CLINICIAN_REQUEST ? invite.invitee_first_name : "Stillwell patient"), patient.lastName || (direction === CLINICIAN_REQUEST ? invite.invitee_last_name : ""),
        direction === CLINICIAN_REQUEST ? invite.invitee_email : normalized(patient.emails[0]?.address ?? ""),
        fullName(clinician), direction === PATIENT_INVITE ? invite.invitee_email : normalized(clinician.emails[0]?.address ?? ""), now]);
      await tx.query(`UPDATE care_team_invites SET status='accepted',accepted_at=$2,accepting_user_id=$3,clinician_id=$4,
        consent_version=COALESCE(consent_version,$5),consented_at=COALESCE(consented_at,$2) WHERE id=$1`,
      [invite.id, now, user.id, clinician.id, CARE_CONSENT_VERSION]);
      return { state: "accepted", linkId: link.id };
    });
  }
  async listTeam(user: Identity) {
    requireRole(user, "patient");
    return patientWrite(this.deps.pool, user.id, async tx => {
      const now = this.now();
      await this.expire(tx, user.id, now);
      const { rows: invites } = await tx.query("SELECT * FROM care_team_invites WHERE inviter_id=$1 AND direction=$2 AND status IN ('pending','expired') ORDER BY sent_at DESC", [user.id, PATIENT_INVITE]);
      const { rows: links } = await tx.query(`SELECT id,clinician_name AS name,connected_at AS "connectedAt" FROM care_team_links WHERE patient_id=$1 AND status='active' ORDER BY connected_at DESC`, [user.id]);
      const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0);
      const resetsAt = new Date(dayStart.getTime() + 86400000);
      const { rows: [emails] } = await tx.query("SELECT count(*) AS count FROM care_team_email_sends WHERE inviter_id=$1 AND direction=$2 AND sent_at >= $3 AND sent_at < $4", [user.id, PATIENT_INVITE, dayStart, resetsAt]);
      return { pendingInvites: invites.filter(i => i.status === "pending").map(publicInvite), expiredInvites: invites.filter(i => i.status === "expired").map(publicInvite), activeClinicians: links,
        serverTime: now.toISOString(), inviteEmailQuota: { used: Number(emails.count), limit: 10, resetsAt: resetsAt.toISOString() } };
    });
  }
  async listRequests(user: Identity) {
    requireRole(user, "clinician");
    return transaction(this.deps.pool, async tx => {
      await this.inviterLock(tx, user);
      await this.expire(tx, user.id, this.now());
      const { rows } = await tx.query("SELECT * FROM care_team_invites WHERE inviter_id=$1 AND direction=$2 ORDER BY sent_at DESC", [user.id, CLINICIAN_REQUEST]);
      return { items: rows.map(publicInvite) };
    });
  }
  async removeClinician(user: Identity, id: string) {
    requireRole(user, "patient");
    await patientWrite(this.deps.pool, user.id, async tx => {
      const { rows } = await tx.query("SELECT id FROM care_team_links WHERE id=$1 AND patient_id=$2 AND status='active'", [id, user.id]);
      if (!rows.length) fail("not_found", "This active clinician was not found.", 404);
      await freezeLink(tx, id, this.now());
    });
  }
  async listPatients(user: Identity) {
    requireRole(user, "clinician");
    const { rows } = await this.deps.pool.query(`SELECT l.id,l.status,l.patient_first_name AS "firstName",l.patient_last_name AS "lastName",
      l.connected_at AS "connectedAt",l.disconnected_at AS "disconnectedAt",
      CASE WHEN l.status='active' THEN (SELECT max(date)::text FROM recovery_logs WHERE owner_id=l.patient_id) ELSE NULL END AS "lastEntryDate"
      FROM care_team_links l WHERE clinician_id=$1 ORDER BY connected_at DESC`, [user.id]);
    return { active: rows.filter(l => l.status === "active"), former: rows.filter(l => l.status === "former") };
  }
  async readPatient(user: Identity, id: string, page = 1) {
    requireRole(user, "clinician");
    if (!Number.isInteger(page) || page < 1 || page > 1000000) fail("invalid_page", "Choose a valid page.");
    return transaction(this.deps.pool, async tx => {
      // Link lock also serializes this read with disconnection/deletion.
      const { rows: [link] } = await tx.query("SELECT * FROM care_team_links WHERE id=$1 AND clinician_id=$2 FOR SHARE", [id, user.id]);
      if (!link) fail("not_found", "This shared journal was not found.", 404);
      let profileSummary: Record<string, unknown>;
      let entries: Record<string, any>[];
      let total: number;
      let lastUpdated: string | null;
      if (link.status === "former") {
        const { rows: [snapshot] } = await tx.query("SELECT * FROM care_team_snapshots WHERE link_id=$1", [link.id]);
        if (!snapshot) fail("snapshot_unavailable", "The frozen journal is unavailable.", 500);
        profileSummary = snapshot.profile_summary;
        total = snapshot.entries.length;
        entries = snapshot.entries.slice((page - 1) * 20, page * 20);
        lastUpdated = snapshot.entries.reduce((latest: string | null, e: any) => e.updatedAt && (!latest || e.updatedAt > latest) ? e.updatedAt : latest, null);
      } else {
        const { rows: [profile] } = await tx.query("SELECT preferences FROM recovery_profiles WHERE owner_id=$1", [link.patient_id]);
        profileSummary = profile?.preferences ?? {};
        const { rows: [stats] } = await tx.query("SELECT count(*) AS count,max(updated_at) AS updated FROM recovery_logs WHERE owner_id=$1", [link.patient_id]);
        total = Number(stats.count); lastUpdated = stats.updated?.toISOString() ?? null;
        const { rows } = await tx.query("SELECT data,date::text AS date,updated_at FROM recovery_logs WHERE owner_id=$1 ORDER BY date DESC LIMIT 20 OFFSET $2", [link.patient_id, (page - 1) * 20]);
        entries = rows.map(e => ({ ...e.data, date: e.date, updatedAt: e.updated_at.toISOString() }));
      }
      return { linkId: link.id, status: link.status, firstName: link.patient_first_name, lastName: link.patient_last_name,
        connectedAt: link.connected_at, disconnectedAt: link.disconnected_at, lastUpdated,
        supportApproach: profileSummary.supportApproach ?? profileSummary.supportMode ?? null,
        focusAreas: profileSummary.focusAreas ?? profileSummary.priorities ?? [], profileSummary,
        entries, page, pageSize: 20, total, hasMore: page * 20 < total };
    });
  }
  async removeFormer(user: Identity, id: string) {
    requireRole(user, "clinician");
    const { rows } = await this.deps.pool.query("DELETE FROM care_team_links WHERE id=$1 AND clinician_id=$2 AND status='former' RETURNING id", [id, user.id]);
    if (!rows.length) fail("not_found", "This former patient was not found.", 404);
  }
  async deleteRecovery(user: Identity) {
    requireRole(user, "patient");
    await patientWrite(this.deps.pool, user.id, async tx => {
      const { rows } = await tx.query("SELECT id FROM care_team_links WHERE patient_id=$1 AND status='active' ORDER BY id", [user.id]);
      const now = this.now();
      for (const link of rows) await freezeLink(tx, link.id, now);
      // Accepted/expired outgoing invites also belong to the patient's deleted journal.
      await tx.query("DELETE FROM care_team_invites WHERE inviter_id=$1 AND direction=$2", [user.id, PATIENT_INVITE]);
      // Delete inbound requests addressed to any verified account email as well.
      await tx.query("DELETE FROM care_team_invites WHERE direction=$1 AND status='pending' AND invitee_email=ANY($2::text[])", [CLINICIAN_REQUEST, user.emails.filter(e => e.verified).map(e => normalized(e.address))]);
      await tx.query("DELETE FROM recovery_profiles WHERE owner_id=$1", [user.id]);
    });
  }
}
