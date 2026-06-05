import { NextResponse } from 'next/server';
import type { AzureCredentials } from '@/lib/services/ai/azure-openai';
import type { SonarQubeCredentials } from '@/lib/types/sonarqube';

export interface RequestCredentials {
  githubToken?: string;
  azureCredentials?: AzureCredentials;
  sonarQubeCredentials?: SonarQubeCredentials;
}

export interface CredentialsResult {
  credentials: RequestCredentials | null;
  error: NextResponse | null;
}

export function extractCredentials(
  request: Request,
  options: {
    requireGitHub?: boolean;
    requireAzure?: boolean;
    requireSonarQube?: boolean;
    logPrefix?: string;
  } = {}
): CredentialsResult {
  const {
    requireGitHub = true,
    requireAzure = true,
    requireSonarQube = false,
    logPrefix = '[API]'
  } = options;

  // Extract GitHub credentials
  const githubToken = request.headers.get('x-github-token');

  // Extract Azure OpenAI credentials
  const azureEndpoint = request.headers.get('x-azure-endpoint');
  const azureKey = request.headers.get('x-azure-api-key');
  const azureDeployment = request.headers.get('x-azure-deployment');
  const azureApiVersion = request.headers.get('x-azure-api-version');

  // Extract SonarQube credentials
  const sonarQubeUrl = request.headers.get('x-sonarqube-url');
  const sonarQubeToken = request.headers.get('x-sonarqube-token');

  // Validate GitHub token (if required)
  if (requireGitHub && !githubToken) {
    console.error(`${logPrefix} Missing GitHub token`);
    return {
      credentials: null,
      error: NextResponse.json(
        { error: 'Missing GitHub token' },
        { status: 401 }
      )
    };
  }

  // Validate Azure credentials (if required)
  if (requireAzure) {
    const missingAzure = !azureEndpoint || !azureKey || !azureDeployment || !azureApiVersion;

    if (missingAzure) {
      console.error(`${logPrefix} Missing Azure credentials:`, {
        hasEndpoint: !!azureEndpoint,
        hasKey: !!azureKey,
        hasDeployment: !!azureDeployment,
        hasApiVersion: !!azureApiVersion,
      });
      return {
        credentials: null,
        error: NextResponse.json(
          { error: 'Missing Azure OpenAI credentials' },
          { status: 401 }
        )
      };
    }
  }

  // Validate SonarQube credentials (if required)
  if (requireSonarQube) {
    const missingSonarQube = !sonarQubeUrl || !sonarQubeToken;

    if (missingSonarQube) {
      console.error(`${logPrefix} Missing SonarQube credentials:`, {
        hasUrl: !!sonarQubeUrl,
        hasToken: !!sonarQubeToken,
      });
      return {
        credentials: null,
        error: NextResponse.json(
          { error: 'Missing SonarQube credentials' },
          { status: 401 }
        )
      };
    }
  }

  // All validations passed - return credentials
  return {
    credentials: {
      githubToken: githubToken || undefined,
      azureCredentials: (requireAzure && azureEndpoint && azureKey && azureDeployment && azureApiVersion) ? {
        endpoint: azureEndpoint,
        apiKey: azureKey,
        deployment: azureDeployment,
        apiVersion: azureApiVersion,
      } : undefined,
      sonarQubeCredentials: (sonarQubeUrl && sonarQubeToken) ? {
        url: sonarQubeUrl,
        token: sonarQubeToken,
      } : undefined,
    },
    error: null
  };
}

export function extractGitHubToken(
  request: Request
): { token: string | null; error: NextResponse | null } {
  const result = extractCredentials(request, { requireAzure: false });

  return {
    token: result.credentials?.githubToken || null,
    error: result.error
  };
}

export function extractSonarQubeCredentials(
  request: Request
): CredentialsResult {
  return extractCredentials(request, {
    requireAzure: false,
    requireSonarQube: true,
  });
}

export function extractSonarQubeOnly(
  request: Request
): CredentialsResult {
  return extractCredentials(request, {
    requireGitHub: false,
    requireAzure: false,
    requireSonarQube: true,
  });
}
