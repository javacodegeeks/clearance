export const ALLOWED_GITHUB_DOMAINS = [
  'api.github.com',
  'raw.githubusercontent.com',
  'github.com',
] as const;

export const ALLOWED_AZURE_DOMAINS = [
  'openai.azure.com',
] as const;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function validateGitHubUrl(url: string): void {
  validateUrl(url, ALLOWED_GITHUB_DOMAINS, 'GitHub');
}

export function validateAzureUrl(url: string): void {
  validateUrl(url, ALLOWED_AZURE_DOMAINS, 'Azure');
}

export function isSafePropertyKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

export function createSafeObject<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

export function safeSet<T>(
  obj: Record<string, T>,
  key: string,
  value: T
): void {
  if (!isSafePropertyKey(key)) {
    throw new Error(`Unsafe property key: ${key}`);
  }
  obj[key] = value;
}

function validateUrl(
  url: string,
  allowedDomains: readonly string[],
  serviceName: string
): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const isAllowedDomain = allowedDomains.includes(parsedUrl.hostname);

  if (!isAllowedDomain) {
    throw new Error(
      `URL must be from an allowed ${serviceName} domain. Got: ${parsedUrl.hostname}`
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
}
