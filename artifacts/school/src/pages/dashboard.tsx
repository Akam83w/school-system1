import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetDashboardStats,
  useGetAttendanceSummary,
  useGetGradeDistribution,
  useGetRecentActivity,
  useListClasses,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type StatCardProps = {
  title: string; value: string | number; sub?: string; icon: React.ReactNode;
  color: string; bg: string; href: string;
};
function safeArray<T>(data: unknown): T[] { return Array.isArray(data) ? data as T[] : []; }

function StatCard({ title, value, sub, icon, color, bg, href }: StatCardProps) {
  return (
    <Link href={href}>
      <a className="block min-w-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="h-full bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase text-muted-foreground">{title}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={`w-10 h-10 shrink-0 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
          </div>
        </div>
      </a>
    </Link>
  );
}
function Empty({ icon, text }: { icon: string; text: string }) {
  return <div className="h-52 flex flex-col items-center justify-center text-muted-foreground"><div className="text-3xl">{icon}</div><p className="text-sm mt-2">{text}</p></div>;
}

export default function DashboardPage() {
  const { data: stats } = useGetDashboardStats();
  const { data: attendance } = useGetAttendanceSummary();
  const { data: grades } = useGetGradeDistribution();
  const { data: activity } = useGetRecentActivity();
  const { data: classes } = useListClasses();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const attendanceSafe = safeArray<any>(attendance);
  const gradesSafe = safeArray<any>(grades);
  const activitySafe = safeArray<any>(activity);
  const attendanceChart = attendanceSafe.map(a => ({
    name: a.className ?? "—", حاضر: a.presentCount ?? 0, غائب: a.absentCount ?? 0,
    متأخر: a.lateCount ?? 0, unrecorded: Boolean(a.unrecorded), total: a.total ?? 0,
  }));
  const gradeChart = useMemo(() => gradesSafe.map(g => {
    const classData = selectedClass ? (g.byClass ?? []).filter((c: any) => String(c.classId) === selectedClass) : [];
    return { ...g, ناجح: selectedClass ? classData.reduce((n: number, c: any) => n + c.passingCount, 0) : g.passingCount ?? 0,
      راسب: selectedClass ? classData.reduce((n: number, c: any) => n + c.failingCount, 0) : g.failingCount ?? 0 };
  }).filter(g => !selectedClass || g.ناجح + g.راسب > 0), [gradesSafe, selectedClass]);

  const statCards: StatCardProps[] = stats ? [
    { title: "الطلاب", value: stats.totalStudents ?? 0, sub: "إجمالي الطلاب", color: "text-blue-600", bg: "bg-blue-50", icon: "👨‍🎓", href: "/students" },
    { title: "المعلمون", value: stats.totalTeachers ?? 0, sub: "المعلمون النشطون", color: "text-green-600", bg: "bg-green-50", icon: "👩‍🏫", href: "/teachers" },
    { title: "الصفوف", value: stats.totalClasses ?? 0, sub: "كل الصفوف", color: "text-purple-600", bg: "bg-purple-50", icon: "🏫", href: "/classes" },
    { title: "المواد", value: stats.totalSubjects ?? 0, sub: "المواد الدراسية", color: "text-orange-600", bg: "bg-orange-50", icon: "📚", href: "/subjects" },
    { title: "الحضور اليوم", value: stats.presentToday ?? 0, sub: "حاضر", color: "text-teal-600", bg: "bg-teal-50", icon: "✅", href: "/attendance" },
    { title: "الغياب اليوم", value: stats.absentToday ?? 0, sub: "غائب — اضغط لعرضهم", color: "text-red-600", bg: "bg-red-50", icon: "❌", href: "/attendance?status=absent" },
    { title: "نسبة حضور اليوم", value: `${stats.attendanceRate ?? 0}%`, sub: "من السجلات المدخلة اليوم", color: "text-cyan-600", bg: "bg-cyan-50", icon: "📊", href: "/attendance" },
    { title: "المعدل العام", value: `${stats.averageGrade ?? 0}%`, sub: "متوسط الدرجات", color: "text-pink-600", bg: "bg-pink-50", icon: "🎯", href: "/grades" },
  ] : [];

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const datePart = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const timePart = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    return `${datePart} ${timePart}`;
  };

  return (
    <Layout>
      <div className="space-y-6 min-w-0">
        <div><h1 className="text-2xl font-bold">لوحة التحكم</h1><p className="text-sm text-muted-foreground">نظرة عامة على النظام</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card, i) => <StatCard key={i} {...card} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          <div className="min-w-0 bg-white p-4 rounded-2xl border">
            <h2 className="text-sm font-bold mb-3">حضور اليوم حسب الصف</h2>
            {attendanceChart.length === 0 ? <Empty icon="📊" text="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={attendanceChart} margin={{ top: 8, right: 4, left: -18, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: any, name: any) => [value, name]} />
                  <Legend />
                  <Bar dataKey="حاضر" fill="#22c55e" />
                  <Bar dataKey="غائب" fill="#ef4444" />
                  <Bar dataKey="متأخر" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {attendanceSafe.some(a => a.unrecorded) && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <strong>غير مسجل:</strong> {attendanceSafe.filter(a => a.unrecorded).map(a => a.className).join("، ")}
              </div>
            )}
          </div>

          <div className="min-w-0 bg-white p-4 rounded-2xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold">الدرجات حسب المادة</h2>
              <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(null); }} className="max-w-full rounded-lg border border-border bg-white px-3 py-2 text-xs">
                <option value="">كل الصفوف</option>
                {safeArray<any>(classes).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            {gradeChart.length === 0 ? <Empty icon="📝" text="لا توجد بيانات" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeChart} margin={{ top: 8, right: 4, left: -18, bottom: 8 }}>
                  <XAxis dataKey="subjectName" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ناجح" fill="#3b82f6" onClick={(data: any) => setSelectedSubject(data)} cursor="pointer" />
                  <Bar dataKey="راسب" fill="#ef4444" onClick={(data: any) => setSelectedSubject(data)} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {selectedSubject && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><strong>{selectedSubject.subjectName}</strong><button onClick={() => setSelectedSubject(null)} className="text-xs text-muted-foreground underline">إغلاق</button></div>
                <p className="mt-1 text-emerald-700">ناجح: {selectedSubject.ناجح}</p>
                <p className="text-red-700">راسب: {selectedSubject.راسب}</p>
                <p className="text-xs text-muted-foreground mt-1">اضغط على عمود المادة لعرض التفاصيل</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">النشاط الأخير</h2>
          {activitySafe.length === 0 ? <Empty icon="📌" text="لا يوجد نشاط" /> : activitySafe.map(a => (
            <div key={a.id} className="flex justify-between items-center gap-3 py-2 border-b last:border-none">
              <div className="min-w-0"><p className="text-sm font-medium">{a.description}</p><p className="text-xs text-muted-foreground truncate">{a.entityName ?? ""}</p></div>
              <span dir="ltr" className="shrink-0 text-xs text-muted-foreground font-mono">{formatTimestamp(a.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
