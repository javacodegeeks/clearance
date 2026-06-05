'use client';

import { useState } from 'react';
import type { AgentAnalysis, Violation } from '@/lib/services/code-governance/types';
import QualityGateStatus from './quality-gate-status';
import PatternAnalysisSection from './pattern-analysis-section';
import ViolationsList from './violations-list';
import MockFixModal from './mock-fix-modal';
import { LoadingSpinner } from '@/components/ui';
import type { PullRequest } from '@/lib/types/github';

interface CodeGovernancePanelProps {
  pr: PullRequest | null;
  analysis: AgentAnalysis | null | undefined;
  loading?: boolean;
  error?: string | null;
  onJumpToFile: (filename: string, line?: number) => void;
}

export default function CodeGovernancePanel({
  pr,
  analysis: externalAnalysis,
  loading: externalLoading = false,
  error: externalError = null,
  onJumpToFile,
}: CodeGovernancePanelProps) {
  if (!pr) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [mockFixModalOpen, setMockFixModalOpen] = useState(false);

  // Use external analysis from orchestrator
  const analysis = externalAnalysis;
  const loading = externalLoading;
  const error = externalError;


  const handleGenerateFix = (violation: Violation) => {
    setSelectedViolation(violation);
    setMockFixModalOpen(true);
  };

  return (
    <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-opacity-50 transition-colors text-left"
        style={{ backgroundColor: expanded ? 'var(--surface-base)' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {expanded ? '[−]' : '[+]'}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Code Governance
          </span>
          {analysis && analysis.violations.inPR > 0 && (
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--surface-raised)',
                color:
                  analysis.violations.bySeverity.BLOCKER > 0 ||
                  analysis.violations.bySeverity.CRITICAL > 0
                    ? '#dc2626'
                    : '#f59e0b',
              }}
            >
              {analysis.violations.inPR}
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" label="analyzing code quality..." />
            </div>
          )}

          {error && (
            <div
              className="text-xs font-mono p-3 rounded border"
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderColor: '#dc2626',
              }}
            >
              [!] {error}
            </div>
          )}

          {!loading && !error && !analysis && (
            <div className="text-center py-8 space-y-2">
              <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                [i] SonarQube not configured
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                Configure SonarQube credentials in settings to enable code governance analysis
              </div>
            </div>
          )}

          {!loading && !error && analysis && (
            <>
              {/* Quality Gate */}
              <QualityGateStatus qualityGate={analysis.qualityGate} />

              {/* Summary */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span style={{ color: 'var(--text-secondary)' }}>
                  total violations: {analysis.violations.inPR}
                </span>
                {analysis.violations.bySeverity.BLOCKER > 0 && (
                  <span style={{ color: '#dc2626' }}>
                    blocker: {analysis.violations.bySeverity.BLOCKER}
                  </span>
                )}
                {analysis.violations.bySeverity.CRITICAL > 0 && (
                  <span style={{ color: '#ea580c' }}>
                    critical: {analysis.violations.bySeverity.CRITICAL}
                  </span>
                )}
                {analysis.violations.bySeverity.MAJOR > 0 && (
                  <span style={{ color: '#f59e0b' }}>
                    major: {analysis.violations.bySeverity.MAJOR}
                  </span>
                )}
              </div>

              {/* Pattern Analysis */}
              <PatternAnalysisSection
                repeatedViolations={analysis.analysis.repeatedViolations}
                hotspotFiles={analysis.analysis.hotspotFiles}
                regressions={analysis.analysis.regressions}
                recommendations={analysis.recommendations}
              />

              {/* Violations List */}
              {analysis.violations.list.length > 0 && (
                <ViolationsList
                  violations={analysis.violations.list}
                  onGenerateFix={handleGenerateFix}
                  onJumpToFile={onJumpToFile}
                />
              )}

              {analysis.violations.list.length === 0 && (
                <div className="text-center py-8 text-sm font-mono" style={{ color: 'var(--status-approved)' }}>
                  [✓] no violations in this PR
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Mock Fix Modal */}
      {mockFixModalOpen && selectedViolation && (
        <MockFixModal
          violation={selectedViolation}
          onClose={() => {
            setMockFixModalOpen(false);
            setSelectedViolation(null);
          }}
        />
      )}
    </div>
  );
}
