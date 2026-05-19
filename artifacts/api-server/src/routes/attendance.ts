import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, studentsTable, classesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireTeacherOrAdmin, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /attendance — filtered by role:
//   admin  → all records
//   teacher → only records for classes assigned to the teacher (via linkedId → teacherId)
//   student → only own attendance records (via linkedId → studentId)
router.get("/attendance", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { classId, studentId, date, academicYear } = req.query;
  const conditions: ReturnType<typeof eq>[] = [];

  if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    conditions.push(eq(attendanceTable.studentId, user.linkedId));
  } else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const teacherClasses = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.teacherId, user.linkedId));
    const classIds = teacherClasses.map(c => c.id);
    if (classIds.length === 0) { res.json([]); return; }
    conditions.push(inArray(attendanceTable.classId, classIds));
  }

  // Apply optional query filters
  if (classId) conditions.push(eq(attendanceTable.classId, Number(classId)));
  if (studentId && user.role !== "student") conditions.push(eq(attendanceTable.studentId, Number(studentId)));
  if (date) conditions.push(eq(attendanceTable.date, String(date)));
  if (academicYear) conditions.push(eq(attendanceTable.academicYear, String(academicYear)));

  const rows = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      studentName: studentsTable.fullName,
      classId: attendanceTable.classId,
      className: classesTable.name,
      date: attendanceTable.date,
      status: attendanceTable.status,
      academicYear: attendanceTable.academicYear,
      notes: attendanceTable.notes,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(attendanceTable.classId, classesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(r => ({
    ...r,
    studentName: r.studentName ?? "",
    className: r.className ?? "",
    academicYear: r.academicYear ?? "2024-2025",
  })));
});

// POST /attendance — teacher + admin; students cannot submit attendance
router.post("/attendance", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { studentId, classId, date, status, academicYear, notes } = req.body;

  const [existing] = await db
    .select({ id: attendanceTable.id })
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.studentId, Number(studentId)),
        eq(attendanceTable.date, String(date)),
        eq(attendanceTable.academicYear, String(academicYear ?? "2024-2025"))
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "تم تسجيل حضور هذا الطالب في هذا اليوم بالفعل لهذا العام الدراسي" });
    return;
  }

  const [row] = await db.insert(attendanceTable).values({
    studentId: Number(studentId),
    classId: Number(classId),
    date,
    status,
    academicYear: academicYear ?? "2024-2025",
    notes: notes ?? null,
  }).returning();
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "attendance", entityId: row.id, afterData: { ...row, studentName: student?.fullName } });
  res.status(201).json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "", academicYear: row.academicYear });
});

// PATCH /attendance/:id — admin only (corrections, always audited)
router.patch("/attendance/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  const { status, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(attendanceTable).set(updates).where(eq(attendanceTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "attendance", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "", academicYear: row.academicYear });
});

// DELETE /attendance/:id — admin only
router.delete("/attendance/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id)));
  await db.delete(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "attendance", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
