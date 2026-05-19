import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, lastSyncTime, syncNow } = useNetworkStatus();

  if (isSyncing) {
    return (
      <div className="w-full bg-blue-600 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2" dir="rtl">
        <svg className="w-3 h-3 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
        </svg>
        جاري مزامنة البيانات مع الخادم...
      </div>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <div className="w-full bg-blue-500 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-3" dir="rtl">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {pendingCount} إجراء في انتظار المزامنة
        </span>
        <button onClick={syncNow} className="bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-0.5 text-xs transition-colors cursor-pointer">
          زامن الآن
        </button>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="w-full bg-amber-500 text-white text-xs font-semibold py-2 px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1" dir="rtl" role="alert">
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
          </svg>
          وضع عدم الاتصال
        </span>
        <span className="text-white/90 font-normal">يمكنك تسجيل الحضور والدرجات — ستُزامَن تلقائياً عند عودة الاتصال</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs flex-shrink-0">
            {pendingCount} إجراء معلق
          </span>
        )}
        {lastSyncTime && (
          <span className="text-white/70 font-normal text-[10px] flex-shrink-0">
            آخر مزامنة: {lastSyncTime.toLocaleTimeString('ar-IQ')}
          </span>
        )}
      </div>
    );
  }

  return null;
}
