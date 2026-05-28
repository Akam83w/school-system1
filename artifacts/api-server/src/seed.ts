import { db } from "@workspace/db";
import {
  classesTable,
  teachersTable,
  adminsTable,
  academicYearsTable,
} from "@workspace/db";
import { count, eq } from "drizzle-orm";
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

/**
 * Main seed function with proper error handling and dependency ordering
 * Runs in sequence:
 * 1. Academic Years (no dependencies)
 * 2. Admin (no dependencies)
 * 3. Classes (optional, depends on teachers existing)
 */
export async function seedDatabase() {
  try {
    logger.debug("Starting database seed...");

    // Step 1: Seed academic years (should always succeed if tables exist)
    await seedAcademicYears();

    // Step 2: Seed admin (must exist for system operation)
    await seedAdmin();

    // Step 3: Seed classes (depends on teachers, safe to skip if no teachers)
    await seedClasses();

    logger.info("✓ Database seed completed successfully");
  } catch (err) {
    logger.error(
      { err },
      "✗ CRITICAL: Database seed encountered an error. " +
        "This may indicate a database connectivity issue or missing schema. " +
        "Run 'pnpm db:push' to initialize the schema."
    );
    throw err; // Re-throw to allow error handling in startup
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

    if ((adminCount?.count ?? 0) > 0) {
      logger.debug("Admin already exists, skipping admin seed");
      return;
    }

    const passwordHash = await bcrypt.hash("admin123", 12);

    await db.insert(adminsTable).values({
      username: "admin",
      passwordHash,
      name: "مدير المدرسة",
      role: "admin",
    });

    logger.info(
      { username: "admin", role: "admin" },
      "✓ Seeded default admin user (password: admin123)"
    );
  } catch (err) {
    logger.warn(
      { err },
      "⚠ Failed to seed admin. Ensure the adminsTable exists and database is accessible."
    );
    throw err;
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

    if ((existing?.count ?? 0) > 0) {
      logger.debug("Academic years already exist, skipping");
      return;
    }

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

    logger.info(
      { count: values.length },
      "✓ Seeded academic years (2020-2099)"
    );
  } catch (err) {
    logger.warn({ err }, "⚠ Failed to seed academic years");
    throw err;
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

    if ((existing?.count ?? 0) >= IRAQI_CLASSES.length) {
      logger.debug("Classes already fully seeded, skipping");
      return;
    }

    const teachers = await db
      .select({ id: teachersTable.id })
      .from(teachersTable)
      .limit(20);

    if (!teachers.length) {
      logger.info(
        "No teachers found in database. Classes seed skipped. " +
          "To populate classes, please create at least one teacher first."
      );
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
      logger.info({ count: seeded }, `✓ Seeded ${seeded} new classes`);
    }
  } catch (err) {
    logger.warn({ err }, "⚠ Failed to seed classes");
    throw err;
  }
}
