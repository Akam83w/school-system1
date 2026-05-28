import { Layout } from "@/components/layout";
import {
  useGetDashboardStats,
  useGetAttendanceSummary,
  useGetGradeDistribution,
  useGetRecentActivity,
} from "@workspace/api-client-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type StatCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
};

function safeArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/* =========================
   Stat Card
========================= */
function StatCard({ title, value, sub, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>

        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Empty state
========================= */
function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-muted-foreground">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm mt-2">{text}</p>
    </div>
  );
}

/* =========================
   Dashboard
========================= */
export default function DashboardPage() {
  const { data: stats } = useGetDashboardStats();
  const { data: attendance } = useGetAttendanceSummary();
  const { data: grades } = useGetGradeDistribution();
  const { data: activity } = useGetRecentActivity();

  /* -------------------------
     SAFE DATA
  ------------------------- */
  const attendanceSafe = safeArray<any>(attendance);
  const gradesSafe = safeArray<any>(grades);
  const activitySafe = safeArray<any>(activity);

  /* -------------------------
     Charts
  ------------------------- */
  const attendanceChart = attendanceSafe.map((a) => ({
    name: a.className ?? "N/A",
    حاضر: a.presentCount ?? 0,
    غائب: a.absentCount ?? 0,
    متأخر: a.lateCount ?? 0,
  }));

  const gradeChart = gradesSafe.map((g) => ({
    name: g.subjectName ?? "N/A",
    ناجح: g.passingCount ?? 0,
    راسب: g.failingCount ?? 0,
  }));

  const statCards = stats
    ? [
        {
          title: "الطلاب",
          value: stats.totalStudents ?? 0,
          sub: "إجمالي",
          color: "text-blue-600",
          bg: "bg-blue-50",
          icon: "👨‍🎓",
        },
        {
          title: "المعلمين",
          value: stats.totalTeachers ?? 0,
          sub: "نشط",
          color: "text-green-600",
          bg: "bg-green-50",
          icon: "👩‍🏫",
        },
        {
          title: "الصفوف",
          value: stats.totalClasses ?? 0,
          sub: "كل الصفوف",
          color: "text-purple-600",
          bg: "bg-purple-50",
          icon: "🏫",
        },
        {
          title: "المواد",
          value: stats.totalSubjects ?? 0,
          sub: "مواد دراسية",
          color: "text-orange-600",
          bg: "bg-orange-50",
          icon: "📚",
        },
        {
          title: "الحضور اليوم",
          value: stats.presentToday ?? 0,
          sub: "حاضر",
          color: "text-teal-600",
          bg: "bg-teal-50",
          icon: "✅",
        },
        {
          title: "الغياب اليوم",
          value: stats.absentToday ?? 0,
          sub: "غائب",
          color: "text-red-600",
          bg: "bg-red-50",
          icon: "❌",
        },
        {
          title: "نسبة الحضور",
          value: `${stats.attendanceRate ?? 0}%`,
          sub: "معدل",
          color: "text-cyan-600",
          bg: "bg-cyan-50",
          icon: "📊",
        },
        {
          title: "المعدل العام",
          value: `${stats.averageGrade ?? 0}%`,
          sub: "درجات",
          color: "text-pink-600",
          bg: "bg-pink-50",
          icon: "🎯",
        },
      ]
    : [];

  /* =========================
     UI
  ========================= */
  return (
    <Layout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">
            نظرة عامة على النظام
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c, i) => (
            <StatCard key={i} {...c} />
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Attendance */}
          <div className="bg-white p-4 rounded-2xl border">
            <h2 className="text-sm font-bold mb-3">الحضور</h2>

            {attendanceChart.length === 0 ? (
              <Empty icon="📊" text="لا توجد بيانات" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attendanceChart}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  <Bar dataKey="حاضر" fill="#22c55e" />
                  <Bar dataKey="غائب" fill="#ef4444" />
                  <Bar dataKey="متأخر" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Grades */}
          <div className="bg-white p-4 rounded-2xl border">
            <h2 className="text-sm font-bold mb-3">الدرجات</h2>

            {gradeChart.length === 0 ? (
              <Empty icon="📝" text="لا توجد بيانات" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gradeChart}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  <Bar dataKey="ناجح" fill="#3b82f6" />
                  <Bar dataKey="راسب" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="bg-white border rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">النشاط الأخير</h2>

          {activitySafe.length === 0 ? (
            <Empty icon="📌" text="لا يوجد نشاط" />
          ) : (
            activitySafe.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center py-2 border-b last:border-none"
              >
                <div>
                  <p className="text-sm font-medium">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.entityName ?? ""}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  {new Date(a.timestamp).toLocaleDateString("ar-IQ")}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </Layout>
  );
}
