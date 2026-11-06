import { db } from "@workspace/db";
import { schoolsTable, academicYearsTable, count, eq, and } from "@workspace/db";
import { logger } from "./lib/logger";

export const IRAQI_CLASSES = [
  { name: "الأول ابتدائي", grade: "ابتدائي" },
  { name: "السادس ابتدائي", grade: "ابتدائي" },
  { name: "الثالث متوسط", grade: "متوسط" },
  { name: "السادس الإعدادي", grade: "إعدادي" },
] as const;

// Create the current academic year independently for each school.
// School managers are always created through the public self-registration transaction;
// never seed a shared default administrator or password.
async function seedAcademicYears() {
  const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable).where(eq(schoolsTable.isActive, true));
  const year = new Date().getFullYear();
  for (const school of schools) {
    const [existing] = await db.select({ count: count() }).from(academicYearsTable)
      .where(and(eq(academicYearsTable.schoolId, school.id), eq(academicYearsTable.isCurrent, true)));
    if ((existing?.count ?? 0) > 0) continue;
    await db.insert(academicYearsTable).values({
      schoolId: school.id, startYear: year, endYear: year + 1,
      label: `${year}-${year + 1}`, isCurrent: true,
    }).onConflictDoNothing();
  }
}
export async function seedDatabase() {
  try {
    logger.debug("Starting school-aware database seed...");
    await seedAcademicYears();
    logger.info("School-aware database seed completed");
  } catch (err) {
    logger.error({ err }, "Database seed failed");
    throw err;
  }
}
