import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { accountRoles } from "./account";
import { recoveryProfiles } from "./recovery";

export const clinicianVerificationStatus = pgEnum(
  "clinician_verification_status",
  ["pending", "verified"],
);

export const clinicianProfiles = pgTable("clinician_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => accountRoles.userId, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  practiceType: text("practice_type").notNull().default("individual"),
  phone: text("phone"),
  website: text("website"),
  profession: text("profession"),
  licenseNumber: text("license_number"),
  licenseRegion: text("license_region"),
  practiceName: text("practice_name"),
  location: text("location"),
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

export const patientClinicianConnectionStatus = pgEnum(
  "patient_clinician_connection_status",
  ["pending", "accepted", "revoked"],
);

export const patientClinicianConnections = pgTable("patient_clinician_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id")
    .notNull()
    .references(() => recoveryProfiles.ownerId, { onDelete: "cascade" }),
  clinicianId: text("clinician_id")
    .notNull()
    .references(() => clinicianProfiles.userId, { onDelete: "cascade" }),
  status: patientClinicianConnectionStatus("status").notNull().default("pending"),
  shareAreas: text("share_areas").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("patient_clinician_connections_clinician_status_idx").on(table.clinicianId, table.status),
  // A patient has one durable relationship row per clinician. Re-inviting a
  // revoked clinician reuses that row rather than creating ambiguous grants.
  uniqueIndex("patient_clinician_connections_patient_clinician_idx").on(table.patientId, table.clinicianId),
]);

export const insertPatientClinicianConnectionSchema = createInsertSchema(patientClinicianConnections)
  .omit({ id: true, createdAt: true, updatedAt: true, acceptedAt: true });
export type InsertPatientClinicianConnection = z.infer<typeof insertPatientClinicianConnectionSchema>;
export type PatientClinicianConnection = typeof patientClinicianConnections.$inferSelect;
