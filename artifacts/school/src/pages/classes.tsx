import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListClasses,
  useListTeachers,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  getListClassesQueryKey,
} from "@workspace/api-client-react";
import type { Class } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const grades = ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس"];
type ClassForm = { name: string; grade: string; teacherId: string; capacity: string; academicYear: string; room: string };
const emptyForm: ClassForm = { name: "أ", grade: "الصف الأول", teacherId: "", capacity: "30", academicYear: "2024-2025", room: "" };

export default function ClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classes, isLoading } = useListClasses();
  const { data: teachers } = useListTeachers();

  const createMutation = useCreateClass({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "تم إضافة الصف" }); } } });
  const updateMutation = useUpdateClass({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() }); setShowForm(false); setEditing(null); setForm(emptyForm); toast({ title: "تم تحديث الصف" }); } } });
  const deleteMutation = useDeleteClass({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() }); toast({ title: "تم حذف الصف" }); } } });

  function openEdit(c: Class) {
    setEditing(c);
    setForm({ name: c.name, grade: c.grade, teacherId: String(c.teacherId), capacity: String(c.capacity), academicYear: c.academicYear, room: c.room ?? "" });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, grade: form.grade, teacherId: Number(form.teacherId), capacity: Number(form.capacity), academicYear: form.academicYear, room: form.room };
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
            <h1 className="text-2xl font-bold">الصفوف الدراسية</h1>
            <p className="text-muted-foreground text-sm">إدارة الصفوف والشعب</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">+ إضافة صف</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? [...Array(6)].map((_, i) => <div key={i} className="rounded-xl h-36 bg-muted animate-pulse" />) :
            (classes ?? []).map((c) => (
              <div key={c.id} className="bg-card rounded-xl border border-card-border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-foreground">{c.grade} - {c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.academicYear}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(c)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">تعديل</button>
                    <button onClick={() => { if (confirm("حذف هذا الصف؟")) deleteMutation.mutate({ id: c.id }); }} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">حذف</button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المعلم المسؤول</span>
                    <span className="font-medium text-foreground">{c.teacherName}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>عدد الطلاب</span>
                    <span className="font-medium text-foreground">{c.studentCount} / {c.capacity}</span>
                  </div>
                  {c.room && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>الغرفة</span>
                      <span className="font-medium text-foreground">{c.room}</span>
                    </div>
                  )}
                </div>
                {/* capacity bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (c.studentCount / c.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل الصف" : "إضافة صف جديد"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الصف *</label>
                  <select required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                    {grades.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الشعبة *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="أ، ب، ج..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">المعلم المسؤول *</label>
                  <select required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                    <option value="">اختر المعلم</option>
                    {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الطاقة الاستيعابية</label>
                  <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">السنة الدراسية</label>
                  <input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الغرفة</label>
                  <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="رقم الغرفة" />
                </div>
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
