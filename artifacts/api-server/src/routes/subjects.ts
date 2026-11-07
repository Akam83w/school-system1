import { Router } from "express";
import { db } from "@workspace/db";
import { subjectsTable, teachersTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function referencesBelongToSchool(teacherId: number, classId: number, schoolId: number) {
  const [teacher] = await db.select({ id: teachersTable.id }).from(teachersTable).where(and(eq(teachersTable.id, teacherId), eq(teachersTable.schoolId, schoolId))).limit(1);
  const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.schoolId, schoolId))).limit(1);
  return !!teacher && !!cls;
}
router.get("/subjects", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select({ id: subjectsTable.id, name: subjectsTable.name, teacherId: subjectsTable.teacherId, teacherName: teachersTable.fullName, classId: subjectsTable.classId, className: classesTable.name, weeklyHours: subjectsTable.weeklyHours, description: subjectsTable.description })
    .from(subjectsTable)
    .leftJoin(teachersTable, and(eq(subjectsTable.teacherId, teachersTable.id), eq(teachersTable.schoolId, user.schoolId!)))
    .leftJoin(classesTable, and(eq(subjectsTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!)))
    .where(user.role === "teacher"
      ? and(eq(subjectsTable.schoolId, user.schoolId!), eq(subjectsTable.teacherId, user.linkedId ?? -1))
      : eq(subjectsTable.schoolId, user.schoolId!));
  res.json(rows.map(r => ({ ...r, teacherName: r.teacherName ?? "", className: r.className ?? "" })));
});
router.post("/subjects", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { name, teacherId, classId, weeklyHours, description } = req.body ?? {};
  if (!name || !(await referencesBelongToSchool(Number(teacherId), Number(classId), user.schoolId!))) {
    res.status(400).json({ error: "المعلم والصف يجب أن يكونا من مدرستك" }); return;
  }
  const [row] = await db.insert(subjectsTable).values({ schoolId: user.schoolId!, name, teacherId: Number(teacherId), classId: Number(classId), weeklyHours: Number(weeklyHours ?? 1), description: description ?? null }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "subject", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.patch("/subjects/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "المادة غير موجودة" }); return; }
  const teacherId = req.body.teacherId !== undefined ? Number(req.body.teacherId) : before.teacherId;
  const classId = req.body.classId !== undefined ? Number(req.body.classId) : before.classId;
  if (!(await referencesBelongToSchool(teacherId, classId, user.schoolId!))) { res.status(400).json({ error: "المعلم والصف يجب أن يكونا من مدرستك" }); return; }
  const updates: any = {};
  for (const key of ["name", "weeklyHours", "description"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (req.body.teacherId !== undefined) updates.teacherId = teacherId;
  if (req.body.classId !== undefined) updates.classId = classId;
  const [row] = await db.update(subjectsTable).set(updates).where(and(eq(subjectsTable.id, id), eq(subjectsTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "subject", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/subjects/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "المادة غير موجودة" }); return; }
  await db.delete(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "subject", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
