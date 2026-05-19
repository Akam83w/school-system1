import { useState, Fragment } from "react";
import { Layout } from "@/components/layout";
import { getToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

type AuditLog = {
  id: number;
  userId: number | null;
  userName: string;
  userPhone: string;
  action: string;
  entity: string;
  entityId: number | null;
  beforeData: any;
  afterData: any;
  createdAt: string;
};

const ACTION_META: Record<string, { label: string; cls: string; dot: string }> = {
  create: { label: "إنشاء", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  update: { label: "تعديل", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  delete: { label: "حذف", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const ENTITY_LABELS: Record<string, string> = {
  student: "طالب", teacher: "معلم", class: "صف", grade: "درجة", attendance: "حضور", subject: "مادة",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-IQ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function fetchAuditLogs(action?: string, entity?: string): Promise<AuditLog[]> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (entity) params.set("entity", entity);
  const res = await fetch(`${base}/api/audit-logs?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("فشل تحميل السجلات");
  return res.json();
}

export default function AuditLogsPage() {
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["audit-logs", filterAction, filterEntity],
    queryFn: () => fetchAuditLogs(filterAction || undefined, filterEntity || undefined),
  });

  const selectCls = "px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">سجل الأحداث</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "جاري التحميل..." : `${(logs ?? []).length} حدث مسجّل في النظام`}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selectCls}>
            <option value="">جميع الإجراءات</option>
            <option value="create">إنشاء</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
          </select>
          <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className={selectCls}>
            <option value="">جميع الكيانات</option>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {(filterAction || filterEntity) && (
            <button onClick={() => { setFilterAction(""); setFilterEntity(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-sm text-red-700">فشل تحميل سجل الأحداث. تأكد من أن لديك صلاحية المدير.</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white border border-border rounded-xl animate-pulse" />)}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {(logs ?? []).length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold text-foreground mb-1">لا توجد أحداث مسجّلة</p>
                <p className="text-sm text-muted-foreground">ستظهر هنا جميع العمليات التي تُجرى على النظام</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["التاريخ والوقت", "المستخدم", "الهاتف", "الإجراء", "الكيان", "المعرّف", "التفاصيل"].map((h) => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(logs ?? []).map((log) => {
                      const meta = ACTION_META[log.action] ?? { label: log.action, cls: "bg-muted text-foreground border-border", dot: "bg-muted-foreground" };
                      const isExpanded = expandedId === log.id;
                      return (
                        <Fragment key={log.id}>
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                  {log.userName?.[0] ?? "؟"}
                                </div>
                                <span className="font-medium text-sm">{log.userName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs" dir="ltr">{log.userPhone}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="bg-muted text-foreground text-xs px-2 py-1 rounded-lg font-medium">
                                {ENTITY_LABELS[log.entity] ?? log.entity}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{log.entityId ?? "—"}</td>
                            <td className="px-4 py-3.5">
                              {(log.beforeData || log.afterData) && (
                                <button onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                                  <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>
                                  {isExpanded ? "إخفاء" : "عرض"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/10">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  {log.beforeData && (
                                    <div>
                                      <p className="font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-400" />قبل التعديل:
                                      </p>
                                      <pre className="bg-red-50 border border-red-100 rounded-xl p-3 overflow-auto max-h-40 text-red-800 text-xs leading-relaxed font-mono">
                                        {JSON.stringify(log.beforeData, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.afterData && (
                                    <div>
                                      <p className="font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />بعد التعديل:
                                      </p>
                                      <pre className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 overflow-auto max-h-40 text-emerald-800 text-xs leading-relaxed font-mono">
                                        {JSON.stringify(log.afterData, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
