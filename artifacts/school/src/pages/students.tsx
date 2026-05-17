import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListStudents,
  useListClasses,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type StudentForm = {
  fullName: string;
  classId: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  address: string;
  status: string;
};

const emptyForm: StudentForm = {
  fullName: "",
  classId: "",
  gender: "ذكر",
  dateOfBirth: "",
  phone: "",
  parentName: "",
  parentPhone: "",
  address: "",
  status: "active",
};

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students, isLoading } = useListStudents(
    { search: search || undefined, classId: classFilter ? Number(classFilter) : undefined },
    { query: { queryKey: getListStudentsQueryKey({ search: search || undefined, classId: classFilter ? Number(classFilter) : undefined }) } }
  );
  const { data: classes } = useListClasses();

  const createMutation = useCreateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "تم إضافة الطالب بنجاح" });
      },
    },
  });

  const updateMutation = useUpdateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setEditing(null);
        setShowForm(false);
        setForm(emptyForm);
        toast({ title: "تم تحديث بيانات الطالب" });
      },
    },
  });

  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        toast({ title: "تم حذف الطالب" });
      },
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      fullName: s.fullName,
      classId: String(s.classId),
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      phone: s.phone ?? "",
      parentName: s.parentName ?? "",
      parentPhone: s.parentPhone ?? "",
      address: s.address ?? "",
      status: s.status,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      fullName: form.fullName,
      classId: Number(form.classId),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      address: form.address,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الطلاب</h1>
            <p className="text-muted-foreground text-sm">إدارة بيانات الطلاب</p>
          </div>
          <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            + إضافة طالب
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-4 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          >
            <option value="">جميع الصفوف</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-right px-4 py-3 font-semibold text-foreground">رقم الطالب</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الاسم الكامل</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الصف</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الجنس</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">ولي الأمر</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : (students ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات</td>
                  </tr>
                ) : (
                  (students ?? []).map((s) => (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.studentCode}</td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/students/${s.id}`} className="hover:text-primary hover:underline">{s.fullName}</Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                      <td className="px-4 py-3">{s.gender}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.parentName ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {s.status === "active" ? "فعال" : "غير فعال"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(s)} className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">تعديل</button>
                          <button
                            onClick={() => { if (confirm("هل تريد حذف هذا الطالب؟")) deleteMutation.mutate({ id: s.id }); }}
                            className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {students && <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">إجمالي: {students.length} طالب</div>}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">الاسم الكامل *</label>
                  <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الصف *</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                    <option value="">اختر الصف</option>
                    {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.grade} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الجنس *</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">تاريخ الميلاد *</label>
                  <input required type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الهاتف</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="07XXXXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اسم ولي الأمر</label>
                  <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">هاتف ولي الأمر</label>
                  <input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">العنوان</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background">
                    <option value="active">فعال</option>
                    <option value="inactive">غير فعال</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
