import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [nameError, setNameError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "name") {
      const parts = value.trim().split(/\s+/).filter(Boolean);
      setNameError(parts.length >= 3 || value === "" ? "" : "يجب أن يتكون الاسم من ثلاثة أسماء على الأقل");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameParts = form.name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 3) {
      toast({ title: "الاسم غير مكتمل", description: "يجب أن يتكون الاسم الكامل من ثلاثة أسماء على الأقل", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "خطأ في التحقق", description: "كلمة المرور وتأكيدها غير متطابقتين", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "كلمة المرور قصيرة", description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username,
          phone: form.phone.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          toast({
            title: "تسجيل جديد محظور",
            description: "يتم إنشاء الحسابات الجديدة من قِبَل مدير النظام فقط. تواصل مع المدير للحصول على حسابك.",
            variant: "destructive",
          });
        } else {
          toast({ title: "فشل إنشاء الحساب", description: data.error ?? "حدث خطأ غير متوقع", variant: "destructive" });
        }
        return;
      }
      setRegistered(true);
      toast({ title: "تم إعداد حساب المدير بنجاح", description: "يمكنك الآن تسجيل الدخول" });
    } catch {
      toast({ title: "خطأ في الاتصال", description: "تعذّر الاتصال بالخادم، حاول مرة أخرى", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const passwordMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword;
  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm";

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">تم إنشاء حساب المدير</h2>
          <p className="text-muted-foreground text-sm mb-6">يمكنك الآن تسجيل الدخول وإدارة حسابات المعلمين والطلاب من لوحة التحكم.</p>
          <Link href="/login">
            <button className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
              تسجيل الدخول
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl font-bold shadow-lg shadow-primary/20 mb-3">م</div>
          <h1 className="text-2xl font-black text-foreground">إعداد حساب المدير</h1>
          <p className="text-muted-foreground text-sm mt-1">هذا النموذج مخصص لإنشاء حساب المدير الأول فقط</p>
        </div>

        {/* Admin-only notice */}
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">إنشاء حسابات المعلمين والطلاب</p>
            <p className="text-xs text-amber-700 mt-0.5">بعد تسجيل الدخول كمدير، يمكنك إنشاء حسابات المعلمين والطلاب من صفحة إدارة المستخدمين. لا يُسمح للمستخدمين بتسجيل حسابات بأنفسهم.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-border p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                الاسم الكامل <span className="text-destructive">*</span>
                <span className="text-muted-foreground text-xs font-normal mr-1">(ثلاثة أسماء على الأقل)</span>
              </label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                className={`${inputCls} ${nameError ? "border-destructive ring-2 ring-destructive/20" : ""}`}
                placeholder="مثال: أحمد محمد علي الجبوري" required
              />
              {nameError && <p className="text-xs text-destructive mt-1 flex items-center gap-1">⚠ {nameError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">اسم المستخدم <span className="text-destructive">*</span></label>
                <input
                  type="text" name="username" value={form.username} onChange={handleChange}
                  className={inputCls} placeholder="مثال: admin123" required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">رقم الهاتف <span className="text-destructive">*</span></label>
                <input
                  type="tel" name="phone" value={form.phone} onChange={handleChange}
                  className={inputCls} placeholder="07XXXXXXXXX" required dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">كلمة المرور <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                    className={`${inputCls} pl-9`} placeholder="6 أحرف على الأقل" required minLength={6}
                  />
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
                <label className="block text-sm font-semibold mb-1.5">تأكيد كلمة المرور <span className="text-destructive">*</span></label>
                <input
                  type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                  className={`${inputCls} ${passwordMismatch ? "border-destructive ring-2 ring-destructive/20" : ""}`}
                  placeholder="أعد الإدخال" required
                />
                {passwordMismatch && <p className="text-xs text-destructive mt-1">⚠ غير متطابقتين</p>}
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  جاري الإعداد...
                </span>
              ) : "إنشاء حساب المدير"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
