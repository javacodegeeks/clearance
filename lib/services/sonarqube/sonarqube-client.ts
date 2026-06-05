import type {
  Violation,
  QualityGate,
  SonarIssuesResponse,
  SonarQualityGateResponse,
  SonarQubeCredentials,
} from '@/lib/types/sonarqube';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class SonarQubeClient {
  private url: string;
  private token: string;

  constructor(credentials: SonarQubeCredentials) {
    this.url = credentials.url.replace(/\/$/, '');
    this.token = credentials.token;
  }

  private getHeaders(): HeadersInit {
    if (!this.token) {
      throw new Error('SonarQube token not configured');
    }

    const basicAuth = Buffer.from(`${this.token}:`).toString('base64');

    return {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async sonarFetch<T>(
    endpoint: string,
    attempt = 1
  ): Promise<T> {
    const url = `${this.url}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        method: 'GET',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[SonarQube] API Error status:', response.status, errorBody);

        if (response.status === 401 || response.status === 403) {
          throw new Error(`SonarQube authentication failed: ${response.status}`);
        }

        if (response.status === 404) {
          throw new Error(`SonarQube resource not found: ${endpoint}`);
        }

        if (
          (response.status >= 500 || response.status === 429) &&
          attempt < MAX_RETRIES
        ) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          return this.sonarFetch<T>(endpoint, attempt + 1);
        }

        throw new Error(`SonarQube API error: ${response.status} - ${errorBody}`);
      }

      return response.json();
    } catch (error) {
      if (attempt < MAX_RETRIES && error instanceof TypeError) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        return this.sonarFetch<T>(endpoint, attempt + 1);
      }

      throw error;
    }
  }

  private componentToFilePath(component: string, projectKey: string): string {
    const prefix = `${projectKey}:`;
    if (component.startsWith(prefix)) {
      return component.substring(prefix.length);
    }
    return component;
  }

  async fetchViolations(
    projectKey: string,
    branch: string
  ): Promise<Violation[]> {

    try {
      const params = new URLSearchParams({
        componentKeys: projectKey,
        branch: branch,
        resolved: 'false',
        ps: '500',
      });

      const response = await this.sonarFetch<SonarIssuesResponse>(
        `/api/issues/search?${params.toString()}`
      );

      const violations: Violation[] = response.issues.map(issue => ({
        key: issue.key,
        rule: issue.rule,
        severity: issue.severity,
        component: this.componentToFilePath(issue.component, projectKey),
        line: issue.line,
        message: issue.message,
        type: issue.type,
        status: issue.status,
        effort: issue.effort,
        debt: issue.debt,
        tags: issue.tags,
      }));

      if (response.total > response.issues.length) {
        const totalPages = Math.ceil(response.total / response.ps);

        for (let page = 2; page <= totalPages && page <= 10; page++) {
          const pageParams = new URLSearchParams({
            componentKeys: projectKey,
            branch: branch,
            resolved: 'false',
            ps: '500',
            p: page.toString(),
          });

          const pageResponse = await this.sonarFetch<SonarIssuesResponse>(
            `/api/issues/search?${pageParams.toString()}`
          );

          const pageViolations = pageResponse.issues.map(issue => ({
            key: issue.key,
            rule: issue.rule,
            severity: issue.severity,
            component: this.componentToFilePath(issue.component, projectKey),
            line: issue.line,
            message: issue.message,
            type: issue.type,
            status: issue.status,
            effort: issue.effort,
            debt: issue.debt,
            tags: issue.tags,
          }));

          violations.push(...pageViolations);
        }
      }

      return violations;
    } catch (error) {
      console.error('[SonarQube] Error fetching violations:', error);
      throw error;
    }
  }

  async fetchQualityGate(projectKey: string): Promise<QualityGate> {

    try {
      const params = new URLSearchParams({
        projectKey: projectKey,
      });

      const response = await this.sonarFetch<SonarQualityGateResponse>(
        `/api/qualitygates/project_status?${params.toString()}`
      );

      const qualityGate: QualityGate = {
        status: response.projectStatus.status === 'NONE' ? 'OK' : response.projectStatus.status,
        conditions: response.projectStatus.conditions?.map(condition => ({
          status: condition.status,
          metricKey: condition.metricKey,
          comparator: condition.comparator,
          errorThreshold: condition.errorThreshold,
          actualValue: condition.actualValue,
        })),
      };

      return qualityGate;
    } catch (error) {
      console.error('[SonarQube] Error fetching quality gate:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sonarFetch('/api/system/status');
      return true;
    } catch (error) {
      console.error('[SonarQube] Connection test failed:', error);
      return false;
    }
  }
}
