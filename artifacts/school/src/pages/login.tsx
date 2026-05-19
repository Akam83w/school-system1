import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { toast } = useToast();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        window.location.href = "/dashboard";
      },
      onError: () => {
        toast({ title: "خطأ في تسجيل الدخول", description: "اسم المستخدم أو كلمة المرور غير صحيحة", variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } });
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left panel: decorative */}
      <div className="hidden lg:flex flex-1 bg-sidebar flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 400 400">
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 10 }).map((__, c) => (
                <rect key={`${r}-${c}`} x={c * 45} y={r * 45} width="20" height="20" rx="4" fill="white" />
              ))
            )}
          </svg>
        </div>
        <div className="relative z-10 text-center max-w-sm">
          {/* School illustration */}
          <div className="w-28 h-28 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
              <rect x="8" y="30" width="48" height="28" rx="2" fill="hsl(213 94% 68%)" opacity="0.9"/>
              <polygon points="32,8 4,30 60,30" fill="hsl(213 94% 68%)"/>
              <rect x="26" y="40" width="12" height="18" rx="2" fill="hsl(224 47% 13%)"/>
              <rect x="10" y="34" width="10" height="8" rx="1" fill="white" opacity="0.6"/>
              <rect x="44" y="34" width="10" height="8" rx="1" fill="white" opacity="0.6"/>
              <circle cx="32" cy="22" r="3" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-3 leading-tight">نظام إدارة المدرسة</h2>
          <p className="text-sidebar-foreground/60 text-base leading-relaxed">
            المنظومة التعليمية العراقية المتكاملة لإدارة الطلاب والمعلمين والدرجات والحضور
          </p>

          {/* Features list */}
          <div className="mt-10 space-y-3 text-right">
            {[
              ["📊", "لوحة تحكم شاملة مع إحصاءات لحظية"],
              ["🎓", "إدارة الطلاب والسجلات الأكاديمية"],
              ["📝", "تاريخ كامل للدرجات والحضور"],
              ["📱", "تطبيق PWA يعمل بدون إنترنت"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <span className="text-sm text-sidebar-foreground/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-2xl font-bold shadow-lg mb-3">م</div>
            <h1 className="text-2xl font-black text-foreground">نظام إدارة المدرسة</h1>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-black text-foreground">مرحباً بعودتك</h2>
              <p className="text-muted-foreground text-sm mt-1">سجّل دخولك للمتابعة</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm pl-10"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20 mt-1"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    جاري التحقق...
                  </span>
                ) : "تسجيل الدخول"}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-5 p-3.5 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-xs font-semibold text-primary mb-1.5">بيانات تجريبية</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>اسم المستخدم: <strong className="text-foreground">admin</strong></span>
                <span>كلمة المرور: <strong className="text-foreground">admin123</strong></span>
              </div>
            </div>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
