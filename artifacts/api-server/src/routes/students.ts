import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, classesTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

async function getNextCode() {
  const all = await db.select({ code: studentsTable.studentCode }).from(studentsTable);
  const nums = all.map(s => parseInt(s.code.replace("STU", ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 1000;
  return `STU${max + 1}`;
}

// GET /students — admin + teacher
router.get("/students", requireAuth, async (req, res) => {
  const { classId, search } = req.query;
  const rows = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      classId: studentsTable.classId,
      className: classesTable.name,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      enrollmentDate: studentsTable.enrollmentDate,
      phone: studentsTable.phone,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      address: studentsTable.address,
      status: studentsTable.status,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(
      and(
        classId ? eq(studentsTable.classId, Number(classId)) : undefined,
        search ? or(
          ilike(studentsTable.fullName, `%${search}%`),
          ilike(studentsTable.studentCode, `%${search}%`),
        ) : undefined,
      )
    );
  res.json(rows.map(r => ({ ...r, className: r.className ?? "" })));
});

// POST /students — admin only
router.post("/students", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { fullName, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body;
  const studentCode = await getNextCode();
  const [row] = await db.insert(studentsTable).values({
    studentCode,
    fullName,
    classId: classId ? Number(classId) : null,
    gender,
    dateOfBirth,
    enrollmentDate: new Date().toISOString().split("T")[0],
    phone: phone ?? null,
    parentName: parentName ?? null,
    parentPhone: parentPhone ?? null,
    address: address ?? null,
    status: status ?? "active",
  }).returning();
  const [cls] = row.classId != null
    ? await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId))
    : [];
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "student", entityId: row.id, afterData: row });
  res.status(201).json({ ...row, className: cls?.name ?? "" });
});

// GET /students/:id — admin + teacher
router.get("/students/:id", requireAuth, async (req, res) => {
  const [row] = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      classId: studentsTable.classId,
      className: classesTable.name,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      enrollmentDate: studentsTable.enrollmentDate,
      phone: studentsTable.phone,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      address: studentsTable.address,
      status: studentsTable.status,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(studentsTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  res.json({ ...row, className: row.className ?? "" });
});

// PATCH /students/:id — admin only
router.patch("/students/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  const { fullName, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body;
  const updates: any = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (classId !== undefined) updates.classId = Number(classId);
  if (gender !== undefined) updates.gender = gender;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
  if (phone !== undefined) updates.phone = phone;
  if (parentName !== undefined) updates.parentName = parentName;
  if (parentPhone !== undefined) updates.parentPhone = parentPhone;
  if (address !== undefined) updates.address = address;
  if (status !== undefined) updates.status = status;
  const [row] = await db.update(studentsTable).set(updates).where(eq(studentsTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  const [cls] = row.classId != null
    ? await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, row.classId))
    : [];
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "student", entityId: row.id, beforeData: before, afterData: row });
  res.json({ ...row, className: cls?.name ?? "" });
});

// DELETE /students/:id — admin only
router.delete("/students/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(req.params.id)));
  await db.delete(studentsTable).where(eq(studentsTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "student", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
