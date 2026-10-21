import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Deliberately no FK to recovery_profiles: former records belong to the clinician.
export const careTeamLinks = pgTable("care_team_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id"),
  clinicianId: text("clinician_id").notNull(),
  patientFirstName: text("patient_first_name").notNull(),
  patientLastName: text("patient_last_name").notNull(),
  patientEmail: text("patient_email").notNull(),
  clinicianName: text("clinician_name").notNull(),
  clinicianEmail: text("clinician_email").notNull(),
  status: text("status").notNull().default("active"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
}, t => [
  check("care_team_link_state", sql`(${t.status} = 'active' AND ${t.patientId} IS NOT NULL AND ${t.disconnectedAt} IS NULL) OR (${t.status} = 'former' AND ${t.patientId} IS NULL AND ${t.disconnectedAt} IS NOT NULL)`),
  uniqueIndex("care_team_active_pair").on(t.patientId, t.clinicianId).where(sql`${t.status} = 'active'`),
  index("care_team_clinician_links").on(t.clinicianId, t.status),
]);

export const careTeamInvites = pgTable("care_team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  direction: text("direction").notNull(),
  inviterId: text("inviter_id").notNull(),
  inviteeFirstName: text("invitee_first_name").notNull(),
  inviteeLastName: text("invitee_last_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  status: text("status").notNull().default("pending"),
  tokenHash: text("token_hash").notNull().unique(),
  consentVersion: text("consent_version"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastResendAt: timestamp("last_resend_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  acceptingUserId: text("accepting_user_id"),
  clinicianId: text("clinician_id"),
}, t => [
  check("care_team_invite_direction", sql`${t.direction} IN ('patient_invites_clinician', 'clinician_requests_patient')`),
  check("care_team_invite_status", sql`${t.status} IN ('pending', 'accepted', 'cancelled', 'expired')`),
  check("care_team_invite_email_lower", sql`${t.inviteeEmail} = lower(${t.inviteeEmail})`),
  uniqueIndex("care_team_pending_email").on(t.inviterId, t.direction, t.inviteeEmail).where(sql`${t.status} = 'pending'`),
]);

export const careTeamSnapshots = pgTable("care_team_snapshots", {
  linkId: uuid("link_id").primaryKey().references(() => careTeamLinks.id, { onDelete: "cascade" }),
  profileSummary: jsonb("profile_summary").$type<Record<string, unknown>>().notNull(),
  entries: jsonb("entries").$type<Record<string, unknown>[]>().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
});

// Independent of invites so cancellation/deletion cannot reset a daily limit.
export const careTeamEmailSends = pgTable("care_team_email_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  inviterId: text("inviter_id").notNull(),
  direction: text("direction").notNull(),
  suppressed: boolean("suppressed").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
}, t => [index("care_team_send_daily_count").on(t.inviterId, t.direction, t.sentAt)]);
