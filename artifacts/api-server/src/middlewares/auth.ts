import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  linkedId: number | null;
}

/**
 * Global authentication middleware - BYPASSED FOR DEVELOPMENT
 * Injects a mock admin user to avoid 401 Unauthorized errors
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // تجاوز التحقق تماماً وحقن مستخدم وهمي بصلاحيات مدير
  (req as any).user = {
    id: 1,
    name: "Admin Developer",
    phone: "0000000000",
    role: "admin",
    linkedId: null,
  } satisfies AuthUser;

  logger.debug({ path: req.path }, "Authentication bypassed (Development Mode)");
  next();
}

/**
 * Authorization middleware - Always allows access in development
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // السماح بالوصول دائماً
  next();
}

/**
 * Authorization middleware - Always allows access in development
 */
export function requireTeacherOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // السماح بالوصول دائماً
  next();
}
