import { db } from "@workspace/db";
import {
  classesTable,
  teachersTable,
  adminsTable,
  academicYearsTable,
} from "@workspace/db";
import { count, eq, inArray, sql } from "drizzle-orm";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";

export const IRAQI_CLASSES = [
  { name: "الأول ابتدائي", grade: "ابتدائي" },
  { name: "الثاني ابتدائي", grade: "ابتدائي" },
  { name: "الثالث ابتدائي", grade: "ابتدائي" },
  { name: "الرابع ابتدائي", grade: "ابتدائي" },
  { name: "الخامس ابتدائي", grade: "ابتدائي" },
  { name: "السادس ابتدائي", grade: "ابتدائي" },
  { name: "الأول متوسط", grade: "متوسط" },
  { name: "الثاني متوسط", grade: "متوسط" },
  { name: "الثالث متوسط", grade: "متوسط" },
  { name: "الرابع الإعدادي", grade: "إعدادي" },
  { name: "الخامس الإعدادي", grade: "إعدادي" },
  { name: "السادس الإعدادي", grade: "إعدادي" },
] as const;

export const IRAQI_CLASS_NAMES = IRAQI_CLASSES.map((c) => c.name);

export async function seedDatabase() {
  try {
    await seedAcademicYears();
    await seedAdmin();
    await seedClasses();
  } catch (err) {
    logger.error({ err }, "Seed error (non-fatal)");
  }
}

/* =========================
   SAFE ADMIN SEED
========================= */
async function seedAdmin() {
  try {
    const [adminCount] = await db
      .select({ count: count() })
      .from(adminsTable);

    if ((adminCount?.count ?? 0) > 0) return;

    const passwordHash = await bcrypt.hash("admin123", 12);

    await db.insert(adminsTable).values({
      username: "admin",
      passwordHash,
      name: "مدير المدرسة",
      role: "admin",
    });

    logger.info("Seeded default admin");
  } catch (err) {
    logger.warn({ err }, "Skipping admin seed (table may not exist)");
  }
}

/* =========================
   SAFE ACADEMIC YEARS
========================= */
async function seedAcademicYears() {
  try {
    const [existing] = await db
      .select({ count: count() })
      .from(academicYearsTable);

    if ((existing?.count ?? 0) > 0) return;

    const values = [];

    for (let y = 2020; y <= 2099; y++) {
      values.push({
        startYear: y,
        endYear: y + 1,
        label: `${y}-${y + 1}`,
        isCurrent: y === new Date().getFullYear(),
      });
    }

    await db.insert(academicYearsTable).values(values).onConflictDoNothing();

    logger.info("Seeded academic years");
  } catch (err) {
    logger.warn({ err }, "Skipping academic years seed");
  }
}

/* =========================
   SAFE CLASSES SEED
========================= */
async function seedClasses() {
  try {
    const [existing] = await db
      .select({ count: count() })
      .from(classesTable);

    if ((existing?.count ?? 0) >= IRAQI_CLASSES.length) return;

    const teachers = await db
      .select({ id: teachersTable.id })
      .from(teachersTable)
      .limit(20);

    if (!teachers.length) {
      logger.warn("No teachers found - skipping classes seed");
      return;
    }

    let teacherIdx = 0;
    let seeded = 0;

    for (const cls of IRAQI_CLASSES) {
      const [exists] = await db
        .select({ count: count() })
        .from(classesTable)
        .where(eq(classesTable.name, cls.name));

      if ((exists?.count ?? 0) > 0) continue;

      const teacherId = teachers[teacherIdx % teachers.length]!.id;
      teacherIdx++;

      await db.insert(classesTable).values({
        name: cls.name,
        grade: cls.grade,
        teacherId,
        capacity: 35,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        room: null,
      });

      seeded++;
    }

    if (seeded > 0) {
      logger.info({ seeded }, "Seeded classes");
    }
  } catch (err) {
    logger.warn({ err }, "Skipping classes seed");
  }
}
