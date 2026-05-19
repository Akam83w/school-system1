import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useGetStudent,
  useListGrades,
  useListAttendance,
  getGetStudentQueryKey,
  getListGradesQueryKey,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import type { Grade, Attendance } from "@workspace/api-client-react";
import { Link } from "wouter";

const CURRENT_YEAR = "2024-2025";
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];

const STATUS_COLORS: Record<string, string> = {
  "حاضر": "bg-emerald-100 text-emerald-700",
  "غائب": "bg-red-100 text-red-700",
  "متأخر": "bg-amber-100 text-amber-700",
};

const EXAM_TYPE_ORDER = [
  "اختبار الشهر الأول",
  "اختبار الشهر الثاني",
  "امتحان نصف السنة",
  "الامتحان النهائي",
  "امتحانات مستمرة",
  "واجب بيتي",
];

function getGradeColor(pct: number) {
  if (pct >= 90) return "text-emerald-600 font-bold";
  if (pct >= 70) return "text-blue-600 font-semibold";
  if (pct >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

function getGradeBadge(pct: number) {
  if (pct >= 90) return "bg-emerald-100 text-emerald-700";
  if (pct >= 70) return "bg-blue-100 text-blue-700";
  if (pct >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function StudentDetailPage({ id }: { id: number }) {
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<"grades" | "attendance">("grades");

  const { data: student, isLoading } = useGetStudent(id, {
    query: { queryKey: getGetStudentQueryKey(id), enabled: !!id },
  });

  // Load all grades for all years (no year filter on the API call — we group client-side for year tabs)
  const { data: allGrades } = useListGrades(
    { studentId: id },
    { query: { queryKey: getListGradesQueryKey({ studentId: id }), enabled: !!id } }
  );
  const { data: allAttendance } = useListAttendance(
    { studentId: id },
    { query: { queryKey: getListAttendanceQueryKey({ studentId: id }), enabled: !!id } }
  );

  // Filter by selected year
  const grades = (allGrades ?? []).filter(g => ((g as any).academicYear ?? CURRENT_YEAR) === yearFilter);
  const attendance = (allAttendance ?? []).filter(a => ((a as any).academicYear ?? CURRENT_YEAR) === yearFilter);

  // Unique years from data
  const gradesYears = [...new Set((allGrades ?? []).map(g => (g as any).academicYear ?? CURRENT_YEAR))];
  const attendanceYears = [...new Set((allAttendance ?? []).map(a => (a as any).academicYear ?? CURRENT_YEAR))];
  const allYears = [...new Set([...gradesYears, ...attendanceYears, CURRENT_YEAR])].sort().reverse();

  // Attendance stats for selected year
  const present = attendance.filter(a => a.status === "حاضر").length;
  const absent = attendance.filter(a => a.status === "غائب").length;
  const late = attendance.filter(a => a.status === "متأخر").length;
  const totalDays = present + absent + late;
  const attendancePct = totalDays > 0 ? Math.round((present / totalDays) * 100) : null;

  // Grade stats for selected year
  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length)
    : null;

  // Group grades by exam type (ordered)
  const gradesByExamType = grades.reduce<Record<string, Grade[]>>((acc, g) => {
    if (!acc[g.examType]) acc[g.examType] = [];
    acc[g.examType].push(g);
    return acc;
  }, {});
  const sortedExamTypes = [
    ...EXAM_TYPE_ORDER.filter(t => gradesByExamType[t]),
    ...Object.keys(gradesByExamType).filter(t => !EXAM_TYPE_ORDER.includes(t)),
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded-lg" />
          <div className="h-52 bg-muted rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-44 bg-muted rounded-2xl" />
            <div className="h-44 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🎓</p>
          <p className="text-muted-foreground text-lg">الطالب غير موجود</p>
          <Link href="/students" className="mt-4 inline-block text-primary hover:underline text-sm">العودة إلى قائمة الطلاب</Link>
        </div>
      </Layout>
    );
  }

  const initials = student.fullName.split(" ").slice(0, 2).map(w => w[0]).join("");

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        {/* Back */}
        <Link href="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى قائمة الطلاب
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-l from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{student.fullName}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${student.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {student.status === "active" ? "فعال" : "غير فعال"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{student.gender}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-1">{student.studentCode}</p>
              {student.classId && (
                <Link href={`/classes/${student.classId}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {student.className}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {avgGrade !== null && (
                <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                  <p className={`text-2xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">متوسط درجات {yearFilter}</p>
                </div>
              )}
              {attendancePct !== null && (
                <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                  <p className={`text-2xl font-bold ${attendancePct >= 80 ? "text-emerald-600" : attendancePct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {attendancePct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">نسبة الحضور {yearFilter}</p>
                </div>
              )}
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                <p className="text-2xl font-bold text-foreground">{(allGrades ?? []).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">إجمالي الدرجات</p>
              </div>
            </div>
          </div>

          {/* Detail chips */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: "📅", label: "تاريخ الميلاد", value: student.dateOfBirth },
              { icon: "📋", label: "تاريخ التسجيل", value: student.enrollmentDate },
              { icon: "📞", label: "الهاتف", value: student.phone },
              { icon: "🏠", label: "العنوان", value: student.address },
              { icon: "👤", label: "ولي الأمر", value: student.parentName },
              { icon: "📲", label: "هاتف ولي الأمر", value: student.parentPhone },
            ].filter(i => i.value).map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/60 rounded-xl px-4 py-2.5 border border-white/80">
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Year filter + tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">العام الدراسي:</span>
            <div className="flex gap-1">
              {allYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setYearFilter(y)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${yearFilter === y ? "bg-primary text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("grades")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "grades" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              الدرجات ({grades.length})
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "attendance" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              الحضور ({totalDays})
            </button>
          </div>
        </div>

        {/* GRADES TAB */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            {grades.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <p className="text-3xl mb-2">📝</p>
                <p className="font-semibold text-foreground mb-1">لا توجد درجات لعام {yearFilter}</p>
                <p className="text-sm text-muted-foreground">سيتم عرض الدرجات هنا بعد تسجيلها</p>
              </div>
            ) : (
              sortedExamTypes.map(examType => {
                const examGrades = gradesByExamType[examType];
                const examAvg = Math.round(examGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / examGrades.length);
                return (
                  <div key={examType} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">{examType}</span>
                        <span className="text-xs text-muted-foreground">{examGrades.length} مادة</span>
                      </div>
                      <span className={`text-sm font-bold ${getGradeColor(examAvg)}`}>المتوسط: {examAvg}%</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          {["المادة", "الدرجة المحصلة", "الدرجة الكاملة", "النسبة", "تاريخ الامتحان", "ملاحظات"].map(h => (
                            <th key={h} className="text-right px-4 py-2.5 font-semibold text-xs text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {examGrades.map(g => {
                          const pct = Math.round((g.score / g.maxScore) * 100);
                          return (
                            <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors last:border-0">
                              <td className="px-4 py-2.5 font-medium">{g.subjectName}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-foreground">{g.score}</td>
                              <td className="px-4 py-2.5 font-mono text-muted-foreground">{g.maxScore}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getGradeBadge(pct)}`}>{pct}%</span>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs">{g.examDate}</td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs">{g.notes ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "إجمالي الأيام", value: totalDays, color: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "حاضر", value: present, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: "غائب", value: absent, color: "bg-red-50 border-red-200 text-red-700" },
                { label: "متأخر", value: late, color: "bg-amber-50 border-amber-200 text-amber-700" },
              ].map(card => (
                <div key={card.label} className={`rounded-xl border p-4 text-center ${card.color}`}>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs mt-1 opacity-80">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance table */}
            {attendance.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold text-foreground mb-1">لا توجد سجلات حضور لعام {yearFilter}</p>
                <p className="text-sm text-muted-foreground">سيتم عرض سجل الحضور اليومي هنا</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-sm font-semibold">سجل الحضور اليومي — {yearFilter}</span>
                  <span className="text-xs text-muted-foreground">{attendance.length} يوم</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border">
                        {["التاريخ", "الصف", "الحالة", "ملاحظات"].map(h => (
                          <th key={h} className="text-right px-4 py-2.5 font-semibold text-xs text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors last:border-0">
                          <td className="px-4 py-2.5 font-mono text-sm">{a.date}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{a.className}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground"}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{a.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
