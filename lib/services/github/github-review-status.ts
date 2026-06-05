// Unified PR review status calculation
import { GITHUB_API_BASE, githubFetch } from './github-api-helpers';

export type ReviewStatus = 'awaiting_review' | 'approved_by_me' | 'merged';

export interface ReviewStatusResult {
  reviewStatus: ReviewStatus;
  hasApproved: boolean;
  otherApprovers: string[];
  myApprovalTime?: string | null;
}

export async function calculateReviewStatus(
  owner: string,
  repo: string,
  prNumber: number,
  isMerged: boolean,
  currentUserLogin: string,
  token: string
): Promise<ReviewStatusResult> {
  try {
    const reviews = await githubFetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      token
    );

    return processReviewStatus(reviews, isMerged, currentUserLogin);
  } catch (error) {
    console.error('[Review Status] Failed to fetch reviews:', error);
    // Return default state on error
    return {
      reviewStatus: 'awaiting_review',
      hasApproved: false,
      otherApprovers: [],
    };
  }
}

export function processReviewStatus(
  reviews: any[],
  isMerged: boolean,
  currentUserLogin: string
): ReviewStatusResult {
  let hasApproved = false;
  let myApprovalTime: string | null = null;
  const otherApprovers: string[] = [];

  // Check all reviews for approvals (both merged and open PRs)
  for (const review of reviews) {
    if (review.state === 'APPROVED') {
      if (review.user.login === currentUserLogin) {
        hasApproved = true;
        myApprovalTime = review.submitted_at;
      } else {
        // Collect other approvers (deduplicate)
        if (!otherApprovers.includes(review.user.login)) {
          otherApprovers.push(review.user.login);
        }
      }
    }
  }

  // Determine final review status
  let reviewStatus: ReviewStatus;
  if (isMerged) {
    reviewStatus = 'merged';
  } else if (hasApproved) {
    reviewStatus = 'approved_by_me';
  } else {
    reviewStatus = 'awaiting_review';
  }

  return {
    reviewStatus,
    hasApproved,
    otherApprovers,
    myApprovalTime,
  };
}

export async function getCurrentUser(token: string): Promise<{ login: string } | null> {
  try {
    const user = await githubFetch(`${GITHUB_API_BASE}/user`, token);
    return user;
  } catch (error) {
    console.error('[Review Status] Failed to fetch current user:', error);
    return null;
  }
}
