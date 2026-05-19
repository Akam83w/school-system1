import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { createHmac } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  const salt = "school_salt_2024";
  return createHmac("sha256", salt).update(password).digest("hex");
}

function generateToken(adminId: number): string {
  const payload = Buffer.from(JSON.stringify({ adminId, ts: Date.now() })).toString("base64");
  const sig = createHmac("sha256", process.env.SESSION_SECRET ?? "school_secret").update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { adminId: number } | null {
  try {
    const [payload, sig] = token.split(".");
    const expected = createHmac("sha256", process.env.SESSION_SECRET ?? "school_secret").update(payload).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch {
    return null;
  }
}

router.post("/auth/register", async (req, res) => {
  const { name, username, phone, password, role } = req.body;

  if (!name || !username || !phone || !password) {
    res.status(400).json({ error: "الاسم الكامل واسم المستخدم ورقم الهاتف وكلمة المرور مطلوبة" });
    return;
  }

  // Validate three-word full name
  const nameParts = String(name).trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 3) {
    res.status(400).json({ error: "يجب أن يتكون الاسم الكامل من ثلاثة أسماء على الأقل" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
    return;
  }

  const phoneStr = String(phone).trim();

  // Check username uniqueness
  const [usernameExists] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.username, username))
    .limit(1);
  if (usernameExists) {
    res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
    return;
  }

  // Check phone uniqueness
  const [phoneExists] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.phone, phoneStr))
    .limit(1);
  if (phoneExists) {
    res.status(409).json({ error: "رقم الهاتف مستخدم بالفعل" });
    return;
  }

  // Determine role
  const [{ total }] = await db.select({ total: count() }).from(adminsTable);
  let finalRole: string;

  if (total === 0) {
    finalRole = "admin"; // First user always becomes admin
  } else {
    if (role === "admin") {
      res.status(409).json({ error: "يوجد مدير واحد فقط مسموح به في النظام" });
      return;
    }
    finalRole = role === "student" ? "student" : "teacher";
  }

  const passwordHash = hashPassword(password);
  const [newAdmin] = await db
    .insert(adminsTable)
    .values({ name: String(name).trim(), username, phone: phoneStr, passwordHash, role: finalRole })
    .returning({ id: adminsTable.id, username: adminsTable.username, name: adminsTable.name, role: adminsTable.role });

  req.log.info({ adminId: newAdmin.id, role: finalRole }, "New user registered");
  res.status(201).json({ success: true, admin: newAdmin });
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    return;
  }
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const hash = hashPassword(password);
  if (admin.passwordHash !== hash) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  const token = generateToken(admin.id);
  res.json({
    token,
    admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
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
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, decoded.adminId)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json({ id: admin.id, username: admin.username, name: admin.name, role: admin.role, phone: admin.phone });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
