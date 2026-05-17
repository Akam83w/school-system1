import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, teachersTable, classesTable, subjectsTable, attendanceTable, gradesTable } from "@workspace/db";
import { count, eq, avg, max, min, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/stats", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const [totalStudents] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.status, "active"));
  const [totalTeachers] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.status, "active"));
  const [totalClasses] = await db.select({ count: count() }).from(classesTable);
  const [totalSubjects] = await db.select({ count: count() }).from(subjectsTable);

  const [presentToday] = await db.select({ count: count() }).from(attendanceTable)
    .where(sql`${attendanceTable.date} = ${today} AND ${attendanceTable.status} = 'حاضر'`);
  const [absentToday] = await db.select({ count: count() }).from(attendanceTable)
    .where(sql`${attendanceTable.date} = ${today} AND ${attendanceTable.status} = 'غائب'`);

  const totalStudentCount = totalStudents?.count ?? 0;
  const presentCount = presentToday?.count ?? 0;
  const absentCount = absentToday?.count ?? 0;
  const attendanceRate = totalStudentCount > 0 ? Math.round((presentCount / totalStudentCount) * 100) : 0;

  const allGrades = await db.select({ score: gradesTable.score, maxScore: gradesTable.maxScore }).from(gradesTable);
  const averageGrade = allGrades.length > 0
    ? Math.round(allGrades.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore)) * 100, 0) / allGrades.length)
    : 0;

  res.json({
    totalStudents: totalStudentCount,
    totalTeachers: totalTeachers?.count ?? 0,
    totalClasses: totalClasses?.count ?? 0,
    totalSubjects: totalSubjects?.count ?? 0,
    presentToday: presentCount,
    absentToday: absentCount,
    attendanceRate,
    averageGrade,
  });
});

router.get("/dashboard/attendance-summary", async (req, res) => {
  const classes = await db.select({ id: classesTable.id, name: classesTable.name }).from(classesTable);
  const result = await Promise.all(
    classes.map(async (cls) => {
      const [presentCount] = await db.select({ count: count() }).from(attendanceTable)
        .where(sql`${attendanceTable.classId} = ${cls.id} AND ${attendanceTable.status} = 'حاضر'`);
      const [absentCount] = await db.select({ count: count() }).from(attendanceTable)
        .where(sql`${attendanceTable.classId} = ${cls.id} AND ${attendanceTable.status} = 'غائب'`);
      const [lateCount] = await db.select({ count: count() }).from(attendanceTable)
        .where(sql`${attendanceTable.classId} = ${cls.id} AND ${attendanceTable.status} = 'متأخر'`);
      const p = presentCount?.count ?? 0;
      const a = absentCount?.count ?? 0;
      const l = lateCount?.count ?? 0;
      return { classId: cls.id, className: cls.name, presentCount: p, absentCount: a, lateCount: l, total: p + a + l };
    })
  );
  res.json(result);
});

router.get("/dashboard/grade-distribution", async (req, res) => {
  const subjects = await db.select({ id: subjectsTable.id, name: subjectsTable.name }).from(subjectsTable);
  const result = await Promise.all(
    subjects.map(async (subject) => {
      const grades = await db.select({ score: gradesTable.score, maxScore: gradesTable.maxScore })
        .from(gradesTable).where(eq(gradesTable.subjectId, subject.id));
      if (grades.length === 0) return { subjectName: subject.name, averageScore: 0, highestScore: 0, lowestScore: 0, passingCount: 0, failingCount: 0 };
      const percentages = grades.map(g => (Number(g.score) / Number(g.maxScore)) * 100);
      return {
        subjectName: subject.name,
        averageScore: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
        highestScore: Math.round(Math.max(...percentages)),
        lowestScore: Math.round(Math.min(...percentages)),
        passingCount: percentages.filter(p => p >= 50).length,
        failingCount: percentages.filter(p => p < 50).length,
      };
    })
  );
  res.json(result);
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const recentStudents = await db.select({ id: studentsTable.id, fullName: studentsTable.fullName, createdAt: studentsTable.createdAt }).from(studentsTable).orderBy(sql`${studentsTable.createdAt} DESC`).limit(3);
  const recentTeachers = await db.select({ id: teachersTable.id, fullName: teachersTable.fullName, createdAt: teachersTable.createdAt }).from(teachersTable).orderBy(sql`${teachersTable.createdAt} DESC`).limit(3);
  const recentGrades = await db
    .select({ id: gradesTable.id, examType: gradesTable.examType, createdAt: gradesTable.createdAt, studentName: studentsTable.fullName })
    .from(gradesTable)
    .leftJoin(studentsTable, eq(gradesTable.studentId, studentsTable.id))
    .orderBy(sql`${gradesTable.createdAt} DESC`).limit(3);

  const activities: { id: number; type: string; description: string; timestamp: string; entityName: string | null }[] = [];
  let actId = 1;
  recentStudents.forEach(s => activities.push({ id: actId++, type: "student", description: "تم تسجيل طالب جديد", timestamp: s.createdAt.toISOString(), entityName: s.fullName }));
  recentTeachers.forEach(t => activities.push({ id: actId++, type: "teacher", description: "تم إضافة معلم جديد", timestamp: t.createdAt.toISOString(), entityName: t.fullName }));
  recentGrades.forEach(g => activities.push({ id: actId++, type: "grade", description: `تم تسجيل ${g.examType}`, timestamp: g.createdAt.toISOString(), entityName: g.studentName ?? null }));

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(activities.slice(0, 10));
});

export default router;
