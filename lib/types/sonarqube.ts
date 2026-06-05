// Type definitions for SonarQube integration
// Based on lib/services/code-governance/types.ts

export interface Violation {
  key: string;
  rule: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  component: string; // File path in SonarQube format
  line?: number;
  message: string;
  type: 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';
  status: 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';
  effort?: string; // e.g., "5min", "1h"
  debt?: string;
  tags?: string[];
}

export interface QualityGate {
  status: 'OK' | 'WARN' | 'ERROR';
  conditions?: Array<{
    status: 'OK' | 'WARN' | 'ERROR';
    metricKey: string;
    comparator: string;
    errorThreshold?: string;
    actualValue?: string;
  }>;
}

export interface SonarQubeProject {
  projectKey: string;
  organization?: string;
}

// SonarQube API response types

export interface SonarIssue {
  key: string;
  rule: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  component: string;
  project: string;
  line?: number;
  hash?: string;
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
  };
  flows?: Array<{
    locations: Array<{
      component: string;
      textRange?: {
        startLine: number;
        endLine: number;
      };
      msg?: string;
    }>;
  }>;
  status: 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';
  message: string;
  effort?: string;
  debt?: string;
  author?: string;
  tags?: string[];
  creationDate: string;
  updateDate: string;
  type: 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';
}

export interface SonarIssuesResponse {
  total: number;
  p: number; // page
  ps: number; // page size
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  effortTotal?: number;
  debtTotal?: number;
  issues: SonarIssue[];
  components?: Array<{
    key: string;
    enabled?: boolean;
    qualifier: string;
    name: string;
    longName: string;
    path?: string;
  }>;
  rules?: Array<{
    key: string;
    name: string;
    status?: string;
    lang?: string;
    langName?: string;
  }>;
}

export interface SonarQualityGateCondition {
  status: 'OK' | 'WARN' | 'ERROR';
  metricKey: string;
  comparator: 'GT' | 'LT' | 'EQ' | 'NE';
  periodIndex?: number;
  errorThreshold?: string;
  warningThreshold?: string;
  actualValue?: string;
}

export interface SonarQualityGateResponse {
  projectStatus: {
    status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
    conditions?: SonarQualityGateCondition[];
    periods?: Array<{
      index: number;
      mode: string;
      date: string;
      parameter?: string;
    }>;
    ignoredConditions?: boolean;
  };
}

export interface SonarProjectStatus {
  status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
  conditions: SonarQualityGateCondition[];
}

// SonarQube credentials and configuration

export interface SonarQubeCredentials {
  url: string;
  token: string;
}

export interface SonarQubeConfig {
  url: string;
  token: string;
  projectKey: string;
  organization?: string;
}
