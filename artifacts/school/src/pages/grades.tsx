import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListGrades,
  useListStudents,
  useListSubjects,
  useListClasses,
  useCreateGrade,
  useDeleteGrade,
  getListGradesQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import type { Grade } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const EXAM_TYPES = [
  "اختبار الشهر الأول",
  "اختبار الشهر الثاني",
  "امتحان نصف السنة",
  "الامتحان النهائي",
  "امتحانات مستمرة",
  "واجب بيتي",
];

const CURRENT_YEAR = "2024-2025";
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];

type GradeForm = {
  studentId: string; subjectId: string; classId: string;
  score: string; maxScore: string; examType: string;
  examDate: string; academicYear: string; notes: string;
};

const emptyForm: GradeForm = {
  studentId: "", subjectId: "", classId: "", score: "", maxScore: "100",
  examType: EXAM_TYPES[0], examDate: new Date().toISOString().split("T")[0],
  academicYear: CURRENT_YEAR, notes: "",
};

function getGradeColor(pct: number) {
  if (pct >= 90) return "text-emerald-600 font-bold";
  if (pct >= 70) return "text-blue-600 font-semibold";
  if (pct >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export default function GradesPage() {
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GradeForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const params = {
    classId: classFilter ? Number(classFilter) : undefined,
    subjectId: subjectFilter ? Number(subjectFilter) : undefined,
    studentId: studentFilter ? Number(studentFilter) : undefined,
    academicYear: yearFilter || undefined,
    examType: examTypeFilter || undefined,
  };
  const { data: grades, isLoading } = useListGrades(params, { query: { queryKey: getListGradesQueryKey(params) } });
  const { data: students } = useListStudents();
  const { data: subjects } = useListSubjects();
  const { data: classes } = useListClasses();

  const createMutation = useCreateGrade({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() });
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "تم تسجيل الدرجة بنجاح" });
      },
      onError: (err: any) => {
        toast({ title: "فشل التسجيل", description: err?.response?.data?.error ?? "حدث خطأ", variant: "destructive" });
      },
    },
  });
  const deleteMutation = useDeleteGrade({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() });
        toast({ title: "تم حذف الدرجة" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      data: {
        studentId: Number(form.studentId),
        subjectId: Number(form.subjectId),
        classId: Number(form.classId),
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        examType: form.examType,
        examDate: form.examDate,
        academicYear: form.academicYear,
        notes: form.notes,
      },
    });
  }

  // Group grades by academic year for display
  const gradesByYear = (grades ?? []).reduce<Record<string, Grade[]>>((acc, g) => {
    const year = (g as any).academicYear ?? CURRENT_YEAR;
    if (!acc[year]) acc[year] = [];
    acc[year].push(g);
    return acc;
  }, {});

  const yearKeys = Object.keys(gradesByYear).sort().reverse();

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">سجل الدرجات</h1>
            <p className="text-muted-foreground text-sm">
              {isLoading ? "جاري التحميل..." : `${(grades ?? []).length} درجة مسجّلة`}
            </p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm"
          >
            + تسجيل درجة جديدة
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">تصفية النتائج</p>
          <div className="flex flex-wrap gap-3">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الأعوام</option>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع أنواع الامتحانات</option>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الصفوف</option>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع المواد</option>
              {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الطلاب</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            {(yearFilter !== CURRENT_YEAR || examTypeFilter || classFilter || subjectFilter || studentFilter) && (
              <button onClick={() => { setYearFilter(CURRENT_YEAR); setExamTypeFilter(""); setClassFilter(""); setSubjectFilter(""); setStudentFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                إعادة تعيين
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (grades ?? []).length === 0 && (
          <div className="bg-card rounded-xl border border-border p-16 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-semibold text-foreground mb-1">لا توجد درجات مسجّلة</p>
            <p className="text-sm text-muted-foreground">ابدأ بتسجيل درجات الطلاب للعام الدراسي الحالي</p>
          </div>
        )}

        {/* Grades grouped by academic year */}
        {!isLoading && yearKeys.map((year) => {
          const yearGrades = gradesByYear[year];
          const avg = yearGrades.length > 0
            ? Math.round(yearGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / yearGrades.length)
            : null;
          return (
            <div key={year} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">العام الدراسي: {year}</span>
                  <span className="text-xs text-muted-foreground">{yearGrades.length} سجل</span>
                </div>
                {avg !== null && (
                  <span className={`text-sm font-semibold ${getGradeColor(avg)}`}>المتوسط: {avg}%</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      {["الطالب", "المادة", "الصف", "الدرجة", "النسبة", "نوع الامتحان", "التاريخ", ...(isAdmin ? ["الإجراءات"] : [])].map((h) => (
                        <th key={h} className="text-right px-4 py-2.5 font-semibold text-foreground text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearGrades.map((g) => {
                      const pct = Math.round((g.score / g.maxScore) * 100);
                      return (
                        <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{g.studentName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{g.subjectName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{g.className}</td>
                          <td className="px-4 py-2.5 font-mono font-semibold">{g.score}<span className="text-muted-foreground font-normal text-xs">/{g.maxScore}</span></td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold ${getGradeColor(pct)}`}>{pct}%</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{g.examType}</span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{g.examDate}</td>
                          {isAdmin && (
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => { if (confirm("حذف هذه الدرجة؟")) deleteMutation.mutate({ id: g.id }); }}
                                className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                              >
                                حذف
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add grade modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">تسجيل درجة جديدة</h3>
                <p className="text-xs text-muted-foreground mt-0.5">الدرجات محفوظة كسجلات تاريخية دائمة</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Academic year */}
              <div>
                <label className="block text-sm font-medium mb-1">العام الدراسي *</label>
                <select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Student */}
              <div>
                <label className="block text-sm font-medium mb-1">الطالب *</label>
                <select required value={form.studentId} onChange={(e) => {
                  const s = (students ?? []).find(st => st.id === Number(e.target.value));
                  setForm({ ...form, studentId: e.target.value, classId: s?.classId ? String(s.classId) : form.classId });
                }} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الطالب</option>
                  {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              {/* Class */}
              <div>
                <label className="block text-sm font-medium mb-1">الصف *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الصف</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-1">المادة *</label>
                <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر المادة</option>
                  {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} - {s.className}</option>)}
                </select>
              </div>
              {/* Exam type */}
              <div>
                <label className="block text-sm font-medium mb-1">نوع الامتحان *</label>
                <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              {/* Score */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الدرجة المحصلة *</label>
                  <input required type="number" min="0" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الدرجة الكاملة *</label>
                  <input required type="number" min="1" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ الامتحان *</label>
                <input required type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending ? "جاري الحفظ..." : "تسجيل الدرجة"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
