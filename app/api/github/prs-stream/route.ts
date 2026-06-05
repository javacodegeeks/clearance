import { NextResponse } from 'next/server';
import { calculateRiskScore } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import { GITHUB_API_BASE, githubFetch } from '@/lib/services/github/github-api-helpers';
import { fetchCIStatus } from '@/lib/services/github/github-ci-status';
import { processReviewStatus } from '@/lib/services/github/github-review-status';
import { fetchPRComments } from '@/lib/services/github/github-pr-fetcher';
import { extractGitHubToken } from '@/lib/api-middleware/credentials';

export const dynamic = 'force-dynamic';

async function processPRs(
  relevantPulls: any[],
  repoFullName: string,
  userLogin: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  token: string
) {
  // Fetch reviews in parallel for relevant PRs only
  const prWithReviews = await Promise.all(
    relevantPulls.map(async (pr) => {
      const requestedReviewers = pr.requested_reviewers || [];
      const reviewerLogins = requestedReviewers.map((r: any) => r.login);
      const isDirectlyRequested = reviewerLogins.includes(userLogin);
      const isMerged = pr.merged_at !== null;

      let hasApproved = false;
      let otherApprovers: string[] = [];

      // Fetch reviews and process status
      try {
        const reviews = await githubFetch(`${GITHUB_API_BASE}/repos/${repoFullName}/pulls/${pr.number}/reviews`, token);
        const reviewStatusResult = processReviewStatus(reviews, isMerged, userLogin);

        hasApproved = reviewStatusResult.hasApproved;
        otherApprovers = reviewStatusResult.otherApprovers;
      } catch (reviewError) {
        // Ignore review fetch errors
      }

      return {
        pr,
        isDirectlyRequested,
        hasApproved,
        isMerged,
        otherApprovers,
      };
    })
  );

  // Stream PRs that should be included
  for (const { pr, isDirectlyRequested, hasApproved, isMerged, otherApprovers } of prWithReviews) {
    const isOpen = pr.state === 'open';
    const isClosed = pr.state === 'closed';

    // Skip closed PRs that are not merged
    if (isClosed && !isMerged) {
      continue;
    }

    // Include PR if: Open and (directly requested OR user approved), OR Merged and user approved it
    const shouldInclude = (isOpen && (isDirectlyRequested || hasApproved)) || (isMerged && hasApproved);

    if (shouldInclude) {
      // Determine review status
      const reviewStatus: 'awaiting_review' | 'approved_by_me' | 'merged' =
        isMerged ? 'merged' :
          hasApproved ? 'approved_by_me' :
            'awaiting_review';

      // Fetch comments and CI status in parallel (performance optimization)
      const [owner, repo] = repoFullName.split('/');
      const [comments, ciStatus] = await Promise.all([
        fetchPRComments(owner, repo, pr.number, token, 'replies'),
        fetchCIStatus(repoFullName, pr.head.sha, token),
      ]);

      // Calculate risk score
      const tempPR = {
        number: pr.number,
        title: pr.title,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at || null,
        user: {
          login: pr.user?.login || 'unknown',
          avatar_url: pr.user?.avatar_url || '',
        },
        repository: repoFullName,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changed_files: pr.changed_files || 0,
        state: pr.state,
        review_status: reviewStatus,
        merged: isMerged,
        other_approvers: otherApprovers,
        comments,
        ci_status: ciStatus,
        head: pr.head ? { ref: pr.head.ref } : undefined,
        base: pr.base ? { ref: pr.base.ref } : undefined,
      };

      const risk = calculateRiskScore(tempPR);

      const prData = {
        ...tempPR,
        risk_score: risk.score,
        risk_breakdown: risk.breakdown,
      };

      // Note: PR details are no longer saved to database
      // All data is fetched fresh from GitHub API

      // Stream this PR immediately
      const data = JSON.stringify(prData) + '\n';
      controller.enqueue(encoder.encode(data));
    }
  }
}

export async function GET(request: Request) {
  // Extract and validate GitHub token
  const { token: githubToken, error } = extractGitHubToken(request);
  if (error) return error;

  // Get watched repos from query parameter
  const url = new URL(request.url);
  const watchedReposParam = url.searchParams.get('repos');
  const watchedRepos = watchedReposParam ? JSON.parse(watchedReposParam) : [];


  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get current user (token is guaranteed non-null after error check)
        const user = await githubFetch(`${GITHUB_API_BASE}/user`, githubToken!);

        // Only fetch from watched repos - no fallback to all orgs
        if (watchedRepos.length === 0) {
          controller.enqueue(encoder.encode('DONE\n'));
          controller.close();
          return;
        }

        // Process watched repos in parallel batches of 3
        const batchSize = 3;
        for (let i = 0; i < watchedRepos.length; i += batchSize) {
          const batch = watchedRepos.slice(i, i + batchSize);

          // Add small delay between batches
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          await Promise.all(batch.map(async (repoFullName: string) => {
            try {
              // Fetch both open and closed PRs
              const [openPulls, closedPulls] = await Promise.all([
                githubFetch(`${GITHUB_API_BASE}/repos/${repoFullName}/pulls?state=open&per_page=100`, githubToken!),
                githubFetch(`${GITHUB_API_BASE}/repos/${repoFullName}/pulls?state=closed&per_page=10&sort=updated&direction=desc`, githubToken!)
              ]);

              const allPulls = [...openPulls, ...closedPulls];
              console.log('[API:PRsStream] Fetched repo:', {
                repo: repoFullName,
                open: openPulls.length,
                closed: closedPulls.length
              });

              // Filter PRs that might be relevant
              const relevantPulls = allPulls.filter(pr => {
                const requestedReviewers = pr.requested_reviewers || [];
                const reviewerLogins = requestedReviewers.map((r: any) => r.login);
                const isMerged = pr.merged_at !== null;
                const isOpen = pr.state === 'open';
                const isClosed = pr.state === 'closed';

                // Skip closed PRs that are not merged
                if (isClosed && !isMerged) {
                  return false;
                }

                // Include if: open and requested, OR merged (we'll check approval in processPRs)
                // Note: This means open PRs where user approved but is no longer requested won't appear
                return (isOpen && reviewerLogins.includes(user.login)) || isMerged;
              });

              if (relevantPulls.length === 0) {
                return;
              }

              // Process PRs
              await processPRs(relevantPulls, repoFullName, user.login, controller, encoder, githubToken!);
            } catch (repoError) {
              console.error('[GitHub] Error fetching PRs from repo:', repoFullName, repoError);
            }
          }));
        }

        // Send completion signal
        controller.enqueue(encoder.encode('DONE\n'));
        controller.close();

      } catch (error) {
        console.error('[GitHub] Stream error:', error);

        let errorMessage = 'Failed to fetch PRs';
        if (error instanceof Error) {
          if (error.message.includes('rate limit')) {
            errorMessage = 'GitHub rate limit exceeded. Please wait a few minutes and try again.';
          } else {
            errorMessage = error.message;
          }
        }

        const errorData = JSON.stringify({ error: errorMessage }) + '\n';
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
