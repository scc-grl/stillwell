import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions)
  .omit({ createdAt: true });
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
