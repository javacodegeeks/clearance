import { PullRequest } from '@/lib/types/github';

const NOTIFIED_STALE_KEY = 'notified-stale-prs';

export function detectStalePRs(prs: PullRequest[], thresholdHours: number): Set<number> {
  const threshold = Math.max(1, thresholdHours) * 60 * 60 * 1000;
  const now = Date.now();
  const stale = new Set<number>();

  for (const pr of prs) {
    if (pr.state === 'closed' || pr.review_status === 'merged') continue;
    const lastUpdated = new Date(pr.updated_at).getTime();
    if (now - lastUpdated >= threshold) {
      stale.add(pr.number);
    }
  }

  return stale;
}

export function getNotifiedStalePRs(): Set<number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STALE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set<number>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveNotifiedStalePRs(ids: Set<number>): void {
  try {
    localStorage.setItem(NOTIFIED_STALE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable — silent fail
  }
}
