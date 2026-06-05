import { NextResponse } from 'next/server';
import { extractGitHubToken } from '@/lib/api-middleware/credentials';
import { GITHUB_API_BASE, githubFetch } from '@/lib/services/github/github-api-helpers';
import { fetchCICheckRuns } from '@/lib/services/github/github-ci-status';
import { fetchPRMetadata } from '@/lib/services/github/github-pr-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { token: githubToken, error } = extractGitHubToken(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const prNumber = searchParams.get('number');

    if (!owner || !repo || !prNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, number' },
        { status: 400 }
      );
    }

    const repository = `${owner}/${repo}`;
    const prNum = parseInt(prNumber);

    const [metadata, detailsData, commentsData] = await Promise.all([
      fetchPRMetadata(owner, repo, prNum, githubToken!),

      fetchPRDetails(owner, repo, prNum, githubToken!),

      fetchPRCommentsComplete(owner, repo, prNum, githubToken!),
    ]);

    const pr = {
      number: metadata.prData.number,
      title: metadata.prData.title,
      repository,
      state: metadata.prData.state,
      html_url: metadata.prData.html_url,
      user: {
        login: metadata.prData.user.login,
        avatar_url: metadata.prData.user.avatar_url,
      },
      created_at: metadata.prData.created_at,
      updated_at: metadata.prData.updated_at,
      changed_files: metadata.prData.changed_files,
      additions: metadata.prData.additions,
      deletions: metadata.prData.deletions,
      review_status: metadata.reviewStatus as 'awaiting_review' | 'approved_by_me' | 'merged',
      my_approval_time: metadata.myApprovalTime,
      other_approvers: metadata.otherApprovers,
      comments: metadata.comments,
      ci_status: metadata.ciStatus,
    };

    return NextResponse.json({
      pr,
      details: detailsData,
      comments: commentsData,
    });
  } catch (error) {
    console.error('[API] Error fetching complete PR data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PR data' },
      { status: 500 }
    );
  }
}

async function fetchPRDetails(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  const repository = `${owner}/${repo}`;

  const [pr, commits, files] = await Promise.all([
    githubFetch(`${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}`, token),
    githubFetch(`${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}/commits`, token),
    githubFetch(`${GITHUB_API_BASE}/repos/${repository}/pulls/${prNumber}/files?per_page=100`, token),
  ]);

  const headSha = pr.head.sha;
  const checks = await fetchCICheckRuns(repository, headSha, token);

  const last5Commits = commits.slice(-5).reverse().map((commit: any) => ({
    sha: commit.sha.substring(0, 7),
    message: commit.commit.message.split('\n')[0],
    author: commit.commit.author.name,
    date: commit.commit.author.date,
    url: commit.html_url,
  }));

  const filesChanged = files.map((file: any) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch || '',
    url: file.blob_url,
  }));

  return {
    commits: last5Commits,
    checks,
    files: filesChanged,
  };
}

async function fetchPRCommentsComplete(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
) {
  const [reviewComments, issueComments] = await Promise.all([
    githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/comments`, token).catch(() => []),
    githubFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`, token).catch(() => []),
  ]);

  const threads = new Map<string, any[]>();

  reviewComments.forEach((comment: any) => {
    const threadId = comment.in_reply_to_id?.toString() || comment.id.toString();
    if (!threads.has(threadId)) {
      threads.set(threadId, []);
    }
    threads.get(threadId)!.push({
      id: comment.id,
      body: comment.body,
      user: {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url,
      },
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      path: comment.path,
      line: comment.line || comment.original_line,
      in_reply_to_id: comment.in_reply_to_id,
      html_url: comment.html_url,
    });
  });

  const commentThreads = Array.from(threads.values()).map(thread => {
    thread.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const rootComment = thread[0];
    const replies = thread.slice(1);

    const lastComment = thread[thread.length - 1];
    const lastBody = lastComment.body.toLowerCase();
    const resolved = lastBody.includes('resolved') ||
                    lastBody.includes('fixed') ||
                    lastBody.includes('done');

    return {
      id: rootComment.id,
      root: rootComment,
      replies,
      resolved,
      path: rootComment.path,
      line: rootComment.line,
    };
  });

  const generalComments = issueComments.map((comment: any) => ({
    id: comment.id,
    body: comment.body,
    user: {
      login: comment.user.login,
      avatar_url: comment.user.avatar_url,
    },
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    html_url: comment.html_url,
  }));

  const totalThreads = commentThreads.length;
  const resolvedThreads = commentThreads.filter(t => t.resolved).length;

  return {
    threads: commentThreads,
    generalComments,
    stats: {
      total: totalThreads,
      resolved: resolvedThreads,
      unresolved: totalThreads - resolvedThreads,
    },
  };
}
