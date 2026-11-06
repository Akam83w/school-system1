import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useListClasses,
  getListStudentsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type StudentForm = {
  fullName: string;
  nationalId: string;
  classId: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  address: string;
  status: string;
};

const emptyForm: StudentForm = {
  fullName: "",
  nationalId: "",
  classId: "",
  gender: "male",
  dateOfBirth: "",
  phone: "",
  parentName: "",
  parentPhone: "",
  address: "",
  status: "active",
};

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const labelCls = "block text-sm font-semibold text-foreground mb-1.5";

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const listParams = {
    search: search || undefined,
    classId: classFilter ? Number(classFilter) : undefined,
  };

  const { data: students, isLoading } = useListStudents(listParams, {
    query: { queryKey: getListStudentsQueryKey(listParams) },
  });
  const { data: classes } = useListClasses();

  const createMutation = useCreateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "✓ تم إضافة الطالب" });
      },
      onError: (err: any) => {
        toast({
          title: "فشل الإضافة",
          description: err?.message || "حدث خطأ",
          variant: "destructive",
        });
      },
    },
  });

  const updateMutation = useUpdateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
        toast({ title: "✓ تم تحديث بيانات الطالب" });
      },
      onError: (err: any) => {
        toast({
          title: "فشل التحديث",
          description: err?.message || "حدث خطأ",
          variant: "destructive",
        });
      },
    },
  });

  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        toast({ title: "تم حذف الطالب" });
      },
      onError: (err: any) => {
        toast({
          title: "فشل الحذف",
          description: err?.message || "حدث خطأ",
          variant: "destructive",
        });
      },
    },
  });

  function openEdit(e: React.MouseEvent, s: Student) {
    e.stopPropagation();
    setEditing(s);
    setForm({
      fullName: s.fullName,
      nationalId: s.nationalId ?? "",
      classId: String(s.classId ?? ""),
      gender: s.gender || "male",
      dateOfBirth: s.dateOfBirth ?? "",
      phone: s.phone ?? "",
      parentName: s.parentName ?? "",
      parentPhone: s.parentPhone ?? "",
      address: s.address ?? "",
      status: s.status || "active",
    });
    setShowForm(true);
  }

  function handleDelete(e: React.MouseEvent, s: Student) {
    e.stopPropagation();
    if (confirm(`حذف الطالب "${s.fullName}"؟`)) {
      deleteMutation.mutate({ id: s.id });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.classId || !form.dateOfBirth) {
      toast({
        title: "بيانات ناقصة",
        description: "الاسم والصف وتاريخ الميلاد مطلوبة",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      fullName: form.fullName.trim(),
      nationalId: form.nationalId.trim() || undefined,
      classId: Number(form.classId),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone.trim() || undefined,
      parentName: form.parentName.trim() || undefined,
      parentPhone: form.parentPhone.trim() || undefined,
      address: form.address.trim() || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">الطلاب</h1>
            <p className="text-muted-foreground text-sm mt-0.5">إدارة بيانات الطلاب المسجلين في النظام</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              إضافة طالب
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="بحث بالاسم أو الرمز..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white min-w-[160px]"
          >
            <option value="">كل الصفوف</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["الرمز", "الاسم الكامل", "الصف", "الجنس", "تاريخ الميلاد", "ولي الأمر", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-muted animate-pulse rounded-lg" /></td>
                      ))}
                    </tr>
                  ))
                ) : (students ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">👨‍🎓</span>
                        <p className="font-semibold text-foreground">لا يوجد طلاب</p>
                        <p className="text-sm text-muted-foreground">ابدأ بإضافة الطلاب إلى النظام</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (students ?? []).map((s) => (
                    <tr key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="hover:bg-primary/3 transition-colors cursor-pointer group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">{s.studentCode}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {s.fullName.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                          </div>
                          <span className="font-semibold group-hover:text-primary transition-colors">{s.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-primary/8 text-primary text-xs px-2 py-1 rounded-lg font-medium">{s.className || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {s.gender === "male" ? "ذكر" : s.gender === "female" ? "أنثى" : s.gender}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{s.dateOfBirth ?? "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{s.parentName || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                          {s.status === "active" ? "فعال" : "غير فعال"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={(e) => openEdit(e, s)} className="px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors">تعديل</button>
                            <button onClick={(e) => handleDelete(e, s)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors">حذف</button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(students ?? []).length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">إجمالي: {students?.length} طالب</span>
              <span>انقر على أي صف لعرض التفاصيل</span>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{editing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}</h3>
                {editing && <p className="text-xs text-muted-foreground mt-0.5">{editing.studentCode}</p>}
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>الاسم الكامل *</label>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} placeholder="الاسم الثلاثي" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>الرقم الوطني</label>
                  <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} className={inputCls} placeholder="اختياري" />
                </div>
                <div>
                  <label className={labelCls}>الصف *</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={inputCls}>
                    <option value="">اختر الصف</option>
                    {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>الجنس *</label>
                  <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>تاريخ الميلاد *</label>
                  <input type="date" required value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>هاتف الطالب</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="07XXXXXXXXX" dir="ltr" />
                </div>
                <div>
                  <label className={labelCls}>الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    <option value="active">فعال</option>
                    <option value="inactive">غير فعال</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>اسم ولي الأمر</label>
                  <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className={inputCls} placeholder="اختياري" />
                </div>
                <div>
                  <label className={labelCls}>هاتف ولي الأمر</label>
                  <input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className={inputCls} placeholder="07XXXXXXXXX" dir="ltr" />
                </div>
              </div>
              <div>
                <label className={labelCls}>العنوان</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all">
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث البيانات" : "إضافة الطالب"}
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
