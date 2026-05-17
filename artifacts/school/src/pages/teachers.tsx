import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListTeachers,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  getListTeachersQueryKey,
} from "@workspace/api-client-react";
import type { Teacher } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type TeacherForm = { fullName: string; specialization: string; phone: string; email: string; address: string; hireDate: string; status: string };
const emptyForm: TeacherForm = { fullName: "", specialization: "", phone: "", email: "", address: "", hireDate: "", status: "active" };

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teachers, isLoading } = useListTeachers(
    { search: search || undefined },
    { query: { queryKey: getListTeachersQueryKey({ search: search || undefined }) } }
  );

  const createMutation = useCreateTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "تم إضافة المعلم" }); } } });
  const updateMutation = useUpdateTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); setShowForm(false); setEditing(null); setForm(emptyForm); toast({ title: "تم تحديث بيانات المعلم" }); } } });
  const deleteMutation = useDeleteTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); toast({ title: "تم حذف المعلم" }); } } });

  function openEdit(t: Teacher) {
    setEditing(t);
    setForm({ fullName: t.fullName, specialization: t.specialization, phone: t.phone, email: t.email ?? "", address: t.address ?? "", hireDate: t.hireDate ?? "", status: t.status });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate({ data: form });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">المعلمون</h1>
            <p className="text-muted-foreground text-sm">إدارة بيانات المعلمين</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">+ إضافة معلم</button>
        </div>

        <input type="text" placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-sm px-4 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />

        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["الرمز", "الاسم", "التخصص", "الهاتف", "تاريخ التعيين", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-border">{[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>
                )) : (teachers ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>
                ) : (teachers ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.teacherCode}</td>
                    <td className="px-4 py-3 font-medium">{t.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.specialization}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.hireDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {t.status === "active" ? "فعال" : "غير فعال"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(t)} className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">تعديل</button>
                        <button onClick={() => { if (confirm("حذف هذا المعلم؟")) deleteMutation.mutate({ id: t.id }); }} className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">حذف</button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {[
                { label: "الاسم الكامل *", key: "fullName", required: true },
                { label: "التخصص *", key: "specialization", required: true },
                { label: "الهاتف *", key: "phone", required: true },
                { label: "البريد الإلكتروني", key: "email" },
                { label: "العنوان", key: "address" },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    required={required}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ التعيين</label>
                <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="active">فعال</option>
                  <option value="inactive">غير فعال</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
