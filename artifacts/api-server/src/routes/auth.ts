import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getRemainingSeconds,
} from "../lib/rateLimiter";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// SESSION SECRET (تعديل لضمان استقرار التشغيل)
// =====================================================
const DEFAULT_SECRET = "my_super_secret_key_12345";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  logger.warn("تنبيه: SESSION_SECRET غير موجود في المتغيرات، سيتم استخدام المفتاح الافتراضي.");
}

const SECRET = SESSION_SECRET || DEFAULT_SECRET;

// =====================================================
// PASSWORDS
// =====================================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  try {
    const valid = await bcrypt.compare(password, hash);
    if (valid) return { valid: true, needsRehash: false };
  } catch (err) {
    logger.warn({ err }, "Password verification failed");
  }

  return { valid: false, needsRehash: false };
}

// =====================================================
// TOKEN SYSTEM
// =====================================================
function generateToken(adminId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ adminId, ts: Date.now() })
  ).toString("base64");

  const sig = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  return `${payload}.${sig}`;
}

export function verifyToken(
  token: string
): { adminId: number } | null {
  try {
    const [payload, sig] = token.split(".");

    const expected = createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");

    if (sig !== expected) return null;

    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch (err) {
    logger.warn({ err }, "Token verification failed");
    return null;
  }
}

// =====================================================
// ROUTER EXPORT
// =====================================================
export default router;
