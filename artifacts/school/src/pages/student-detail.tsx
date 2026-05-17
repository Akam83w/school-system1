import { Layout } from "@/components/layout";
import { useGetStudent, useListGrades, useListAttendance, getGetStudentQueryKey, getListGradesQueryKey, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

function getGradeColor(pct: number) {
  if (pct >= 90) return "text-emerald-600 font-bold";
  if (pct >= 70) return "text-blue-600 font-semibold";
  if (pct >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export default function StudentDetailPage({ id }: { id: number }) {
  const { data: student, isLoading } = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id), enabled: !!id } });
  const { data: grades } = useListGrades({ studentId: id }, { query: { queryKey: getListGradesQueryKey({ studentId: id }), enabled: !!id } });
  const { data: attendance } = useListAttendance({ studentId: id }, { query: { queryKey: getListAttendanceQueryKey({ studentId: id }), enabled: !!id } });

  const attendanceSummary = {
    present: (attendance ?? []).filter(a => a.status === "حاضر").length,
    absent: (attendance ?? []).filter(a => a.status === "غائب").length,
    late: (attendance ?? []).filter(a => a.status === "متأخر").length,
  };

  const avgGrade = (grades ?? []).length > 0
    ? Math.round((grades ?? []).reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / (grades ?? []).length)
    : null;

  if (isLoading) {
    return <Layout><div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div></Layout>;
  }

  if (!student) {
    return <Layout><div className="text-center py-12 text-muted-foreground">الطالب غير موجود</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back */}
        <Link href="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          العودة إلى قائمة الطلاب
        </Link>

        {/* Header card */}
        <div className="bg-card rounded-xl border border-card-border p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {student.fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{student.fullName}</h1>
              <p className="text-muted-foreground text-sm mt-1">{student.studentCode} — {student.className}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {student.status === "active" ? "فعال" : "غير فعال"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{student.gender}</span>
              </div>
            </div>
            {avgGrade !== null && (
              <div className="text-center">
                <p className={`text-3xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}%</p>
                <p className="text-xs text-muted-foreground mt-1">متوسط الدرجات</p>
              </div>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">البيانات الشخصية</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "تاريخ الميلاد", value: student.dateOfBirth },
                { label: "تاريخ التسجيل", value: student.enrollmentDate },
                { label: "الهاتف", value: student.phone },
                { label: "العنوان", value: student.address },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">بيانات ولي الأمر</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "الاسم", value: student.parentName },
                { label: "الهاتف", value: student.parentPhone },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ) : null)}
              {!student.parentName && !student.parentPhone && (
                <p className="text-muted-foreground text-sm">لا توجد بيانات</p>
              )}
            </div>

            <h3 className="font-bold text-foreground mb-3 mt-5">إحصائيات الحضور</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-emerald-50 rounded-lg p-2"><p className="font-bold text-emerald-700">{attendanceSummary.present}</p><p className="text-xs text-emerald-600">حاضر</p></div>
              <div className="bg-red-50 rounded-lg p-2"><p className="font-bold text-red-700">{attendanceSummary.absent}</p><p className="text-xs text-red-600">غائب</p></div>
              <div className="bg-amber-50 rounded-lg p-2"><p className="font-bold text-amber-700">{attendanceSummary.late}</p><p className="text-xs text-amber-600">متأخر</p></div>
            </div>
          </div>
        </div>

        {/* Grades */}
        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">سجل الدرجات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["المادة", "الدرجة", "النسبة", "نوع الامتحان", "التاريخ"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(grades ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">لا توجد درجات</td></tr>
                ) : (grades ?? []).map((g) => {
                  const pct = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <tr key={g.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{g.subjectName}</td>
                      <td className="px-4 py-3 font-mono">{g.score}/{g.maxScore}</td>
                      <td className="px-4 py-3"><span className={getGradeColor(pct)}>{pct}%</span></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{g.examType}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{g.examDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
