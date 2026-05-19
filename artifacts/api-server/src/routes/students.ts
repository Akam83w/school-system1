import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, classesTable } from "@workspace/db";
import { eq, ilike, and, or, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

async function getNextCode() {
  const all = await db.select({ code: studentsTable.studentCode }).from(studentsTable);
  const nums = all.map(s => parseInt(s.code.replace("STU", ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 1000;
  return `STU${max + 1}`;
}

// GET /students — filtered by role:
//   admin  → all students (with optional classId / search filters)
//   teacher → only students in classes assigned to the teacher
//   student → only own profile
router.get("/students", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { classId, search } = req.query;
  const conditions: ReturnType<typeof eq>[] = [];

  if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    conditions.push(eq(studentsTable.id, user.linkedId));
  } else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const teacherClasses = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.teacherId, user.linkedId));
    const classIds = teacherClasses.map(c => c.id);
    if (classIds.length === 0) { res.json([]); return; }
    if (classId && classIds.includes(Number(classId))) {
      conditions.push(eq(studentsTable.classId, Number(classId)));
    } else if (classId) {
      res.json([]); return;
    } else {
      conditions.push(inArray(studentsTable.classId, classIds));
    }
  } else {
    if (classId) conditions.push(eq(studentsTable.classId, Number(classId)));
  }

  if (search && user.role !== "student") {
    conditions.push(
      or(
        ilike(studentsTable.fullName, `%${search}%`),
        ilike(studentsTable.studentCode, `%${search}%`),
      )!
    );
  }

  const rows = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      nationalId: studentsTable.nationalId,
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
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(r => ({ ...r, className: r.className ?? "" })));
});

// POST /students — admin only
router.post("/students", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { fullName, nationalId, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body;

  if (nationalId) {
    const [exists] = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.nationalId, String(nationalId).trim())).limit(1);
    if (exists) {
      res.status(409).json({ error: "الرقم الوطني مستخدم بالفعل لطالب آخر" });
      return;
    }
  }

  const studentCode = await getNextCode();
  const [row] = await db.insert(studentsTable).values({
    studentCode,
    fullName,
    nationalId: nationalId ? String(nationalId).trim() : null,
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
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "student", entityId: row.id, afterData: { ...row, className: cls?.name } });
  res.status(201).json({ ...row, className: cls?.name ?? "" });
});

// GET /students/:id — filtered by role
router.get("/students/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const targetId = Number(req.params.id);

  if (user.role === "student" && user.linkedId !== targetId) {
    res.status(403).json({ error: "يمكنك الاطلاع على ملفك الشخصي فقط" });
    return;
  }

  if (user.role === "teacher") {
    if (!user.linkedId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const [student] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, targetId));
    if (!student) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
    if (student.classId != null) {
      const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(
        and(eq(classesTable.id, student.classId), eq(classesTable.teacherId, user.linkedId))
      );
      if (!cls) { res.status(403).json({ error: "غير مصرح: الطالب ليس في صفوفك" }); return; }
    }
  }

  const [row] = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      nationalId: studentsTable.nationalId,
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
    .where(eq(studentsTable.id, targetId));
  if (!row) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  res.json({ ...row, className: row.className ?? "" });
});

// PATCH /students/:id — admin only
router.patch("/students/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(studentsTable).where(eq(studentsTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "الطالب غير موجود" }); return; }

  const { fullName, nationalId, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body;

  if (nationalId && nationalId !== before.nationalId) {
    const [exists] = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.nationalId, String(nationalId).trim())).limit(1);
    if (exists) {
      res.status(409).json({ error: "الرقم الوطني مستخدم بالفعل لطالب آخر" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (nationalId !== undefined) updates.nationalId = nationalId ? String(nationalId).trim() : null;
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
