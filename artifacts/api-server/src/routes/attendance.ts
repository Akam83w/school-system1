import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, studentsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTeacherOrAdmin, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /attendance — all authenticated roles
router.get("/attendance", requireAuth, async (req, res) => {
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

// POST /attendance — teacher + admin
router.post("/attendance", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
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
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "attendance", entityId: row.id, afterData: { ...row, studentName: student?.fullName } });
  res.status(201).json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "" });
});

// PATCH /attendance/:id — teacher + admin
router.patch("/attendance/:id", requireAuth, requireTeacherOrAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  const { status, notes } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(attendanceTable).set(updates).where(eq(attendanceTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "السجل غير موجود" }); return; }
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, row.studentId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "attendance", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, studentName: student?.fullName ?? "", className: cls?.name ?? "" });
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
