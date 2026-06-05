import { NextResponse } from 'next/server';
import { generateMissions } from '@/lib/services/ai/azure-openai';
import type { Mission } from '@/lib/types/github';
import { sortMissionsByPriority } from '@/lib/config/constants/mission-config';
import { extractCredentials } from '@/lib/api-middleware/credentials';
import { fetchPRWithFiles } from '@/lib/services/github/github-pr-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for AI analysis

export async function POST(request: Request) {
  try {
    // Extract and validate credentials
    const { credentials, error } = extractCredentials(request, { logPrefix: '[API:GenerateMissions]' });
    if (error) return error;

    const { githubToken, azureCredentials } = credentials!;

    const body = await request.json();
    const { owner, repo, pr_number } = body;

    if (!owner || !repo || !pr_number) {
      return NextResponse.json(
        { error: 'owner, repo, and pr_number required' },
        { status: 400 }
      );
    }

    // Fetch PR details and files with patches
    const { pr, files } = await fetchPRWithFiles(owner, repo, pr_number, githubToken!, {
      includePatches: true,
    });

    // Filter files with patches (skip binary files, removed files)
    const filesWithPatches = files.filter(f => f.patch && f.status !== 'removed');
    console.log('[API:GenerateMissions] PR fetched:', {
      filesWithPatches: filesWithPatches.length,
      totalFiles: files.length
    });

    // Generate missions using Azure OpenAI
    let missions: Mission[];
    try {
      const rawMissions = await generateMissions(
        {
          prTitle: pr.title,
          prBody: pr.body,
          changedFiles: pr.changed_files,
          additions: pr.additions,
          deletions: pr.deletions,
          files: filesWithPatches.map(f => ({ filename: f.filename, patch: f.patch! })),
        },
        azureCredentials!
      );

      missions = rawMissions.map((m, idx) => ({
        id: `mission-${Date.now()}-${idx}`,
        priority: m.priority || 'medium',
        category: m.category || 'correctness',
        file: m.file || 'unknown',
        line: m.line,
        title: m.title || 'Untitled concern',
        why: m.why || '',
        tasks: m.tasks || [],
        status: 'pending' as const,
        code_snippet: m.code_snippet,
      }));

    } catch (error) {
      console.error('[API] Error parsing missions:', error);
      return NextResponse.json(
        {
          error: 'Invalid AI response format',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Check if any missions were generated
    if (missions.length === 0) {
      return NextResponse.json({
        missions: [],
        generated_at: new Date().toISOString(),
        files_analyzed: filesWithPatches.length,
        skipped_files: files.filter(f => !f.patch || f.status === 'removed').map(f => f.filename),
        pr_updated_at: pr.updated_at,
        message: 'No critical concerns found',
      });
    }

    // Sort by priority (high to low)
    missions = sortMissionsByPriority(missions);

    return NextResponse.json({
      missions,
      generated_at: new Date().toISOString(),
      files_analyzed: filesWithPatches.length,
      skipped_files: files.filter(f => !f.patch || f.status === 'removed').map(f => f.filename),
      pr_updated_at: pr.updated_at,
    });
  } catch (error) {
    console.error('[API] Error generating missions:', error);
    return NextResponse.json(
      { error: 'Failed to generate missions' },
      { status: 500 }
    );
  }
}
