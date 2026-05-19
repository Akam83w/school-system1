import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Announcement } from "@workspace/api-client-react";

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  info: { label: "إشعار", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "ℹ️" },
  warning: { label: "تحذير", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "⚠️" },
  holiday: { label: "عطلة", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "🎉" },
  alert: { label: "تنبيه عاجل", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "🚨" },
};

const EMPTY_FORM = { title: "", body: "", type: "info", isPinned: false, expiresAt: "" };

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

export default function AnnouncementsPage() {
  return (
    <Layout>
      <AnnouncementsContent />
    </Layout>
  );
}

function AnnouncementsContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const { data: announcements = [], isLoading } = useListAnnouncements();

  const createMutation = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/announcements"] });
        toast({ title: "تم نشر الإعلان" });
        setShowCreate(false);
        setForm(EMPTY_FORM);
      },
      onError: (e: any) => {
        toast({ title: "خطأ", description: e?.message ?? "فشل نشر الإعلان", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/announcements"] });
        toast({ title: "تم تحديث الإعلان" });
        setEditTarget(null);
      },
      onError: (e: any) => {
        toast({ title: "خطأ", description: e?.message ?? "فشل التحديث", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/announcements"] });
        toast({ title: "تم حذف الإعلان" });
        setDeleteTarget(null);
      },
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<{ id: number; form: typeof EMPTY_FORM } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  function openEdit(a: Announcement) {
    setEditTarget({
      id: a.id,
      form: {
        title: a.title,
        body: a.body,
        type: a.type,
        isPinned: a.isPinned,
        expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().split("T")[0] : "",
      },
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, setter: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>) {
    const { name, value, type } = e.target;
    setter(prev => ({ ...prev, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">الإعلانات المدرسية</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{(announcements as Announcement[]).length} إعلان نشط</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            إعلان جديد
          </button>
        )}
      </div>

      {/* Announcements list */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : (announcements as Announcement[]).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 text-3xl">📢</div>
          <p className="text-foreground font-semibold mb-1">لا توجد إعلانات حالياً</p>
          <p className="text-muted-foreground text-sm">ستظهر هنا الإعلانات والإشعارات المدرسية</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(announcements as Announcement[]).map((a) => {
            const tc = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
            const isExpired = a.expiresAt ? new Date(a.expiresAt) < new Date() : false;
            return (
              <div key={a.id} className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden", tc.border, isExpired && "opacity-60")}>
                <div className={cn("px-5 py-3 border-b flex items-center justify-between", tc.bg, tc.border)}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{tc.icon}</span>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 border", tc.text, tc.border)}>{tc.label}</span>
                    {a.isPinned && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        مثبّت
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-xs font-semibold text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full">
                        منتهي
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a)}
                        className="text-xs px-3 py-1 rounded-lg bg-white/80 border border-border text-muted-foreground hover:text-foreground hover:bg-white transition-colors font-medium">
                        تعديل
                      </button>
                      <button onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                        className="text-xs px-3 py-1 rounded-lg bg-white/80 border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium">
                        حذف
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4">
                  <h3 className="text-base font-bold text-foreground mb-1.5">{a.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>بقلم: {a.authorName}</span>
                    <span>•</span>
                    <span>{formatDate(a.createdAt)}</span>
                    {a.expiresAt && <span>• ينتهي: {formatDate(a.expiresAt)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black">إعلان جديد</h2>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ data: { ...form, isPinned: form.isPinned, expiresAt: form.expiresAt || undefined } }); }}
              className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">عنوان الإعلان <span className="text-destructive">*</span></label>
                <input name="title" value={form.title} onChange={e => handleChange(e, setForm)} className={inputCls} placeholder="مثال: إجازة عيد الأضحى المبارك" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">محتوى الإعلان <span className="text-destructive">*</span></label>
                <textarea name="body" value={form.body} onChange={e => handleChange(e, setForm)} className={`${inputCls} min-h-[100px] resize-y`} placeholder="تفاصيل الإعلان..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">نوع الإعلان</label>
                  <select name="type" value={form.type} onChange={e => handleChange(e, setForm)} className={`${inputCls} cursor-pointer`}>
                    <option value="info">إشعار عام</option>
                    <option value="warning">تحذير</option>
                    <option value="holiday">عطلة</option>
                    <option value="alert">تنبيه عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">تاريخ الانتهاء (اختياري)</label>
                  <input name="expiresAt" type="date" value={form.expiresAt} onChange={e => handleChange(e, setForm)} className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" name="isPinned" checked={form.isPinned} onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} className="w-4 h-4 rounded border-border text-primary" />
                <span className="text-sm font-medium">تثبيت الإعلان في أعلى القائمة</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 shadow-sm shadow-primary/20">
                  {createMutation.isPending ? "جاري النشر..." : "نشر الإعلان"}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black">تعديل الإعلان</h2>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editTarget.id, data: { ...editTarget.form, expiresAt: editTarget.form.expiresAt || null } });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">العنوان</label>
                <input name="title" value={editTarget.form.title} onChange={e => handleChange(e, (v) => setEditTarget(p => p && ({ ...p, form: typeof v === 'function' ? v(p.form) : v })))} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">المحتوى</label>
                <textarea name="body" value={editTarget.form.body} onChange={e => setEditTarget(p => p && ({ ...p, form: { ...p.form, body: e.target.value } }))} className={`${inputCls} min-h-[100px] resize-y`} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">النوع</label>
                  <select name="type" value={editTarget.form.type} onChange={e => setEditTarget(p => p && ({ ...p, form: { ...p.form, type: e.target.value } }))} className={`${inputCls} cursor-pointer`}>
                    <option value="info">إشعار عام</option>
                    <option value="warning">تحذير</option>
                    <option value="holiday">عطلة</option>
                    <option value="alert">تنبيه عاجل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">تاريخ الانتهاء</label>
                  <input name="expiresAt" type="date" value={editTarget.form.expiresAt} onChange={e => setEditTarget(p => p && ({ ...p, form: { ...p.form, expiresAt: e.target.value } }))} className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editTarget.form.isPinned} onChange={e => setEditTarget(p => p && ({ ...p, form: { ...p.form, isPinned: e.target.checked } }))} className="w-4 h-4 rounded border-border text-primary" />
                <span className="text-sm font-medium">تثبيت الإعلان</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 shadow-sm shadow-primary/20">
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button type="button" onClick={() => setEditTarget(null)}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
              </svg>
            </div>
            <h3 className="text-lg font-black mb-2">حذف الإعلان</h3>
            <p className="text-muted-foreground text-sm mb-6">هل تريد حذف إعلان "<strong>{deleteTarget.title}</strong>"؟</p>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate({ id: deleteTarget.id })} disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                {deleteMutation.isPending ? "جاري الحذف..." : "نعم، احذف"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
