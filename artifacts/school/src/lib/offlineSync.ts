import { offlineDb, type OfflineAction } from './offlineDb';
import { getToken } from './auth';

function getBase(): string {
  return (import.meta.env.BASE_URL as string).replace(/\/$/, '');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Add an action to the offline queue */
export async function enqueueAction(
  action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>
): Promise<void> {
  await offlineDb.offlineActions.add({
    ...action,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  });
}

/** Process all pending actions in the queue */
export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  const token = getToken();
  if (!token) return { synced: 0, failed: 0 };

  const pending = await offlineDb.offlineActions
    .where('status')
    .anyOf(['pending'])
    .sortBy('timestamp');

  let synced = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      await offlineDb.offlineActions.update(action.id!, { status: 'syncing' });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(action.url, {
        method: action.method,
        headers: authHeaders(),
        body: action.body ? JSON.stringify(action.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        await offlineDb.offlineActions.delete(action.id!);
        synced++;
      } else {
        const newCount = action.retryCount + 1;
        await offlineDb.offlineActions.update(action.id!, {
          status: newCount >= 5 ? 'failed' : 'pending',
          retryCount: newCount,
        });
        if (newCount >= 5) failed++;
      }
    } catch {
      // Network not available — reset to pending and stop
      if (action.id != null) {
        await offlineDb.offlineActions.update(action.id, { status: 'pending' });
      }
      break;
    }
  }

  return { synced, failed };
}

/** Get count of pending actions */
export async function getPendingCount(): Promise<number> {
  return offlineDb.offlineActions.where('status').anyOf(['pending', 'syncing']).count();
}

/** Load offline actions for a specific entity (for UI display) */
export async function getOfflineActionsForEntity(entity: OfflineAction['entity']): Promise<OfflineAction[]> {
  return offlineDb.offlineActions.where('entity').equals(entity).sortBy('timestamp');
}

/** Populate IndexedDB caches from API (best-effort, silent fail) */
export async function refreshOfflineCache(): Promise<void> {
  const token = getToken();
  if (!token) return;

  const base = getBase();
  const headers = authHeaders();

  const fetches = await Promise.allSettled([
    fetch(`${base}/api/students`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/api/classes`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/api/teachers`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/api/subjects`, { headers }).then(r => r.ok ? r.json() : null),
  ]);

  const [students, classes, teachers, subjects] = fetches.map(f =>
    f.status === 'fulfilled' && Array.isArray(f.value) ? f.value : null
  );

  const now = Date.now();

  try {
    await offlineDb.transaction(
      'rw',
      offlineDb.students,
      offlineDb.classes,
      offlineDb.teachers,
      offlineDb.subjects,
      async () => {
        if (students) {
          await offlineDb.students.clear();
          await offlineDb.students.bulkPut(students.map((s: unknown) => ({ ...(s as object), _cachedAt: now } as import('./offlineDb').CachedStudent)));
        }
        if (classes) {
          await offlineDb.classes.clear();
          await offlineDb.classes.bulkPut(classes);
        }
        if (teachers) {
          await offlineDb.teachers.clear();
          await offlineDb.teachers.bulkPut(teachers);
        }
        if (subjects) {
          await offlineDb.subjects.clear();
          await offlineDb.subjects.bulkPut(subjects);
        }
      }
    );
  } catch {
    // Silently ignore IDB errors — cache is optional
  }
}
