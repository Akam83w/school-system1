import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  schoolCode: text("school_code").notNull().unique(), // SCH-2026-001
  name: text("name").notNull(),
  arabicName: text("arabic_name"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  registrationYear: integer("registration_year").notNull().default(new Date().getFullYear()),
  isActive: boolean("is_active").notNull().default(true),
  subscriptionStatus: text("subscription_status").notNull().default("active"), // active | suspended | expired
  maxStudents: integer("max_students").notNull().default(1000),
  maxTeachers: integer("max_teachers").notNull().default(100),
  metadata: text("metadata"), // JSON string for future use
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
