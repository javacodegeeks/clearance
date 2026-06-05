// Browser-based credentials storage using localStorage
// This ensures each user's credentials are stored only in their browser

import { createLocalStorageStore } from './storage-utils';

export interface Credentials {
  github_token: string;
  azure_openai_endpoint: string;
  azure_openai_key: string;
  azure_openai_deployment: string;
  azure_openai_api_version: string;
  sonarqube_url: string;
  sonarqube_token: string;
}

const CREDENTIALS_KEY = 'pr-dashboard-credentials';
const OBFUSCATION_KEY = 'pr-dashboard-2024'; // Simple XOR key

function encode(str: string): string {
  try {
    const xored = str.split('').map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
      )
    ).join('');
    return btoa(xored);
  } catch (error) {
    console.error('[Credentials] Encoding failed:', error);
    return str; // Fallback to plain text if encoding fails
  }
}

function decode(str: string): string {
  try {
    // Try to decode as base64
    const decoded = atob(str);
    // Try to XOR decode
    const xorDecoded = decoded.split('').map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
      )
    ).join('');

    // Verify it's valid JSON
    JSON.parse(xorDecoded);
    return xorDecoded;
  } catch (error) {
    // If decoding fails, assume it's plain text JSON (backwards compatibility)
    try {
      JSON.parse(str);
      console.log('[Credentials] Migrating plain text credentials to encoded format');
      return str;
    } catch {
      console.error('[Credentials] Decoding failed and not valid JSON:', error);
      throw error; // Let the storage handler deal with it
    }
  }
}

// Create storage instance with custom serialization to encode credentials
const credentialsStore = createLocalStorageStore<Credentials>({
  key: CREDENTIALS_KEY,
  serialize: (value: Credentials) => encode(JSON.stringify(value)),
  deserialize: (value: string) => JSON.parse(decode(value)),
});

export function getCredentials(): Credentials | null {
  const creds = credentialsStore.get();
  console.log('[Credentials] Get credentials:', {
    hasGithub: !!creds?.github_token,
    hasAzure: !!creds?.azure_openai_endpoint && !!creds?.azure_openai_key,
    hasSonarQube: !!creds?.sonarqube_url && !!creds?.sonarqube_token
  });
  return creds;
}

export function saveCredentials(credentials: Credentials): boolean {
  const success = credentialsStore.set(credentials);
  console.log('[Credentials] Save:', {
    success,
    hasGithub: !!credentials.github_token,
    hasAzure: !!credentials.azure_openai_endpoint && !!credentials.azure_openai_key,
    hasSonarQube: !!credentials.sonarqube_url && !!credentials.sonarqube_token
  });
  return success;
}

export function clearCredentials(): void {
  console.log('[Credentials] Clear all credentials');
  credentialsStore.remove();
}

export function hasCredentials(): boolean {
  const creds = getCredentials();
  return !!(creds && creds.github_token);
}

export function getCredential(key: keyof Credentials): string | null {
  const creds = getCredentials();
  return creds?.[key] || null;
}
