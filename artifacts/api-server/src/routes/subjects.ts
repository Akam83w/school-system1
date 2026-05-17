import { Router } from "express";
import { db } from "@workspace/db";
import { subjectsTable, teachersTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/subjects", async (req, res) => {
  const rows = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      teacherId: subjectsTable.teacherId,
      teacherName: teachersTable.fullName,
      classId: subjectsTable.classId,
      className: classesTable.name,
      weeklyHours: subjectsTable.weeklyHours,
      description: subjectsTable.description,
    })
    .from(subjectsTable)
    .leftJoin(teachersTable, eq(subjectsTable.teacherId, teachersTable.id))
    .leftJoin(classesTable, eq(subjectsTable.classId, classesTable.id));
  res.json(rows.map(r => ({ ...r, teacherName: r.teacherName ?? "", className: r.className ?? "" })));
});

router.post("/subjects", async (req, res) => {
  const { name, teacherId, classId, weeklyHours, description } = req.body;
  const [row] = await db.insert(subjectsTable).values({
    name,
    teacherId: Number(teacherId),
    classId: Number(classId),
    weeklyHours: Number(weeklyHours),
    description: description ?? null,
  }).returning();
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, row.teacherId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  res.status(201).json({ ...row, teacherName: teacher?.fullName ?? "", className: cls?.name ?? "" });
});

router.patch("/subjects/:id", async (req, res) => {
  const { name, teacherId, classId, weeklyHours, description } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (teacherId !== undefined) updates.teacherId = Number(teacherId);
  if (classId !== undefined) updates.classId = Number(classId);
  if (weeklyHours !== undefined) updates.weeklyHours = Number(weeklyHours);
  if (description !== undefined) updates.description = description;
  const [row] = await db.update(subjectsTable).set(updates).where(eq(subjectsTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "المادة غير موجودة" }); return; }
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, row.teacherId));
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId));
  res.json({ ...row, teacherName: teacher?.fullName ?? "", className: cls?.name ?? "" });
});

router.delete("/subjects/:id", async (req, res) => {
  await db.delete(subjectsTable).where(eq(subjectsTable.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;
