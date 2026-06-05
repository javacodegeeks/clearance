// Unified CI status fetching for GitHub PRs
import { GITHUB_API_BASE, githubFetch } from './github-api-helpers';

export type CIStatus = 'success' | 'failure' | 'pending' | 'none';

export interface CICheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

export async function fetchCIStatus(
  repository: string,
  sha: string,
  token: string
): Promise<CIStatus> {
  try {
    const [statusResponse, checksResponse] = await Promise.all([
      githubFetch(`${GITHUB_API_BASE}/repos/${repository}/commits/${sha}/status`, token).catch(() => ({ state: null })),
      githubFetch(`${GITHUB_API_BASE}/repos/${repository}/commits/${sha}/check-runs`, token).catch(() => ({ check_runs: [] }))
    ]);

    // Prefer check-runs if available
    if (checksResponse.check_runs && checksResponse.check_runs.length > 0) {
      const checkStatuses = checksResponse.check_runs.map((run: any) => {
        if (run.status !== 'completed') return 'pending';
        return run.conclusion === 'success' ? 'success' : 'failure';
      });

      if (checkStatuses.includes('failure')) {
        return 'failure';
      } else if (checkStatuses.includes('pending')) {
        return 'pending';
      } else if (checkStatuses.every((s: string) => s === 'success')) {
        return 'success';
      }
    }

    // Fall back to commit status
    if (statusResponse.state) {
      if (statusResponse.state === 'success') return 'success';
      if (statusResponse.state === 'pending') return 'pending';
      if (statusResponse.state === 'failure') return 'failure';
    }

    return 'none';
  } catch (error) {
    console.error('[CI Status] Error fetching CI status:', error);
    return 'none';
  }
}

export async function fetchCICheckRuns(
  repository: string,
  sha: string,
  token: string
): Promise<CICheckRun[]> {
  try {
    const checksResponse = await githubFetch(
      `${GITHUB_API_BASE}/repos/${repository}/commits/${sha}/check-runs`,
      token
    );

    return (checksResponse.check_runs || []).map((check: any) => ({
      name: check.name,
      status: check.status,
      conclusion: check.conclusion,
      url: check.html_url,
    }));
  } catch (error) {
    console.error('[CI Status] Error fetching check runs:', error);
    return [];
  }
}
