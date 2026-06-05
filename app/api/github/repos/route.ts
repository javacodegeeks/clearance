import { NextRequest, NextResponse } from 'next/server';
import { GITHUB_API_BASE, githubFetch } from '@/lib/services/github/github-api-helpers';
import { extractGitHubToken } from '@/lib/api-middleware/credentials';

interface GitHubRepo {
  full_name: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    // Extract and validate GitHub token
    const { token: githubToken, error } = extractGitHubToken(request);
    if (error) return error;

    // Step 1: Fetch user's organizations (token is guaranteed non-null after error check)
    let orgs;
    try {
      orgs = await githubFetch(`${GITHUB_API_BASE}/user/orgs?per_page=100`, githubToken!);
    } catch (error) {
      console.error('[GitHub] API Error fetching orgs:', error);

      if (error instanceof Error && error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait before trying again.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Step 2: Fetch repos from each organization
    const allRepos: GitHubRepo[] = [];
    const repoSet = new Set<string>(); // To deduplicate

    for (const org of orgs) {

      let page = 1;
      const perPage = 100;

      while (true) {
        const reposUrl = `${GITHUB_API_BASE}/orgs/${org.login}/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`;

        let repos: GitHubRepo[];
        try {
          repos = await githubFetch(reposUrl, githubToken!);
        } catch (error) {
          console.error('[GitHub] Error fetching repos for org', org.login, ':', error);

          // Check for SAML SSO error
          if (error instanceof Error && error.message.includes('403')) {
            console.error('[GitHub] SAML SSO enforcement detected for org', org.login);
          }

          break;
        }

        if (repos.length === 0) {
          break;
        }

        // Add repos, avoiding duplicates
        for (const repo of repos) {
          if (!repoSet.has(repo.full_name)) {
            repoSet.add(repo.full_name);
            allRepos.push(repo);
          }
        }

        if (repos.length < perPage) {
          break;
        }

        page++;

        // Safety limit per org
        if (page > 10) {
          break;
        }
      }
    }

    // Return simplified repo data
    const simplifiedRepos = allRepos.map(repo => ({
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      updated_at: repo.updated_at,
    }));

    return NextResponse.json(simplifiedRepos);
  } catch (error) {
    console.error('[API] Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
