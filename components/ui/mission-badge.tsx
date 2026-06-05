'use client';

import React from 'react';

interface MissionBadgeProps {
  count: number;
  isGenerating?: boolean;
}

export function MissionBadge({ count, isGenerating = false }: MissionBadgeProps) {
  if (!isGenerating && count === 0) {
    return null;
  }

  return (
    <span
      className="font-mono text-xs px-2 py-0.5 rounded"
      style={{
        backgroundColor: 'var(--surface-raised)',
        color: 'var(--status-approved)',
        border: '1px solid var(--border-subtle)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
      title={isGenerating ? 'Generating AI focus items...' : `${count} AI-suggested focus item${count !== 1 ? 's' : ''}`}
    >
      {isGenerating ? (
        <>
          <span>&gt;</span>
          <span className="animate-pulse">...</span>
        </>
      ) : (
        <>
          <span>●</span>
          <span>{count}</span>
        </>
      )}
    </span>
  );
}
