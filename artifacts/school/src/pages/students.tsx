import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListStudents, useListClasses, useCreateStudent, useUpdateStudent,
  useDeleteStudent, getListStudentsQueryKey, useGetMe,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { offlineDb, type CachedStudent } from "@/lib/offlineDb";

type StudentForm = {
  fullName: string; classId: string; gender: string; dateOfBirth: string;
  phone: string; parentName: string; parentPhone: string; address: string; status: string;
};
const emptyForm: StudentForm = {
  fullName: "", classId: "", gender: "ذكر", dateOfBirth: "",
  phone: "", parentName: "", parentPhone: "", address: "", status: "active",
};

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
const labelCls = "block text-sm font-semibold text-foreground mb-1.5";

function Avatar({ name, colorClass }: { name: string; colorClass: string }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("");
  return (
    <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [cachedStudents, setCachedStudents] = useState<CachedStudent[] | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isOnline } = useNetworkStatus();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const params = { search: search || undefined, classId: classFilter ? Number(classFilter) : undefined };
  const { data: students, isLoading, isError } = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params) } });
  const { data: classes } = useListClasses();

  // Load from IndexedDB when offline or when server data fails
  useEffect(() => {
    if (!isOnline || isError) {
      offlineDb.students.toArray().then((rows) => {
        let filtered = rows;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(s =>
            s.fullName.toLowerCase().includes(q) ||
            s.studentCode?.toLowerCase().includes(q)
          );
        }
        if (classFilter) {
          filtered = filtered.filter(s => s.classId === Number(classFilter));
        }
        setCachedStudents(filtered);
      }).catch(() => setCachedStudents([]));
    } else {
      setCachedStudents(null);
    }
  }, [isOnline, isError, search, classFilter]);

  const createMutation = useCreateStudent({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); setShowForm(false); setForm(emptyForm); toast({ title: "✓ تم إضافة الطالب بنجاح" }); } } });
  const updateMutation = useUpdateStudent({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); setEditing(null); setShowForm(false); setForm(emptyForm); toast({ title: "✓ تم تحديث بيانات الطالب" }); } } });
  const deleteMutation = useDeleteStudent({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); toast({ title: "تم حذف الطالب" }); } } });

  function openAdd() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(s: Student) {
    setEditing(s);
    setForm({ fullName: s.fullName, classId: String(s.classId), gender: s.gender, dateOfBirth: s.dateOfBirth, phone: s.phone ?? "", parentName: s.parentName ?? "", parentPhone: s.parentPhone ?? "", address: s.address ?? "", status: s.status });
    setShowForm(true);
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOnline) {
      toast({ title: "غير متصل", description: "لا يمكن إضافة طلاب جدد في وضع عدم الاتصال", variant: "destructive" });
      return;
    }
    const payload = { fullName: form.fullName, classId: Number(form.classId), gender: form.gender, dateOfBirth: form.dateOfBirth, phone: form.phone, parentName: form.parentName, parentPhone: form.parentPhone, address: form.address, status: form.status };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate({ data: payload });
  }
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Display: prefer server data when online, fall back to IDB when offline
  const displayStudents = (!isOnline || isError) && cachedStudents !== null
    ? cachedStudents as unknown as Student[]
    : (students ?? []);
  const isOfflineFallback = (!isOnline || isError) && cachedStudents !== null;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">الطلاب</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isOfflineFallback
                ? `${displayStudents.length} طالب — بيانات محلية (غير متصل)`
                : "إدارة بيانات الطلاب والسجلات الأكاديمية"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOfflineFallback && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                بيانات محلية
              </span>
            )}
            {isAdmin && (
              <button onClick={openAdd} disabled={!isOnline}
                title={!isOnline ? "الإضافة تتطلب اتصالاً بالإنترنت" : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                إضافة طالب
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="بحث بالاسم أو الرقم..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-background" />
          </div>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white min-w-[160px]">
            <option value="">جميع الصفوف</option>
            {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
          </select>
          {(search || classFilter) && (
            <button onClick={() => { setSearch(""); setClassFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">مسح الفلاتر</button>
          )}
        </div>

        {/* Offline notice */}
        {isOfflineFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-amber-800">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>تعرض الآن بيانات محفوظة محلياً — ستُحدَّث تلقائياً عند عودة الاتصال. عدد الطلاب المحفوظين: <strong>{cachedStudents?.length ?? 0}</strong></span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["رقم الطالب", "الاسم الكامل", "الصف", "الجنس", "ولي الأمر", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading && !isOfflineFallback ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-muted animate-pulse rounded-lg" /></td>
                      ))}
                    </tr>
                  ))
                ) : displayStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">🎓</span>
                        <p className="font-semibold text-foreground">لا توجد بيانات</p>
                        <p className="text-sm text-muted-foreground">
                          {isOfflineFallback ? "لا توجد بيانات محفوظة محلياً" : "ابدأ بإضافة الطلاب إلى النظام"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : displayStudents.map((s) => (
                  <tr key={s.id} onClick={() => !isOfflineFallback && navigate(`/students/${s.id}`)}
                    className={`hover:bg-primary/3 transition-colors ${!isOfflineFallback ? 'cursor-pointer' : ''} group`}>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">{s.studentCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.fullName} colorClass="bg-primary/10 text-primary" />
                        <span className="font-semibold group-hover:text-primary transition-colors">{s.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{s.className}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.gender === "ذكر" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                        {s.gender === "ذكر" ? "♂" : "♀"} {s.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-sm">{s.parentName ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {s.status === "active" ? "فعال" : "غير فعال"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isAdmin && !isOfflineFallback ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(s)}
                            className="px-3 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors">
                            تعديل
                          </button>
                          <button onClick={() => { if (confirm("هل تريد حذف هذا الطالب؟")) deleteMutation.mutate({ id: s.id }); }}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors">
                            حذف
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayStudents.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">إجمالي: {displayStudents.length} طالب</span>
              <span>{isOfflineFallback ? "بيانات محفوظة محلياً" : "انقر على أي صف لعرض الملف الكامل"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{editing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{editing ? `رقم الطالب: ${editing.studentCode}` : "أدخل بيانات الطالب الجديد"}</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>الاسم الكامل *</label>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} placeholder="الاسم الثلاثي" />
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
                  <label className={labelCls}>الجنس *</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>تاريخ الميلاد *</label>
                  <input required type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>رقم الهاتف</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="07XXXXXXXXX" />
                </div>
                <div>
                  <label className={labelCls}>اسم ولي الأمر</label>
                  <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>هاتف ولي الأمر</label>
                  <input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>العنوان</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
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
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث البيانات" : "إضافة الطالب"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
