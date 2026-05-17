import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes } from "crypto";

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
