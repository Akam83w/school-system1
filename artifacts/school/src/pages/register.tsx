import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Role = "teacher" | "student";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "teacher" as Role,
  });
  const [nameError, setNameError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "فشل إنشاء الحساب", description: data.error ?? "حدث خطأ غير متوقع", variant: "destructive" });
        return;
      }

      toast({ title: "تم إنشاء الحساب بنجاح", description: "يمكنك الآن تسجيل الدخول" });
      navigate("/login");
    } catch {
      toast({ title: "خطأ في الاتصال", description: "تعذّر الاتصال بالخادم، حاول مرة أخرى", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const passwordMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-white text-3xl font-bold shadow-2xl mb-4">م</div>
          <h1 className="text-3xl font-bold text-white mb-1">نظام إدارة المدرسة</h1>
          <p className="text-white/60 text-sm">المنظومة التعليمية العراقية</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">إنشاء حساب جديد</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                الاسم الكامل <span className="text-red-500">*</span>
                <span className="text-muted-foreground text-xs font-normal mr-1">(ثلاثة أسماء على الأقل)</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${nameError ? "border-red-400 bg-red-50" : "border-border bg-background"}`}
                placeholder="مثال: أحمد محمد الجبوري"
                required
              />
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                اسم المستخدم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
                placeholder="07XXXXXXXXX"
                required
                dir="ltr"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">الدور الوظيفي</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
              >
                <option value="teacher">معلم</option>
                <option value="student">طالب</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">يُعيَّن دور المدير تلقائياً للمستخدم الأول فقط</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
                placeholder="6 أحرف على الأقل"
                required
                minLength={6}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                تأكيد كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${passwordMismatch ? "border-red-400 bg-red-50" : "border-border bg-background"}`}
                placeholder="أعد إدخال كلمة المرور"
                required
              />
              {passwordMismatch && (
                <p className="text-xs text-red-500 mt-1">كلمة المرور وتأكيدها غير متطابقتين</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-2"
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
