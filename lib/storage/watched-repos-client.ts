// Browser-based watched repos storage using localStorage
// Each user's watched repos are stored only in their browser

import { createLocalStorageStore } from './storage-utils';

const WATCHED_REPOS_KEY = 'pr-dashboard-watched-repos';

// Create storage instance
const watchedReposStore = createLocalStorageStore<string[]>({
  key: WATCHED_REPOS_KEY,
  defaultValue: [],
});

export async function getWatchedRepos(): Promise<string[]> {
  const repos = watchedReposStore.get() ?? [];
  return repos;
}

export async function saveWatchedRepos(repos: string[]): Promise<boolean> {
  const success = watchedReposStore.set(repos);
  if (!success) {
    console.error('[WatchedReposClient] Failed to save repos');
  }
  return success;
}
