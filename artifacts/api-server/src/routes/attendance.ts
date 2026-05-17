import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, studentsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/attendance", async (req, res) => {
  const { classId, studentId, date } = req.query;
  const conditions: any[] = [];
  if (classId) conditions.push(eq(attendanceTable.classId, Number(classId)));
  if (studentId) conditions.push(eq(attendanceTable.studentId, Number(studentId)));
  if (date) conditions.push(eq(attendanceTable.date, String(date)));

  const rows = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      studentName: studentsTable.fullName,
      classId: attendanceTable.classId,
      className: classesTable.name,
      date: attendanceTable.date,
      status: attendanceTable.status,
      notes: attendanceTable.notes,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(attendanceTable.classId, classesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(r => ({ ...r, studentName: r.studentName ?? "", className: r.className ?? "" })));
});

router.post("/attendance", async (req, res) => {
  const { studentId, classId, date, status, notes } = req.body;
  const [row] = await db.insert(attendanceTable).values({
    studentId: Number(studentId),
    classId: Number(classId),
    date,
    status,
    notes: notes ?? null,
  }).returning();
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  res.status(201).json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "" });
});

router.patch("/attendance/:id", async (req, res) => {
  const { status, notes } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(attendanceTable).set(updates).where(eq(attendanceTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  res.json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "" });
});

export default router;
