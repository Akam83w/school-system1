import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({
    schoolName: "", schoolType: "primary", name: "", username: "",
    phone: "", email: "", password: "", confirmPassword: "",
  });
  const input = "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm";
  function change(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 3) {
      toast({ title: "الاسم غير مكتمل", description: "أدخل اسم المدير الثلاثي على الأقل", variant: "destructive" }); return;
    }
    if (form.password.length < 8) {
      toast({ title: "كلمة المرور قصيرة", description: "استخدم 8 أحرف على الأقل", variant: "destructive" }); return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "تأكيد كلمة المرور", description: "كلمتا المرور غير متطابقتين", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/api/auth/register-school`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: form.schoolName.trim(), schoolType: form.schoolType,
          name: form.name.trim(), username: form.username.trim(),
          phone: form.phone.trim(), email: form.email.trim() || undefined,
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: "تعذر تسجيل المدرسة", description: data.error || "حدث خطأ غير متوقع", variant: "destructive" }); return;
      }
      setRegistered(true);
      toast({ title: "تم تسجيل المدرسة", description: "تم إنشاء حساب المدير بنجاح. يمكنك تسجيل الدخول الآن." });
    } catch {
      toast({ title: "خطأ في الاتصال", description: "تعذر الاتصال بالخادم", variant: "destructive" });
    } finally { setLoading(false); }
  }

  if (registered) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md text-center bg-white rounded-2xl border p-8 shadow-xl">
        <div className="text-4xl mb-3">✓</div>
        <h1 className="text-xl font-black mb-2">تم تسجيل المدرسة بنجاح</h1>
        <p className="text-sm text-muted-foreground mb-6">أصبح بإمكان مدير المدرسة تسجيل الدخول وإضافة المعلمين والطلاب.</p>
        <Link href="/login" className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-bold">الانتقال لتسجيل الدخول</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-border p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl mb-3">م</div>
          <h1 className="text-2xl font-black">تسجيل مدرسة جديدة</h1>
          <p className="text-muted-foreground text-sm mt-1">أنشئ ملف المدرسة وحساب مديرها في خطوة واحدة</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">اسم المدرسة *</label>
            <input className={input} name="schoolName" value={form.schoolName} onChange={change} required minLength={3} placeholder="مثال: متوسطة النور للبنين" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">نوع المدرسة *</label>
            <select className={input} name="schoolType" value={form.schoolType} onChange={change} required>
              <option value="primary">ابتدائية</option>
              <option value="intermediate">متوسطة</option>
              <option value="preparatory">إعدادية</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div className="border-t pt-4">
            <h2 className="font-bold mb-3">بيانات مدير المدرسة</h2>
            <label className="block text-sm font-semibold mb-1.5">الاسم الكامل (ثلاثي على الأقل) *</label>
            <input className={input} name="name" value={form.name} onChange={change} required placeholder="أحمد محمد علي" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold mb-1.5">اسم المستخدم *</label><input className={input} name="username" value={form.username} onChange={change} required minLength={3} autoComplete="username" /></div>
            <div><label className="block text-sm font-semibold mb-1.5">رقم الهاتف *</label><input className={input} name="phone" value={form.phone} onChange={change} required type="tel" dir="ltr" placeholder="07XXXXXXXXX" /></div>
          </div>
          <div><label className="block text-sm font-semibold mb-1.5">البريد الإلكتروني (اختياري)</label><input className={input} name="email" value={form.email} onChange={change} type="email" dir="ltr" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold mb-1.5">كلمة المرور *</label><input className={input} name="password" value={form.password} onChange={change} type="password" required minLength={8} autoComplete="new-password" /></div>
            <div><label className="block text-sm font-semibold mb-1.5">تأكيد كلمة المرور *</label><input className={input} name="confirmPassword" value={form.confirmPassword} onChange={change} type="password" required autoComplete="new-password" /></div>
          </div>
          <p className="text-xs text-muted-foreground">كل مدرسة تحصل على مساحة بيانات مستقلة. لا يمكن لمدير مدرسة الاطلاع على بيانات مدرسة أخرى.</p>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-60">
            {loading ? "جارٍ تسجيل المدرسة..." : "تسجيل المدرسة وإنشاء حساب المدير"}
          </button>
        </form>
        <div className="mt-5 text-center text-sm text-muted-foreground">لديك حساب؟ <Link href="/login" className="text-primary font-semibold">تسجيل الدخول</Link></div>
      </div>
    </div>
  );
}
