import { Layout } from "@/components/layout";
import {
  useGetClass,
  useListStudents,
  useListAttendance,
  getGetClassQueryKey,
  getListStudentsQueryKey,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

function getGradeColor(pct: number) {
  if (pct >= 80) return "bg-emerald-100 text-emerald-700";
  if (pct >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function ClassDetailPage({ id }: { id: number }) {
  const [activeTab, setActiveTab] = useState<"students" | "attendance">("students");
  const [, navigate] = useLocation();

  const { data: cls, isLoading: classLoading } = useGetClass(id, {
    query: { queryKey: getGetClassQueryKey(id), enabled: !!id },
  });

  const { data: students, isLoading: studentsLoading } = useListStudents(
    { classId: id },
    { query: { queryKey: getListStudentsQueryKey({ classId: id }), enabled: !!id } }
  );

  const { data: attendance, isLoading: attendanceLoading } = useListAttendance(
    { classId: id },
    { query: { queryKey: getListAttendanceQueryKey({ classId: id }), enabled: !!id && activeTab === "attendance" } }
  );

  if (classLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!cls) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🏫</p>
          <p className="text-muted-foreground text-lg">الصف غير موجود</p>
          <Link href="/classes" className="mt-4 inline-block text-primary hover:underline text-sm">العودة إلى الصفوف</Link>
        </div>
      </Layout>
    );
  }

  const activeStudents = (students ?? []).filter(s => s.status === "active");
  const capacityPct = Math.min(100, Math.round(((cls.studentCount ?? 0) / cls.capacity) * 100));

  // Attendance summary across all dates
  const attSummary = {
    present: (attendance ?? []).filter(a => a.status === "حاضر").length,
    absent: (attendance ?? []).filter(a => a.status === "غائب").length,
    late: (attendance ?? []).filter(a => a.status === "متأخر").length,
    total: (attendance ?? []).length,
  };
  const attRate = attSummary.total > 0 ? Math.round((attSummary.present / attSummary.total) * 100) : null;

  // Group attendance by date
  const attByDate = (attendance ?? []).reduce<Record<string, typeof attendance>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date]!.push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(attByDate).sort((a, b) => b.localeCompare(a));

  const statusColors: Record<string, string> = {
    "حاضر": "bg-emerald-100 text-emerald-700",
    "غائب": "bg-red-100 text-red-700",
    "متأخر": "bg-amber-100 text-amber-700",
  };

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Back */}
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى الصفوف
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-l from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {cls.name}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{cls.grade} — شعبة {cls.name}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">العام الدراسي: {cls.academicYear}</p>
                {cls.room && <p className="text-muted-foreground text-sm">الغرفة: {cls.room}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[80px] shadow-sm">
                <p className="text-2xl font-bold text-primary">{cls.studentCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">طالب</p>
              </div>
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[80px] shadow-sm">
                <p className="text-2xl font-bold text-foreground">{cls.capacity}</p>
                <p className="text-xs text-muted-foreground mt-0.5">الطاقة</p>
              </div>
              {attRate !== null && (
                <div className={`rounded-xl border px-4 py-3 text-center min-w-[80px] shadow-sm ${getGradeColor(attRate)}`}>
                  <p className="text-2xl font-bold">{attRate}%</p>
                  <p className="text-xs mt-0.5">الحضور</p>
                </div>
              )}
            </div>
          </div>

          {/* Teacher */}
          <div className="mt-4 flex items-center gap-2 bg-white/60 rounded-xl px-4 py-2.5 border border-white/80 w-fit">
            <span className="text-base">👩‍🏫</span>
            <span className="text-sm text-muted-foreground">المعلم المسؤول:</span>
            <span className="text-sm font-semibold text-foreground">{cls.teacherName}</span>
          </div>

          {/* Capacity bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>نسبة الامتلاء</span>
              <span>{capacityPct}%</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${capacityPct >= 90 ? "bg-red-500" : capacityPct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {[
            { key: "students" as const, label: "الطلاب", icon: "🎓", count: students?.length },
            { key: "attendance" as const, label: "الحضور والغياب", icon: "✅", count: (attendance ?? []).length || undefined },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Students tab */}
        {activeTab === "students" && (
          <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">قائمة الطلاب</h3>
              <span className="text-xs text-muted-foreground">{activeStudents.length} طالب فعال</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {["#", "رقم الطالب", "الاسم الكامل", "الجنس", "تاريخ الميلاد", "ولي الأمر", "الحالة"].map(h => (
                      <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {[...Array(7)].map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (students ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <p className="text-3xl mb-2">👤</p>
                        <p className="text-muted-foreground text-sm">لا يوجد طلاب مسجلون في هذا الصف</p>
                      </td>
                    </tr>
                  ) : (
                    (students ?? []).map((s, idx) => (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/students/${s.id}`)}
                        className="border-b border-border last:border-0 hover:bg-primary/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.studentCode}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                              {s.fullName.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
                            </div>
                            <span className="font-medium group-hover:text-primary transition-colors">{s.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.gender}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.dateOfBirth}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.parentName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {s.status === "active" ? "فعال" : "غير فعال"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance tab */}
        {activeTab === "attendance" && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "إجمالي السجلات", value: attSummary.total, color: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "حاضر", value: attSummary.present, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: "غائب", value: attSummary.absent, color: "bg-red-50 border-red-200 text-red-700" },
                { label: "متأخر", value: attSummary.late, color: "bg-amber-50 border-amber-200 text-amber-700" },
              ].map(card => (
                <div key={card.label} className={`rounded-xl border p-4 text-center ${card.color}`}>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs mt-1 opacity-80">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance by date */}
            <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-bold text-foreground">سجلات الحضور</h3>
              </div>

              {attendanceLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
                </div>
              ) : sortedDates.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-muted-foreground text-sm">لا توجد سجلات حضور لهذا الصف</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sortedDates.map(date => {
                    const recs = attByDate[date] ?? [];
                    const p = recs.filter(r => r.status === "حاضر").length;
                    const a = recs.filter(r => r.status === "غائب").length;
                    const l = recs.filter(r => r.status === "متأخر").length;
                    const rate = recs.length > 0 ? Math.round((p / recs.length) * 100) : 0;
                    return (
                      <details key={date} className="group">
                        <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors list-none">
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-medium text-sm">{new Date(date).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 font-medium">✓ {p}</span>
                            <span className="text-xs text-red-600 font-medium">✗ {a}</span>
                            {l > 0 && <span className="text-xs text-amber-600 font-medium">~ {l}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getGradeColor(rate)}`}>{rate}%</span>
                          </div>
                        </summary>
                        <div className="px-5 pb-3">
                          <div className="bg-muted/30 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">الطالب</th>
                                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">الحالة</th>
                                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recs.map(r => (
                                  <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-white/50 transition-colors">
                                    <td className="px-3 py-2 font-medium">{r.studentName}</td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? "bg-muted"}`}>{r.status}</span>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">{r.notes ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
