// Unified GitHub PR fetching utilities
import { GITHUB_API_BASE, githubFetch } from './github-api-helpers';
import { calculateCommentStatsWithKeywords, calculateCommentStatsWithReplies, groupCommentsIntoThreads, isThreadResolvedByKeywords } from '@/lib/core/comment-utils';
import { calculateReviewStatus, getCurrentUser } from './github-review-status';
import { fetchCIStatus } from './github-ci-status';

export interface PRComments {
  total: number;
  resolved: number;
}

export async function fetchPRComments(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  method: 'keywords' | 'replies' = 'keywords'
): Promise<PRComments> {
  try {
    const [reviewComments, issueComments] = await Promise.all([
      githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`, token).catch(() => []),
      githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`, token).catch(() => [])
    ]);

    if (method === 'keywords') {
      return calculateCommentStatsWithKeywords(reviewComments, issueComments);
    } else {
      return calculateCommentStatsWithReplies(reviewComments, issueComments);
    }
  } catch (error) {
    console.error('[PR Fetcher] Failed to fetch comments:', error);
    return { total: 0, resolved: 0 };
  }
}

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  try {
    // Fetch PR data and current user in parallel
    const [prData, currentUser] = await Promise.all([
      githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, token),
      getCurrentUser(token)
    ]);

    if (!currentUser) {
      throw new Error('Failed to get current user');
    }

    // Fetch comments, review status, and CI status in parallel
    const [comments, reviewStatusResult, ciStatus] = await Promise.all([
      fetchPRComments(owner, repo, prNumber, token, 'keywords'),
      calculateReviewStatus(owner, repo, prNumber, prData.merged, currentUser.login, token),
      fetchCIStatus(`${owner}/${repo}`, prData.head.sha, token)
    ]);

    return {
      prData,
      currentUser,
      comments,
      reviewStatus: reviewStatusResult.reviewStatus,
      otherApprovers: reviewStatusResult.otherApprovers,
      myApprovalTime: reviewStatusResult.myApprovalTime,
      ciStatus,
    };
  } catch (error) {
    console.error('[PR Fetcher] Failed to fetch PR metadata:', error);
    throw error;
  }
}

export async function fetchPRData(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  return githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, token);
}

export async function fetchPRReviews(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  return githubFetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token
  ).catch(() => []);
}

export async function getPullRequestDetails(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  try {
    const [pr, files] = await Promise.all([
      githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, token),
      githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, token),
    ]);

    return {
      title: pr.title,
      body: pr.body || '',
      files: files.map((f: any) => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || '',
        status: f.status || 'modified',
      })),
    };
  } catch (error) {
    console.error('[GitHub] Failed to fetch PR details:', error);
    throw error;
  }
}

