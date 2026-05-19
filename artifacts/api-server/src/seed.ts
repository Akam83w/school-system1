import { db } from "@workspace/db";
import { classesTable, teachersTable, adminsTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { logger } from "./lib/logger";
import crypto from "crypto";

export const IRAQI_GRADES = [
  "الأول متوسط",
  "الثاني متوسط",
  "الثالث متوسط",
  "الرابع الإعدادي",
  "الخامس الإعدادي",
  "السادس الإعدادي",
] as const;

const DEFAULT_SECTIONS = ["أ", "ب"];

export async function seedDatabase() {
  try {
    await seedAdmin();
    await seedClasses();
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}

async function seedAdmin() {
  const [adminCount] = await db.select({ count: count() }).from(adminsTable);
  if ((adminCount?.count ?? 0) > 0) return;

  const hash = crypto
    .createHmac("sha256", process.env["SESSION_SECRET"] ?? "school_salt_2024")
    .update("admin123")
    .digest("hex");

  await db.insert(adminsTable).values({
    username: "admin",
    passwordHash: hash,
    name: "مدير المدرسة",
    role: "admin",
  });
  logger.info("Seeded default admin");
}

async function seedClasses() {
  const [existing] = await db
    .select({ count: count() })
    .from(classesTable)
    .where(inArray(classesTable.grade, [...IRAQI_GRADES]));

  if ((existing?.count ?? 0) >= IRAQI_GRADES.length) {
    logger.info("Iraqi grade classes already seeded — skipping");
    return;
  }

  const teachers = await db
    .select({ id: teachersTable.id })
    .from(teachersTable)
    .limit(10);

  if (teachers.length === 0) {
    logger.warn("No teachers found — cannot seed classes");
    return;
  }

  let teacherIdx = 0;
  let seeded = 0;

  for (const grade of IRAQI_GRADES) {
    const [gradeExists] = await db
      .select({ count: count() })
      .from(classesTable)
      .where(eq(classesTable.grade, grade));

    if ((gradeExists?.count ?? 0) > 0) continue;

    for (const section of DEFAULT_SECTIONS) {
      const teacherId = teachers[teacherIdx % teachers.length]!.id;
      teacherIdx++;
      await db.insert(classesTable).values({
        name: section,
        grade,
        teacherId,
        capacity: 35,
        academicYear: "2024-2025",
        room: null,
      });
      seeded++;
    }
  }

  if (seeded > 0) logger.info({ seeded }, "Seeded Iraqi grade classes");
}
