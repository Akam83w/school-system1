import { Layout } from "@/components/layout";
import {
  useGetDashboardStats,
  useGetAttendanceSummary,
  useGetGradeDistribution,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#10b981", "#ef4444", "#f59e0b"];

function StatCard({ title, value, sub, color }: { title: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-md ${color}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

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

  const activityIcons: Record<string, string> = {
    student: "👤",
    teacher: "👩‍🏫",
    grade: "📝",
    attendance: "✅",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على المدرسة</p>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl h-24 bg-muted animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="إجمالي الطلاب" value={stats.totalStudents} sub="طالب مسجل" color="bg-blue-600" />
            <StatCard title="المعلمون" value={stats.totalTeachers} sub="معلم فعال" color="bg-emerald-600" />
            <StatCard title="الصفوف" value={stats.totalClasses} sub="صف دراسي" color="bg-violet-600" />
            <StatCard title="المواد" value={stats.totalSubjects} sub="مادة دراسية" color="bg-orange-500" />
            <StatCard title="حاضرون اليوم" value={stats.presentToday} color="bg-teal-600" />
            <StatCard title="غائبون اليوم" value={stats.absentToday} color="bg-red-500" />
            <StatCard title="نسبة الحضور" value={`${stats.attendanceRate}%`} color="bg-cyan-600" />
            <StatCard title="متوسط الدرجات" value={`${stats.averageGrade}%`} color="bg-pink-600" />
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance chart */}
          <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">الحضور حسب الصف</h3>
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontFamily: "Cairo", fontSize: 12, direction: "rtl" }}
                    formatter={(val, name) => [val, name]}
                  />
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Bar dataKey="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="غائب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="متأخر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </div>

          {/* Grade distribution */}
          <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">توزيع الدرجات حسب المادة</h3>
            {gradeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontFamily: "Cairo", fontSize: 12, direction: "rtl" }} />
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Bar dataKey="ناجح" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="راسب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">النشاط الأخير</h3>
          {(activity ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">لا توجد أنشطة حديثة</p>
          ) : (
            <div className="space-y-3">
              {(activity ?? []).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-base flex-shrink-0">
                    {activityIcons[a.type] ?? "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.description}</p>
                    {a.entityName && <p className="text-xs text-muted-foreground mt-0.5">{a.entityName}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(a.timestamp).toLocaleDateString("ar-IQ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
