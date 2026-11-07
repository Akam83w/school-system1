import { Router } from "express";
import { db, schoolMessagesTable, schoolMessageVersionsTable, studentsTable, classesTable } from "@workspace/db";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function teacherOwnsClass(user: AuthUser, classId: number) {
  if (user.role !== "teacher" || !user.linkedId || !user.schoolId) return false;
  const [row] = await db.select({ id: classesTable.id }).from(classesTable).where(and(
    eq(classesTable.id, classId), eq(classesTable.teacherId, user.linkedId), eq(classesTable.schoolId, user.schoolId)
  )).limit(1);
  return !!row;
}
async function getStudentClass(studentId: number, schoolId: number) {
  const [row] = await db.select({ id: studentsTable.id, classId: studentsTable.classId }).from(studentsTable).where(and(
    eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)
  )).limit(1);
  return row;
}

router.get("/messages/mine", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  if (user.role !== "teacher" || !user.schoolId) return res.status(403).json({ error: "هذه القائمة للمعلم فقط" });
  const rows = await db.select().from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.schoolId, user.schoolId), eq(schoolMessagesTable.authorId, user.id)
  )).orderBy(desc(schoolMessagesTable.createdAt));
  res.json(rows);
});

router.post("/messages/public", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  if (!["admin", "teacher"].includes(user.role) || !user.schoolId) return res.status(403).json({ error: "ليس لديك صلاحية إرسال الإشعارات" });
  const { audience, classId, title, body, template } = req.body ?? {};
  const target = audience === "school" ? "school" : audience === "class" ? "class" : "";
  const cleanBody = typeof body === "string" ? body.trim() : "";
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const allowedTemplates = ["homework", "exam_reminder", "general_note", "holiday", "meeting", "general"];
  const kind = String(template ?? "general");
  if (!target || !cleanBody || cleanBody.length > 500 || !allowedTemplates.includes(kind)) return res.status(400).json({ error: "حدد المستلمين واكتب رسالة لا تتجاوز 500 حرف" });
  let parsedClassId: number | null = null;
  if (target === "class") {
    parsedClassId = Number(classId);
    if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) return res.status(400).json({ error: "اختر صفاً صحيحاً" });
    const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(and(eq(classesTable.id, parsedClassId), eq(classesTable.schoolId, user.schoolId))).limit(1);
    if (!cls) return res.status(404).json({ error: "الصف غير موجود" });
    if (user.role === "teacher" && !(await teacherOwnsClass(user, parsedClassId))) return res.status(403).json({ error: "يمكنك الإرسال إلى صفوفك فقط" });
  } else if (user.role !== "admin") {
    return res.status(403).json({ error: "المعلم يستطيع إرسال الإشعارات إلى صفوفه فقط" });
  }
  const [row] = await db.insert(schoolMessagesTable).values({
    schoolId: user.schoolId, audience: target, classId: parsedClassId, studentId: null,
    authorId: user.id, authorName: user.name, authorRole: user.role, template: kind,
    title: cleanTitle || "إشعار مدرسي", body: cleanBody,
  }).returning();
  res.status(201).json(row);
});

router.post("/messages/private", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  if (!["admin", "teacher"].includes(user.role) || !user.schoolId) return res.status(403).json({ error: "ليس لديك صلاحية إرسال الرسائل" });
  const studentId = Number(req.body?.studentId);
  const student = await getStudentClass(studentId, user.schoolId);
  if (!student?.classId) return res.status(404).json({ error: "الطالب غير موجود أو غير مرتبط بصف" });
  if (user.role === "teacher" && !(await teacherOwnsClass(user, student.classId))) return res.status(403).json({ error: "يمكنك مراسلة أولياء أمور طلاب صفوفك فقط" });
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const template = String(req.body?.template ?? "general");
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!body || body.length > 2000 || !["summons", "behavior", "progress", "general"].includes(template)) return res.status(400).json({ error: "اكتب رسالة صحيحة لا تتجاوز 2000 حرف" });
  const [row] = await db.insert(schoolMessagesTable).values({
    schoolId: user.schoolId, audience: "private", classId: student.classId, studentId,
    authorId: user.id, authorName: user.name, authorRole: user.role, template,
    title: title || (template === "summons" ? "استدعاء ولي الأمر" : template === "behavior" ? "ملاحظة سلوكية" : template === "progress" ? "ملاحظة عن المستوى" : "رسالة خاصة"),
    body,
  }).returning();
  res.status(201).json(row);
});

