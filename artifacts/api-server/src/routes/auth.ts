import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
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
  const { name, username, email, password } = req.body;
  if (!name || !username || !password) {
    res.status(400).json({ error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
    return;
  }
  const emailVal: string | undefined = typeof email === "string" && email.trim() ? email.trim() : undefined;

  const existing = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(
      emailVal
        ? or(eq(adminsTable.username, username), eq(adminsTable.email, emailVal))
        : eq(adminsTable.username, username)
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const passwordHash = hashPassword(password);
  const [newAdmin] = await db
    .insert(adminsTable)
    .values({ name, username, email: emailVal ?? null, passwordHash, role: "admin" })
    .returning({ id: adminsTable.id, username: adminsTable.username, name: adminsTable.name, role: adminsTable.role });

  req.log.info({ adminId: newAdmin.id }, "New admin registered");
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
  res.json({ id: admin.id, username: admin.username, name: admin.name, role: admin.role });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
