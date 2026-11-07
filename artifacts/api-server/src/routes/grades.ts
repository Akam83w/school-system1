import { Router } from "express";
import { db } from "@workspace/db";
import { gradesTable, studentsTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireTeacherOrAdmin, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function validReferences(studentId: number, subjectId: number, classId: number, schoolId: number) {
  const [student] = await db.select({ id: studentsTable.id, classId: studentsTable.classId }).from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId))).limit(1);
  const [subject] = await db.select({ id: subjectsTable.id, classId: subjectsTable.classId }).from(subjectsTable).where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.schoolId, schoolId))).limit(1);
  const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.schoolId, schoolId))).limit(1);
  return !!student && !!subject && !!cls && student.classId === classId && subject.classId === classId;
}
router.get("/grades", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { studentId, classId, subjectId, academicYear, examType } = req.query;
  const conditions: any[] = [eq(gradesTable.schoolId, user.schoolId!)];
  if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    conditions.push(eq(gradesTable.studentId, user.linkedId));
  } else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const ownClasses = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.teacherId, user.linkedId), eq(classesTable.schoolId, user.schoolId!)));
    const ids = ownClasses.map(x => x.id); if (!ids.length) { res.json([]); return; }
    conditions.push(inArray(gradesTable.classId, ids));
  }
  if (studentId && user.role !== "student") conditions.push(eq(gradesTable.studentId, Number(studentId)));
  if (classId) conditions.push(eq(gradesTable.classId, Number(classId)));
  if (subjectId) conditions.push(eq(gradesTable.subjectId, Number(subjectId)));
  if (academicYear) conditions.push(eq(gradesTable.academicYear, String(academicYear)));
  if (examType) conditions.push(eq(gradesTable.examType, String(examType)));
  const rows = await db.select({
    id: gradesTable.id, studentId: gradesTable.studentId, studentName: studentsTable.fullName,
    subjectId: gradesTable.subjectId, subjectName: subjectsTable.name, classId: gradesTable.classId,
    className: classesTable.name, score: gradesTable.score, maxScore: gradesTable.maxScore,
    examType: gradesTable.examType, examDate: gradesTable.examDate, academicYear: gradesTable.academicYear, notes: gradesTable.notes,
  }).from(gradesTable)
    .leftJoin(studentsTable, and(eq(gradesTable.studentId, studentsTable.id), eq(studentsTable.schoolId, user.schoolId!)))
    .leftJoin(subjectsTable, and(eq(gradesTable.subjectId, subjectsTable.id), eq(subjectsTable.schoolId, user.schoolId!)))
    .leftJoin(classesTable, and(eq(gradesTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!)))
    .where(and(...conditions));
  res.json(rows.map(r => ({ ...r, studentName: r.studentName ?? "", subjectName: r.subjectName ?? "", className: r.className ?? "", score: Number(r.score), maxScore: Number(r.maxScore) })));
});
router.post("/grades", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { studentId, subjectId, classId, score, maxScore, examType, examDate, academicYear, notes } = req.body ?? {};
  if (!(await validReferences(Number(studentId), Number(subjectId), Number(classId), user.schoolId!))) { res.status(400).json({ error: "الطالب والمادة والصف يجب أن يكونوا من مدرستك ومن الصف نفسه" }); return; }
  if (user.role === "teacher") {
    const [assigned] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, Number(classId)), eq(classesTable.teacherId, user.linkedId ?? -1), eq(classesTable.schoolId, user.schoolId!))).limit(1);
    if (!assigned) { res.status(403).json({ error: "لا يمكنك تسجيل درجات لصف غير مخصص لك" }); return; }
  }
  const [row] = await db.insert(gradesTable).values({ schoolId: user.schoolId!, studentId: Number(studentId), subjectId: Number(subjectId), classId: Number(classId), score: String(score), maxScore: String(maxScore ?? 100), examType, examDate, academicYear: academicYear ?? "2026-2027", notes: notes ?? null }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "grade", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.patch("/grades/:id", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(gradesTable).where(and(eq(gradesTable.id, id), eq(gradesTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الدرجة غير موجودة" }); return; }
  if (user.role === "teacher") {
    const [assigned] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, before.classId), eq(classesTable.teacherId, user.linkedId ?? -1), eq(classesTable.schoolId, user.schoolId!))).limit(1);
    if (!assigned) { res.status(403).json({ error: "يمكنك تعديل درجات صفوفك فقط" }); return; }
  }
  const updates: any = {};
  for (const key of ["examType", "examDate", "notes"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (req.body?.score !== undefined) updates.score = String(req.body.score);
  if (req.body?.maxScore !== undefined) updates.maxScore = String(req.body.maxScore);
  const [row] = await db.update(gradesTable).set(updates).where(and(eq(gradesTable.id, id), eq(gradesTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "grade", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/grades/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(gradesTable).where(and(eq(gradesTable.id, id), eq(gradesTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الدرجة غير موجودة" }); return; }
  await db.delete(gradesTable).where(and(eq(gradesTable.id, id), eq(gradesTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "grade", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
