import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// SECRET - REQUIRED
// =====================================================
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  logger.error("❌ CRITICAL ERROR: SESSION_SECRET is not set in environment variables!");
  logger.error("Please set SESSION_SECRET in your .env file");
  logger.error("Generate one with: openssl rand -base64 32");
  process.exit(1);
}

const SECRET = SESSION_SECRET;
logger.info("✅ SESSION_SECRET loaded successfully from environment");

// =====================================================
// PASSWORD
// =====================================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    logger.warn({ err }, "Password verification failed");
    return false;
  }
}

// =====================================================
// TOKEN
// =====================================================
function generateToken(adminId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      adminId,
      ts: Date.now(),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
  ).toString("base64");

  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string) {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
    const supplied = Buffer.from(sig, "hex");
    const calculated = Buffer.from(expected, "hex");
    if (supplied.length !== calculated.length || !timingSafeEqual(supplied, calculated)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    if (!decoded?.adminId || !decoded?.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// =====================================================
// LOGIN
// =====================================================
router.post("/auth/login", async (req: any, res: any) => {
  try {
    const { username, identifier, password, role } = req.body ?? {};
    const user = (username || identifier || "").toString().trim();
    const requestedRole = (role || "admin").toString().trim().toLowerCase();

    if (!user || typeof password !== "string" || !password) {
      return res.status(400).json({ error: "أدخل اسم المستخدم وكلمة المرور" });
    }
    if (!["admin", "teacher", "student"].includes(requestedRole)) {
      return res.status(400).json({ error: "نوع الحساب غير صالح" });
    }

    let admin: any;

    if (requestedRole === "admin") {
      [admin] = await db.select().from(adminsTable)
        .where(eq(adminsTable.username, user)).limit(1);
      if (admin && !["admin", "super_admin"].includes(admin.role)) admin = undefined;
    } else if (requestedRole === "teacher") {
      const [teacher] = await db.select({ id: teachersTable.id })
        .from(teachersTable).where(eq(teachersTable.teacherCode, user)).limit(1);
      if (teacher) {
        [admin] = await db.select().from(adminsTable)
          .where(eq(adminsTable.linkedId, teacher.id)).limit(1);
        if (admin && admin.role !== "teacher") admin = undefined;
      }
    } else {
      const [student] = await db.select({ id: studentsTable.id })
        .from(studentsTable).where(eq(studentsTable.nationalId, user)).limit(1);
      if (student) {
        [admin] = await db.select().from(adminsTable)
          .where(eq(adminsTable.linkedId, student.id)).limit(1);
        if (admin && admin.role !== "student") admin = undefined;
      }
    }

    if (!admin) {
      logger.warn({ role: requestedRole }, "Login failed: account or linked profile not found");
      return res.status(401).json({ error: "الحساب غير موجود أو غير مرتبط بملفك. راجع مدير المدرسة" });
    }
    if (!admin.passwordHash || !(await verifyPassword(password, admin.passwordHash))) {
      logger.warn({ userId: admin.id, role: requestedRole }, "Login failed: invalid password");
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    const token = generateToken(admin.id);
    return res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        phone: admin.phone,
        linkedId: admin.linkedId,
      },
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    return res.status(500).json({ error: "تعذر إكمال تسجيل الدخول بسبب خطأ في الخادم" });
  }
});

// =====================================================
// REGISTER (first admin only — when no users exist)
// =====================================================
router.post("/auth/register", async (req: any, res: any) => {
  try {
    const [adminCount] = await db.select({ count: count() }).from(adminsTable);
    if ((adminCount?.count ?? 0) > 0) {
      return res.status(403).json({
        error: "يتم إنشاء الحسابات الجديدة من قِبَل مدير النظام فقط.",
      });
    }

    const { name, username, phone, email, password } = req.body ?? {};

    if (!name || !username || !password) {
      return res.status(400).json({ error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
    }

    const nameParts = String(name).trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 3) {
      return res.status(400).json({ error: "يجب أن يتكون الاسم من ثلاثة أسماء على الأقل" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
    }

    const usernameStr = String(username).trim();
    const passwordHash = await hashPassword(String(password));

    const [newUser] = await db
      .insert(adminsTable)
      .values({
        name: String(name).trim(),
        username: usernameStr,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        passwordHash,
        role: "admin",
        linkedId: null,
      })
      .returning();

    logger.info({ userId: newUser.id, username: newUser.username }, "First admin registered");

    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
    });
  } catch (err) {
    logger.error({ err }, "Register error");
    return res.status(500).json({ error: "خطأ في الخادم أثناء إنشاء الحساب" });
  }
});

// =====================================================
// GET ME
// =====================================================
router.get("/auth/me", async (req: any, res: any) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const token = auth.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "توكن غير صالح" });
    }

    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.id, decoded.adminId))
      .limit(1);

    if (!admin) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    return res.json({
      id: admin.id,
      name: admin.name,
      role: admin.role,
      username: admin.username,
      phone: admin.phone,
      linkedId: admin.linkedId,
    });
  } catch (err) {
    logger.error({ err }, "ME error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
