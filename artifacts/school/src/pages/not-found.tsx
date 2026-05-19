import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="text-center max-w-sm">
        <p className="text-8xl font-black text-primary/15 mb-4 leading-none">٤٠٤</p>
        <h1 className="text-2xl font-black text-foreground mb-2">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          عذراً، لا يمكن إيجاد الصفحة المطلوبة. ربما تغيّر الرابط أو لم تعد موجودة.
        </p>
        <Link href="/dashboard">
          <button className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20">
            العودة إلى لوحة التحكم
          </button>
        </Link>
      </div>
    </div>
  );
}
