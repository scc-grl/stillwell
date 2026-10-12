import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { accountRoles } from "./account";

export const clinicianVerificationStatus = pgEnum(
  "clinician_verification_status",
  ["pending", "verified"],
);

export const clinicianProfiles = pgTable("clinician_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => accountRoles.userId, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  profession: text("profession").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseRegion: text("license_region").notNull(),
  practiceName: text("practice_name").notNull(),
  location: text("location").notNull(),
  areas: text("areas").array().notNull().default(sql`ARRAY[]::text[]`),
  listInDirectory: boolean("list_in_directory").notNull().default(false),
  openToNewPatients: boolean("open_to_new_patients").notNull().default(false),
  verificationStatus: clinicianVerificationStatus("verification_status")
    .notNull()
    .default("pending"),
  inviteCode: text("invite_code"),
  connectCode: text("connect_code").notNull().unique(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertClinicianProfileSchema = createInsertSchema(clinicianProfiles)
  .omit({ createdAt: true, updatedAt: true, verificationStatus: true });
export type InsertClinicianProfile = z.infer<typeof insertClinicianProfileSchema>;
export type ClinicianProfile = typeof clinicianProfiles.$inferSelect;

export const partnershipRequests = pgTable("partnership_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationName: text("organization_name").notNull(),
  organizationType: text("organization_type").notNull(),
  contactName: text("contact_name").notNull(),
  contactRole: text("contact_role").notNull(),
  workEmail: text("work_email").notNull(),
  phone: text("phone"),
  peopleSupported: text("people_supported").notNull(),
  message: text("message"),
  notificationStatus: text("notification_status").notNull().default("not_configured"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartnershipRequestSchema = createInsertSchema(partnershipRequests)
  .omit({ id: true, createdAt: true, notificationStatus: true });
export type InsertPartnershipRequest = z.infer<typeof insertPartnershipRequestSchema>;
export type PartnershipRequest = typeof partnershipRequests.$inferSelect;
