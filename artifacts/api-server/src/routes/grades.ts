import { Router } from "express";
import { db } from "@workspace/db";
import { gradesTable, studentsTable, subjectsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/grades", async (req, res) => {
  const { studentId, classId, subjectId } = req.query;
  const conditions: any[] = [];
  if (studentId) conditions.push(eq(gradesTable.studentId, Number(studentId)));
  if (classId) conditions.push(eq(gradesTable.classId, Number(classId)));
  if (subjectId) conditions.push(eq(gradesTable.subjectId, Number(subjectId)));

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
  })));
});

router.post("/grades", async (req, res) => {
  const { studentId, subjectId, classId, score, maxScore, examType, examDate, notes } = req.body;
  const [row] = await db.insert(gradesTable).values({
    studentId: Number(studentId),
    subjectId: Number(subjectId),
    classId: Number(classId),
    score: String(score),
    maxScore: String(maxScore ?? 100),
    examType,
    examDate,
    notes: notes ?? null,
  }).returning();
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [subject] = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, row.subjectId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  res.status(201).json({ ...row, studentName: student?.fullName ?? "", subjectName: subject?.name ?? "", className: cls?.name ?? "", score: Number(row.score), maxScore: Number(row.maxScore) });
});

router.patch("/grades/:id", async (req, res) => {
  const { score, maxScore, examType, examDate, notes } = req.body;
  const updates: any = {};
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
  res.json({ ...row, studentName: student?.fullName ?? "", subjectName: subject?.name ?? "", className: cls?.name ?? "", score: Number(row.score), maxScore: Number(row.maxScore) });
});

router.delete("/grades/:id", async (req, res) => {
  await db.delete(gradesTable).where(eq(gradesTable.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;
