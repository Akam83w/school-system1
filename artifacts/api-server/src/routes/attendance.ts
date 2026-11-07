import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, studentsTable, classesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireTeacherOrAdmin, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function validAttendanceRefs(studentId: number, classId: number, schoolId: number) {
  const [student] = await db.select({ id: studentsTable.id, classId: studentsTable.classId }).from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId))).limit(1);
  const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.schoolId, schoolId))).limit(1);
  return !!student && !!cls && student.classId === classId;
}
router.get("/attendance", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser; const { classId, studentId, date, academicYear } = req.query;
  const conditions: any[] = [eq(attendanceTable.schoolId, user.schoolId!)];
  if (user.role === "student") { if (!user.linkedId) { res.json([]); return; } conditions.push(eq(attendanceTable.studentId, user.linkedId)); }
  else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const own = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.teacherId, user.linkedId), eq(classesTable.schoolId, user.schoolId!)));
    const ids = own.map(x => x.id); if (!ids.length) { res.json([]); return; } conditions.push(inArray(attendanceTable.classId, ids));
  }
  if (classId) conditions.push(eq(attendanceTable.classId, Number(classId)));
  if (studentId && user.role !== "student") conditions.push(eq(attendanceTable.studentId, Number(studentId)));
  if (date) conditions.push(eq(attendanceTable.date, String(date)));
  if (academicYear) conditions.push(eq(attendanceTable.academicYear, String(academicYear)));
  const rows = await db.select({ id: attendanceTable.id, studentId: attendanceTable.studentId, studentName: studentsTable.fullName, classId: attendanceTable.classId, className: classesTable.name, date: attendanceTable.date, status: attendanceTable.status, academicYear: attendanceTable.academicYear, notes: attendanceTable.notes })
    .from(attendanceTable)
    .leftJoin(studentsTable, and(eq(attendanceTable.studentId, studentsTable.id), eq(studentsTable.schoolId, user.schoolId!)))
    .leftJoin(classesTable, and(eq(attendanceTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!)))
    .where(and(...conditions));
  res.json(rows.map(r => ({ ...r, studentName: r.studentName ?? "", className: r.className ?? "" })));
});
router.post("/attendance", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const { studentId, classId, date, status, academicYear, notes } = req.body ?? {};
  if (!(await validAttendanceRefs(Number(studentId), Number(classId), user.schoolId!))) { res.status(400).json({ error: "الطالب والصف يجب أن يكونا من مدرستك ومن الصف نفسه" }); return; }
  if (user.role === "teacher") {
    const [assigned] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, Number(classId)), eq(classesTable.teacherId, user.linkedId ?? -1), eq(classesTable.schoolId, user.schoolId!))).limit(1);
    if (!assigned) { res.status(403).json({ error: "لا يمكنك تسجيل حضور صف غير مخصص لك" }); return; }
  }
  const year = String(academicYear ?? "2026-2027");
  const [existing] = await db.select({ id: attendanceTable.id }).from(attendanceTable).where(and(eq(attendanceTable.schoolId, user.schoolId!), eq(attendanceTable.studentId, Number(studentId)), eq(attendanceTable.date, String(date)), eq(attendanceTable.academicYear, year))).limit(1);
  if (existing) { res.status(409).json({ error: "تم تسجيل حضور هذا الطالب في هذا اليوم بالفعل لهذا العام الدراسي" }); return; }
  const [row] = await db.insert(attendanceTable).values({ schoolId: user.schoolId!, studentId: Number(studentId), classId: Number(classId), date: String(date), status, academicYear: year, notes: notes ?? null }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "attendance", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.patch("/attendance/:id", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(attendanceTable).where(and(eq(attendanceTable.id, id), eq(attendanceTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  if (user.role === "teacher") {
    const [assigned] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, before.classId), eq(classesTable.teacherId, user.linkedId ?? -1), eq(classesTable.schoolId, user.schoolId!))).limit(1);
    if (!assigned) { res.status(403).json({ error: "يمكنك تعديل حضور صفوفك فقط" }); return; }
  }
  const updates: any = {}; if (req.body?.status !== undefined) updates.status = req.body.status; if (req.body?.notes !== undefined) updates.notes = req.body.notes;
  const [row] = await db.update(attendanceTable).set(updates).where(and(eq(attendanceTable.id, id), eq(attendanceTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "attendance", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/attendance/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(attendanceTable).where(and(eq(attendanceTable.id, id), eq(attendanceTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  await db.delete(attendanceTable).where(and(eq(attendanceTable.id, id), eq(attendanceTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "attendance", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
