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
  useGetMe,
} from "@workspace/api-client-react";
import type { Class } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["ابتدائي", "متوسط", "إعدادي"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<
  Stage,
  { bg: string; border: string; badge: string; dot: string; header: string }
> = {
  ابتدائي: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
    header: "text-sky-700",
  },
  متوسط: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
    header: "text-violet-700",
  },
  إعدادي: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    header: "text-amber-700",
  },
};

const STAGE_LABELS: Record<Stage, string> = {
  ابتدائي: "المرحلة الابتدائية",
  متوسط: "المرحلة المتوسطة",
  إعدادي: "المرحلة الإعدادية",
};

type FormState = {
  name: string;
  grade: string;
  teacherId: string;
  capacity: string;
  academicYear: string;
  room: string;
};

const emptyForm: FormState = {
  name: "",
  grade: "ابتدائي",
  teacherId: "",
  capacity: "35",
  academicYear: "2026-2027",
  room: "",
};

export default function ClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me, isLoading: meLoading } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const schoolType = (me as any)?.schoolType as string | undefined;
  const schoolStage: Stage | null = schoolType === "primary" ? "ابتدائي" : schoolType === "intermediate" ? "متوسط" : schoolType === "preparatory" ? "إعدادي" : null;
  const visibleStages = meLoading ? [] : schoolStage ? [schoolStage] : STAGES;

  const { data: classes, isLoading } = useListClasses();
  const pageLoading = isLoading || meLoading;
  const { data: teachers } = useListTeachers();

  const createMutation = useCreateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "تم إنشاء الصف بنجاح" });
      },
      onError: (err: any) => {
        toast({ title: "فشل إنشاء الصف", description: err?.message, variant: "destructive" });
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
        toast({ title: "تم تحديث الصف بنجاح" });
      },
      onError: () => {
        toast({ title: "فشل التحديث", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        toast({ title: "تم حذف الصف" });
      },
      onError: () => {
        toast({ title: "فشل الحذف", variant: "destructive" });
      },
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, grade: schoolStage ?? "ابتدائي" });
    setShowForm(true);
  }

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

  function handleDelete(e: React.MouseEvent, c: Class) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`حذف الصف "${c.name}"؟`)) {
      deleteMutation.mutate({ id: c.id });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.teacherId) {
      toast({
        title: "بيانات ناقصة",
        description: "اسم الصف والمعلم مطلوبان",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      name: form.name.trim(),
      grade: form.grade,
      teacherId: Number(form.teacherId),
      capacity: Number(form.capacity) || 35,
      academicYear: form.academicYear || "2026-2027",
      room: form.room || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const allClasses = classes ?? [];


  const schoolClasses = schoolStage ? allClasses.filter((c) => c.grade === schoolStage) : allClasses;
  const grouped: Record<Stage, typeof allClasses> = {
    ابتدائي: schoolClasses.filter((c) => c.grade === "ابتدائي"),
    متوسط: schoolClasses.filter((c) => c.grade === "متوسط"),
    إعدادي: schoolClasses.filter((c) => c.grade === "إعدادي"),
  };

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Header — نفس أسلوب المواد */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">الصفوف الدراسية</h1>
            <p className="text-muted-foreground text-sm">
              {pageLoading ? "جاري التحميل..." : `${schoolClasses.length} صف · ${schoolClasses.reduce((s, c) => s + (c.studentCount ?? 0), 0)} طالب`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              إضافة صف
            </button>
          )}
        </div>

        {/* Stage chips */}
        {!pageLoading && (
          <div className="flex flex-wrap gap-2">
            {visibleStages.map((stage) => {
              const cols = STAGE_COLORS[stage];
              const stageClasses = grouped[stage];
              const stageStudents = stageClasses.reduce((s, c) => s + (c.studentCount ?? 0), 0);
              return (
                <span
                  key={stage}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cols.badge} ${cols.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cols.dot}`} />
                  {STAGE_LABELS[stage]}
                  <span className="opacity-70">
                    · {stageClasses.length} صف · {stageStudents} طالب
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {pageLoading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-5 w-40 bg-muted rounded animate-pulse mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[...Array(6)].map((__, j) => (
                    <div key={j} className="rounded-xl h-36 bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!pageLoading &&
          visibleStages.map((stage) => {
            const stageClasses = grouped[stage];
            if (stageClasses.length === 0) return null;
            const cols = STAGE_COLORS[stage];
            const stageStudents = stageClasses.reduce((s, c) => s + (c.studentCount ?? 0), 0);

            return (
              <div key={stage}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cols.badge} ${cols.border}`}>
                    <span className={`w-2 h-2 rounded-full ${cols.dot}`} />
                    <span className={`font-bold text-sm ${cols.header}`}>{STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stageClasses.length} صف · {stageStudents} طالب
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
                  {stageClasses.map((c) => {
                    const pct = Math.min(100, Math.round(((c.studentCount ?? 0) / c.capacity) * 100));
                    return (
                      <div
                        key={c.id}
                        className={`relative group rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${cols.bg} ${cols.border}`}
                      >
                        <Link
                          href={`/classes/${c.id}`}
                          className="absolute inset-0 rounded-xl z-0"
                          aria-label={`عرض تفاصيل ${c.name}`}
                        />
                        <div className="relative z-10 p-3 pointer-events-none">
                          <div className={`text-center font-black text-sm leading-tight mb-2 ${cols.header}`}>
                            {c.name}
                          </div>
                          <p className="text-center text-xs text-muted-foreground truncate mb-2">
                            {c.teacherName || "—"}
                          </p>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">طلاب</span>
                            <span className="font-bold">
                              {c.studentCount}/{c.capacity}
                            </span>
                          </div>
                          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : cols.dot
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {isAdmin && (
                            <div className="pointer-events-auto mt-2 flex gap-1">
                              <button
                                className="flex-1 text-xs py-1 rounded bg-white/60 hover:bg-white border border-current/20 font-medium transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openEdit(c);
                                }}
                              >
                                تعديل
                              </button>
                              <button
                                className="flex-1 text-xs py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium transition-colors"
                                onClick={(e) => handleDelete(e, c)}
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {!pageLoading && schoolClasses.length === 0 && (
          <div className="bg-card rounded-xl border border-card-border p-16 text-center shadow-sm">
            <p className="text-4xl mb-3">🏫</p>
            <p className="font-semibold text-foreground mb-1">لا توجد صفوف دراسية</p>
            <p className="text-sm text-muted-foreground mb-4">ابدأ بإضافة صف جديد</p>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90"
              >
                + إضافة صف
              </button>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          dir="rtl"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editing ? `تعديل الصف: ${editing.name}` : "إضافة صف جديد"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">اسم الصف *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: الصف الأول أ"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">المرحلة *</label>
                <select
                  required
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                >
                  {visibleStages.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">المعلم المسؤول *</label>
                <select
                  required
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                >
                  <option value="">اختر المعلم</option>
                  {(teachers ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">الطاقة الاستيعابية</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">السنة الدراسية</label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">رقم الغرفة</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="اختياري"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm transition-all"
                >
                  {isPending ? "جاري الحفظ..." : editing ? "حفظ التغييرات" : "إنشاء الصف"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
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
