import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { getToken } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";

async function api(path: string, method = "GET", body?: any) {
  const response = await fetch(path, { method, headers: { Authorization: `Bearer ${getToken() ?? ""}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "تعذر تنفيذ الطلب");
  return data;
}

export default function ParentMessagesPage() {
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const initialQuery = new URLSearchParams(window.location.search);
  const [classId, setClassId] = useState(initialQuery.get("classId") ?? "");
  const [studentId, setStudentId] = useState(initialQuery.get("studentId") ?? "");
  const [mode, setMode] = useState<"public" | "private">("public");
  const [audience, setAudience] = useState<"school" | "class">("class");
  const [template, setTemplate] = useState("homework");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [conversation, setConversation] = useState<any[]>([]);
  const [myMessages, setMyMessages] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { api("/api/classes").then(setClasses).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!classId) { setStudents([]); setStudentId(""); return; }
    api(`/api/students?classId=${encodeURIComponent(classId)}`).then(rows => { setStudents(rows); setStudentId(current => current && rows.some((s: any) => String(s.id) === current) ? current : ""); }).catch(e => setError(e.message));
  }, [classId]);
  useEffect(() => {
    if (!studentId) { setConversation([]); return; }
    api(`/api/messages/private/${studentId}`).then(setConversation).catch(e => setError(e.message));
  }, [studentId, success]);
  useEffect(() => {
    if ((me as any)?.role === "teacher") api("/api/messages/mine").then(setMyMessages).catch(e => setError(e.message));
  }, [me, success]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      if (mode === "public") {
        await api("/api/messages/public", "POST", { audience: isAdmin ? audience : "class", classId: audience === "school" ? undefined : Number(classId), title, body, template });
        setSuccess("تم إرسال الإشعار إلى المستلمين المحددين"); setBody(""); setTitle("");
      } else {
        await api("/api/messages/private", "POST", { studentId: Number(studentId), title, body, template });
        setSuccess("تم إرسال الرسالة الخاصة إلى ولي الأمر"); setBody(""); setTitle("");
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function editMessage(message: any) {
    const next = window.prompt("عدّل نص الرسالة. سيُحفظ النص السابق في سجل المدير.", message.body);
    if (next == null || next.trim() === message.body) return;
    if (!next.trim()) { setError("نص الرسالة لا يمكن أن يكون فارغاً"); return; }
    setBusy(true); setError("");
    try { await api(`/api/messages/${message.id}`, "PATCH", { body: next.trim() }); setSuccess("تم تعديل الرسالة وحفظ النسخة السابقة في السجل"); if (studentId) setConversation(await api(`/api/messages/private/${studentId}`)); setMyMessages(await api("/api/messages/mine")); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  const selectedStudent = students.find(s => String(s.id) === studentId);
  return <Layout>
    <div dir="rtl" className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-black">رسائل أولياء الأمور</h1><p className="mt-1 text-sm text-muted-foreground">الإشعارات الصفية والمحادثات الخاصة المسجلة</p></div>
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <button onClick={() => { setMode("public"); setTemplate("homework"); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "public" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>إشعار صف / مدرسة</button>
        <button onClick={() => { setMode("private"); setTemplate("general"); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === "private" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>رسالة خاصة لولي أمر</button>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
        {mode === "public" && isAdmin && <label className="block text-sm font-semibold">المستلمون<select value={audience} onChange={e => setAudience(e.target.value as any)} className="mt-1 w-full rounded-xl border p-3"><option value="school">كل المدرسة</option><option value="class">صف محدد</option></select></label>}
        {(mode === "private" || !isAdmin || audience === "class") && <label className="block text-sm font-semibold">الصف<select required value={classId} onChange={e => setClassId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">اختر الصف</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {mode === "private" && <label className="block text-sm font-semibold">الطالب<select required value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">اختر الطالب</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>}
        <label className="block text-sm font-semibold">القالب<select value={template} onChange={e => setTemplate(e.target.value)} className="mt-1 w-full rounded-xl border p-3">
          {mode === "public" ? <><option value="homework">واجب منزلي</option><option value="exam_reminder">تذكير بامتحان</option><option value="general_note">ملاحظة عامة</option><option value="holiday">عطلة رسمية</option><option value="meeting">اجتماع أولياء الأمور</option></> : <><option value="summons">استدعاء ولي الأمر</option><option value="behavior">ملاحظة سلوكية</option><option value="progress">ملاحظة عن المستوى</option><option value="general">رسالة عامة</option></>}
        </select></label>
        <label className="block text-sm font-semibold">عنوان مختصر<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border p-3" placeholder="اختياري" /></label>
        <label className="block text-sm font-semibold">نص الرسالة<textarea required value={body} onChange={e => setBody(e.target.value)} maxLength={mode === "public" ? 500 : 2000} rows={4} className="mt-1 w-full rounded-xl border p-3" placeholder="اكتب الرسالة هنا..." /></label>
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{body.length}/{mode === "public" ? 500 : 2000}</span><button disabled={busy || !body.trim() || (mode === "private" && !studentId) || (mode === "public" && audience === "class" && !classId)} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "جارٍ الإرسال..." : "إرسال"}</button></div>
      </form>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      {mode === "public" && !isAdmin && <section className="space-y-3 rounded-2xl border bg-white p-4">
        <h2 className="font-bold">إشعاراتك السابقة</h2>
        {myMessages.filter(m => m.audience !== "private").map(m => <article key={m.id} className="rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm">{m.title}</strong><span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-GB")}</span></div>
          <p className="my-2 whitespace-pre-wrap text-sm leading-7">{m.body}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{m.audience === "class" ? "إشعار صف" : "إشعار عام"}{m.editedAt ? " · معدّلة" : ""}</span><button onClick={() => editMessage(m)} disabled={busy} className="text-primary underline">تعديل الرسالة</button></div>
        </article>)}
        {!myMessages.some(m => m.audience !== "private") && <p className="text-sm text-muted-foreground">لم ترسل إشعارات بعد</p>}
      </section>}
      {mode === "private" && studentId && <section className="space-y-3 rounded-2xl border bg-white p-4">
        <h2 className="font-bold">محادثة خاصة — {selectedStudent?.fullName}</h2>
        {conversation.map(m => <article key={m.id} className="rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm">{m.title}</strong><span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-GB")}</span></div>
          <p className="my-2 whitespace-pre-wrap text-sm leading-7">{m.body}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{m.authorName}{m.editedAt ? " · معدّلة" : ""}</span>{(me as any)?.role === "teacher" && m.authorId === (me as any)?.id && <button onClick={() => editMessage(m)} disabled={busy} className="text-primary underline">تعديل الرسالة</button>}</div>
        </article>)}
        {!conversation.length && <p className="text-sm text-muted-foreground">لا توجد رسائل سابقة لهذا الطالب</p>}
      </section>}
      <p className="text-xs text-muted-foreground">لا يوجد خيار حذف للرسائل. كل تعديل يحفظ النص السابق في سجل خاص بالمدير.</p>
    </div>
  </Layout>;
}
