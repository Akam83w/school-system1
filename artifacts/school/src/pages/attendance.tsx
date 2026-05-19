import { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout";
import {
  useListAttendance, useListStudents, useListClasses, useRecordAttendance,
  getListAttendanceQueryKey, useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { enqueueAction, getOfflineActionsForEntity } from "@/lib/offlineSync";
import type { OfflineAction } from "@/lib/offlineDb";

const STATUS_OPTIONS = ["حاضر", "غائب", "متأخر"];
const STATUS_STYLE: Record<string, { cls: string; dot: string; bg: string }> = {
  "حاضر": { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bg: "bg-emerald-50" },
  "غائب": { cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", bg: "bg-red-50" },
  "متأخر": { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", bg: "bg-amber-50" },
};
const CURRENT_YEAR = "2024-2025";
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];
const inputCls = "px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

function getBase() {
  return (import.meta.env.BASE_URL as string).replace(/\/$/, '');
}

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [classFilter, setClassFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [studentFilter, setStudentFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: "", classId: "", date: today, status: "حاضر", academicYear: CURRENT_YEAR, notes: "" });
  const [offlinePending, setOfflinePending] = useState<OfflineAction[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const canRecord = ["admin", "teacher"].includes((me as any)?.role ?? "");
  const { isOnline, pendingCount } = useNetworkStatus();

  const params = { date: dateFilter || undefined, classId: classFilter ? Number(classFilter) : undefined, studentId: studentFilter ? Number(studentFilter) : undefined, academicYear: yearFilter || undefined };
  const { data: records, isLoading } = useListAttendance(params, { query: { queryKey: getListAttendanceQueryKey(params) } });
  const { data: students } = useListStudents();
  const { data: classes } = useListClasses();

  const recordMutation = useRecordAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        setShowForm(false);
        setForm({ studentId: "", classId: "", date: today, status: "حاضر", academicYear: CURRENT_YEAR, notes: "" });
        toast({ title: "✓ تم تسجيل الحضور" });
      },
      onError: (err: any) => {
        toast({ title: "فشل التسجيل", description: err?.response?.data?.error ?? "حدث خطأ", variant: "destructive" });
      },
    },
  });

  const loadOfflinePending = useCallback(async () => {
    const items = await getOfflineActionsForEntity('attendance');
    setOfflinePending(items);
  }, []);

  useEffect(() => { loadOfflinePending(); }, [loadOfflinePending, pendingCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      studentId: Number(form.studentId),
      classId: Number(form.classId),
      date: form.date,
      status: form.status,
      academicYear: form.academicYear,
      notes: form.notes,
    };

    if (!isOnline) {
      const studentName = (students ?? []).find(s => s.id === Number(form.studentId))?.fullName ?? form.studentId;
      const className = (classes ?? []).find(c => c.id === Number(form.classId))?.name ?? '';
      await enqueueAction({
        tempId: `att-${Date.now()}`,
        method: 'POST',
        url: `${getBase()}/api/attendance`,
        body: payload as Record<string, unknown>,
        entity: 'attendance',
        displayLabel: `حضور ${studentName}: ${form.status}`,
        localData: {
          studentName,
          className,
          date: form.date,
          status: form.status,
          academicYear: form.academicYear,
          notes: form.notes,
        },
      });
      toast({ title: "✓ تم الحفظ محلياً", description: "سيُزامَن تلقائياً عند عودة الاتصال" });
      setShowForm(false);
      setForm({ studentId: "", classId: "", date: today, status: "حاضر", academicYear: CURRENT_YEAR, notes: "" });
      await loadOfflinePending();
    } else {
      recordMutation.mutate({ data: payload });
    }
  }

  const serverRecords = records ?? [];
  const present = serverRecords.filter(r => r.status === "حاضر").length;
  const absent = serverRecords.filter(r => r.status === "غائب").length;
  const late = serverRecords.filter(r => r.status === "متأخر").length;
  const total = serverRecords.length + offlinePending.length;

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">الحضور والغياب</h1>
            <p className="text-muted-foreground text-sm mt-0.5">سجل تاريخي دائم — كل يوم يُضاف كسجل جديد</p>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                وضع غير متصل
              </span>
            )}
            {canRecord && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                تسجيل حضور
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">تصفية السجلات</p>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={inputCls}>
              <option value="">جميع الأعوام</option>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputCls} />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputCls}>
              <option value="">جميع الصفوف</option>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className={inputCls}>
              <option value="">جميع الطلاب</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            {(dateFilter !== today || classFilter || studentFilter || yearFilter !== CURRENT_YEAR) && (
              <button onClick={() => { setDateFilter(today); setClassFilter(""); setStudentFilter(""); setYearFilter(CURRENT_YEAR); }}
                className="text-xs text-muted-foreground hover:text-foreground underline">إعادة تعيين</button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {(total > 0 || offlinePending.length > 0) && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "حاضر", count: present, pct: serverRecords.length ? Math.round(present / serverRecords.length * 100) : 0, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" },
              { label: "غائب", count: absent, pct: serverRecords.length ? Math.round(absent / serverRecords.length * 100) : 0, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500" },
              { label: "متأخر", count: late, pct: serverRecords.length ? Math.round(late / serverRecords.length * 100) : 0, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500" },
            ].map(({ label, count, pct, color, bg, border, bar }) => (
              <div key={label} className={`${bg} border ${border} rounded-xl p-4`}>
                <div className={`text-2xl font-black ${color}`}>{count}</div>
                <div className={`text-sm font-semibold ${color} mt-0.5`}>{label}</div>
                <div className="mt-2 h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
              </div>
            ))}
          </div>
        )}

        {/* Records table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-bold">سجلات الحضور</span>
            <div className="flex items-center gap-2">
              {offlinePending.length > 0 && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold">
                  {offlinePending.length} معلق
                </span>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{total} سجل</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["الطالب", "الصف", "التاريخ", "العام الدراسي", "الحالة", "ملاحظات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* Offline pending rows first */}
                {offlinePending.map((action) => {
                  const d = action.localData ?? {};
                  const status = String(d.status ?? "حاضر");
                  const s = STATUS_STYLE[status] ?? STATUS_STYLE["حاضر"];
                  return (
                    <tr key={action.tempId} className="bg-amber-50/40">
                      <td className="px-4 py-3.5 font-semibold text-amber-900">{String(d.studentName ?? "—")}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{String(d.className ?? "—")}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{String(d.date ?? "—")}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{String(d.academicYear ?? CURRENT_YEAR)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {status}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            ⏳ معلق
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{String(d.notes ?? "—")}</td>
                    </tr>
                  );
                })}

                {/* Server records */}
                {isLoading ? [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-4 bg-muted animate-pulse rounded-lg" /></td>)}</tr>
                )) : serverRecords.length === 0 && offlinePending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">✅</span>
                        <p className="text-muted-foreground text-sm">لا توجد سجلات لهذا الفلتر</p>
                        {!isOnline && <p className="text-xs text-amber-600">أنت في وضع عدم الاتصال — سجل الحضور وسيُحفظ محلياً</p>}
                      </div>
                    </td>
                  </tr>
                ) : serverRecords.map((r) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE["حاضر"];
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-semibold">{r.studentName}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{r.className}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{r.date}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{(r as any).academicYear ?? CURRENT_YEAR}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">تسجيل حضور جديد</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isOnline ? "يُضاف كسجل تاريخي دائم" : "⚡ سيُحفظ محلياً ويُزامَن لاحقاً"}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">العام الدراسي *</label>
                  <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className={`${inputCls} w-full`}>
                    {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">التاريخ *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">الطالب *</label>
                <select required value={form.studentId} onChange={(e) => {
                  const s = (students ?? []).find(st => st.id === Number(e.target.value));
                  setForm({ ...form, studentId: e.target.value, classId: s?.classId ? String(s.classId) : form.classId });
                }} className={`${inputCls} w-full`}>
                  <option value="">اختر الطالب</option>
                  {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.fullName} — {s.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">الصف *</label>
                <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">اختر الصف</option>
                  {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">الحالة *</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((s) => {
                    const st = STATUS_STYLE[s];
                    return (
                      <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.status === s ? `${st.cls} border-current` : "border-border text-muted-foreground hover:border-primary/30"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="اختياري" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={recordMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all">
                  {recordMutation.isPending ? "جاري التسجيل..." : isOnline ? "تسجيل الحضور" : "حفظ محلياً ⚡"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
