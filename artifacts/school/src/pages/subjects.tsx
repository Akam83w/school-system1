import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListSubjects,
  useListTeachers,
  useListClasses,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  getListSubjectsQueryKey,
} from "@workspace/api-client-react";
import type { Subject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SubjectForm = { name: string; teacherId: string; classId: string; weeklyHours: string; description: string };
const emptyForm: SubjectForm = { name: "", teacherId: "", classId: "", weeklyHours: "4", description: "" };

export default function SubjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subjects, isLoading } = useListSubjects();
  const { data: teachers } = useListTeachers();
  const { data: classes } = useListClasses();

  const createMutation = useCreateSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "تم إضافة المادة" }); } } });
  const updateMutation = useUpdateSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); setShowForm(false); setEditing(null); setForm(emptyForm); toast({ title: "تم تحديث المادة" }); } } });
  const deleteMutation = useDeleteSubject({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() }); toast({ title: "تم حذف المادة" }); } } });

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ name: s.name, teacherId: String(s.teacherId), classId: String(s.classId), weeklyHours: String(s.weeklyHours), description: s.description ?? "" });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, teacherId: Number(form.teacherId), classId: Number(form.classId), weeklyHours: Number(form.weeklyHours), description: form.description };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
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
            <h1 className="text-2xl font-bold">المواد الدراسية</h1>
            <p className="text-muted-foreground text-sm">إدارة المواد والمناهج</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">+ إضافة مادة</button>
        </div>

        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["اسم المادة", "الصف", "المعلم", "الحصص الأسبوعية", "الوصف", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-border">{[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>
                )) : (subjects ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>
                ) : (subjects ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.teacherName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{s.weeklyHours} حصص</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[150px] truncate">{s.description ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">تعديل</button>
                        <button onClick={() => { if (confirm("حذف هذه المادة؟")) deleteMutation.mutate({ id: s.id }); }} className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل المادة" : "إضافة مادة جديدة"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المادة *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الصف *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الصف</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المعلم *</label>
                <select required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر المعلم</option>
                  {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحصص الأسبوعية</label>
                <input type="number" min="1" max="10" value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">{isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة"}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
