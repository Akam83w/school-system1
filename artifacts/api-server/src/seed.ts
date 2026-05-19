import { db } from "@workspace/db";
import { classesTable, teachersTable, adminsTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { logger } from "./lib/logger";
import crypto from "crypto";

export const IRAQI_CLASSES = [
  { name: "الأول ابتدائي",   grade: "ابتدائي" },
  { name: "الثاني ابتدائي",  grade: "ابتدائي" },
  { name: "الثالث ابتدائي",  grade: "ابتدائي" },
  { name: "الرابع ابتدائي",  grade: "ابتدائي" },
  { name: "الخامس ابتدائي",  grade: "ابتدائي" },
  { name: "السادس ابتدائي",  grade: "ابتدائي" },
  { name: "الأول متوسط",    grade: "متوسط"   },
  { name: "الثاني متوسط",   grade: "متوسط"   },
  { name: "الثالث متوسط",   grade: "متوسط"   },
  { name: "الرابع الإعدادي", grade: "إعدادي"  },
  { name: "الخامس الإعدادي", grade: "إعدادي"  },
  { name: "السادس الإعدادي", grade: "إعدادي"  },
] as const;

export const IRAQI_CLASS_NAMES = IRAQI_CLASSES.map((c) => c.name);

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
    .where(inArray(classesTable.name, [...IRAQI_CLASS_NAMES]));

  if ((existing?.count ?? 0) >= IRAQI_CLASSES.length) {
    logger.info("Iraqi school classes already seeded — skipping");
    return;
  }

  const teachers = await db
    .select({ id: teachersTable.id })
    .from(teachersTable)
    .limit(12);

  if (teachers.length === 0) {
    logger.warn("No teachers found — cannot seed classes");
    return;
  }

  let teacherIdx = 0;
  let seeded = 0;

  for (const cls of IRAQI_CLASSES) {
    const [alreadyExists] = await db
      .select({ count: count() })
      .from(classesTable)
      .where(eq(classesTable.name, cls.name));

    if ((alreadyExists?.count ?? 0) > 0) continue;

    const teacherId = teachers[teacherIdx % teachers.length]!.id;
    teacherIdx++;

    await db.insert(classesTable).values({
      name: cls.name,
      grade: cls.grade,
      teacherId,
      capacity: 35,
      academicYear: "2024-2025",
      room: null,
    });
    seeded++;
  }

  if (seeded > 0) logger.info({ seeded }, "Seeded Iraqi school classes");
}
