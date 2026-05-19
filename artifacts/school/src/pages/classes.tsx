import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListClasses,
  useListTeachers,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  getListClassesQueryKey,
} from "@workspace/api-client-react";
import type { Class } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const IRAQI_GRADES = [
  "الأول متوسط",
  "الثاني متوسط",
  "الثالث متوسط",
  "الرابع الإعدادي",
  "الخامس الإعدادي",
  "السادس الإعدادي",
] as const;

const GRADE_COLORS: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  "الأول متوسط":    { bg: "bg-blue-50",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  "الثاني متوسط":   { bg: "bg-indigo-50",  border: "border-indigo-200",  badge: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500" },
  "الثالث متوسط":   { bg: "bg-violet-50",  border: "border-violet-200",  badge: "bg-violet-100 text-violet-700",  dot: "bg-violet-500" },
  "الرابع الإعدادي": { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  "الخامس الإعدادي": { bg: "bg-orange-50",  border: "border-orange-200",  badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-500" },
  "السادس الإعدادي": { bg: "bg-rose-50",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-700",    dot: "bg-rose-500" },
};

type ClassForm = { name: string; grade: string; teacherId: string; capacity: string; academicYear: string; room: string };
const emptyForm: ClassForm = { name: "أ", grade: IRAQI_GRADES[0], teacherId: "", capacity: "35", academicYear: "2024-2025", room: "" };

export default function ClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classes, isLoading } = useListClasses();
  const { data: teachers } = useListTeachers();

  const createMutation = useCreateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "تم إضافة الشعبة" });
      },
    },
  });
  const updateMutation = useUpdateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
        toast({ title: "تم تحديث الشعبة" });
      },
    },
  });
  const deleteMutation = useDeleteClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        toast({ title: "تم حذف الشعبة" });
      },
    },
  });

  function openEdit(c: Class) {
    setEditing(c);
    setForm({
      name: c.name,
      grade: c.grade,
      teacherId: String(c.teacherId),
      capacity: String(c.capacity),
      academicYear: c.academicYear,
      room: c.room ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      grade: form.grade,
      teacherId: Number(form.teacherId),
      capacity: Number(form.capacity),
      academicYear: form.academicYear,
      room: form.room,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Group classes by grade, preserving Iraqi grade order
  const grouped: Record<string, typeof classes> = {};
  for (const grade of IRAQI_GRADES) {
    const gradeClasses = (classes ?? []).filter((c) => c.grade === grade);
    if (gradeClasses.length > 0) grouped[grade] = gradeClasses;
  }
  // Also catch any non-standard grades that may exist
  const otherClasses = (classes ?? []).filter(
    (c) => !IRAQI_GRADES.includes(c.grade as any)
  );
  if (otherClasses.length > 0) grouped["أخرى"] = otherClasses;

  const totalStudents = (classes ?? []).reduce((s, c) => s + (c.studentCount ?? 0), 0);

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">الصفوف الدراسية</h1>
            <p className="text-muted-foreground text-sm">
              {isLoading ? "جاري التحميل..." : `${(classes ?? []).length} شعبة · ${totalStudents} طالب`}
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm"
          >
            + إضافة شعبة
          </button>
        </div>

        {/* Grade level overview chips */}
        {!isLoading && (
          <div className="flex flex-wrap gap-2">
            {IRAQI_GRADES.map((grade) => {
              const cols = GRADE_COLORS[grade];
              const count = (classes ?? []).filter((c) => c.grade === grade).length;
              return (
                <span
                  key={grade}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cols?.badge ?? ""} ${cols?.border ?? ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cols?.dot ?? "bg-gray-400"}`} />
                  {grade}
                  {count > 0 && <span className="opacity-70">({count})</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-5 w-36 bg-muted rounded animate-pulse mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(2)].map((__, j) => (
                    <div key={j} className="rounded-xl h-40 bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grouped by grade */}
        {!isLoading && Object.keys(grouped).length === 0 && (
          <div className="bg-card rounded-xl border border-card-border p-16 text-center shadow-sm">
            <p className="text-4xl mb-3">🏫</p>
            <p className="font-semibold text-foreground mb-1">لا توجد صفوف دراسية</p>
            <p className="text-sm text-muted-foreground">اضغط على "إضافة شعبة" لبدء إضافة الشعب الدراسية</p>
          </div>
        )}

        {!isLoading && Object.entries(grouped).map(([grade, gradeClasses]) => {
          const cols = GRADE_COLORS[grade] ?? { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
          const gradeTotal = (gradeClasses ?? []).reduce((s, c) => s + (c.studentCount ?? 0), 0);

          return (
            <div key={grade}>
              {/* Grade section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cols.badge} ${cols.border}`}>
                  <span className={`w-2 h-2 rounded-full ${cols.dot}`} />
                  <span className="font-bold text-sm">{grade}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(gradeClasses ?? []).length} شعبة · {gradeTotal} طالب
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Section cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-2">
                {(gradeClasses ?? []).map((c) => {
                  const pct = Math.min(100, Math.round(((c.studentCount ?? 0) / c.capacity) * 100));
                  return (
                    <div key={c.id} className={`relative group rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${cols.bg} ${cols.border} hover:border-opacity-70`}>
                      {/* Full-card link */}
                      <Link
                        href={`/classes/${c.id}`}
                        className="absolute inset-0 rounded-xl z-0"
                        aria-label={`عرض تفاصيل ${grade} - شعبة ${c.name}`}
                      />

                      <div className="relative z-10 p-4 pointer-events-none">
                        {/* Section badge + actions */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 ${cols.badge} ${cols.border}`}>
                            {c.name}
                          </div>
                          <div className="flex gap-1 pointer-events-auto">
                            <button
                              onClick={(e) => { e.preventDefault(); openEdit(c); }}
                              className="text-xs px-2 py-1 rounded bg-white/70 hover:bg-white border border-current/20 font-medium transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); if (confirm("حذف هذه الشعبة؟")) deleteMutation.mutate({ id: c.id }); }}
                              className="text-xs px-2 py-1 rounded bg-white/70 hover:bg-red-100 hover:text-red-600 border border-current/20 font-medium transition-colors"
                            >
                              حذف
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mb-0.5">المعلم المسؤول</p>
                        <p className="text-sm font-semibold text-foreground truncate mb-3">{c.teacherName || "—"}</p>

                        {/* Students count */}
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">الطلاب</span>
                          <span className="font-bold">{c.studentCount} / {c.capacity}</span>
                        </div>

                        {/* Capacity bar */}
                        <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : cols.dot
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Hover hint */}
                        <div className="mt-2 flex items-center gap-1 text-xs opacity-0 group-hover:opacity-70 transition-opacity">
                          <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span>عرض التفاصيل</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل الشعبة" : "إضافة شعبة جديدة"}</h3>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Grade — fixed Iraqi grades dropdown */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">المرحلة الدراسية *</label>
                  <select
                    required
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  >
                    {IRAQI_GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Section letter */}
                <div>
                  <label className="block text-sm font-medium mb-1">الشعبة *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="أ، ب، ج..."
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-sm font-medium mb-1">المعلم المسؤول *</label>
                  <select
                    required
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  >
                    <option value="">اختر المعلم</option>
                    {(teachers ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium mb-1">الطاقة الاستيعابية</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Academic year */}
                <div>
                  <label className="block text-sm font-medium mb-1">السنة الدراسية</label>
                  <input
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Room */}
                <div>
                  <label className="block text-sm font-medium mb-1">الغرفة</label>
                  <input
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="رقم الغرفة"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
