import { Router } from "express";
import { db } from "@workspace/db";
import { subjectsTable, teachersTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /subjects — all authenticated roles
router.get("/subjects", requireAuth, async (req, res) => {
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

// POST /subjects — admin only
router.post("/subjects", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
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
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "subject", entityId: row.id, afterData: row });
  res.status(201).json({ ...row, teacherName: teacher?.fullName ?? "", className: cls?.name ?? "" });
});

// PATCH /subjects/:id — admin only
router.patch("/subjects/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "المادة غير موجودة" }); return; }
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
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "subject", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, teacherName: teacher?.fullName ?? "", className: cls?.name ?? "" });
});

// DELETE /subjects/:id — admin only
router.delete("/subjects/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, Number(req.params.id)));
  await db.delete(subjectsTable).where(eq(subjectsTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "subject", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
