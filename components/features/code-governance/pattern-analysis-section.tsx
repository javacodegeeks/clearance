'use client';

import type { PatternInsight } from '@/lib/services/code-governance/types';
import { getPatternSeverityColor } from '@/lib/utils/severity-colors';

interface PatternAnalysisSectionProps {
  repeatedViolations: PatternInsight[];
  hotspotFiles: PatternInsight[];
  regressions: PatternInsight[];
  recommendations: {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    actions: string[];
    estimatedEffort: string;
  };
}

export default function PatternAnalysisSection({
  repeatedViolations,
  hotspotFiles,
  regressions,
  recommendations,
}: PatternAnalysisSectionProps) {
  const hasPatterns =
    repeatedViolations.length > 0 || hotspotFiles.length > 0 || regressions.length > 0;

  if (!hasPatterns && recommendations.actions.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      case 'low':
        return 'var(--status-approved)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className="border-t pt-3 space-y-3"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
        [~] Pattern Analysis
      </div>

      {/* Priority & Effort */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span style={{ color: getPriorityColor(recommendations.priority) }}>
          priority: {recommendations.priority}
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          • estimated: {recommendations.estimatedEffort}
        </span>
      </div>

      {/* Recommendations */}
      {recommendations.actions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            recommended actions:
          </div>
          {recommendations.actions.map((action, idx) => (
            <div
              key={idx}
              className="text-xs font-mono pl-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {idx + 1}. {action}
            </div>
          ))}
        </div>
      )}

      {/* Repeated Violations */}
      {repeatedViolations.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            repeated violations:
          </div>
          {repeatedViolations.map((insight, idx) => (
            <div
              key={idx}
              className="text-xs font-mono pl-2 space-y-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <div>
                <span style={{ color: getPatternSeverityColor(insight.severity) }}>
                  [{insight.severity.toUpperCase()}]
                </span>{' '}
                {insight.title}
              </div>
              <div className="pl-4">
                └─ {insight.description}
              </div>
              {insight.recommendation && (
                <div className="pl-4" style={{ color: 'var(--text-muted)' }}>
                  → {insight.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hotspot Files */}
      {hotspotFiles.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            hotspot files:
          </div>
          {hotspotFiles.map((insight, idx) => (
            <div
              key={idx}
              className="text-xs font-mono pl-2 space-y-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <div>
                <span style={{ color: getPatternSeverityColor(insight.severity) }}>
                  [{insight.severity.toUpperCase()}]
                </span>{' '}
                {insight.title}
              </div>
              <div className="pl-4">
                └─ {insight.description}
              </div>
              {insight.recommendation && (
                <div className="pl-4" style={{ color: 'var(--text-muted)' }}>
                  → {insight.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Regressions */}
      {regressions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: '#dc2626' }}>
            regressions detected:
          </div>
          {regressions.map((insight, idx) => (
            <div
              key={idx}
              className="text-xs font-mono pl-2 space-y-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <div>
                <span style={{ color: '#dc2626' }}>
                  [REGRESSION]
                </span>{' '}
                {insight.title}
              </div>
              <div className="pl-4">
                └─ {insight.description}
              </div>
              {insight.recommendation && (
                <div className="pl-4" style={{ color: 'var(--text-muted)' }}>
                  → {insight.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
