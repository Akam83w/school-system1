import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, teachersTable, classesTable, subjectsTable, attendanceTable, gradesTable } from "@workspace/db";
import { count, eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthUser } from "../middlewares/auth";
const router = Router();
router.use(requireAuth);

router.get("/dashboard/stats", async (req, res) => {
  const user = (req as any).user as AuthUser; const schoolId = user.schoolId!;
  const today = new Date().toISOString().slice(0, 10);
  const [students] = await db.select({ count: count() }).from(studentsTable).where(and(eq(studentsTable.schoolId, schoolId), eq(studentsTable.status, "active")));
  const [teachers] = await db.select({ count: count() }).from(teachersTable).where(and(eq(teachersTable.schoolId, schoolId), eq(teachersTable.status, "active")));
  const [classes] = await db.select({ count: count() }).from(classesTable).where(eq(classesTable.schoolId, schoolId));
  const [subjects] = await db.select({ count: count() }).from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId));
  const [present] = await db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today), eq(attendanceTable.status, "حاضر")));
  const [absent] = await db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today), eq(attendanceTable.status, "غائب")));
  const [recordedToday] = await db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today)));
  const total = students?.count ?? 0; const p = present?.count ?? 0; const a = absent?.count ?? 0; const recorded = recordedToday?.count ?? 0;
  const grades = await db.select({ score: gradesTable.score, maxScore: gradesTable.maxScore }).from(gradesTable).where(eq(gradesTable.schoolId, schoolId));
  const averageGrade = grades.length ? Math.round(grades.reduce((sum, g) => sum + Number(g.score) / Number(g.maxScore) * 100, 0) / grades.length) : 0;
  res.json({ totalStudents: total, totalTeachers: teachers?.count ?? 0, totalClasses: classes?.count ?? 0, totalSubjects: subjects?.count ?? 0, presentToday: p, absentToday: a, attendanceRate: recorded ? Math.round(p / recorded * 100) : 0, averageGrade });
});
router.get("/dashboard/attendance-summary", async (req, res) => {
  const user = (req as any).user as AuthUser; const schoolId = user.schoolId!;
  const today = new Date().toISOString().slice(0, 10);
  const classes = await db.select({ id: classesTable.id, name: classesTable.name }).from(classesTable).where(eq(classesTable.schoolId, schoolId));
  const result = await Promise.all(classes.map(async cls => {
    const rows = await db.select({ status: attendanceTable.status }).from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.classId, cls.id), eq(attendanceTable.date, today)));
    const present = rows.filter(x => x.status === "حاضر").length;
    const absent = rows.filter(x => x.status === "غائب").length;
    const late = rows.filter(x => x.status === "متأخر").length;
    return { classId: cls.id, className: cls.name, presentCount: present, absentCount: absent, lateCount: late, total: rows.length, unrecorded: rows.length === 0 };
  }));
  res.json(result);
});
router.get("/dashboard/grade-distribution", async (req, res) => {
  const user = (req as any).user as AuthUser; const schoolId = user.schoolId!;
  const classes = await db.select({ id: classesTable.id, name: classesTable.name }).from(classesTable).where(eq(classesTable.schoolId, schoolId));
  const subjects = await db.select({ id: subjectsTable.id, name: subjectsTable.name, classId: subjectsTable.classId }).from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId));
  const result = await Promise.all(subjects.map(async subject => {
    const rows = await db.select({ score: gradesTable.score, maxScore: gradesTable.maxScore }).from(gradesTable).where(and(eq(gradesTable.subjectId, subject.id), eq(gradesTable.schoolId, schoolId)));
    const values = rows.map(g => Number(g.score) / Number(g.maxScore) * 100);
    const byClass = await Promise.all(classes.filter(c => c.id === subject.classId).map(async cls => {
      const classRows = await db.select({ score: gradesTable.score, maxScore: gradesTable.maxScore }).from(gradesTable).where(and(eq(gradesTable.subjectId, subject.id), eq(gradesTable.classId, cls.id), eq(gradesTable.schoolId, schoolId)));
      const percentages = classRows.map(g => Number(g.score) / Number(g.maxScore) * 100);
      return { classId: cls.id, className: cls.name, passingCount: percentages.filter(x => x >= 50).length, failingCount: percentages.filter(x => x < 50).length };
    }));
    if (!values.length) return { subjectId: subject.id, subjectName: subject.name, averageScore: 0, highestScore: 0, lowestScore: 0, passingCount: 0, failingCount: 0, byClass };
    return { subjectId: subject.id, subjectName: subject.name, averageScore: Math.round(values.reduce((x,y)=>x+y,0)/values.length), highestScore: Math.round(Math.max(...values)), lowestScore: Math.round(Math.min(...values)), passingCount: values.filter(x=>x>=50).length, failingCount: values.filter(x=>x<50).length, byClass };
  }));
  res.json(result);
});
router.get("/dashboard/recent-activity", async (req, res) => {
  const user = (req as any).user as AuthUser; const schoolId = user.schoolId!;
  const students = await db.select({ id: studentsTable.id, fullName: studentsTable.fullName, createdAt: studentsTable.createdAt }).from(studentsTable).where(eq(studentsTable.schoolId, schoolId)).orderBy(sql`${studentsTable.createdAt} DESC`).limit(3);
  const teachers = await db.select({ id: teachersTable.id, fullName: teachersTable.fullName, createdAt: teachersTable.createdAt }).from(teachersTable).where(eq(teachersTable.schoolId, schoolId)).orderBy(sql`${teachersTable.createdAt} DESC`).limit(3);
  const grades = await db.select({ id: gradesTable.id, examType: gradesTable.examType, createdAt: gradesTable.createdAt, studentName: studentsTable.fullName, subjectName: subjectsTable.name }).from(gradesTable).leftJoin(studentsTable, and(eq(gradesTable.studentId, studentsTable.id), eq(studentsTable.schoolId, schoolId))).leftJoin(subjectsTable, and(eq(gradesTable.subjectId, subjectsTable.id), eq(subjectsTable.schoolId, schoolId))).where(eq(gradesTable.schoolId, schoolId)).orderBy(sql`${gradesTable.createdAt} DESC`).limit(3);
  const activities: { id: number; type: string; description: string; timestamp: string; entityName: string | null }[] = [];
  let id = 1;
  students.forEach(x => activities.push({ id: id++, type: "student", description: "تم تسجيل طالب جديد", timestamp: x.createdAt.toISOString(), entityName: x.fullName }));
  teachers.forEach(x => activities.push({ id: id++, type: "teacher", description: "تم إضافة معلم جديد", timestamp: x.createdAt.toISOString(), entityName: x.fullName }));
  grades.forEach(x => activities.push({ id: id++, type: "grade", description: `تم تسجيل ${x.examType}`, timestamp: x.createdAt.toISOString(), entityName: [x.studentName, x.subjectName].filter(Boolean).join(" — ") || null }));
  activities.sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime());
  res.json(activities.slice(0,10));
});
export default router;
