// Type definitions for Code Governance feature
// Import and re-export shared SonarQube types from canonical source
import type { Violation, QualityGate, SonarQubeProject } from '@/lib/types/sonarqube';
export type { Violation, QualityGate, SonarQubeProject };

export interface PatternInsight {
  type: 'repeated_violation' | 'hotspot_file' | 'regression';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles?: string[];
  count?: number;
  recommendation?: string;
}

export interface AgentAnalysis {
  pr: {
    owner: string;
    repo: string;
    number: number;
    branch: string;
    sha: string;
  };
  timestamp: string;
  violations: {
    total: number;
    inPR: number;
    list: Violation[];
    bySeverity: Record<Violation['severity'], number>;
    byType: Record<Violation['type'], number>;
  };
  qualityGate: QualityGate | null;
  analysis: {
    repeatedViolations: PatternInsight[];
    hotspotFiles: PatternInsight[];
    regressions: PatternInsight[];
  };
  recommendations: {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    actions: string[];
    estimatedEffort: string;
  };
  notification: {
    shouldNotify: boolean;
    severity: 'high' | 'medium' | 'low';
    message: string;
  };
}

export interface AgentStatus {
  running: boolean;
  mode: 'webhook' | 'polling' | 'inactive';
  activePRs: number;
  queuedScans: number;
  lastScanTime?: number;
  errors: number;
}
