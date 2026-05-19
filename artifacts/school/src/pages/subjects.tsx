import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListSubjects, useListTeachers, useListClasses, useCreateSubject, useUpdateSubject,
  useDeleteSubject, getListSubjectsQueryKey,
} from "@workspace/api-client-react";
import type { Subject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SubjectForm = { name: string; teacherId: string; classId: string; weeklyHours: string; description: string };
const emptyForm: SubjectForm = { name: "", teacherId: "", classId: "", weeklyHours: "4", description: "" };
const inputCls = "w-full px-3 py-2.5 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const labelCls = "block text-sm font-semibold text-foreground mb-1.5";

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700",
];

export default function SubjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subjects, isLoading } = useListSubjects();
  const { data: teachers } = useListTeachers();
  const { data: classes } = useListClasses();

  const createMutation = useCreateSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "✓ تم إضافة المادة" }); } } });
  const updateMutation = useUpdateSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); setShowForm(false); setEditing(null); setForm(emptyForm); toast({ title: "✓ تم تحديث المادة" }); } } });
  const deleteMutation = useDeleteSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); toast({ title: "تم حذف المادة" }); } } });

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ name: s.name, teacherId: String(s.teacherId), classId: String(s.classId), weeklyHours: String(s.weeklyHours), description: s.description ?? "" });
    setShowForm(true);
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, teacherId: Number(form.teacherId), classId: Number(form.classId), weeklyHours: Number(form.weeklyHours), description: form.description };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate({ data: payload });
  }
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">المواد الدراسية</h1>
            <p className="text-muted-foreground text-sm mt-0.5">إدارة المواد الدراسية والمناهج</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة مادة
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["اسم المادة", "الصف", "المعلم المسؤول", "الحصص الأسبوعية", "الوصف", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  [...Array(4)].map((_, i) => <tr key={i}>{[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-4 bg-muted animate-pulse rounded-lg" /></td>)}</tr>)
                ) : (subjects ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📚</span>
                        <p className="font-semibold text-foreground">لا توجد مواد دراسية</p>
                        <p className="text-sm text-muted-foreground">ابدأ بإضافة المواد الدراسية</p>
                      </div>
                    </td>
                  </tr>
                ) : (subjects ?? []).map((s, idx) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${SUBJECT_COLORS[idx % SUBJECT_COLORS.length]}`}>
                          {s.name[0]}
                        </div>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{s.className}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{s.teacherName}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-semibold">{s.weeklyHours} حصص</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs max-w-[150px] truncate">{s.description ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(s)} className="px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors">تعديل</button>
                        <button onClick={() => { if (confirm("حذف هذه المادة؟")) deleteMutation.mutate({ id: s.id }); }} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(subjects ?? []).length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              إجمالي: <span className="font-semibold">{subjects?.length}</span> مادة دراسية
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{editing ? "تعديل المادة الدراسية" : "إضافة مادة جديدة"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>اسم المادة *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="مثال: الرياضيات" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>الصف *</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={inputCls}>
                    <option value="">اختر الصف</option>
                    {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>المعلم *</label>
                  <select required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={inputCls}>
                    <option value="">اختر المعلم</option>
                    {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>الحصص الأسبوعية</label>
                  <input type="number" min="1" max="10" value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value }) } rows={2} className={`${inputCls} resize-none`} placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all">
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة المادة"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
