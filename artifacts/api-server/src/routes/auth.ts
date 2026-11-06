import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, teachersTable, studentsTable, schoolsTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";

const router = Router();
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  logger.error("SESSION_SECRET is required");
  process.exit(1);
}
const SECRET = SESSION_SECRET;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(password, hash); }
  catch (err) { logger.warn({ err }, "Password verification failed"); return false; }
}

function generateToken(adminId: number) {
  const payload = Buffer.from(JSON.stringify({
    adminId, ts: Date.now(), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  })).toString("base64");
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
    if (supplied.length !== calculated.length || !timingSafeEqual(supplied, calculated)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    if (!decoded?.adminId || !decoded?.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch { return null; }
}

// Login identifiers are globally unique at the account table. Tenant ownership is
// resolved from the server-side account row on every request, never trusted from JWT/body.
router.post("/auth/login", async (req: any, res: any) => {
  try {
    const { username, identifier, password, role } = req.body ?? {};
    const user = (username || identifier || "").toString().trim();
    const requestedRole = (role || "admin").toString().trim().toLowerCase();
    if (!user || typeof password !== "string" || !password) return res.status(400).json({ error: "أدخل اسم المستخدم وكلمة المرور" });
    if (!["admin", "teacher", "student"].includes(requestedRole)) return res.status(400).json({ error: "نوع الحساب غير صالح" });

    let account: any;
    [account] = await db.select().from(adminsTable)
      .where(or(eq(adminsTable.username, user), eq(adminsTable.phone, user))).limit(1);

    if (account && account.role !== requestedRole && !(requestedRole === "admin" && account.role === "super_admin")) account = undefined;

    if (!account && requestedRole === "teacher") {
      const [profile] = await db.select({ id: teachersTable.id, schoolId: teachersTable.schoolId })
        .from(teachersTable).where(eq(teachersTable.teacherCode, user)).limit(1);
      if (profile) {
        [account] = await db.select().from(adminsTable).where(and(
          eq(adminsTable.linkedId, profile.id), eq(adminsTable.role, "teacher"), eq(adminsTable.schoolId, profile.schoolId)
        )).limit(1);
      }
    }
    if (!account && requestedRole === "student") {
      const [profile] = await db.select({ id: studentsTable.id, schoolId: studentsTable.schoolId })
        .from(studentsTable).where(eq(studentsTable.nationalId, user)).limit(1);
      if (profile) {
        [account] = await db.select().from(adminsTable).where(and(
          eq(adminsTable.linkedId, profile.id), eq(adminsTable.role, "student"), eq(adminsTable.schoolId, profile.schoolId)
        )).limit(1);
      }
    }

    if (!account) return res.status(401).json({ error: "الحساب غير موجود أو غير مرتبط بملفك. راجع مدير المدرسة" });
    if (!account.passwordHash || !(await verifyPassword(password, account.passwordHash))) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    if (account.role !== "super_admin" && !account.schoolId) return res.status(403).json({ error: "هذا الحساب غير مرتبط بمدرسة. راجع الدعم الفني" });

    const token = generateToken(account.id);
    return res.json({ token, admin: {
      id: account.id, username: account.username, name: account.name, role: account.role,
      phone: account.phone, linkedId: account.linkedId, schoolId: account.schoolId,
    }});
  } catch (err) {
    logger.error({ err }, "Login error");
    return res.status(500).json({ error: "تعذر إكمال تسجيل الدخول بسبب خطأ في الخادم" });
  }
});

// Each public registration creates exactly one school and its first school manager atomically.
router.post(["/auth/register", "/auth/register-school"], async (req: any, res: any) => {
  try {
    const { schoolName, schoolType, name, username, phone, email, password } = req.body ?? {};
    const cleanSchool = String(schoolName ?? "").trim();
    const cleanName = String(name ?? "").trim();
    const cleanUsername = String(username ?? "").trim();
    const cleanPhone = String(phone ?? "").trim();
    const type = String(schoolType ?? "").trim().toLowerCase();
    if (!cleanSchool || !cleanName || !cleanUsername || !cleanPhone || typeof password !== "string") {
      return res.status(400).json({ error: "اسم المدرسة ونوعها واسم المدير واسم المستخدم والهاتف وكلمة المرور مطلوبة" });
    }
    if (cleanSchool.length < 3 || cleanSchool.length > 160) return res.status(400).json({ error: "اسم المدرسة يجب أن يكون بين 3 و160 حرفاً" });
    if (cleanName.split(/\s+/).filter(Boolean).length < 3) return res.status(400).json({ error: "يجب أن يتكون اسم المدير من ثلاثة أسماء على الأقل" });
    if (!/^[\p{L}\p{N}._-]{3,40}$/u.test(cleanUsername)) return res.status(400).json({ error: "اسم المستخدم يجب أن يكون 3-40 حرفاً أو رقماً" });
    if (password.length < 8) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    if (!["primary", "intermediate", "preparatory", "other"].includes(type)) return res.status(400).json({ error: "نوع المدرسة غير صالح" });

    const passwordHash = await hashPassword(password);
    const result = await db.transaction(async (tx) => {
      const [school] = await tx.insert(schoolsTable).values({
        schoolCode: `SCH-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
        name: cleanSchool, arabicName: cleanSchool, schoolType: type,
        phone: cleanPhone, email: email ? String(email).trim().toLowerCase() : null,
        isActive: true, subscriptionStatus: "active",
      }).returning();
      const [manager] = await tx.insert(adminsTable).values({
        name: cleanName, username: cleanUsername, phone: cleanPhone,
        email: email ? String(email).trim().toLowerCase() : null,
        passwordHash, role: "admin", schoolId: school.id, linkedId: null,
      }).returning();
      return { school, manager };
    });
    const token = generateToken(result.manager.id);
    return res.status(201).json({
      token,
      school: { id: result.school.id, name: result.school.name, schoolType: result.school.schoolType },
      admin: { id: result.manager.id, name: result.manager.name, username: result.manager.username, role: result.manager.role, schoolId: result.school.id },
    });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "اسم المستخدم أو رقم الهاتف أو البريد الإلكتروني مستخدم مسبقاً" });
    logger.error({ err }, "School registration error");
    return res.status(500).json({ error: "تعذر إنشاء المدرسة والحساب. تحقق من البيانات وحاول مجدداً" });
  }
});

router.get("/auth/me", async (req: any, res: any) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return res.status(401).json({ error: "غير مصرح" });
    const decoded = verifyToken(authorization.slice(7));
    if (!decoded) return res.status(401).json({ error: "توكن غير صالح" });
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, decoded.adminId)).limit(1);
    if (!admin) return res.status(404).json({ error: "المستخدم غير موجود" });
    let schoolType: string | null = null;
    if (admin.schoolId) {
      const [school] = await db.select({ schoolType: schoolsTable.schoolType }).from(schoolsTable).where(eq(schoolsTable.id, admin.schoolId)).limit(1);
      schoolType = school?.schoolType ?? null;
    }
    return res.json({ id: admin.id, name: admin.name, role: admin.role, username: admin.username, phone: admin.phone, linkedId: admin.linkedId, schoolId: admin.schoolId, schoolType });
  } catch (err) {
    logger.error({ err }, "ME error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
