import { validateGitHubUrl } from '@/lib/security/url-validation';

export const GITHUB_API_BASE = 'https://api.github.com';

export function getHeaders(token: string) {
  if (!token) {
    throw new Error('GitHub token not configured');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'Connection': 'close',
  };
}

export async function githubFetch(url: string, token: string, options: RequestInit = {}) {
  // Validate URL before making request to prevent SSRF
  validateGitHubUrl(url);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[GitHub] API Error status:', response.status, errorBody);

    // Check for rate limit
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      console.error('[GitHub] Rate limit - Remaining:', rateLimitRemaining, 'Reset:', rateLimitReset);
      throw new Error(`GitHub rate limit exceeded. Please try again later.`);
    }

    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}
