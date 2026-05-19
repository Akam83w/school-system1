import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone) return;
    // Don't show if dismissed recently
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Show after 3 seconds delay
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setShow(false);
    setInstallEvent(null);
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem("pwa-prompt-dismissed", String(Date.now()));
  }

  if (!show || installed) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 z-50 md:left-auto md:w-80"
      dir="rtl"
      role="dialog"
      aria-label="تثبيت التطبيق"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Blue header bar */}
        <div className="bg-primary px-5 py-4 flex items-center gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="30" width="40" height="24" rx="2" fill="white" fillOpacity="0.9"/>
              <polygon points="32,10 7,30 57,30" fill="white"/>
              <rect x="26" y="42" width="12" height="12" rx="2" fill="#1d4ed8"/>
              <rect x="14" y="34" width="8" height="6" rx="1" fill="#bfdbfe"/>
              <rect x="42" y="34" width="8" height="6" rx="1" fill="#bfdbfe"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">نظام إدارة المدرسة</p>
            <p className="text-white/70 text-xs mt-0.5">ثبّت التطبيق على جهازك</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            ثبّت التطبيق للوصول السريع وإمكانية العمل دون اتصال بالإنترنت
          </p>

          {/* Feature list */}
          <div className="space-y-1.5 mb-4">
            {[
              { icon: "⚡", text: "تشغيل سريع من الشاشة الرئيسية" },
              { icon: "📶", text: "يعمل حتى بدون اتصال" },
              { icon: "🔔", text: "تجربة تطبيق أصلي" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-base">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              تثبيت الآن
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
