import { pgTable, uuid, text, timestamp, jsonb, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** No story is stored. Consent precedes the separate AI request. */
export const recoveryIntakeConsents = pgTable("recovery_intake_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  version: text("version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).defaultNow().notNull(),
  syntheticOnly: boolean("synthetic_only").default(true).notNull(),
});
export const recoveryIntakeAttempts = pgTable("recovery_intake_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("recovery_intake_attempts_owner_time").on(table.ownerId, table.createdAt)]);

/** Append-only stage changes, separate from the daily journal and frozen care-team copies. */
export const recoveryStages = pgTable("recovery_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  stage: text("stage", { enum: ["1", "2", "3", "4", "5", "6", "maintenance"] }).notNull(),
  status: text("status", { enum: ["provisional", "confirmed", "proposed"] }).notNull(),
  source: text("source", { enum: ["intake", "weekly", "clinician"] }).notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  ruleIds: jsonb("rule_ids").$type<string[]>().notNull(),
  rulesVersion: text("rules_version").notNull(),
  confirmedBy: text("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  syntheticOnly: boolean("synthetic_only").default(true).notNull(),
  intakeConsentId: uuid("intake_consent_id").references(() => recoveryIntakeConsents.id, { onDelete: "set null" }),
  decisionKey: text("decision_key"),
}, table => [uniqueIndex("recovery_stages_intake_decision_unique").on(table.intakeConsentId, table.decisionKey)]);
export const insertRecoveryStageSchema = createInsertSchema(recoveryStages).omit({ id: true, createdAt: true });
export const insertRecoveryIntakeConsentSchema = createInsertSchema(recoveryIntakeConsents).omit({ id: true, consentedAt: true });
export type InsertRecoveryStage = z.infer<typeof insertRecoveryStageSchema>;
export type RecoveryStageRow = typeof recoveryStages.$inferSelect;
