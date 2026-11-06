import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, classesTable } from "@workspace/db";
import { eq, ilike, and, or, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function getNextCode(schoolId: number) {
  const all = await db.select({ code: studentsTable.studentCode }).from(studentsTable).where(eq(studentsTable.schoolId, schoolId));
  const nums = all.map(s => parseInt(s.code.replace("STU", ""))).filter(n => !isNaN(n));
  return `STU${(nums.length ? Math.max(...nums) : 1000) + 1}`;
}
async function classBelongsToSchool(classId: number | null, schoolId: number) {
  if (classId == null) return true;
  const [row] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, classId), eq(classesTable.schoolId, schoolId))).limit(1);
  return !!row;
}
router.get("/students", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { classId, search } = req.query;
  const conditions: any[] = [eq(studentsTable.schoolId, user.schoolId!)];
  if (user.role === "student") {
    if (!user.linkedId) { res.json([]); return; }
    conditions.push(eq(studentsTable.id, user.linkedId));
  } else if (user.role === "teacher") {
    if (!user.linkedId) { res.json([]); return; }
    const teacherClasses = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.teacherId, user.linkedId), eq(classesTable.schoolId, user.schoolId!)));
    const ids = teacherClasses.map(c => c.id);
    if (!ids.length) { res.json([]); return; }
    if (classId && ids.includes(Number(classId))) conditions.push(eq(studentsTable.classId, Number(classId)));
    else if (classId) { res.json([]); return; }
    else conditions.push(inArray(studentsTable.classId, ids));
  } else if (classId) conditions.push(eq(studentsTable.classId, Number(classId)));
  if (search && user.role !== "student") conditions.push(or(ilike(studentsTable.fullName, `%${search}%`), ilike(studentsTable.studentCode, `%${search}%`))!);
  const rows = await db.select({
    id: studentsTable.id, fullName: studentsTable.fullName, studentCode: studentsTable.studentCode,
    nationalId: studentsTable.nationalId, classId: studentsTable.classId, className: classesTable.name,
    gender: studentsTable.gender, dateOfBirth: studentsTable.dateOfBirth, enrollmentDate: studentsTable.enrollmentDate,
    phone: studentsTable.phone, parentName: studentsTable.parentName, parentPhone: studentsTable.parentPhone,
    address: studentsTable.address, status: studentsTable.status,
  }).from(studentsTable).leftJoin(classesTable, and(eq(studentsTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!))).where(and(...conditions));
  res.json(rows.map(r => ({ ...r, className: r.className ?? "" })));
});
router.post("/students", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { fullName, nationalId, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body ?? {};
  if (!fullName) { res.status(400).json({ error: "اسم الطالب مطلوب" }); return; }
  const parsedClass = classId ? Number(classId) : null;
  if (!(await classBelongsToSchool(parsedClass, user.schoolId!))) { res.status(400).json({ error: "الصف المحدد لا يتبع مدرستك" }); return; }
  if (nationalId) {
    const [exists] = await db.select({ id: studentsTable.id }).from(studentsTable).where(and(eq(studentsTable.nationalId, String(nationalId).trim()), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
    if (exists) { res.status(409).json({ error: "الرقم الوطني مستخدم بالفعل في مدرستك" }); return; }
  }
  const [row] = await db.insert(studentsTable).values({
    schoolId: user.schoolId!, studentCode: await getNextCode(user.schoolId!), fullName: String(fullName).trim(),
    nationalId: nationalId ? String(nationalId).trim() : null, classId: parsedClass,
    gender, dateOfBirth, enrollmentDate: new Date().toISOString().slice(0, 10),
    phone: phone ?? null, parentName: parentName ?? null, parentPhone: parentPhone ?? null,
    address: address ?? null, status: status ?? "active",
  }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "student", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.get("/students/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  if (user.role === "student" && user.linkedId !== id) { res.status(403).json({ error: "يمكنك الاطلاع على ملفك الشخصي فقط" }); return; }
  const [row] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
  if (!row) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  if (user.role === "teacher") {
    if (!user.linkedId || !row.classId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, row.classId), eq(classesTable.teacherId, user.linkedId), eq(classesTable.schoolId, user.schoolId!))).limit(1);
    if (!cls) { res.status(403).json({ error: "الطالب ليس في صفوفك" }); return; }
  }
  res.json(row);
});
router.patch("/students/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  const { fullName, nationalId, classId, gender, dateOfBirth, phone, parentName, parentPhone, address, status } = req.body ?? {};
  const parsedClass = classId === undefined ? before.classId : (classId ? Number(classId) : null);
  if (!(await classBelongsToSchool(parsedClass, user.schoolId!))) { res.status(400).json({ error: "الصف المحدد لا يتبع مدرستك" }); return; }
  if (nationalId && nationalId !== before.nationalId) {
    const [exists] = await db.select({ id: studentsTable.id }).from(studentsTable).where(and(eq(studentsTable.nationalId, String(nationalId).trim()), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
    if (exists) { res.status(409).json({ error: "الرقم الوطني مستخدم بالفعل في مدرستك" }); return; }
  }
  const updates: any = {};
  for (const key of ["fullName", "gender", "dateOfBirth", "phone", "parentName", "parentPhone", "address", "status"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (nationalId !== undefined) updates.nationalId = nationalId ? String(nationalId).trim() : null;
  if (classId !== undefined) updates.classId = parsedClass;
  const [row] = await db.update(studentsTable).set(updates).where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "student", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/students/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  await db.delete(studentsTable).where(and(eq(studentsTable.id, id), eq(studentsTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "student", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
