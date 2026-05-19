import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2"
      dir="rtl"
      role="alert"
    >
      <span className="text-base">📶</span>
      <span>أنت غير متصل بالإنترنت — يتم عرض البيانات المحفوظة مؤقتاً</span>
    </div>
  );
}
