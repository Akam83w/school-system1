import { Request, Response, NextFunction } from "express";
import { db, adminsTable, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "../routes/auth";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  linkedId: number | null;
  schoolId: number | null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) { res.status(401).json({ error: "غير مصرح: سجل الدخول أولاً" }); return; }
    const decoded = verifyToken(authorization.slice(7));
    if (!decoded?.adminId) { res.status(401).json({ error: "انتهت الجلسة أو رمز الدخول غير صالح" }); return; }
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, Number(decoded.adminId))).limit(1);
    if (!admin) { res.status(401).json({ error: "الحساب غير موجود أو تم تعطيله" }); return; }
    if (admin.role !== "super_admin" && !admin.schoolId) {
      res.status(403).json({ error: "الحساب غير مرتبط بمدرسة؛ تم إيقاف الوصول لحماية البيانات" }); return;
    }
    (req as any).user = {
      id: admin.id, name: admin.name, phone: admin.phone ?? "",
      role: admin.role, linkedId: admin.linkedId ?? null, schoolId: admin.schoolId ?? null,
    } satisfies AuthUser;
    next();
  } catch (error) { next(error); }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthUser | undefined;
  if (!user || user.role !== "admin" || !user.schoolId) {
    res.status(403).json({ error: "هذه الصفحة للمدير فقط" }); return;
  }
  next();
}
export function requireTeacherOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthUser | undefined;
  if (!user || !["teacher", "admin"].includes(user.role) || !user.schoolId) {
    res.status(403).json({ error: "ليس لديك صلاحية الوصول" }); return;
  }
  next();
}
