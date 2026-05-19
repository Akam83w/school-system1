import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  linkedId: number | null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
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
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }
  (req as any).user = {
    id: admin.id,
    name: admin.name,
    phone: admin.phone ?? "",
    role: admin.role,
    linkedId: admin.linkedId ?? null,
  } satisfies AuthUser;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "admin") {
    res.status(403).json({ error: "هذه العملية متاحة للمدير فقط" });
    return;
  }
  next();
}

export function requireTeacherOrAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser | undefined;
  if (user?.role !== "admin" && user?.role !== "teacher") {
    res.status(403).json({ error: "غير مصرح بهذه العملية" });
    return;
  }
  next();
}
