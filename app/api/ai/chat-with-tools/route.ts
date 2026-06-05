import { extractCredentials } from '@/lib/api-middleware/credentials';
import { createNDJSONStreamingResponse } from '@/lib/api-middleware/streaming';
import { chatWithToolsStream } from '@/lib/services/ai/azure-openai';
import { getPullRequestDetails, fetchPRData } from '@/lib/services/github/github-pr-fetcher';
import { fetchCICheckRuns } from '@/lib/services/github/github-ci-status';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Extract and validate credentials
    const { credentials, error } = extractCredentials(request, { logPrefix: '[API:ChatWithTools]' });
    if (error) return error;

    const { githubToken, azureCredentials } = credentials!;

    const body = await request.json();
    const { repository, prNumber, messages = [], missions = [] } = body;

    if (!repository || !prNumber) {
      return NextResponse.json({ error: 'Repository and PR number required' }, { status: 400 });
    }

    // Parse owner/repo
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid repository format' }, { status: 400 });
    }

    // Fetch PR details and metadata from GitHub
    const [prDetails, prData] = await Promise.all([
      getPullRequestDetails(owner, repo, prNumber, githubToken!),
      fetchPRData(owner, repo, prNumber, githubToken!)
    ]);

    console.log('[API:ChatWithTools] PR details fetched:', {
      title: prDetails.title,
      filesCount: prDetails.files.length,
      sha: prData.head.sha
    });

    // Fetch CI check runs
    const checks = await fetchCICheckRuns(
      `${owner}/${repo}`,
      prData.head.sha,
      githubToken!
    );

    console.log('[API:ChatWithTools] CI checks fetched:', checks.length);

    // Stream the chat response with tool calls
    return createNDJSONStreamingResponse(
      chatWithToolsStream(
        prDetails.title,
        prDetails.body,
        prDetails.files,
        missions,
        messages,
        azureCredentials!,
        {
          repository: `${owner}/${repo}`,
          sha: prData.head.sha,
          checks
        },
        githubToken!
      ),
      {
        onError: (error) => console.error('[API:ChatWithTools] Stream error:', error)
      }
    );
  } catch (error) {
    console.error('[API:ChatWithTools] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return NextResponse.json({ error: 'Azure OpenAI not configured' }, { status: 401 });
      }
      if (error.message.includes('GitHub token')) {
        return NextResponse.json({ error: 'GitHub token not configured' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to analyze PR' }, { status: 500 });
  }
}
