import { useState, useEffect, useCallback, useRef } from 'react';
import { syncPendingActions, getPendingCount } from '@/lib/offlineSync';
import { useQueryClient } from '@tanstack/react-query';

export interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const { synced } = await syncPendingActions();
      if (synced > 0) {
        await queryClient.invalidateQueries();
      }
      setLastSyncTime(new Date());
      await refreshCount();
    } catch {
      // Silently ignore sync errors
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient, refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Small delay to ensure connectivity is stable
      setTimeout(syncNow, 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Poll pending count every 4 seconds
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 4000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return { isOnline, pendingCount, isSyncing, lastSyncTime, syncNow };
}
