import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListGrades,
  useListStudents,
  useListSubjects,
  useListClasses,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
  getListGradesQueryKey,
} from "@workspace/api-client-react";
import type { Grade } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const examTypes = ["اختبار شهري", "امتحان نصفي", "امتحان نهائي", "واجب بيتي"];
type GradeForm = { studentId: string; subjectId: string; classId: string; score: string; maxScore: string; examType: string; examDate: string; notes: string };
const emptyForm: GradeForm = { studentId: "", subjectId: "", classId: "", score: "", maxScore: "100", examType: "اختبار شهري", examDate: new Date().toISOString().split("T")[0], notes: "" };

function getGradeColor(pct: number) {
  if (pct >= 90) return "text-emerald-600 font-bold";
  if (pct >= 70) return "text-blue-600 font-semibold";
  if (pct >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export default function GradesPage() {
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState<GradeForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    classId: classFilter ? Number(classFilter) : undefined,
    subjectId: subjectFilter ? Number(subjectFilter) : undefined,
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
        toast({ title: "تم تسجيل الدرجة" });
      },
    },
  });
  const updateMutation = useUpdateGrade({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGradesQueryKey() });
        setShowForm(false);
        setEditing(null);
        toast({ title: "تم تحديث الدرجة" });
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

  function openEdit(g: Grade) {
    setEditing(g);
    setForm({ studentId: String(g.studentId), subjectId: String(g.subjectId), classId: String(g.classId), score: String(g.score), maxScore: String(g.maxScore), examType: g.examType, examDate: g.examDate, notes: g.notes ?? "" });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { studentId: Number(form.studentId), subjectId: Number(form.subjectId), classId: Number(form.classId), score: Number(form.score), maxScore: Number(form.maxScore), examType: form.examType, examDate: form.examDate, notes: form.notes };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { score: payload.score, maxScore: payload.maxScore, examType: payload.examType, examDate: payload.examDate, notes: payload.notes } });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">الدرجات</h1>
            <p className="text-muted-foreground text-sm">تسجيل وإدارة درجات الطلاب</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">+ إضافة درجة</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
            <option value="">جميع الصفوف</option>
            {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
            <option value="">جميع المواد</option>
            {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["الطالب", "المادة", "الصف", "الدرجة", "نسبة النجاح", "نوع الامتحان", "التاريخ", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">{[...Array(8)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>
                )) : (grades ?? []).length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">لا توجد درجات</td></tr>
                ) : (grades ?? []).map((g) => {
                  const pct = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <tr key={g.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{g.studentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.subjectName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.className}</td>
                      <td className="px-4 py-3 font-mono">{g.score}/{g.maxScore}</td>
                      <td className="px-4 py-3">
                        <span className={getGradeColor(pct)}>{pct}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{g.examType}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{g.examDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(g)} className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">تعديل</button>
                          <button onClick={() => { if (confirm("حذف هذه الدرجة؟")) deleteMutation.mutate({ id: g.id }); }} className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل الدرجة" : "إضافة درجة جديدة"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">الطالب *</label>
                    <select required value={form.studentId} onChange={(e) => {
                      const s = (students ?? []).find(st => st.id === Number(e.target.value));
                      setForm({ ...form, studentId: e.target.value, classId: s ? String(s.classId) : form.classId });
                    }} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                      <option value="">اختر الطالب</option>
                      {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName} - {s.className}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">المادة *</label>
                    <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                      <option value="">اختر المادة</option>
                      {(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} - {s.className}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الصف *</label>
                    <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                      <option value="">اختر الصف</option>
                      {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
                    </select>
                  </div>
                </>
              )}
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
              <div>
                <label className="block text-sm font-medium mb-1">نوع الامتحان *</label>
                <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  {examTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ الامتحان *</label>
                <input required type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">{isPending ? "جاري الحفظ..." : editing ? "تحديث" : "تسجيل"}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
