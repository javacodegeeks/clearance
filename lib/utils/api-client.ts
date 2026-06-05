// Unified API client for internal API calls
// Handles credential headers, error handling, and response parsing

import type { Credentials } from '@/lib/storage/credentials-storage';

export function createApiHeaders(credentials: Credentials): HeadersInit {
  return {
    'x-github-token': credentials.github_token,
    'x-azure-endpoint': credentials.azure_openai_endpoint,
    'x-azure-api-key': credentials.azure_openai_key,
    'x-azure-deployment': credentials.azure_openai_deployment,
    'x-azure-api-version': credentials.azure_openai_api_version,
  };
}

export function createGitHubHeaders(githubToken: string): HeadersInit {
  return {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
  };
}

export async function apiGet<T>(url: string, credentials: Credentials): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: createApiHeaders(credentials),
  });

  if (!res.ok) {
    console.error('[APIClient] GET failed:', { url, status: res.status });
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API GET ${url} failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function apiPost<T>(
  url: string,
  body: any,
  credentials: Credentials
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...createApiHeaders(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('[APIClient] POST failed:', { url, status: res.status });
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API POST ${url} failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function apiGetStream(
  url: string,
  credentials: Credentials
): Promise<Response> {
  const res = await fetch(url, {
    method: 'GET',
    headers: createApiHeaders(credentials),
  });

  if (!res.ok) {
    console.error('[APIClient] GET Stream failed:', { url, status: res.status });
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API GET Stream ${url} failed: ${res.status} ${errorText}`);
  }

  return res;
}

export async function githubApiGet<T>(url: string, githubToken: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: createGitHubHeaders(githubToken),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub API GET failed: ${res.status} ${errorText}`);
  }

  return res.json();
}
