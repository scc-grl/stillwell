import { createInsertSchema } from "drizzle-zod";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const accountTypeEnum = pgEnum("account_type", ["patient", "clinician"]);

export const accountRoles = pgTable("account_roles", {
  userId: text("user_id").primaryKey(),
  accountType: accountTypeEnum("account_type").notNull(),
  registrationIntentId: uuid("registration_intent_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountRoleSchema = createInsertSchema(accountRoles).omit({ createdAt: true });
export type InsertAccountRole = z.infer<typeof insertAccountRoleSchema>;
export type AccountRole = typeof accountRoles.$inferSelect;
export type AccountType = AccountRole["accountType"];
