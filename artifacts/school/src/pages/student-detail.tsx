import { Layout } from "@/components/layout";
import {
  useGetStudent,
  useListGrades,
  useListAttendance,
  getGetStudentQueryKey,
  getListGradesQueryKey,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";

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
  const { data: student, isLoading } = useGetStudent(id, {
    query: { queryKey: getGetStudentQueryKey(id), enabled: !!id },
  });
  const { data: grades } = useListGrades(
    { studentId: id },
    { query: { queryKey: getListGradesQueryKey({ studentId: id }), enabled: !!id } }
  );
  const { data: attendance } = useListAttendance(
    { studentId: id },
    { query: { queryKey: getListAttendanceQueryKey({ studentId: id }), enabled: !!id } }
  );

  const present = (attendance ?? []).filter((a) => a.status === "حاضر").length;
  const absent = (attendance ?? []).filter((a) => a.status === "غائب").length;
  const late = (attendance ?? []).filter((a) => a.status === "متأخر").length;
  const total = present + absent + late;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : null;

  const avgGrade =
    (grades ?? []).length > 0
      ? Math.round(
          (grades ?? []).reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
            (grades ?? []).length
        )
      : null;

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
          <div className="h-64 bg-muted rounded-2xl" />
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
          <Link href="/students" className="mt-4 inline-block text-primary hover:underline text-sm">
            العودة إلى قائمة الطلاب
          </Link>
        </div>
      </Layout>
    );
  }

  const initials = student.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Back */}
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى قائمة الطلاب
        </Link>

        {/* Hero header */}
        <div className="bg-gradient-to-l from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {initials}
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{student.fullName}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    student.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {student.status === "active" ? "فعال" : "غير فعال"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {student.gender}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-1">{student.studentCode}</p>
              {/* Class link */}
              <Link
                href={`/classes/${student.classId}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {student.className}
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3">
              {avgGrade !== null && (
                <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                  <p className={`text-2xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">متوسط الدرجات</p>
                </div>
              )}
              {attendancePct !== null && (
                <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                  <p className={`text-2xl font-bold ${attendancePct >= 80 ? "text-emerald-600" : attendancePct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {attendancePct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">نسبة الحضور</p>
                </div>
              )}
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                <p className="text-2xl font-bold text-foreground">{(grades ?? []).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">درجات مسجّلة</p>
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
            ]
              .filter((i) => i.value)
              .map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-white/60 rounded-xl px-4 py-2.5 border border-white/80"
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{value}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Attendance summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "إجمالي الأيام", value: total, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "حاضر", value: present, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "غائب", value: absent, color: "bg-red-50 border-red-200 text-red-700" },
            { label: "متأخر", value: late, color: "bg-amber-50 border-amber-200 text-amber-700" },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl border p-4 text-center ${card.color}`}>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs mt-1 opacity-80">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Grades table */}
        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">سجل الدرجات</h3>
            {(grades ?? []).length > 0 && (
              <span className="text-xs text-muted-foreground">{(grades ?? []).length} سجل</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["المادة", "الدرجة", "النسبة", "نوع الامتحان", "التاريخ"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(grades ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <p className="text-2xl mb-2">📝</p>
                      <p className="text-muted-foreground text-sm">لا توجد درجات مسجّلة</p>
                    </td>
                  </tr>
                ) : (
                  (grades ?? []).map((g) => {
                    const pct = Math.round((g.score / g.maxScore) * 100);
                    return (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{g.subjectName}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{g.score}<span className="text-muted-foreground font-normal">/{g.maxScore}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getGradeBadge(pct)}`}>{pct}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{g.examType}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{g.examDate}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent attendance */}
        {(attendance ?? []).length > 0 && (
          <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">سجل الحضور الأخير</h3>
              <span className="text-xs text-muted-foreground">{(attendance ?? []).length} سجل</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {["التاريخ", "الصف", "الحالة", "ملاحظات"].map((h) => (
                      <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(attendance ?? []).slice(0, 20).map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.className}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          a.status === "حاضر" ? "bg-emerald-100 text-emerald-700" :
                          a.status === "غائب" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{a.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
