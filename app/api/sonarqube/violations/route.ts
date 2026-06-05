
import { NextResponse } from 'next/server';
import { SonarQubeClient } from '@/lib/services/sonarqube/sonarqube-client';
import { extractSonarQubeCredentials } from '@/lib/api-middleware/credentials';
import { fetchPRFiles } from '@/lib/services/github/github-pr-helpers';
import { createSafeObject, isSafePropertyKey } from '@/lib/security/url-validation';
import type { Violation } from '@/lib/types/sonarqube';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function filterViolationsByPRFiles(
  violations: Violation[],
  prFiles: string[]
): Violation[] {
  // Create a set for faster lookup
  const prFileSet = new Set(prFiles);

  const filtered = violations.filter(violation => {
    // The component field contains the file path
    const filePath = violation.component;
    return prFileSet.has(filePath);
  });

  console.log(`[API:Violations] Filtered ${violations.length} violations to ${filtered.length} in PR files`);
  return filtered;
}

export async function GET(request: Request) {

  try {
    // Extract and validate credentials
    const { credentials, error } = extractSonarQubeCredentials(request);
    if (error) return error;

    const { githubToken, sonarQubeCredentials } = credentials!;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectKey = searchParams.get('projectKey');
    const branch = searchParams.get('branch');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const prNumber = searchParams.get('prNumber');

    // Validate required parameters
    if (!projectKey || !branch || !owner || !repo || !prNumber) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['projectKey', 'branch', 'owner', 'repo', 'prNumber'],
        },
        { status: 400 }
      );
    }

    // Create SonarQube client
    const sonarClient = new SonarQubeClient(sonarQubeCredentials!);

    // Fetch data in parallel
    const [violations, prFiles] = await Promise.all([
      sonarClient.fetchViolations(projectKey, branch),
      fetchPRFiles(owner, repo, parseInt(prNumber), githubToken!, {
        excludeRemoved: true,
        filenamesOnly: true,
      }),
    ]);

    // Filter violations to only changed files
    const filteredViolations = filterViolationsByPRFiles(violations, prFiles);

    const bySeverity = filteredViolations.reduce((acc, v) => {
      if (isSafePropertyKey(v.severity)) {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
      }
      return acc;
    }, createSafeObject<number>());

    const byType = filteredViolations.reduce((acc, v) => {
      if (isSafePropertyKey(v.type)) {
        acc[v.type] = (acc[v.type] || 0) + 1;
      }
      return acc;
    }, createSafeObject<number>());

    return NextResponse.json({
      violations: filteredViolations,
      summary: {
        total: filteredViolations.length,
        bySeverity,
        byType,
      },
      metadata: {
        projectKey,
        branch,
        prFiles: prFiles.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API:Violations] Error:', error);

    // Return appropriate error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for authentication errors
    if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
      return NextResponse.json(
        { error: 'SonarQube authentication failed. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Check for not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return NextResponse.json(
        { error: 'SonarQube project or branch not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch violations', details: errorMessage },
      { status: 500 }
    );
  }
}
