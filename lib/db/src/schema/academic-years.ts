import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";

export const academicYearsTable = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "restrict" }),
  startYear: integer("start_year").notNull().unique(),
  endYear: integer("end_year").notNull(),
  label: text("label").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
});

export type AcademicYear = typeof academicYearsTable.$inferSelect;
