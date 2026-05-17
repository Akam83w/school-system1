import { Router } from "express";
import { db } from "@workspace/db";
import { classesTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/classes", async (req, res) => {
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
    .leftJoin(teachersTable, eq(classesTable.teacherId, teachersTable.id));

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

router.post("/classes", async (req, res) => {
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
  res.status(201).json({ ...row, teacherName: teacher?.fullName ?? "", studentCount: 0 });
});

router.get("/classes/:id", async (req, res) => {
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
    .where(eq(classesTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "الصف غير موجود" }); return; }
  const [cnt] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.classId, row.id));
  res.json({ ...row, teacherName: row.teacherName ?? "", studentCount: cnt?.count ?? 0 });
});

router.patch("/classes/:id", async (req, res) => {
  const { name, grade, teacherId, capacity, academicYear, room } = req.body;
  const updates: any = {};
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
  res.json({ ...row, teacherName: teacher?.fullName ?? "", studentCount: cnt?.count ?? 0 });
});

router.delete("/classes/:id", async (req, res) => {
  await db.delete(classesTable).where(eq(classesTable.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;
