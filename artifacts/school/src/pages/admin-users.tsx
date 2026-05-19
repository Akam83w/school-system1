import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListTeachers, useListStudents } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Redirect } from "wouter";

type Role = "admin" | "teacher" | "student";

const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير النظام",
  teacher: "معلم",
  student: "طالب",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-amber-100 text-amber-800 border-amber-200",
  teacher: "bg-blue-100 text-blue-800 border-blue-200",
  student: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const EMPTY_CREATE = { name: "", username: "", phone: "", password: "", role: "teacher" as Role, linkedId: "" };
const EMPTY_EDIT = { name: "", role: "teacher" as Role, linkedId: "" };

export default function AdminUsersPage() {
  const { data: me } = useGetMe();
  const role = (me as any)?.role;

  if (role && role !== "admin") return <Redirect to="/dashboard" />;

  return (
    <Layout>
      <AdminUsersContent currentUserId={(me as any)?.id} />
    </Layout>
  );
}

function AdminUsersContent({ currentUserId }: { currentUserId?: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useListUsers();
  const { data: teachers = [] } = useListTeachers();
  const { data: students = [] } = useListStudents();

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/users"] });
        toast({ title: "تم إنشاء الحساب", description: "تم إنشاء حساب المستخدم الجديد بنجاح" });
        setShowCreate(false);
        setCreateForm(EMPTY_CREATE);
      },
      onError: (e: any) => {
        toast({ title: "خطأ", description: e?.message ?? "حدث خطأ غير متوقع", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/users"] });
        toast({ title: "تم التحديث", description: "تم تحديث بيانات المستخدم بنجاح" });
        setEditTarget(null);
      },
      onError: (e: any) => {
        toast({ title: "خطأ", description: e?.message ?? "حدث خطأ غير متوقع", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/users"] });
        toast({ title: "تم الحذف", description: "تم حذف حساب المستخدم" });
        setDeleteTarget(null);
      },
      onError: (e: any) => {
        toast({ title: "خطأ", description: e?.message ?? "لا يمكن تنفيذ هذه العملية", variant: "destructive" });
      },
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [showPass, setShowPass] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; form: typeof EMPTY_EDIT } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  function openEdit(u: any) {
    setEditTarget({
      id: u.id,
      form: { name: u.name, role: u.role, linkedId: u.linkedId ? String(u.linkedId) : "" },
    });
  }

  function handleCreateChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value, ...(name === "role" ? { linkedId: "" } : {}) }));
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (!editTarget) return;
    const { name, value } = e.target;
    setEditTarget(prev => prev && ({ ...prev, form: { ...prev.form, [name]: value, ...(name === "role" ? { linkedId: "" } : {}) } }));
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const nameParts = createForm.name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 3) {
      toast({ title: "الاسم غير مكتمل", description: "يجب أن يتكون الاسم من ثلاثة أسماء على الأقل", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      data: {
        name: createForm.name.trim(),
        username: createForm.username.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
        ...(createForm.linkedId ? { linkedId: Number(createForm.linkedId) } : {}),
      },
    });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        name: editTarget.form.name.trim() || undefined,
        role: editTarget.form.role,
        linkedId: editTarget.form.linkedId ? Number(editTarget.form.linkedId) : null,
      },
    });
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
  const selectCls = `${inputCls} cursor-pointer`;

  const linkedOptions = createForm.role === "teacher"
    ? (teachers as any[]).map(t => ({ value: t.id, label: `${t.fullName} (${t.teacherCode ?? ""})` }))
    : createForm.role === "student"
    ? (students as any[]).map(s => ({ value: s.id, label: `${s.fullName} (${s.studentCode ?? ""})` }))
    : [];

  const editLinkedOptions = editTarget
    ? editTarget.form.role === "teacher"
      ? (teachers as any[]).map(t => ({ value: t.id, label: `${t.fullName} (${t.teacherCode ?? ""})` }))
      : editTarget.form.role === "student"
      ? (students as any[]).map(s => ({ value: s.id, label: `${s.fullName} (${s.studentCode ?? ""})` }))
      : []
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">إدارة المستخدمين</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            إنشاء وإدارة حسابات المعلمين والطلاب والمديرين — {(users as any[]).length} حساب مسجّل
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          مستخدم جديد
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-sm text-blue-800">
          <span className="font-semibold">ملاحظة: </span>
          تأكد من ربط حساب المعلم بسجل معلمه في قائمة المعلمين، وكذلك حساب الطالب بسجله. هذا الربط يحدد ما يراه كل مستخدم.
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : (users as any[]).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">لا يوجد مستخدمون مسجّلون</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-semibold">
                <th className="px-5 py-3 text-right">#</th>
                <th className="px-5 py-3 text-right">الاسم الكامل</th>
                <th className="px-5 py-3 text-right">اسم المستخدم</th>
                <th className="px-5 py-3 text-right">الهاتف</th>
                <th className="px-5 py-3 text-right">الدور</th>
                <th className="px-5 py-3 text-right">الربط</th>
                <th className="px-5 py-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(users as any[]).map((u, idx) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{u.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono">{u.username}</td>
                  <td className="px-5 py-3.5 text-muted-foreground" dir="ltr">{u.phone ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg border", ROLE_COLORS[u.role as Role] ?? "bg-gray-100 text-gray-700 border-gray-200")}>
                      {ROLE_LABELS[u.role as Role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {u.linkedId
                      ? u.role === "teacher"
                        ? (teachers as any[]).find(t => t.id === u.linkedId)?.fullName ?? `#${u.linkedId}`
                        : u.role === "student"
                        ? (students as any[]).find(s => s.id === u.linkedId)?.fullName ?? `#${u.linkedId}`
                        : "—"
                      : <span className="text-amber-600 font-medium">{u.role !== "admin" ? "غير مربوط" : "—"}</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/8 text-primary hover:bg-primary/15 transition-colors border border-primary/15"
                      >
                        تعديل
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-foreground">إنشاء حساب جديد</h2>
              <button onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); }} className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">الاسم الكامل <span className="text-destructive">*</span></label>
                <input type="text" name="name" value={createForm.name} onChange={handleCreateChange}
                  className={inputCls} placeholder="ثلاثة أسماء على الأقل" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">اسم المستخدم <span className="text-destructive">*</span></label>
                  <input type="text" name="username" value={createForm.username} onChange={handleCreateChange}
                    className={inputCls} placeholder="مثال: teacher1" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">رقم الهاتف <span className="text-destructive">*</span></label>
                  <input type="tel" name="phone" value={createForm.phone} onChange={handleCreateChange}
                    className={inputCls} placeholder="07XXXXXXXXX" required dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">كلمة المرور <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} name="password" value={createForm.password} onChange={handleCreateChange}
                    className={`${inputCls} pl-9`} placeholder="6 أحرف على الأقل" required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      {showPass
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">الدور <span className="text-destructive">*</span></label>
                <select name="role" value={createForm.role} onChange={handleCreateChange} className={selectCls} required>
                  <option value="teacher">معلم</option>
                  <option value="student">طالب</option>
                  <option value="admin">مدير النظام</option>
                </select>
              </div>
              {linkedOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    ربط بـ{createForm.role === "teacher" ? "معلم" : "طالب"}
                    <span className="text-muted-foreground font-normal mr-1">(اختياري — يحدد ما يراه المستخدم)</span>
                  </label>
                  <select name="linkedId" value={createForm.linkedId} onChange={handleCreateChange} className={selectCls}>
                    <option value="">— بدون ربط —</option>
                    {linkedOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-primary/20">
                  {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); }}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-foreground">تعديل حساب المستخدم</h2>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">الاسم الكامل</label>
                <input type="text" name="name" value={editTarget.form.name} onChange={handleEditChange}
                  className={inputCls} placeholder="اتركه فارغاً للإبقاء على القيمة الحالية" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">الدور</label>
                <select name="role" value={editTarget.form.role} onChange={handleEditChange} className={selectCls}>
                  <option value="teacher">معلم</option>
                  <option value="student">طالب</option>
                  <option value="admin">مدير النظام</option>
                </select>
              </div>
              {editLinkedOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    ربط بـ{editTarget.form.role === "teacher" ? "معلم" : "طالب"}
                  </label>
                  <select name="linkedId" value={editTarget.form.linkedId} onChange={handleEditChange} className={selectCls}>
                    <option value="">— بدون ربط —</option>
                    {editLinkedOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-primary/20">
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button type="button" onClick={() => setEditTarget(null)}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">تأكيد الحذف</h3>
            <p className="text-muted-foreground text-sm mb-6">
              هل أنت متأكد من حذف حساب <span className="font-semibold text-foreground">"{deleteTarget.name}"</span>؟
              <br /><span className="text-red-600 font-medium">لا يمكن التراجع عن هذه العملية.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {deleteMutation.isPending ? "جاري الحذف..." : "نعم، احذف الحساب"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
