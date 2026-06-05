'use client';

import { EnhancedRiskBreakdown, RiskComponent, FileRiskScore } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import { useState } from 'react';

interface RiskBreakdownPanelProps {
  breakdown: EnhancedRiskBreakdown;
}

export default function RiskBreakdownPanel({ breakdown }: RiskBreakdownPanelProps) {
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState(false);

  const toggleComponent = (key: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedComponents(newExpanded);
  };

  const riskMeta = {
    level: breakdown.level,
    label: breakdown.label,
    color: getColorForLevel(breakdown.level),
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Risk Score
          </span>
          <span
            className="px-3 py-1 rounded font-mono text-base font-bold"
            style={{
              backgroundColor: riskMeta.color.bg,
              color: riskMeta.color.text,
              border: `1px solid ${riskMeta.color.border}`,
            }}
          >
            {breakdown.totalScore.toFixed(1)}
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            / 10.0
          </span>
        </div>
        <span
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            backgroundColor: riskMeta.color.bg,
            color: riskMeta.color.text,
          }}
        >
          {riskMeta.label}
        </span>
      </div>

      {/* Component Breakdown Tree */}
      <div>
        <div
          className="text-xs font-mono mb-2"
          style={{ color: 'var(--text-tertiary)' }}
        >
          # Risk Component Breakdown
        </div>
        <div
          className="rounded"
          style={{
            backgroundColor: 'var(--surface-base)',
            border: '1px solid var(--border-standard)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          <ComponentTreeItem
            component={breakdown.components.fileVolume}
            componentKey="fileVolume"
            expanded={expandedComponents.has('fileVolume')}
            onToggle={() => toggleComponent('fileVolume')}
            isFirst
          />
          <ComponentTreeItem
            component={breakdown.components.lineChanges}
            componentKey="lineChanges"
            expanded={expandedComponents.has('lineChanges')}
            onToggle={() => toggleComponent('lineChanges')}
          />
          <ComponentTreeItem
            component={breakdown.components.securityFiles}
            componentKey="securityFiles"
            expanded={expandedComponents.has('securityFiles')}
            onToggle={() => toggleComponent('securityFiles')}
          />
          <ComponentTreeItem
            component={breakdown.components.ciStatus}
            componentKey="ciStatus"
            expanded={expandedComponents.has('ciStatus')}
            onToggle={() => toggleComponent('ciStatus')}
          />
          <ComponentTreeItem
            component={breakdown.components.reviewDepth}
            componentKey="reviewDepth"
            expanded={expandedComponents.has('reviewDepth')}
            onToggle={() => toggleComponent('reviewDepth')}
          />
          <ComponentTreeItem
            component={breakdown.components.timing}
            componentKey="timing"
            expanded={expandedComponents.has('timing')}
            onToggle={() => toggleComponent('timing')}
            isLast
          />
        </div>
      </div>

      {/* Top Risk Files */}
      {breakdown.topRiskFiles.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedFiles(!expandedFiles)}
            className="w-full text-left flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
          >
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {expandedFiles ? '[−]' : '[+]'}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              # Top Risk Files
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              ({breakdown.topRiskFiles.length})
            </span>
          </button>

          {expandedFiles && (
            <div
              className="rounded space-y-2 p-3"
              style={{
                backgroundColor: 'var(--surface-base)',
                border: '1px solid var(--border-standard)',
              }}
            >
              {breakdown.topRiskFiles.map((file, index) => (
                <FileRiskItem key={file.filename} file={file} rank={index + 1} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {breakdown.recommendations.length > 0 && (
        <div>
          <div
            className="text-xs font-mono mb-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            # Recommendations
          </div>
          <div
            className="rounded p-3 space-y-2"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: '1px solid var(--border-standard)',
            }}
          >
            {breakdown.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  →
                </span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ComponentTreeItemProps {
  component: RiskComponent;
  componentKey: string;
  expanded: boolean;
  onToggle: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function ComponentTreeItem({
  component,
  componentKey,
  expanded,
  onToggle,
  isFirst,
  isLast,
}: ComponentTreeItemProps) {
  const borderStyle = {
    borderTop: isFirst ? 'none' : '1px solid var(--border-subtle)',
    borderBottom: isLast ? 'none' : undefined,
  };

  // Color based on severity
  let barColor = 'var(--status-approved)'; // green
  if (component.percentage >= 70) {
    barColor = 'var(--diff-deletion)'; // red
  } else if (component.percentage >= 40) {
    barColor = '#f59e0b'; // amber
  }

  return (
    <div style={borderStyle}>
      <button
        onClick={onToggle}
        className="w-full text-left p-3 hover:bg-opacity-50 transition-colors"
        style={{
          backgroundColor: expanded ? 'var(--surface-raised)' : 'transparent',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? '├─' : '├+'}
            </span>
            <span
              className="text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
            >
              {component.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-mono font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {component.score.toFixed(1)}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              / {component.maxScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 rounded-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="h-full transition-all duration-300 risk-progress-bar"
            style={{
              width: `${component.percentage}%`,
              backgroundColor: barColor,
            }}
          />
        </div>

        {/* Description */}
        {!expanded && (
          <div
            className="text-xs font-mono mt-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {component.description}
          </div>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-1"
          style={{ backgroundColor: 'var(--surface-raised)' }}
        >
          <div
            className="text-xs font-mono mb-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {component.description}
          </div>
          {component.contributors.map((contributor, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="font-mono ml-4"
                style={{ color: 'var(--text-muted)' }}
              >
                →
              </span>
              <span>{contributor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FileRiskItemProps {
  file: FileRiskScore;
  rank: number;
}

function FileRiskItem({ file, rank }: FileRiskItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: `1px solid ${file.color.border}`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-xs font-mono flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              {rank}.
            </span>
            <span
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-primary)' }}
              title={file.filename}
            >
              {file.filename}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                backgroundColor: file.color.bg,
                color: file.color.text,
              }}
            >
              {file.score.toFixed(1)}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? '▼' : '▶'}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div
          className="px-2 pb-2 space-y-1 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {file.reasons.map((reason, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                →
              </span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getColorForLevel(level: 'low' | 'medium' | 'high'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'low':
      return { bg: '#d1fae5', text: '#065f46', border: '#059669' };
    case 'medium':
      return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    case 'high':
      return { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' };
  }
}
