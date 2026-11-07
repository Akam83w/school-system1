import { Router } from "express";
import { db, studentsTable, classesTable, attendanceTable, gradesTable, subjectsTable, schoolMessagesTable, announcementsTable } from "@workspace/db";
import { and, eq, or, desc, isNull, gte } from "drizzle-orm";
import { requireAuth, type AuthUser } from "../middlewares/auth";

const router = Router();
router.use(requireAuth, (req, res, next): void => {
  const user = (req as any).user as AuthUser;
  if (!["student", "parent"].includes(user.role)) { res.status(403).json({ error: "هذه الصفحة مخصصة لحساب الطالب أو ولي الأمر" }); return; }
  if (!user.linkedId || !user.schoolId) { res.status(403).json({ error: "الحساب غير مرتبط بطالب؛ راجع إدارة المدرسة" }); return; }
  next();
});

async function linkedStudent(user: AuthUser) {
  const [student] = await db.select({
    id: studentsTable.id, fullName: studentsTable.fullName, studentCode: studentsTable.studentCode,
    classId: studentsTable.classId, className: classesTable.name, gender: studentsTable.gender,
    status: studentsTable.status,
  }).from(studentsTable)
    .leftJoin(classesTable, and(eq(studentsTable.classId, classesTable.id), eq(classesTable.schoolId, user.schoolId!)))
    .where(and(eq(studentsTable.id, user.linkedId!), eq(studentsTable.schoolId, user.schoolId!))).limit(1);
  return student;
}

router.get("/portal/profile", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const student = await linkedStudent(user);
  if (!student) return res.status(404).json({ error: "ملف الطالب المرتبط بالحساب غير موجود" });
  res.json(student);
});

router.get("/portal/attendance", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select({
    id: attendanceTable.id, date: attendanceTable.date, status: attendanceTable.status,
    academicYear: attendanceTable.academicYear, notes: attendanceTable.notes,
  }).from(attendanceTable).where(and(
    eq(attendanceTable.schoolId, user.schoolId!), eq(attendanceTable.studentId, user.linkedId!)
  )).orderBy(desc(attendanceTable.date));
  res.json(rows);
});

router.get("/portal/grades", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select({
    id: gradesTable.id, subjectName: subjectsTable.name, score: gradesTable.score,
    maxScore: gradesTable.maxScore, examType: gradesTable.examType, examDate: gradesTable.examDate,
    academicYear: gradesTable.academicYear, notes: gradesTable.notes,
  }).from(gradesTable)
    .leftJoin(subjectsTable, and(eq(gradesTable.subjectId, subjectsTable.id), eq(subjectsTable.schoolId, user.schoolId!)))
    .where(and(eq(gradesTable.schoolId, user.schoolId!), eq(gradesTable.studentId, user.linkedId!)))
    .orderBy(desc(gradesTable.examDate));
  res.json(rows.map(r => ({ ...r, subjectName: r.subjectName ?? "", score: Number(r.score), maxScore: Number(r.maxScore) })));
});

router.get("/portal/behavior", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select({
    id: schoolMessagesTable.id, title: schoolMessagesTable.title, body: schoolMessagesTable.body,
    authorName: schoolMessagesTable.authorName, createdAt: schoolMessagesTable.createdAt,
    editedAt: schoolMessagesTable.editedAt,
  }).from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.schoolId, user.schoolId!), eq(schoolMessagesTable.audience, "private"),
    eq(schoolMessagesTable.studentId, user.linkedId!), eq(schoolMessagesTable.template, "behavior")
  )).orderBy(desc(schoolMessagesTable.createdAt));
  res.json(rows);
});

router.get("/portal/notifications", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const student = await linkedStudent(user);
  if (!student) return res.status(404).json({ error: "ملف الطالب غير موجود" });
  const messages = await db.select({
    id: schoolMessagesTable.id, audience: schoolMessagesTable.audience, title: schoolMessagesTable.title,
    body: schoolMessagesTable.body, template: schoolMessagesTable.template,
    authorName: schoolMessagesTable.authorName, createdAt: schoolMessagesTable.createdAt,
    editedAt: schoolMessagesTable.editedAt,
  }).from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.schoolId, user.schoolId!),
    or(
      eq(schoolMessagesTable.audience, "school"),
      and(eq(schoolMessagesTable.audience, "class"), eq(schoolMessagesTable.classId, student.classId ?? -1))
    )
  )).orderBy(desc(schoolMessagesTable.createdAt));
  const legacy = await db.select({
    id: announcementsTable.id, title: announcementsTable.title, body: announcementsTable.body,
    type: announcementsTable.type, authorName: announcementsTable.authorName,
    createdAt: announcementsTable.createdAt,
  }).from(announcementsTable).where(and(
    eq(announcementsTable.schoolId, user.schoolId!), or(isNull(announcementsTable.expiresAt), gte(announcementsTable.expiresAt, new Date()))
  )).orderBy(desc(announcementsTable.createdAt));
  res.json({
    publicMessages: messages,
    schoolAnnouncements: legacy,
  });
});

router.get("/portal/conversation", async (req, res): Promise<any> => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select({
    id: schoolMessagesTable.id, title: schoolMessagesTable.title, body: schoolMessagesTable.body,
    template: schoolMessagesTable.template, authorName: schoolMessagesTable.authorName,
    createdAt: schoolMessagesTable.createdAt, editedAt: schoolMessagesTable.editedAt,
  }).from(schoolMessagesTable).where(and(
    eq(schoolMessagesTable.schoolId, user.schoolId!), eq(schoolMessagesTable.audience, "private"),
    eq(schoolMessagesTable.studentId, user.linkedId!)
  )).orderBy(desc(schoolMessagesTable.createdAt));
  res.json(rows);
});

export default router;
