import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { getToken } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";

export default function MessageAuditPage() {
  const { data: me } = useGetMe();
  const [data, setData] = useState<{ messages: any[]; versions: any[] }>({ messages: [], versions: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/message-audit", { headers: { Authorization: `Bearer ${getToken() ?? ""}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر تحميل السجل"); return d; })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  if (me && (me as any).role !== "admin") return <Redirect to="/dashboard" />;
  const versionsByMessage = new Map<number, any[]>();
  data.versions.forEach(v => versionsByMessage.set(v.messageId, [...(versionsByMessage.get(v.messageId) ?? []), v]));
  return <Layout><div dir="rtl" className="space-y-5">
    <div><h1 className="text-2xl font-black">سجل الرسائل</h1><p className="mt-1 text-sm text-muted-foreground">سجل مراجعة للرسائل العامة والخاصة ونسخها السابقة — للمدير فقط</p></div>
    {loading && <p className="p-8 text-center">جاري التحميل...</p>}
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!loading && data.messages.map(m => <article key={m.id} className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{m.title || "رسالة"}</strong><span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-GB")}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-7">{m.body}</p>
      <p className="text-xs text-muted-foreground">المرسل: {m.authorName} · النوع: {m.audience === "private" ? "خاص" : m.audience === "class" ? "صف" : "عام"} · الطالب: {m.studentId ?? "—"} · الصف: {m.classId ?? "—"}</p>
      {(versionsByMessage.get(m.id) ?? []).map(v => <div key={v.id} className="rounded-xl bg-amber-50 p-3 text-sm"><p className="mb-1 font-semibold">النص السابق — {new Date(v.editedAt).toLocaleString("en-GB")}</p><p className="whitespace-pre-wrap">{v.previousBody}</p><p className="mt-1 text-xs text-muted-foreground">عدّلها: {v.editedByName}</p></div>)}
    </article>)}
    {!loading && !error && !data.messages.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">لا توجد رسائل في السجل</p>}
  </div></Layout>;
}
