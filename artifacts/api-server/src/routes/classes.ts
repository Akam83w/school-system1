import { Router } from "express";
import { db } from "@workspace/db";
import { classesTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /classes — filtered by role:
//   admin  → all classes
//   teacher → only classes assigned to the teacher (via linkedId → teacherId)
//   student → only own class (via linkedId → students.id → classId)
router.get("/classes", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  let whereCondition: ReturnType<typeof eq> | undefined;

  if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    whereCondition = eq(classesTable.teacherId, user.linkedId);
  } else if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    const [student] = await db
      .select({ classId: studentsTable.classId })
      .from(studentsTable)
      .where(eq(studentsTable.id, user.linkedId));
    if (!student?.classId) { res.json([]); return; }
    whereCondition = eq(classesTable.id, student.classId);
  }

  const rows = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      grade: classesTable.grade,
      teacherId: classesTable.teacherId,
      teacherName: teachersTable.fullName,
      capacity: classesTable.capacity,
      academicYear: classesTable.academicYear,
      room: classesTable.room,
    })
    .from(classesTable)
    .leftJoin(teachersTable, eq(classesTable.teacherId, teachersTable.id))
    .where(whereCondition);

  const result = await Promise.all(
    rows.map(async (row) => {
      const [cnt] = await db
        .select({ count: count() })
        .from(studentsTable)
        .where(eq(studentsTable.classId, row.id));
      return { ...row, teacherName: row.teacherName ?? "", studentCount: cnt?.count ?? 0 };
    })
  );
  res.json(result);
});

// POST /classes — admin only
router.post("/classes", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { name, grade, teacherId, capacity, academicYear, room } = req.body;
  const [row] = await db.insert(classesTable).values({
    name,
    grade,
    teacherId: Number(teacherId),
    capacity: Number(capacity),
    academicYear: academicYear ?? "2024-2025",
    room: room ?? null,
  }).returning();
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, row.teacherId));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "class", entityId: row.id, afterData: row });
  res.status(201).json({ ...row, teacherName: teacher?.fullName ?? "", studentCount: 0 });
});

// GET /classes/:id — role-aware access
router.get("/classes/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const classId = Number(req.params.id);

  // Teacher: only own class
  if (user.role === "teacher") {
    if (!user.linkedId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const [check] = await db.select({ id: classesTable.id }).from(classesTable).where(
      and(eq(classesTable.id, classId), eq(classesTable.teacherId, user.linkedId))
    );
    if (!check) { res.status(403).json({ error: "غير مصرح: هذا الصف ليس صفك المعيّن" }); return; }
  }
  // Student: only own class
  if (user.role === "student") {
    if (!user.linkedId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const [student] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, user.linkedId));
    if (student?.classId !== classId) { res.status(403).json({ error: "غير مصرح: لا يمكنك الاطلاع على بيانات هذا الصف" }); return; }
  }

  const [row] = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      grade: classesTable.grade,
      teacherId: classesTable.teacherId,
      teacherName: teachersTable.fullName,
      capacity: classesTable.capacity,
      academicYear: classesTable.academicYear,
      room: classesTable.room,
    })
    .from(classesTable)
    .leftJoin(teachersTable, eq(classesTable.teacherId, teachersTable.id))
    .where(eq(classesTable.id, classId));
  if (!row) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const [cnt] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.classId, row.id));
  res.json({ ...row, teacherName: row.teacherName ?? "", studentCount: cnt?.count ?? 0 });
});

// PATCH /classes/:id — admin only
router.patch("/classes/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(classesTable).where(eq(classesTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const { name, grade, teacherId, capacity, academicYear, room } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (grade !== undefined) updates.grade = grade;
  if (teacherId !== undefined) updates.teacherId = Number(teacherId);
  if (capacity !== undefined) updates.capacity = Number(capacity);
  if (academicYear !== undefined) updates.academicYear = academicYear;
  if (room !== undefined) updates.room = room;
  const [row] = await db.update(classesTable).set(updates).where(eq(classesTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, row.teacherId));
  const [cnt] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.classId, row.id));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "class", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, teacherName: teacher?.fullName ?? "", studentCount: cnt?.count ?? 0 });
});

// DELETE /classes/:id — admin only
router.delete("/classes/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(classesTable).where(eq(classesTable.id, Number(req.params.id)));
  await db.delete(classesTable).where(eq(classesTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "class", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
