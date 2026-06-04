import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
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
// PASSWORD - PROPER VERIFICATION
// =====================================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const valid = await bcrypt.compare(password, hash);
    return valid;
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
    JSON.stringify({ adminId, ts: Date.now() })
  ).toString("base64");

  const sig = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  return `${payload}.${sig}`;
}

export function verifyToken(token: string) {
  try {
    const [payload, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");

    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch {
    return null;
  }
}

// =====================================================
// LOGIN ENDPOINT
// =====================================================
router.post("/auth/login", async (req: any, res: any) => {
  try {
    const { username, identifier, password } = req.body;
    const user = username || identifier;

    if (!user || !password) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }

    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, user));

    if (!admin) {
      return res.status(401).json({ error: "خطأ في البيانات" });
    }

    // ✅ PROPER PASSWORD VERIFICATION
    const valid = await verifyPassword(password, admin.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "خطأ في البيانات" });
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
    return res.status(500).json({ error: "Server error" });
  }
});

// =====================================================
// GET ME ENDPOINT
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
      .where(eq(adminsTable.id, decoded.adminId));

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
