import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "attendance" | "grades" | "behavior" | "notifications";
type Payload = {
  profile: any | null; attendance: any[]; grades: any[]; behavior: any[];
  notifications: { publicMessages: any[]; schoolAnnouncements: any[] } | null;
  conversation: any[];
};

const EMPTY: Payload = { profile: null, attendance: [], grades: [], behavior: [], notifications: null, conversation: [] };

async function api(path: string) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "تعذر تحميل البيانات");
  return body;
}
function dateLabel(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export default function PortalPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("attendance");
  const [data, setData] = useState<Payload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      api("/api/portal/profile"), api("/api/portal/attendance"), api("/api/portal/grades"),
      api("/api/portal/behavior"), api("/api/portal/notifications"), api("/api/portal/conversation"),
    ]).then(([profile, attendance, grades, behavior, notifications, conversation]) => {
      if (alive) setData({ profile, attendance, grades, behavior, notifications, conversation });
    }).catch(e => { if (alive) setError(e.message || "تعذر تحميل بيانات الطالب"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  function logout() {
    clearToken(); queryClient.clear(); window.location.href = "/login";
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "attendance", label: "الحضور والغياب", icon: "📅" },
    { id: "grades", label: "الدرجات", icon: "📊" },
    { id: "behavior", label: "سلوك الطالب", icon: "🌟" },
    { id: "notifications", label: "الإشعارات", icon: "🔔" },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0"><p className="text-xs text-slate-500">بوابة الطالب وولي الأمر</p><h1 className="truncate text-lg font-black">{data.profile?.fullName ?? "ملف الطالب"}</h1></div>
          <button onClick={logout} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50">تسجيل الخروج</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {data.profile && <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="font-bold">{data.profile.fullName}</p>
          <p className="mt-1 text-sm text-slate-500">{data.profile.className || "لم يُحدد الصف"} · رمز الطالب: {data.profile.studentCode}</p>
        </section>}
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition active:scale-[0.98] ${tab === t.id ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}>
            <span className="ml-1">{t.icon}</span>{t.label}
          </button>)}
        </nav>
        {loading && <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">جاري تحميل بيانات الطالب...</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => setReload(x => x + 1)} className="mr-3 underline">إعادة المحاولة</button></div>}
        {!loading && !error && <>
          {tab === "attendance" && <section className="overflow-hidden rounded-2xl border bg-white">
            <h2 className="border-b px-4 py-3 font-bold">سجل الحضور والغياب</h2>
            {data.attendance.length ? <div className="divide-y">{data.attendance.map(r => <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div><p className="font-semibold">{dateLabel(r.date)}</p><p className="text-xs text-slate-500">{r.academicYear}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status === "حاضر" ? "bg-emerald-50 text-emerald-700" : r.status === "غائب" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{r.status}</span>
            </div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">لا توجد سجلات حضور بعد</p>}
          </section>}
          {tab === "grades" && <section className="overflow-hidden rounded-2xl border bg-white">
            <h2 className="border-b px-4 py-3 font-bold">درجات الطالب</h2>
            {data.grades.length ? <div className="divide-y">{data.grades.map(g => <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="truncate font-semibold">{g.subjectName}</p><p className="text-xs text-slate-500">{g.examType} · {dateLabel(g.examDate)}</p></div>
              <p dir="ltr" className="shrink-0 font-black">{g.score} / {g.maxScore}</p>
            </div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">لا توجد درجات مسجلة</p>}
          </section>}
          {tab === "behavior" && <section className="overflow-hidden rounded-2xl border bg-white">
            <h2 className="border-b px-4 py-3 font-bold">ملاحظات السلوك</h2>
            {data.behavior.length ? <div className="divide-y">{data.behavior.map(m => <article key={m.id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2"><p className="font-bold">{m.title}</p><time className="text-xs text-slate-500">{dateLabel(m.createdAt)}</time></div>
              <p className="whitespace-pre-wrap text-sm leading-7">{m.body}</p><p className="text-xs text-slate-500">من: {m.authorName}{m.editedAt ? " · معدّلة" : ""}</p>
            </article>)}</div> : <p className="p-8 text-center text-sm text-slate-500">لا توجد ملاحظات سلوكية</p>}
          </section>}
          {tab === "notifications" && <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border bg-white">
              <h2 className="border-b px-4 py-3 font-bold">إشعارات المدرسة والصف</h2>
              {(data.notifications?.publicMessages ?? []).length ? (data.notifications?.publicMessages ?? []).map(m => <article key={`m-${m.id}`} className="space-y-1 border-b px-4 py-3 last:border-0">
                <p className="font-bold">{m.title}</p><p className="whitespace-pre-wrap text-sm leading-7">{m.body}</p>
                <p className="text-xs text-slate-500">{m.authorName} · {dateLabel(m.createdAt)}{m.editedAt ? " · معدّلة" : ""}</p>
              </article>) : <p className="p-6 text-center text-sm text-slate-500">لا توجد إشعارات جديدة</p>}
              {(data.notifications?.schoolAnnouncements ?? []).map(m => <article key={`a-${m.id}`} className="space-y-1 border-t px-4 py-3">
                <p className="font-bold">{m.title}</p><p className="whitespace-pre-wrap text-sm leading-7">{m.body}</p><p className="text-xs text-slate-500">{m.authorName} · {dateLabel(m.createdAt)}</p>
              </article>)}
            </section>
            <section className="overflow-hidden rounded-2xl border bg-white">
              <h2 className="border-b px-4 py-3 font-bold">المحادثة الخاصة مع المدرسة</h2>
              {data.conversation.length ? data.conversation.map(m => <article key={m.id} className="m-3 max-w-[90%] rounded-2xl bg-blue-50 p-3">
                <p className="text-sm leading-7">{m.body}</p><p className="mt-1 text-xs text-slate-500">{m.authorName} · {dateLabel(m.createdAt)}{m.editedAt ? " · معدّلة" : ""}</p>
              </article>) : <p className="p-6 text-center text-sm text-slate-500">لا توجد رسائل خاصة</p>}
            </section>
          </div>}
        </>}
      </main>
    </div>
  );
}
