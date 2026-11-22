import { pgTable, text, jsonb, timestamp, primaryKey, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoveryWeeklyChecks = pgTable("recovery_weekly_checks", {
  ownerId: text("owner_id").notNull(),
  week: text("week").notNull(),
  rulesVersion: text("rules_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [primaryKey({ columns: [t.ownerId, t.week] })]);
export const recoveryIntakeBaselines = pgTable("recovery_intake_baselines", {
  ownerId: text("owner_id").primaryKey(),
  scores: jsonb("scores").$type<Record<string, number | null>>().notNull(),
});
// Durable retry marker: all patient APIs are blocked while Clerk deletion is retried.
export const recoveryAccountDeletions = pgTable("recovery_account_deletions", {
  ownerId: text("owner_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const recoveryStageEmails = pgTable("recovery_stage_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  clinicianId: text("clinician_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  sent: boolean("sent").default(false).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertRecoveryWeeklyCheckSchema = createInsertSchema(recoveryWeeklyChecks).omit({ createdAt: true });
export type InsertRecoveryWeeklyCheck = z.infer<typeof insertRecoveryWeeklyCheckSchema>;
