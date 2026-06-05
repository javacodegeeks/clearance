'use client';

import type { AgentStatus } from '@/lib/services/code-governance/types';

interface AgentStatusIndicatorProps {
  status: AgentStatus | null;
}

export default function AgentStatusIndicator({ status }: AgentStatusIndicatorProps) {
  if (!status) {
    return (
      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        [○] agent inactive
      </div>
    );
  }

  const getStatusColor = () => {
    if (!status.running) return 'var(--text-muted)';
    if (status.errors > 0) return '#f59e0b'; // warning yellow
    return 'var(--status-approved)'; // green
  };

  const getStatusIcon = () => {
    if (!status.running) return '○';
    if (status.errors > 0) return '⚠';
    return '●';
  };

  const getStatusText = () => {
    if (!status.running) return 'inactive';
    if (status.mode === 'webhook') return 'monitoring (webhook)';
    if (status.mode === 'polling') return 'monitoring (polling)';
    return 'inactive';
  };

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span style={{ color: getStatusColor() }}>
        [{getStatusIcon()}] {getStatusText()}
      </span>
      {status.running && (
        <>
          {status.activePRs > 0 && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              • {status.activePRs} active
            </span>
          )}
          {status.queuedScans > 0 && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              • {status.queuedScans} queued
            </span>
          )}
          {status.errors > 0 && (
            <span style={{ color: '#f59e0b' }}>
              • {status.errors} error{status.errors !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
    </div>
  );
}
