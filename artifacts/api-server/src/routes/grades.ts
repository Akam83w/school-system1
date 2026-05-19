import { Router } from "express";
import { db } from "@workspace/db";
import { gradesTable, studentsTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireTeacherOrAdmin, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /grades — filtered by role:
//   admin  → all grades
//   teacher → only grades in classes assigned to the teacher (via linkedId → teacherId)
//   student → only own grades (via linkedId → studentId)
router.get("/grades", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { studentId, classId, subjectId, academicYear, examType } = req.query;
  const conditions: ReturnType<typeof eq>[] = [];

  if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    conditions.push(eq(gradesTable.studentId, user.linkedId));
  } else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const teacherClasses = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.teacherId, user.linkedId));
    const classIds = teacherClasses.map(c => c.id);
    if (classIds.length === 0) { res.json([]); return; }
    conditions.push(inArray(gradesTable.classId, classIds));
  }

  // Apply optional query filters
  if (studentId && user.role !== "student") conditions.push(eq(gradesTable.studentId, Number(studentId)));
  if (classId) conditions.push(eq(gradesTable.classId, Number(classId)));
  if (subjectId) conditions.push(eq(gradesTable.subjectId, Number(subjectId)));
  if (academicYear) conditions.push(eq(gradesTable.academicYear, String(academicYear)));
  if (examType) conditions.push(eq(gradesTable.examType, String(examType)));

  const rows = await db
    .select({
      id: gradesTable.id,
      studentId: gradesTable.studentId,
      studentName: studentsTable.fullName,
      subjectId: gradesTable.subjectId,
      subjectName: subjectsTable.name,
      classId: gradesTable.classId,
      className: classesTable.name,
      score: gradesTable.score,
      maxScore: gradesTable.maxScore,
      examType: gradesTable.examType,
      examDate: gradesTable.examDate,
      academicYear: gradesTable.academicYear,
      notes: gradesTable.notes,
    })
    .from(gradesTable)
    .leftJoin(studentsTable, eq(gradesTable.studentId, studentsTable.id))
    .leftJoin(subjectsTable, eq(gradesTable.subjectId, subjectsTable.id))
    .leftJoin(classesTable, eq(gradesTable.classId, classesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(r => ({
    ...r,
    studentName: r.studentName ?? "",
    subjectName: r.subjectName ?? "",
    className: r.className ?? "",
    score: Number(r.score),
    maxScore: Number(r.maxScore),
    academicYear: r.academicYear ?? "2024-2025",
  })));
});

// POST /grades — teacher + admin; students cannot submit grades
router.post("/grades", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { studentId, subjectId, classId, score, maxScore, examType, examDate, academicYear, notes } = req.body;
  const [row] = await db.insert(gradesTable).values({
    studentId: Number(studentId),
    subjectId: Number(subjectId),
    classId: Number(classId),
    score: String(score),
    maxScore: String(maxScore ?? 100),
    examType,
    examDate,
    academicYear: academicYear ?? "2024-2025",
    notes: notes ?? null,
  }).returning();
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [subject] = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, row.subjectId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "grade", entityId: row.id, afterData: { ...row, studentName: student?.fullName, subjectName: subject?.name } });
  res.status(201).json({ ...row, studentName: student?.fullName ?? "", subjectName: subject?.name ?? "", className: cls?.name ?? "", score: Number(row.score), maxScore: Number(row.maxScore) });
});

// PATCH /grades/:id — admin only (corrections; logged)
router.patch("/grades/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(gradesTable).where(eq(gradesTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "الدرجة غير موجودة" }); return; }
  const { score, maxScore, examType, examDate, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (score !== undefined) updates.score = String(score);
  if (maxScore !== undefined) updates.maxScore = String(maxScore);
  if (examType !== undefined) updates.examType = examType;
  if (examDate !== undefined) updates.examDate = examDate;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(gradesTable).set(updates).where(eq(gradesTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "الدرجة غير موجودة" }); return; }
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [subject] = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, row.subjectId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "grade", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, studentName: student?.fullName ?? "", subjectName: subject?.name ?? "", className: cls?.name ?? "", score: Number(row.score), maxScore: Number(row.maxScore) });
});

// DELETE /grades/:id — admin only
router.delete("/grades/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(gradesTable).where(eq(gradesTable.id, Number(req.params.id)));
  await db.delete(gradesTable).where(eq(gradesTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "grade", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
