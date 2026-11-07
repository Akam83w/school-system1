import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { adminsTable } from "./admins";
import { studentsTable } from "./students";
import { classesTable } from "./classes";

export const schoolMessagesTable = pgTable("school_messages", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "restrict" }),
  audience: text("audience").notNull(), // school | class | private
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "restrict" }),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "restrict" }),
  authorId: integer("author_id").notNull().references(() => adminsTable.id, { onDelete: "restrict" }),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  template: text("template").notNull().default("general"),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schoolMessageVersionsTable = pgTable("school_message_versions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => schoolMessagesTable.id, { onDelete: "restrict" }),
  previousBody: text("previous_body").notNull(),
  editedBy: integer("edited_by").notNull().references(() => adminsTable.id, { onDelete: "restrict" }),
  editedByName: text("edited_by_name").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SchoolMessage = typeof schoolMessagesTable.$inferSelect;
export type SchoolMessageVersion = typeof schoolMessageVersionsTable.$inferSelect;
