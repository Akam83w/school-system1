import { Layout } from "@/components/layout";
import {
  useGetDashboardStats,
  useGetAttendanceSummary,
  useGetGradeDistribution,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type StatCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
};

function StatCard({ title, value, sub, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
          <p className={`text-3xl font-black ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h3 className="font-bold text-foreground mb-4 text-sm">{title}</h3>
      {children}
    </div>
  );
}

const ACTIVITY_COLORS: Record<string, { bg: string; icon: string }> = {
  student: { bg: "bg-blue-100", icon: "👤" },
  teacher: { bg: "bg-emerald-100", icon: "👩‍🏫" },
  grade: { bg: "bg-purple-100", icon: "📝" },
  attendance: { bg: "bg-amber-100", icon: "✅" },
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: attendance } = useGetAttendanceSummary();
  const { data: grades } = useGetGradeDistribution();
  const { data: activity } = useGetRecentActivity();

  const attendanceChartData = (attendance ?? []).map((a) => ({
    name: a.className,
    حاضر: a.presentCount,
    غائب: a.absentCount,
    متأخر: a.lateCount,
  }));

  const gradeChartData = (grades ?? []).map((g) => ({
    name: g.subjectName,
    ناجح: g.passingCount,
    راسب: g.failingCount,
  }));

  const statCards = stats ? [
    {
      title: "إجمالي الطلاب", value: stats.totalStudents, sub: "طالب مسجّل",
      color: "text-blue-600", bg: "bg-blue-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
      title: "المعلمون", value: stats.totalTeachers, sub: "معلم فعال",
      color: "text-emerald-600", bg: "bg-emerald-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
    },
    {
      title: "الصفوف الدراسية", value: stats.totalClasses, sub: "صف دراسي",
      color: "text-violet-600", bg: "bg-violet-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    },
    {
      title: "المواد الدراسية", value: stats.totalSubjects, sub: "مادة دراسية",
      color: "text-orange-600", bg: "bg-orange-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    },
    {
      title: "حاضرون اليوم", value: stats.presentToday, sub: "من إجمالي الطلاب",
      color: "text-teal-600", bg: "bg-teal-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="20 6 9 17 4 12"/></svg>
    },
    {
      title: "غائبون اليوم", value: stats.absentToday, sub: "يحتاجون متابعة",
      color: "text-red-600", bg: "bg-red-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    },
    {
      title: "نسبة الحضور", value: `${stats.attendanceRate}%`, sub: "معدل عام",
      color: "text-cyan-600", bg: "bg-cyan-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
    },
    {
      title: "متوسط الدرجات", value: `${stats.averageGrade}%`, sub: "للعام الدراسي",
      color: "text-pink-600", bg: "bg-pink-50",
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
    },
  ] : [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-0.5">نظرة شاملة على المدرسة — العام الدراسي 2024-2025</p>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl h-28 bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card) => <StatCard key={card.title} {...card} />)}
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="الحضور حسب الصف الدراسي">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontFamily: "Cairo", fontSize: 12, direction: "rtl", borderRadius: "10px", border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Bar dataKey="حاضر" fill="#10b981" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="غائب" fill="#ef4444" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="متأخر" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart icon="📊" text="لا توجد بيانات حضور بعد" />
            )}
          </ChartCard>

          <ChartCard title="توزيع الدرجات حسب المادة">
            {gradeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontFamily: "Cairo", fontSize: 12, direction: "rtl", borderRadius: "10px", border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Bar dataKey="ناجح" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="راسب" fill="#ef4444" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart icon="📝" text="لا توجد بيانات درجات بعد" />
            )}
          </ChartCard>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="font-bold text-foreground mb-4 text-sm">النشاط الأخير</h3>
          {(activity ?? []).length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-muted-foreground text-sm">لا توجد أنشطة حديثة</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(activity ?? []).map((a) => {
                const meta = ACTIVITY_COLORS[a.type] ?? { bg: "bg-gray-100", icon: "📋" };
                return (
                  <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center text-base flex-shrink-0`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.description}</p>
                      {a.entityName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.entityName}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 bg-muted px-2 py-0.5 rounded-lg">
                      {new Date(a.timestamp).toLocaleDateString("ar-IQ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EmptyChart({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}
