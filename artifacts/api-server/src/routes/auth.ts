import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import { isRateLimited, recordFailedAttempt, clearFailedAttempts, getRemainingSeconds } from "../lib/rateLimiter";

const router = Router();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(
  password: string,
  hash: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // Try bcrypt first (the current secure format)
  try {
    const valid = await bcrypt.compare(password, hash);
    if (valid) return { valid: true, needsRehash: false };
  } catch {}

  // Legacy HMAC fallback — auto-migration on first login
  const legacyHash = createHmac("sha256", "school_salt_2024").update(password).digest("hex");
  if (legacyHash === hash) return { valid: true, needsRehash: true };

  return { valid: false, needsRehash: false };
}

function generateToken(adminId: number): string {
  const payload = Buffer.from(JSON.stringify({ adminId, ts: Date.now() })).toString("base64");
  const sig = createHmac("sha256", process.env.SESSION_SECRET ?? "school_secret")
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { adminId: number } | null {
  try {
    const [payload, sig] = token.split(".");
    const expected = createHmac("sha256", process.env.SESSION_SECRET ?? "school_secret")
      .update(payload)
      .digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch {
    return null;
  }
}

// POST /auth/register — ONLY for first-user bootstrap (creates the initial admin account).
// All subsequent accounts must be created by an admin via POST /users.
router.post("/auth/register", async (req, res) => {
  const [{ total }] = await db.select({ total: count() }).from(adminsTable);

  if (total > 0) {
    res.status(403).json({
      error:
        "تسجيل المستخدمين الجدد محظور. يرجى التواصل مع مدير النظام لإنشاء حساب جديد.",
    });
    return;
  }

  const { name, username, phone, email, password } = req.body;

  if (!name || !username || !phone || !password) {
    res.status(400).json({
      error: "الاسم الكامل واسم المستخدم ورقم الهاتف وكلمة المرور مطلوبة",
    });
    return;
  }

  const nameParts = String(name).trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 3) {
    res
      .status(400)
      .json({ error: "يجب أن يتكون الاسم الكامل من ثلاثة أسماء على الأقل" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res
      .status(400)
      .json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
    return;
  }

  const phoneStr = String(phone).trim();
  const usernameStr = String(username).trim();
  const emailStr = email ? String(email).trim().toLowerCase() : null;

  const [usernameExists] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.username, usernameStr))
    .limit(1);
  if (usernameExists) {
    res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [newAdmin] = await db
    .insert(adminsTable)
    .values({
      name: String(name).trim(),
      username: usernameStr,
      phone: phoneStr,
      email: emailStr,
      passwordHash,
      role: "admin",
    })
    .returning({
      id: adminsTable.id,
      username: adminsTable.username,
      name: adminsTable.name,
      role: adminsTable.role,
    });

  req.log.info({ adminId: newAdmin.id }, "First admin registered");
  res.status(201).json({ success: true, admin: newAdmin });
});

// POST /auth/login — role-aware login:
//   role='admin'   → identifier is email or username
//   role='teacher' → identifier is teacherCode (employee ID)
//   role='student' → identifier is nationalId
//   role omitted   → try admin by email/username (backward compat)
router.post("/auth/login", async (req, res) => {
  const { identifier, password, role } = req.body;
  // Accept legacy 'username' field from old clients
  const id = String(identifier ?? req.body.username ?? "").trim();

  if (!id || !password) {
    res.status(400).json({ error: "معرّف الدخول وكلمة المرور مطلوبان" });
    return;
  }

  // Rate limiting — keyed by IP
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    const remaining = getRemainingSeconds(ip);
    res.status(429).json({
      error: `تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. حاول مرة أخرى بعد ${Math.ceil(remaining / 60)} دقيقة.`,
      retryAfterSeconds: remaining,
    });
    return;
  }

  let admin: typeof adminsTable.$inferSelect | null = null;

  if (role === "teacher") {
    // Teacher logs in with their employee ID (teacherCode)
    const [teacher] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.teacherCode, id))
      .limit(1);
    if (teacher) {
      const [linked] = await db
        .select()
        .from(adminsTable)
        .where(and(eq(adminsTable.linkedId, teacher.id), eq(adminsTable.role, "teacher")))
        .limit(1);
      admin = linked ?? null;
    }
  } else if (role === "student") {
    // Student logs in with their national ID
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.nationalId, id))
      .limit(1);
    if (student) {
      const [linked] = await db
        .select()
        .from(adminsTable)
        .where(and(eq(adminsTable.linkedId, student.id), eq(adminsTable.role, "student")))
        .limit(1);
      admin = linked ?? null;
    }
  } else {
    // Admin / no role: try email first, then username
    const [byEmail] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.email, id))
      .limit(1);
    if (byEmail) {
      admin = byEmail;
    } else {
      const [byUsername] = await db
        .select()
        .from(adminsTable)
        .where(eq(adminsTable.username, id))
        .limit(1);
      admin = byUsername ?? null;
    }
  }

  if (!admin) {
    recordFailedAttempt(ip);
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const { valid, needsRehash } = await verifyPassword(String(password), admin.passwordHash);
  if (!valid) {
    recordFailedAttempt(ip);
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  // Auto-upgrade legacy HMAC hash to bcrypt on first login
  if (needsRehash) {
    try {
      const newHash = await hashPassword(String(password));
      await db
        .update(adminsTable)
        .set({ passwordHash: newHash })
        .where(eq(adminsTable.id, admin.id));
      req.log.info({ adminId: admin.id }, "Password auto-upgraded to bcrypt");
    } catch {}
  }

  clearFailedAttempts(ip);
  const token = generateToken(admin.id);
  res.json({
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      linkedId: admin.linkedId ?? null,
    },
  });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "رمز غير صالح" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, decoded.adminId))
    .limit(1);
  if (!admin) {
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    phone: admin.phone,
    email: admin.email,
    linkedId: admin.linkedId ?? null,
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
