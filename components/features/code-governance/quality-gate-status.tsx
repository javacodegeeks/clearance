'use client';

import type { QualityGate } from '@/lib/services/code-governance/types';

interface QualityGateStatusProps {
  qualityGate: QualityGate | null;
}

export default function QualityGateStatus({ qualityGate }: QualityGateStatusProps) {
  if (!qualityGate) {
    return (
      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        [?] quality gate: unknown
      </div>
    );
  }

  const getStatusColor = () => {
    switch (qualityGate.status) {
      case 'OK':
        return 'var(--status-approved)';
      case 'WARN':
        return '#f59e0b';
      case 'ERROR':
        return 'var(--diff-deletion)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getStatusIcon = () => {
    switch (qualityGate.status) {
      case 'OK':
        return '✓';
      case 'WARN':
        return '⚠';
      case 'ERROR':
        return '✗';
      default:
        return '?';
    }
  };

  const getStatusText = () => {
    switch (qualityGate.status) {
      case 'OK':
        return 'passed';
      case 'WARN':
        return 'warning';
      case 'ERROR':
        return 'failed';
      default:
        return 'unknown';
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono" style={{ color: getStatusColor() }}>
        [{getStatusIcon()}] quality gate: {getStatusText()}
      </div>

      {qualityGate.conditions && qualityGate.conditions.length > 0 && (
        <div className="pl-4 space-y-1">
          {qualityGate.conditions.map((condition, idx) => (
            <div
              key={idx}
              className="text-xs font-mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              └─ {condition.metricKey}:{' '}
              <span
                style={{
                  color:
                    condition.status === 'OK'
                      ? 'var(--status-approved)'
                      : condition.status === 'WARN'
                      ? '#f59e0b'
                      : 'var(--diff-deletion)',
                }}
              >
                {condition.actualValue || 'N/A'}
              </span>
              {condition.errorThreshold && ` (threshold: ${condition.errorThreshold})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
