
import { NextResponse } from 'next/server';
import { extractGitHubToken } from '@/lib/api-middleware/credentials';
import { GITHUB_API_BASE, githubFetch } from '@/lib/services/github/github-api-helpers';
import { parseSonarProperties } from '@/lib/services/sonarqube/sonar-properties-parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string> {

  const repository = `${owner}/${repo}`;

  try {
    const response = await githubFetch(
      `${GITHUB_API_BASE}/repos/${repository}/contents/${path}?ref=${branch}`,
      token
    );

    // GitHub returns base64-encoded content
    if (response.content && response.encoding === 'base64') {
      const content = Buffer.from(response.content, 'base64').toString('utf-8');
      console.log('[API:SonarConfig] File fetched successfully');
      return content;
    }

    throw new Error('Invalid file content format');
  } catch (error) {
    console.error('[API:SonarConfig] Error fetching file:', error);
    throw error;
  }
}

export async function GET(request: Request) {

  try {
    // Extract and validate credentials
    const { token, error } = extractGitHubToken(request);
    if (error) return error;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    // Validate required parameters
    if (!owner || !repo) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['owner', 'repo'],
        },
        { status: 400 }
      );
    }


    // Try common locations for sonar-project.properties
    const possiblePaths = [
      'sonar-project.properties',
      '.sonar/sonar-project.properties',
      'config/sonar-project.properties',
    ];

    let content: string | null = null;
    let foundPath: string | null = null;

    // Try each path until we find the file
    for (const path of possiblePaths) {
      try {
        content = await fetchFileContent(owner, repo, path, branch, token!);
        foundPath = path;
        break;
      } catch (error) {
        console.log('[API:SonarConfig] File not found at path, trying next location:', path);
        continue;
      }
    }

    // If file not found in any location
    if (!content || !foundPath) {
      return NextResponse.json(
        {
          error: 'sonar-project.properties not found',
          message: 'Could not find sonar-project.properties in repository',
          searchedPaths: possiblePaths,
        },
        { status: 404 }
      );
    }

    // Parse sonar-project.properties
    try {
      const config = parseSonarProperties(content);

      return NextResponse.json({
        config,
        metadata: {
          owner,
          repo,
          branch,
          path: foundPath,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (parseError) {
      console.error('[API:SonarConfig] Error parsing sonar-project.properties:', parseError);

      return NextResponse.json(
        {
          error: 'Failed to parse sonar-project.properties',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          path: foundPath,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API:SonarConfig] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to fetch SonarQube configuration', details: errorMessage },
      { status: 500 }
    );
  }
}
