import { date, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoveryProfiles = pgTable("recovery_profiles", {
  ownerId: text("owner_id").primaryKey(),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull(),
  consentVersion: text("consent_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recoveryLogs = pgTable("recovery_logs", {
  ownerId: text("owner_id").notNull().references(() => recoveryProfiles.ownerId, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.ownerId, table.date] })]);

export const insertRecoveryProfileSchema = createInsertSchema(recoveryProfiles).omit({ consentedAt: true });
export const insertRecoveryLogSchema = createInsertSchema(recoveryLogs).omit({ updatedAt: true });
export type InsertRecoveryProfile = z.infer<typeof insertRecoveryProfileSchema>;
export type InsertRecoveryLog = z.infer<typeof insertRecoveryLogSchema>;
