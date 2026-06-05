import { GITHUB_API_BASE, githubFetch } from './github-api-helpers';
import type { GitHubPRFile } from '@/lib/types/github';

export interface FetchPRFilesOptions {
  includePatches?: boolean;
  excludeRemoved?: boolean;
  filenamesOnly?: boolean;
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  options: FetchPRFilesOptions & { filenamesOnly: true }
): Promise<string[]>;

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  options?: FetchPRFilesOptions
): Promise<GitHubPRFile[]>;

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  options: FetchPRFilesOptions = {}
): Promise<GitHubPRFile[] | string[]> {
  const {
    includePatches = false,
    excludeRemoved = false,
    filenamesOnly = false,
  } = options;

  const repository = `${owner}/${repo}`;
  const files: GitHubPRFile[] = await githubFetch(
    `${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}/files?per_page=100`,
    token
  );

  const filteredFiles = excludeRemoved
    ? files.filter(f => f.status !== 'removed')
    : files;

  if (filenamesOnly) {
    return filteredFiles.map(f => f.filename);
  }

  return filteredFiles.map(f => ({
    filename: f.filename,
    patch: includePatches ? f.patch : undefined,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
  }));
}

export async function fetchPRWithFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  options: FetchPRFilesOptions = {}
): Promise<{
  pr: {
    title: string;
    body: string;
    changed_files: number;
    additions: number;
    deletions: number;
    updated_at: string;
  };
  files: GitHubPRFile[];
}> {
  const repository = `${owner}/${repo}`;

  // Fetch PR details and files in parallel
  const [pr, files] = await Promise.all([
    githubFetch(`${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}`, token),
    fetchPRFiles(owner, repo, prNumber, token, options),
  ]);

  return {
    pr: {
      title: pr.title,
      body: pr.body || '',
      changed_files: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
      updated_at: pr.updated_at,
    },
    files: files as GitHubPRFile[],
  };
}
