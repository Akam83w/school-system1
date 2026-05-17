import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListAttendance,
  useListStudents,
  useListClasses,
  useRecordAttendance,
  useUpdateAttendance,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import type { Attendance } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const statusOptions = ["حاضر", "غائب", "متأخر"];
const statusColors: Record<string, string> = {
  "حاضر": "bg-emerald-100 text-emerald-700",
  "غائب": "bg-red-100 text-red-700",
  "متأخر": "bg-amber-100 text-amber-700",
};

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [classFilter, setClassFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ studentId: "", classId: "", date: today, status: "حاضر", notes: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    date: dateFilter || undefined,
    classId: classFilter ? Number(classFilter) : undefined,
  };
  const { data: records, isLoading } = useListAttendance(params, { query: { queryKey: getListAttendanceQueryKey(params) } });
  const { data: students } = useListStudents();
  const { data: classes } = useListClasses();

  const recordMutation = useRecordAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        setShowForm(false);
        setForm({ studentId: "", classId: "", date: today, status: "حاضر", notes: "" });
        toast({ title: "تم تسجيل الحضور" });
      },
    },
  });
  const updateMutation = useUpdateAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        setEditingId(null);
        toast({ title: "تم تحديث سجل الحضور" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    recordMutation.mutate({ data: { studentId: Number(form.studentId), classId: Number(form.classId), date: form.date, status: form.status, notes: form.notes } });
  }

  const summary = {
    present: (records ?? []).filter(r => r.status === "حاضر").length,
    absent: (records ?? []).filter(r => r.status === "غائب").length,
    late: (records ?? []).filter(r => r.status === "متأخر").length,
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">الحضور والغياب</h1>
            <p className="text-muted-foreground text-sm">تسجيل ومتابعة الحضور اليومي</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm">+ تسجيل حضور</button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
            <option value="">جميع الصفوف</option>
            {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
          </select>
        </div>

        {/* Summary */}
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

        {/* Table */}
        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["الطالب", "الصف", "التاريخ", "الحالة", "ملاحظات", "تعديل"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">{[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>
                )) : (records ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا توجد سجلات لهذا اليوم</td></tr>
                ) : (records ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.studentName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.className}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <select
                          defaultValue={r.status}
                          onChange={(e) => {
                            updateMutation.mutate({ id: r.id, data: { status: e.target.value, notes: r.notes ?? "" } });
                          }}
                          className="px-2 py-1 rounded border border-border text-xs bg-background"
                        >
                          {statusOptions.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? "bg-muted"}`}>{r.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.notes ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                        className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      >
                        {editingId === r.id ? "إغلاق" : "تعديل"}
                      </button>
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
              <h3 className="text-lg font-bold">تسجيل حضور جديد</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <label className="block text-sm font-medium mb-1">الصف *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  <option value="">اختر الصف</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة *</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                  {statusOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={recordMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">{recordMutation.isPending ? "جاري الحفظ..." : "تسجيل"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
