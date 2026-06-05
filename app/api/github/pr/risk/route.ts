import { NextResponse } from 'next/server';
import { GITHUB_API_BASE, githubFetch } from '@/lib/services/github/github-api-helpers';
import { fetchCIStatus } from '@/lib/services/github/github-ci-status';
import { fetchPRComments } from '@/lib/services/github/github-pr-fetcher';
import { calculateEnhancedRiskScore } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import { extractGitHubToken } from '@/lib/api-middleware/credentials';
import { PullRequest } from '@/lib/types/github';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Extract and validate GitHub token
    const { token: githubToken, error } = extractGitHubToken(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const prNumber = searchParams.get('pr_number');

    if (!owner || !repo || !prNumber) {
      return NextResponse.json(
        { error: 'owner, repo, and pr_number are required' },
        { status: 400 }
      );
    }

    const repository = `${owner}/${repo}`;

    // Fetch PR data, files, and status in parallel
    const [prData, files, comments] = await Promise.all([
      githubFetch(`${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}`, githubToken!),
      githubFetch(
        `${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}/files?per_page=100`,
        githubToken!
      ),
      fetchPRComments(owner, repo, parseInt(prNumber), githubToken!, 'replies'),
    ]);

    // Fetch CI status
    const ciStatus = await fetchCIStatus(repository, prData.head.sha, githubToken!);

    // Build PR object for risk calculation
    const pr: PullRequest = {
      number: prData.number,
      title: prData.title,
      html_url: prData.html_url,
      created_at: prData.created_at,
      updated_at: prData.updated_at,
      merged_at: prData.merged_at || null,
      user: {
        login: prData.user?.login || 'unknown',
        avatar_url: prData.user?.avatar_url || '',
      },
      repository: repository,
      additions: prData.additions || 0,
      deletions: prData.deletions || 0,
      changed_files: prData.changed_files || 0,
      state: prData.state,
      review_status: 'awaiting_review', // Not needed for risk calculation
      merged: !!prData.merged_at,
      other_approvers: [],
      comments,
      ci_status: ciStatus,
      head: prData.head ? { ref: prData.head.ref } : undefined,
      base: prData.base ? { ref: prData.base.ref } : undefined,
    };

    // Format files for risk calculation
    const formattedFiles = files.map((file: any) => ({
      filename: file.filename,
      patch: file.patch || '',
      additions: file.additions || 0,
      deletions: file.deletions || 0,
    }));

    // Calculate enhanced risk score
    const enhancedRisk = calculateEnhancedRiskScore(pr, formattedFiles);

    return NextResponse.json(enhancedRisk);
  } catch (error) {
    console.error('[API] Error calculating enhanced risk:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}
