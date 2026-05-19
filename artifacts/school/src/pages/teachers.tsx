import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, getListTeachersQueryKey, useGetMe,
} from "@workspace/api-client-react";
import type { Teacher } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type TeacherForm = { fullName: string; specialization: string; phone: string; email: string; address: string; hireDate: string; status: string };
const emptyForm: TeacherForm = { fullName: "", specialization: "", phone: "", email: "", address: "", hireDate: "", status: "active" };
const inputCls = "w-full px-3 py-2.5 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const labelCls = "block text-sm font-semibold text-foreground mb-1.5";

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const { data: teachers, isLoading } = useListTeachers(
    { search: search || undefined },
    { query: { queryKey: getListTeachersQueryKey({ search: search || undefined }) } }
  );

  const createMutation = useCreateTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "✓ تم إضافة المعلم" }); } } });
  const updateMutation = useUpdateTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); setShowForm(false); setEditing(null); setForm(emptyForm); toast({ title: "✓ تم تحديث بيانات المعلم" }); } } });
  const deleteMutation = useDeleteTeacher({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() }); toast({ title: "تم حذف المعلم" }); } } });

  function openEdit(e: React.MouseEvent, t: Teacher) {
    e.stopPropagation();
    setEditing(t);
    setForm({ fullName: t.fullName, specialization: t.specialization, phone: t.phone, email: t.email ?? "", address: t.address ?? "", hireDate: t.hireDate ?? "", status: t.status });
    setShowForm(true);
  }
  function handleDelete(e: React.MouseEvent, t: Teacher) {
    e.stopPropagation();
    if (confirm("حذف هذا المعلم؟")) deleteMutation.mutate({ id: t.id });
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate({ data: form });
  }
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">المعلمون</h1>
            <p className="text-muted-foreground text-sm mt-0.5">إدارة بيانات الكادر التدريسي</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              إضافة معلم
            </button>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="relative max-w-sm">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="بحث بالاسم أو التخصص..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["الرمز", "الاسم الكامل", "التخصص", "الهاتف", "تاريخ التعيين", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-4 bg-muted animate-pulse rounded-lg" /></td>)}</tr>
                  ))
                ) : (teachers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">👩‍🏫</span>
                        <p className="font-semibold text-foreground">لا يوجد معلمون</p>
                        <p className="text-sm text-muted-foreground">ابدأ بإضافة المعلمين إلى النظام</p>
                      </div>
                    </td>
                  </tr>
                ) : (teachers ?? []).map((t) => (
                  <tr key={t.id} onClick={() => navigate(`/teachers/${t.id}`)}
                    className="hover:bg-primary/3 transition-colors cursor-pointer group">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">{t.teacherCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {t.fullName.split(" ").slice(0, 2).map(w => w[0]).join("")}
                        </div>
                        <span className="font-semibold group-hover:text-primary transition-colors">{t.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-primary/8 text-primary text-xs px-2 py-1 rounded-lg font-medium">{t.specialization}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs" dir="ltr">{t.phone}</td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{t.hireDate ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${t.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {t.status === "active" ? "فعال" : "غير فعال"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={(e) => openEdit(e, t)} className="px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors">تعديل</button>
                          <button onClick={(e) => handleDelete(e, t)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors">حذف</button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(teachers ?? []).length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">إجمالي: {teachers?.length} معلم</span>
              <span>انقر على أي صف لعرض التفاصيل</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{editing ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}</h3>
                {editing && <p className="text-xs text-muted-foreground mt-0.5">{editing.teacherCode}</p>}
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {[
                { label: "الاسم الكامل *", key: "fullName", required: true, placeholder: "الاسم الثلاثي" },
                { label: "التخصص *", key: "specialization", required: true, placeholder: "مثال: الرياضيات" },
                { label: "الهاتف *", key: "phone", required: true, placeholder: "07XXXXXXXXX" },
                { label: "البريد الإلكتروني", key: "email", placeholder: "اختياري" },
                { label: "العنوان", key: "address", placeholder: "اختياري" },
              ].map(({ label, key, required, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input required={required} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className={inputCls} placeholder={placeholder} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>تاريخ التعيين</label>
                  <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="active">فعال</option>
                    <option value="inactive">غير فعال</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all">
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث البيانات" : "إضافة المعلم"}
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
