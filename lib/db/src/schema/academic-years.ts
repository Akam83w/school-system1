import { pgTable, text, serial, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";

export const academicYearsTable = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id, { onDelete: "restrict" }),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  label: text("label").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
}, (table) => ({
  schoolStartYearUnique: uniqueIndex("academic_years_school_start_year_unique").on(table.schoolId, table.startYear),
}));

export type AcademicYear = typeof academicYearsTable.$inferSelect;
