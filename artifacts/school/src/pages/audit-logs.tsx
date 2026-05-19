import { useState } from "react";
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

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "إنشاء", color: "bg-green-100 text-green-700 border-green-200" },
  update: { label: "تعديل", color: "bg-blue-100 text-blue-700 border-blue-200" },
  delete: { label: "حذف", color: "bg-red-100 text-red-700 border-red-200" },
};

const ENTITY_LABELS: Record<string, string> = {
  student: "طالب",
  teacher: "معلم",
  class: "صف",
  grade: "درجة",
  attendance: "حضور",
  subject: "مادة",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-IQ", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">سجل الأحداث</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "جاري التحميل..." : `${(logs ?? []).length} حدث مسجّل`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">جميع الإجراءات</option>
              <option value="create">إنشاء</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
            </select>
          </div>
          <div>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">جميع الكيانات</option>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          {(filterAction || filterEntity) && (
            <button
              onClick={() => { setFilterAction(""); setFilterEntity(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            فشل تحميل سجل الأحداث. تأكد من أن لديك صلاحية المدير.
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
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
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التاريخ</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المستخدم</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الهاتف</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراء</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الكيان</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المعرّف</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs ?? []).map((log) => {
                      const actionMeta = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-700 border-gray-200" };
                      const isExpanded = expandedId === log.id;
                      return (
                        <>
                          <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                            <td className="px-4 py-3 font-medium">{log.userName}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs" dir="ltr">{log.userPhone}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${actionMeta.color}`}>
                                {actionMeta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">{ENTITY_LABELS[log.entity] ?? log.entity}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.entityId ?? "—"}</td>
                            <td className="px-4 py-3">
                              {(log.beforeData || log.afterData) && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {isExpanded ? "إخفاء" : "عرض"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${log.id}-detail`} className="bg-muted/20">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  {log.beforeData && (
                                    <div>
                                      <p className="font-semibold text-muted-foreground mb-1">قبل التعديل:</p>
                                      <pre className="bg-red-50 border border-red-100 rounded p-2 overflow-auto max-h-40 text-red-800 text-xs leading-relaxed">
                                        {JSON.stringify(log.beforeData, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.afterData && (
                                    <div>
                                      <p className="font-semibold text-muted-foreground mb-1">بعد التعديل:</p>
                                      <pre className="bg-green-50 border border-green-100 rounded p-2 overflow-auto max-h-40 text-green-800 text-xs leading-relaxed">
                                        {JSON.stringify(log.afterData, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
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
