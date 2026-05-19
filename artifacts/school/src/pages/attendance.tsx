import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListAttendance,
  useListStudents,
  useListClasses,
  useRecordAttendance,
  getListAttendanceQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["حاضر", "غائب", "متأخر"];
const STATUS_COLORS: Record<string, string> = {
  "حاضر": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "غائب": "bg-red-100 text-red-700 border-red-200",
  "متأخر": "bg-amber-100 text-amber-700 border-amber-200",
};

const CURRENT_YEAR = "2024-2025";
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [classFilter, setClassFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [studentFilter, setStudentFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: "", classId: "", date: today, status: "حاضر", academicYear: CURRENT_YEAR, notes: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const userRole = (me as any)?.role ?? "";

  const params = {
    date: dateFilter || undefined,
    classId: classFilter ? Number(classFilter) : undefined,
    studentId: studentFilter ? Number(studentFilter) : undefined,
    academicYear: yearFilter || undefined,
  };
  const { data: records, isLoading } = useListAttendance(params, { query: { queryKey: getListAttendanceQueryKey(params) } });
  const { data: students } = useListStudents();
  const { data: classes } = useListClasses();

  const recordMutation = useRecordAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        setShowForm(false);
        setForm({ studentId: "", classId: "", date: today, status: "حاضر", academicYear: CURRENT_YEAR, notes: "" });
        toast({ title: "تم تسجيل الحضور بنجاح" });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "حدث خطأ";
        toast({ title: "فشل التسجيل", description: msg, variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    recordMutation.mutate({
      data: {
        studentId: Number(form.studentId),
        classId: Number(form.classId),
        date: form.date,
        status: form.status,
        academicYear: form.academicYear,
        notes: form.notes,
      },
    });
  }

  const summary = {
    present: (records ?? []).filter(r => r.status === "حاضر").length,
    absent: (records ?? []).filter(r => r.status === "غائب").length,
    late: (records ?? []).filter(r => r.status === "متأخر").length,
  };

  const canRecord = userRole === "admin" || userRole === "teacher";

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">الحضور والغياب</h1>
            <p className="text-muted-foreground text-sm">سجل تاريخي يومي — كل يوم يُضاف كسجل جديد دون حذف</p>
          </div>
          {canRecord && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">
              + تسجيل حضور
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">تصفية السجلات</p>
          <div className="flex flex-wrap gap-3">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الأعوام</option>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الصفوف</option>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
              <option value="">جميع الطلاب</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            <button onClick={() => { setDateFilter(""); setClassFilter(""); setStudentFilter(""); setYearFilter(CURRENT_YEAR); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              إعادة تعيين
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{summary.present}</p>
            <p className="text-sm text-emerald-600 mt-1">حاضر</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
            <p className="text-sm text-red-600 mt-1">غائب</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{summary.late}</p>
            <p className="text-sm text-amber-600 mt-1">متأخر</p>
          </div>
        </div>

        {/* Records table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-semibold">سجلات الحضور</span>
            <span className="text-xs text-muted-foreground">{(records ?? []).length} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20 border-b border-border">
                  {["الطالب", "الصف", "التاريخ", "العام الدراسي", "الحالة", "ملاحظات"].map((h) => (
                    <th key={h} className="text-right px-4 py-2.5 font-semibold text-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                  </tr>
                )) : (records ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-3xl mb-2">✅</p>
                      <p className="text-muted-foreground text-sm">لا توجد سجلات لهذا الفلتر</p>
                    </td>
                  </tr>
                ) : (records ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{r.studentName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.className}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{r.date}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{(r as any).academicYear ?? CURRENT_YEAR}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[r.status] ?? "bg-muted border-border"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add attendance modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">تسجيل حضور جديد</h3>
                <p className="text-xs text-muted-foreground mt-0.5">يُضاف كسجل تاريخي — لا يمكن الكتابة فوق سجل سابق</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">العام الدراسي *</label>
                <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الطالب *</label>
                <select required value={form.studentId} onChange={(e) => {
                  const s = (students ?? []).find(st => st.id === Number(e.target.value));
                  setForm({ ...form, studentId: e.target.value, classId: s?.classId ? String(s.classId) : form.classId });
                }} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الطالب</option>
                  {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName} - {s.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الصف *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الصف</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة *</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, status: s })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.status === s ? STATUS_COLORS[s] + " font-bold" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={recordMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
                  {recordMutation.isPending ? "جاري التسجيل..." : "تسجيل"}
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
