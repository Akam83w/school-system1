import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  linkedId: number | null;
}

/**
 * Global authentication middleware
 * Validates JWT token from Authorization header and attaches user to request
 *
 * Expected header format: Authorization: Bearer <token>
 * On success: (req as any).user is set with AuthUser data
 * On failure: Returns 401 Unauthorized
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn(
        { path: req.path, ip: req.ip },
        "Request missing or invalid Authorization header"
      );
      res.status(401).json({ error: "غير مصرح - رمز الدخول مفقود" });
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn(
        { path: req.path, ip: req.ip },
        "Invalid or expired token signature"
      );
      res.status(401).json({ error: "رمز غير صالح أو منتهي الصلاحية" });
      return;
    }

    // Load user from database to verify they still exist
    const [admin] = await db
      .select({
        id: adminsTable.id,
        name: adminsTable.name,
        phone: adminsTable.phone,
        role: adminsTable.role,
        linkedId: adminsTable.linkedId,
      })
      .from(adminsTable)
      .where(eq(adminsTable.id, decoded.adminId));

    if (!admin) {
      logger.warn(
        { adminId: decoded.adminId, path: req.path },
        "Token references non-existent user"
      );
      res.status(401).json({ error: "المستخدم غير موجود" });
      return;
    }

    // Attach user to request for use in route handlers
    (req as any).user = {
      id: admin.id,
      name: admin.name,
      phone: admin.phone ?? "",
      role: admin.role,
      linkedId: admin.linkedId ?? null,
    } satisfies AuthUser;

    logger.debug(
      { userId: admin.id, role: admin.role, path: req.path },
      "Authentication successful"
    );

    next();
  } catch (err) {
    logger.error({ err, path: req.path }, "Authentication middleware error");
    res.status(500).json({ error: "خطأ في التحقق من الهوية" });
  }
}

/**
 * Authorization middleware - Requires admin role
 * Use this for admin-only operations
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "admin") {
    logger.warn(
      { userId: user?.id, role: user?.role, path: req.path },
      "Unauthorized: admin role required"
    );
    res.status(403).json({ error: "هذه العملية متاحة للمدير فقط" });
    return;
  }
  next();
}

/**
 * Authorization middleware - Requires teacher or admin role
 * Use this for teacher management operations
 */
export function requireTeacherOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "admin" && user?.role !== "teacher") {
    logger.warn(
      { userId: user?.id, role: user?.role, path: req.path },
      "Unauthorized: teacher or admin role required"
    );
    res.status(403).json({ error: "غير مصرح بهذه العملية" });
    return;
  }
  next();
}
