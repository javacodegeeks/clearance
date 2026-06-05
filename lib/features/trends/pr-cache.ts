import { PullRequest } from '@/lib/types/github';
import { createLocalStorageStore } from '@/lib/storage/storage-utils';

interface CachedData {
  prs: PullRequest[];
  timestamp: number;
  checksum: string;
}

const CACHE_KEY = 'pr-queue-cache';

// Create storage instance
const prCacheStore = createLocalStorageStore<CachedData>({
  key: CACHE_KEY,
});

// Generate checksum for change detection
export function generateChecksum(prs: PullRequest[]): string {
  const data = prs.map(pr => ({
    number: pr.number,
    repository: pr.repository,
    status: pr.review_status,
    ci: pr.ci_status,
  }));
  return JSON.stringify(data);
}

// Save PRs to cache
export function savePRCache(prs: PullRequest[]): void {
  const cached: CachedData = {
    prs,
    timestamp: Date.now(),
    checksum: generateChecksum(prs),
  };

  const success = prCacheStore.set(cached);
  if (!success) {
    console.error('[Cache] Failed to save');
  } else {
    console.log('[Cache] Saved:', { count: prs.length });
  }
}

// Load PRs from cache
export function loadPRCache(maxAgeMinutes: number): PullRequest[] | null {
  const cached = prCacheStore.get();

  if (!cached) {
    console.log('[Cache] No cached data found');
    return null;
  }

  const ageMinutes = (Date.now() - cached.timestamp) / (1000 * 60);

  if (ageMinutes > maxAgeMinutes) {
    console.log('[Cache] Expired:', {
      ageMinutes: ageMinutes.toFixed(1),
      maxAge: maxAgeMinutes
    });
    return null;
  }

  console.log('[Cache] Hit:', {
    count: cached.prs.length,
    ageMinutes: ageMinutes.toFixed(1)
  });
  return cached.prs;
}

// Get cached checksum for comparison
export function getCachedChecksum(): string | null {
  const cached = prCacheStore.get();
  return cached?.checksum ?? null;
}

// Get cached timestamp for comparison
export function getCachedTimestamp(): number {
  const cached = prCacheStore.get();
  return cached?.timestamp ?? 0;
}

// Clear cache
export function clearPRCache(): void {
  console.log('[Cache] Clearing cache');
  prCacheStore.remove();
}
