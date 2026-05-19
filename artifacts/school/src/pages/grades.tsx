import { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout";
import {
  useListGrades, useListStudents, useListSubjects, useListClasses,
  useCreateGrade, useDeleteGrade, getListGradesQueryKey, useGetMe,
} from "@workspace/api-client-react";
import type { Grade } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { enqueueAction, getOfflineActionsForEntity } from "@/lib/offlineSync";
import type { OfflineAction } from "@/lib/offlineDb";

const EXAM_TYPES = ["اختبار الشهر الأول", "اختبار الشهر الثاني", "امتحان نصف السنة", "الامتحان النهائي", "امتحانات مستمرة", "واجب بيتي"];
const CURRENT_YEAR = "2024-2025";
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];

type GradeForm = { studentId: string; subjectId: string; classId: string; score: string; maxScore: string; examType: string; examDate: string; academicYear: string; notes: string };
const emptyForm: GradeForm = { studentId: "", subjectId: "", classId: "", score: "", maxScore: "100", examType: EXAM_TYPES[0], examDate: new Date().toISOString().split("T")[0], academicYear: CURRENT_YEAR, notes: "" };

function getBase() {
  return (import.meta.env.BASE_URL as string).replace(/\/$/, '');
}

function getGradeStyle(pct: number) {
  if (pct >= 90) return { cls: "text-emerald-600 font-black", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 70) return { cls: "text-blue-600 font-bold", badge: "bg-blue-50 text-blue-700 border-blue-200" };
  if (pct >= 50) return { cls: "text-amber-600 font-bold", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  return { cls: "text-red-600 font-bold", badge: "bg-red-50 text-red-700 border-red-200" };
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const selectFilterCls = "px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

export default function GradesPage() {
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GradeForm>(emptyForm);
  const [offlinePending, setOfflinePending] = useState<OfflineAction[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const { isOnline, pendingCount } = useNetworkStatus();

  const params = { classId: classFilter ? Number(classFilter) : undefined, subjectId: subjectFilter ? Number(subjectFilter) : undefined, studentId: studentFilter ? Number(studentFilter) : undefined, academicYear: yearFilter || undefined, examType: examTypeFilter || undefined };
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
        toast({ title: "✓ تم تسجيل الدرجة" });
      },
      onError: (err: any) => {
        toast({ title: "فشل التسجيل", description: err?.response?.data?.error ?? "حدث خطأ", variant: "destructive" });
      },
    },
  });
  const deleteMutation = useDeleteGrade({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() }); toast({ title: "تم حذف الدرجة" }); } } });

  const loadOfflinePending = useCallback(async () => {
    const items = await getOfflineActionsForEntity('grade');
    setOfflinePending(items);
  }, []);

  useEffect(() => { loadOfflinePending(); }, [loadOfflinePending, pendingCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      studentId: Number(form.studentId),
      subjectId: Number(form.subjectId),
      classId: Number(form.classId),
      score: Number(form.score),
      maxScore: Number(form.maxScore),
      examType: form.examType,
      examDate: form.examDate,
      academicYear: form.academicYear,
      notes: form.notes,
    };

    if (!isOnline) {
      const studentName = (students ?? []).find(s => s.id === Number(form.studentId))?.fullName ?? '';
      const subjectName = (subjects ?? []).find(s => s.id === Number(form.subjectId))?.name ?? '';
      const className = (classes ?? []).find(c => c.id === Number(form.classId))?.name ?? '';
      const pct = Math.round((Number(form.score) / Number(form.maxScore)) * 100);

      await enqueueAction({
        tempId: `grade-${Date.now()}`,
        method: 'POST',
        url: `${getBase()}/api/grades`,
        body: payload as Record<string, unknown>,
        entity: 'grade',
        displayLabel: `درجة ${studentName} في ${subjectName}: ${form.score}/${form.maxScore}`,
        localData: {
          studentName,
          subjectName,
          className,
          score: Number(form.score),
          maxScore: Number(form.maxScore),
          pct,
          examType: form.examType,
          examDate: form.examDate,
          academicYear: form.academicYear,
          notes: form.notes,
        },
      });
      toast({ title: "✓ تم الحفظ محلياً", description: "سيُزامَن تلقائياً عند عودة الاتصال" });
      setShowForm(false);
      setForm(emptyForm);
      await loadOfflinePending();
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const gradesByYear = (grades ?? []).reduce<Record<string, Grade[]>>((acc, g) => {
    const year = (g as any).academicYear ?? CURRENT_YEAR;
    if (!acc[year]) acc[year] = [];
    acc[year].push(g);
    return acc;
  }, {});
  const yearKeys = Object.keys(gradesByYear).sort().reverse();
  const hasFilters = yearFilter !== CURRENT_YEAR || examTypeFilter || classFilter || subjectFilter || studentFilter;
  const totalCount = (grades ?? []).length + offlinePending.length;

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">سجل الدرجات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isLoading ? "جاري التحميل..." : `${totalCount} درجة مسجّلة${offlinePending.length > 0 ? ` (${offlinePending.length} معلقة)` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                وضع غير متصل
              </span>
            )}
            <button onClick={() => { setForm(emptyForm); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              تسجيل درجة
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">تصفية النتائج</p>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={selectFilterCls}>
              <option value="">جميع الأعوام</option>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)} className={selectFilterCls}>
              <option value="">جميع أنواع الامتحانات</option>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectFilterCls}>
              <option value="">جميع الصفوف</option>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={selectFilterCls}>
              <option value="">جميع المواد</option>
              {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className={selectFilterCls}>
              <option value="">جميع الطلاب</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setYearFilter(CURRENT_YEAR); setExamTypeFilter(""); setClassFilter(""); setSubjectFilter(""); setStudentFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">إعادة تعيين</button>
            )}
          </div>
        </div>

        {/* Offline pending section */}
        {offlinePending.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-bold text-amber-800">درجات معلقة — في انتظار الاتصال</span>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg">{offlinePending.length} سجل</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-50/50">
                    {["الطالب", "المادة", "الصف", "الدرجة", "النسبة", "نوع الامتحان", "التاريخ", "الحالة"].map((h) => (
                      <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold text-amber-700 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {offlinePending.map((action) => {
                    const d = action.localData ?? {};
                    const score = Number(d.score ?? 0);
                    const maxScore = Number(d.maxScore ?? 100);
                    const pct = Math.round((score / maxScore) * 100);
                    const style = getGradeStyle(pct);
                    return (
                      <tr key={action.tempId} className="bg-amber-50/30">
                        <td className="px-4 py-3 font-semibold text-amber-900">{String(d.studentName ?? '—')}</td>
                        <td className="px-4 py-3 text-amber-800">{String(d.subjectName ?? '—')}</td>
                        <td className="px-4 py-3 text-amber-700 text-xs">{String(d.className ?? '—')}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="font-bold">{score}</span>
                          <span className="text-amber-600 text-xs">/{maxScore}</span>
                        </td>
                        <td className="px-4 py-3"><span className={`text-sm ${style.cls}`}>{pct}%</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}>{String(d.examType ?? '—')}</span>
                        </td>
                        <td className="px-4 py-3 text-amber-700 text-xs font-mono">{String(d.examDate ?? '—')}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            ⏳ معلق
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (grades ?? []).length === 0 && offlinePending.length === 0 && (
          <div className="bg-white rounded-xl border border-border p-16 text-center shadow-sm">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-semibold text-foreground mb-1">لا توجد درجات مسجّلة</p>
            <p className="text-sm text-muted-foreground">
              {!isOnline ? "أنت في وضع عدم الاتصال — يمكنك تسجيل الدرجات وستُحفظ محلياً" : "ابدأ بتسجيل درجات الطلاب"}
            </p>
          </div>
        )}

        {/* Grouped by year (server data) */}
        {!isLoading && yearKeys.map((year) => {
          const yearGrades = gradesByYear[year];
          const avg = yearGrades.length > 0 ? Math.round(yearGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / yearGrades.length) : null;
          const avgStyle = avg !== null ? getGradeStyle(avg) : null;
          return (
            <div key={year} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-primary rounded-full" />
                  <span className="text-sm font-bold text-foreground">العام الدراسي: {year}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">{yearGrades.length} سجل</span>
                </div>
                {avgStyle && avg !== null && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${avgStyle.badge}`}>
                    المتوسط: {avg}%
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      {["الطالب", "المادة", "الصف", "الدرجة", "النسبة", "نوع الامتحان", "التاريخ", ...(isAdmin ? ["حذف"] : [])].map((h) => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {yearGrades.map((g) => {
                      const pct = Math.round((g.score / g.maxScore) * 100);
                      const style = getGradeStyle(pct);
                      return (
                        <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-semibold">{g.studentName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{g.subjectName}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{g.className}</td>
                          <td className="px-4 py-3 font-mono">
                            <span className="font-bold">{g.score}</span>
                            <span className="text-muted-foreground text-xs">/{g.maxScore}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${style.cls}`}>{pct}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}>{g.examType}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{g.examDate}</td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <button onClick={() => { if (confirm("حذف هذه الدرجة؟")) deleteMutation.mutate({ id: g.id }); }}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors">حذف</button>
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">تسجيل درجة جديدة</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isOnline ? "الدرجات محفوظة كسجلات تاريخية دائمة" : "⚡ سيُحفظ محلياً ويُزامَن لاحقاً"}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">العام الدراسي *</label>
                  <select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className={inputCls}>
                    {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">نوع الامتحان *</label>
                  <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} className={inputCls}>
                    {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">الطالب *</label>
                <select required value={form.studentId} onChange={(e) => {
                  const s = (students ?? []).find(st => st.id === Number(e.target.value));
                  setForm({ ...form, studentId: e.target.value, classId: s?.classId ? String(s.classId) : form.classId });
                }} className={inputCls}>
                  <option value="">اختر الطالب</option>
                  {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">الصف *</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={inputCls}>
                    <option value="">اختر الصف</option>
                    {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">المادة *</label>
                  <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={inputCls}>
                    <option value="">اختر المادة</option>
                    {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">الدرجة المحصلة *</label>
                  <input required type="number" min="0" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className={inputCls} placeholder="مثال: 85" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">الدرجة الكاملة *</label>
                  <input required type="number" min="1" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">تاريخ الامتحان *</label>
                <input required type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all">
                  {createMutation.isPending ? "جاري الحفظ..." : isOnline ? "تسجيل الدرجة" : "حفظ محلياً ⚡"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
