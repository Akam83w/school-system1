import { Layout } from "@/components/layout";
import {
  useGetTeacher,
  useListClasses,
  useListSubjects,
  getGetTeacherQueryKey,
  getListClassesQueryKey,
  getListSubjectsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";

export default function TeacherDetailPage({ id }: { id: number }) {
  const [activeTab, setActiveTab] = useState<"classes" | "subjects">("classes");

  const { data: teacher, isLoading } = useGetTeacher(id, {
    query: { queryKey: getGetTeacherQueryKey(id), enabled: !!id },
  });

  const { data: allClasses } = useListClasses({
    query: { queryKey: getListClassesQueryKey() },
  });

  const { data: allSubjects } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() },
  });

  const classes = (allClasses ?? []).filter((c) => c.teacherId === id);
  const subjects = (allSubjects ?? []).filter((s) => s.teacherId === id);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-44 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!teacher) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-4xl mb-4">👩‍🏫</p>
          <p className="text-muted-foreground text-lg">المعلم غير موجود</p>
          <Link href="/teachers" className="mt-4 inline-block text-primary hover:underline text-sm">
            العودة إلى المعلمين
          </Link>
        </div>
      </Layout>
    );
  }

  const initials = teacher.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Back */}
        <Link
          href="/teachers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى المعلمين
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{teacher.fullName}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    teacher.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {teacher.status === "active" ? "فعال" : "غير فعال"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">{teacher.specialization}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{teacher.teacherCode}</p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                <p className="text-2xl font-bold text-emerald-600">{classes.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">صفوف</p>
              </div>
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{subjects.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">مواد</p>
              </div>
              <div className="bg-white rounded-xl border border-border px-4 py-3 text-center min-w-[72px] shadow-sm">
                <p className="text-2xl font-bold text-foreground">
                  {subjects.reduce((s, sub) => s + sub.weeklyHours, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">حصص/أسبوع</p>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: "📞", label: "الهاتف", value: teacher.phone },
              { icon: "✉️", label: "البريد الإلكتروني", value: teacher.email },
              { icon: "🏠", label: "العنوان", value: teacher.address },
              { icon: "📅", label: "تاريخ التعيين", value: teacher.hireDate },
            ]
              .filter((i) => i.value)
              .map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-white/60 rounded-xl px-4 py-2.5 border border-white/80"
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{value}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {[
            { key: "classes" as const, label: "الصفوف المسؤول عنها", icon: "🏫", count: classes.length },
            { key: "subjects" as const, label: "المواد التي يدرّسها", icon: "📚", count: subjects.length },
          ].map((tab) => (
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
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted-foreground/20"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Classes tab */}
        {activeTab === "classes" && (
          <div>
            {classes.length === 0 ? (
              <div className="bg-card rounded-xl border border-card-border p-10 text-center shadow-sm">
                <p className="text-3xl mb-3">🏫</p>
                <p className="text-muted-foreground">لا توجد صفوف مسجّلة لهذا المعلم</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((c) => {
                  const pct = Math.min(100, Math.round(((c.studentCount ?? 0) / c.capacity) * 100));
                  return (
                    <Link key={c.id} href={`/classes/${c.id}`}>
                      <div className="bg-card rounded-xl border border-card-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {c.name}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-tight">{c.grade}</p>
                            <p className="text-xs text-muted-foreground">شعبة {c.name} — {c.academicYear}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>عدد الطلاب</span>
                            <span className="font-medium text-foreground">
                              {c.studentCount} / {c.capacity}
                            </span>
                          </div>
                          {c.room && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>الغرفة</span>
                              <span className="font-medium text-foreground">{c.room}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          عرض تفاصيل الصف
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Subjects tab */}
        {activeTab === "subjects" && (
          <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">المواد الدراسية</h3>
            </div>
            {subjects.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-3xl mb-2">📚</p>
                <p className="text-muted-foreground text-sm">لا توجد مواد مسجّلة لهذا المعلم</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {["اسم المادة", "الصف", "الحصص الأسبوعية", "الوصف"].map((h) => (
                        <th key={h} className="text-right px-4 py-3 font-semibold text-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {s.weeklyHours} حصص
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                          {s.description ?? "—"}
                        </td>
                      </tr>
                    ))}
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
