
import type { SonarQubeProject } from '@/lib/types/sonarqube';

export function parseSonarProperties(content: string): SonarQubeProject {
  const lines = content.split('\n');
  const properties: Record<string, string> = {};

  for (const line of lines) {
    // Trim whitespace
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Parse key=value pairs
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();

    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');

    properties[key] = cleanValue;
  }

  // Extract required properties
  const projectKey = properties['sonar.projectKey'];
  const organization = properties['sonar.organization'];

  if (!projectKey) {
    throw new Error('Missing required property: sonar.projectKey');
  }

  return {
    projectKey,
    organization: organization || undefined,
  };
}

export function isValidSonarProperties(content: string): boolean {
  try {
    parseSonarProperties(content);
    return true;
  } catch {
    return false;
  }
}

export function extractProperty(content: string, propertyKey: string): string | undefined {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Check if line starts with the property key
    if (trimmed.startsWith(`${propertyKey}=`)) {
      const equalIndex = trimmed.indexOf('=');
      const value = trimmed.substring(equalIndex + 1).trim();

      // Remove quotes if present
      return value.replace(/^["']|["']$/g, '');
    }
  }

  return undefined;
}
