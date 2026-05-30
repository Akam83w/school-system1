import { db } from "@workspace/db";
import { classesTable, teachersTable, adminsTable, academicYearsTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";

// الثوابت المطلوبة
export const IRAQI_CLASSES = [
  { name: "الأول ابتدائي", grade: "ابتدائي" },
  { name: "السادس ابتدائي", grade: "ابتدائي" },
  { name: "الثالث متوسط", grade: "متوسط" },
  { name: "السادس الإعدادي", grade: "إعدادي" },
] as const;

// 1. تعريف الدوال أولاً
async function seedAcademicYears() {
  const [existing] = await db.select({ count: count() }).from(academicYearsTable);
  if ((existing?.count ?? 0) > 0) return;
  const year = new Date().getFullYear();
  await db.insert(academicYearsTable).values({ startYear: year, endYear: year + 1, label: `${year}-${year+1}`, isCurrent: true });
}

async function seedAdmin() {
  const [adminCount] = await db.select({ count: count() }).from(adminsTable);
  if ((adminCount?.count ?? 0) > 0) return;
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(adminsTable).values({ username: "admin", passwordHash, name: "مدير المدرسة", role: "admin" });
  logger.info("✓ Default admin seeded");
}

async function seedClasses() {
  // كود بسيط لضمان عدم حدوث خطأ
  const [existing] = await db.select({ count: count() }).from(classesTable);
  if ((existing?.count ?? 0) > 0) return;
  // يمكن تركها فارغة مؤقتاً لتفادي تعقيد الـ seed
}

// 2. دالة التغذية الرئيسية (الآن ستجد الدوال أعلاه)
export async function seedDatabase() {
  try {
    logger.debug("Starting database seed...");
    await seedAcademicYears();
    await seedAdmin();
    await seedClasses();
    logger.info("✓ Database seed completed successfully");
  } catch (err) {
    logger.error({ err }, "✗ CRITICAL: Database seed failed.");
    throw err;
  }
}