router.get("/messages/private/:studentId", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  if (!["admin", "teacher"].includes(user.role) || !user.schoolId) return res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
  const studentId = Number(req.params.studentId);
  const student = await getStudentClass(studentId, user.schoolId);
  if (!student) return res.status(404).json({ error: "الطالب غير موجود" });
  if (user.role === "teacher" && (!student.classId || !(await teacherOwnsClass(user, student.classId)))) return res.status(403).json({ error: "هذه المحادثة ليست ضمن صفوفك" });
  const rows = await db.select().from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.schoolId, user.schoolId), eq(schoolMessagesTable.audience, "private"),
    eq(schoolMessagesTable.studentId, studentId)
  )).orderBy(desc(schoolMessagesTable.createdAt));
  res.json(rows);
});

router.patch("/messages/:id", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  if (user.role !== "teacher" || !user.schoolId) return res.status(403).json({ error: "تعديل الرسائل متاح للمعلم المرسل فقط" });
  const id = Number(req.params.id);
  const [message] = await db.select().from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.id, id), eq(schoolMessagesTable.schoolId, user.schoolId)
  )).limit(1);
  if (!message) return res.status(404).json({ error: "الرسالة غير موجودة" });
  if (message.authorId !== user.id || message.authorRole !== "teacher") return res.status(403).json({ error: "يمكنك تعديل رسائلك أنت فقط" });
  if (!message.classId || !(await teacherOwnsClass(user, message.classId))) return res.status(403).json({ error: "لم تعد تملك صلاحية هذا الصف" });
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 2000) return res.status(400).json({ error: "نص الرسالة مطلوب ولا يتجاوز 2000 حرف" });
  const updated = await db.transaction(async tx => {
    await tx.insert(schoolMessageVersionsTable).values({
      messageId: message.id, previousBody: message.body, editedBy: user.id, editedByName: user.name,
    });
    const [row] = await tx.update(schoolMessagesTable).set({ body, editedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schoolMessagesTable.id, message.id), eq(schoolMessagesTable.authorId, user.id))).returning();
    return row;
  });
  res.json(updated);
});

router.get("/message-audit", requireAdmin, async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const messages = await db.select({
    id: schoolMessagesTable.id, audience: schoolMessagesTable.audience, classId: schoolMessagesTable.classId,
    studentId: schoolMessagesTable.studentId, className: classesTable.name, studentName: studentsTable.fullName,
    authorId: schoolMessagesTable.authorId, authorName: schoolMessagesTable.authorName, authorRole: schoolMessagesTable.authorRole,
    template: schoolMessagesTable.template, title: schoolMessagesTable.title, body: schoolMessagesTable.body,
    editedAt: schoolMessagesTable.editedAt, createdAt: schoolMessagesTable.createdAt,
  }).from(schoolMessagesTable)
    .leftJoin(classesTable, and(eq(schoolMessagesTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!)))
    .leftJoin(studentsTable, and(eq(schoolMessagesTable.studentId, studentsTable.id), eq(studentsTable.schoolId, user.schoolId!)))
    .where(eq(schoolMessagesTable.schoolId, user.schoolId!)).orderBy(desc(schoolMessagesTable.createdAt));
  const ids = messages.map(m => m.id);
  const versions = ids.length ? await db.select().from(schoolMessageVersionsTable).where(inArray(schoolMessageVersionsTable.messageId, ids)).orderBy(desc(schoolMessageVersionsTable.editedAt)) : [];
  res.json({ messages, versions });
});

export default router;
