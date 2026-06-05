
import { NextResponse } from 'next/server';
import { SonarQubeClient } from '@/lib/services/sonarqube/sonarqube-client';
import { extractSonarQubeOnly } from '@/lib/api-middleware/credentials';
import { createSafeObject, isSafePropertyKey } from '@/lib/security/url-validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET(request: Request) {

  try {
    // Extract and validate credentials (only SonarQube, no GitHub token needed)
    const { credentials, error } = extractSonarQubeOnly(request);
    if (error) return error;

    const { sonarQubeCredentials } = credentials!;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectKey = searchParams.get('projectKey');

    // Validate required parameters
    if (!projectKey) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: projectKey',
        },
        { status: 400 }
      );
    }


    // Create SonarQube client
    const sonarClient = new SonarQubeClient(sonarQubeCredentials!);

    // Fetch quality gate status
    const qualityGate = await sonarClient.fetchQualityGate(projectKey);

    const conditionsSummary = qualityGate.conditions?.reduce((acc, condition) => {
      if (isSafePropertyKey(condition.status)) {
        acc[condition.status] = (acc[condition.status] || 0) + 1;
      }
      return acc;
    }, createSafeObject<number>());

    return NextResponse.json({
      qualityGate,
      summary: {
        status: qualityGate.status,
        totalConditions: qualityGate.conditions?.length || 0,
        conditionsByStatus: conditionsSummary,
      },
      metadata: {
        projectKey,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API:QualityGate] Error:', error);

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
        { error: 'SonarQube project not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch quality gate', details: errorMessage },
      { status: 500 }
    );
  }
}
