interface AttemptRecord {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_MS = 15 * 60 * 1000;  // 15 minute block

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now - record.firstAt > WINDOW_MS * 2) {
      attempts.delete(key);
    }
  }
}, 60 * 1000);

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.blockedUntil && now < entry.blockedUntil) return true;
  if (now - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function getRemainingSeconds(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  const now = Date.now();
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return Math.ceil((entry.blockedUntil - now) / 1000);
  }
  return Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000);
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count++;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_MS;
    }
  }
}

export function clearFailedAttempts(key: string): void {
  attempts.delete(key);
}
