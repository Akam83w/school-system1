import { Router } from "express";
import { db } from "@workspace/db";
import { classesTable, teachersTable, studentsTable, schoolsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function getSchoolStage(schoolId: number): Promise<string | null> {
  const [school] = await db.select({ schoolType: schoolsTable.schoolType }).from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1);
  if (school?.schoolType === "primary") return "ابتدائي";
  if (school?.schoolType === "intermediate") return "متوسط";
  if (school?.schoolType === "preparatory") return "إعدادي";
  return null;
}
async function teacherBelongsToSchool(teacherId: number, schoolId: number) {
  const [t] = await db.select({ id: teachersTable.id }).from(teachersTable).where(and(eq(teachersTable.id, teacherId), eq(teachersTable.schoolId, schoolId))).limit(1);
  return !!t;
}
router.get("/classes", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const filters = [eq(classesTable.schoolId, user.schoolId!)];
  const schoolStage = await getSchoolStage(user.schoolId!);
  if (schoolStage) filters.push(eq(classesTable.grade, schoolStage));
  if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    filters.push(eq(classesTable.teacherId, user.linkedId));
  } else if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    const [student] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(and(eq(studentsTable.id, user.linkedId), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
    if (!student?.classId) { res.json([]); return; }
    filters.push(eq(classesTable.id, student.classId));
  }
  const rows = await db.select({ id: classesTable.id, name: classesTable.name, grade: classesTable.grade, teacherId: classesTable.teacherId, teacherName: teachersTable.fullName, capacity: classesTable.capacity, academicYear: classesTable.academicYear, room: classesTable.room })
    .from(classesTable).leftJoin(teachersTable, and(eq(classesTable.teacherId, teachersTable.id), eq(teachersTable.schoolId, user.schoolId!))).where(and(...filters));
  const result = await Promise.all(rows.map(async row => {
    const [cnt] = await db.select({ count: count() }).from(studentsTable).where(and(eq(studentsTable.classId, row.id), eq(studentsTable.schoolId, user.schoolId!)));
    return { ...row, teacherName: row.teacherName ?? "", studentCount: cnt?.count ?? 0 };
  }));
  res.json(result);
});
router.post("/classes", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { name, grade, teacherId, capacity, academicYear, room } = req.body ?? {};
  const schoolStage = await getSchoolStage(user.schoolId!);
  if (!name || !grade || (schoolStage && grade !== schoolStage) || !Number.isInteger(Number(teacherId)) || !(await teacherBelongsToSchool(Number(teacherId), user.schoolId!))) {
    res.status(400).json({ error: "بيانات الصف أو المعلم غير صحيحة، ويجب أن يكون المعلم من مدرستك" }); return;
  }
  const [row] = await db.insert(classesTable).values({ schoolId: user.schoolId!, name, grade, teacherId: Number(teacherId), capacity: Number(capacity ?? 40), academicYear: academicYear ?? "2026-2027", room: room ?? null }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "class", entityId: row.id, afterData: row });
  res.status(201).json({ ...row, studentCount: 0 });
});
router.get("/classes/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const filters = [eq(classesTable.id, id), eq(classesTable.schoolId, user.schoolId!)];
  const schoolStage = await getSchoolStage(user.schoolId!);
  if (schoolStage) filters.push(eq(classesTable.grade, schoolStage));
  if (user.role === "teacher") filters.push(eq(classesTable.teacherId, user.linkedId ?? -1));
  if (user.role === "student") {
    const [student] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(and(eq(studentsTable.id, user.linkedId ?? -1), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
    if (student?.classId !== id) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  }
  const [row] = await db.select({ id: classesTable.id, name: classesTable.name, grade: classesTable.grade, teacherId: classesTable.teacherId, teacherName: teachersTable.fullName, capacity: classesTable.capacity, academicYear: classesTable.academicYear, room: classesTable.room }).from(classesTable).leftJoin(teachersTable, and(eq(classesTable.teacherId, teachersTable.id), eq(teachersTable.schoolId, user.schoolId!))).where(and(...filters)).limit(1);
  if (!row) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const [cnt] = await db.select({ count: count() }).from(studentsTable).where(and(eq(studentsTable.classId, id), eq(studentsTable.schoolId, user.schoolId!)));
  res.json({ ...row, teacherName: row.teacherName ?? "", studentCount: cnt?.count ?? 0 });
});
router.patch("/classes/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(classesTable).where(and(eq(classesTable.id, id), eq(classesTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const { name, grade, teacherId, capacity, academicYear, room } = req.body ?? {};
  const schoolStage = await getSchoolStage(user.schoolId!);
  if (grade !== undefined && schoolStage && grade !== schoolStage) { res.status(400).json({ error: "لا يمكن إضافة صف خارج مرحلة مدرستك" }); return; }
  if (teacherId !== undefined && !(await teacherBelongsToSchool(Number(teacherId), user.schoolId!))) { res.status(400).json({ error: "المعلم يجب أن يكون من المدرسة نفسها" }); return; }
  const updates: any = {};
  for (const key of ["name", "grade", "capacity", "academicYear", "room"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (teacherId !== undefined) updates.teacherId = Number(teacherId);
  const [row] = await db.update(classesTable).set(updates).where(and(eq(classesTable.id, id), eq(classesTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "class", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/classes/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(classesTable).where(and(eq(classesTable.id, id), eq(classesTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  await db.delete(classesTable).where(and(eq(classesTable.id, id), eq(classesTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "class", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
