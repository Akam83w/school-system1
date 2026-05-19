import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";

export const academicYearsTable = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  startYear: integer("start_year").notNull().unique(),
  endYear: integer("end_year").notNull(),
  label: text("label").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
});

export type AcademicYear = typeof academicYearsTable.$inferSelect;
