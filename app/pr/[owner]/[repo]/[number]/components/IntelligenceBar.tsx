'use client';

import { BlastRadiusData, HistoricalPattern, PRContextData } from '@/lib/mock-data/intelligence-features';
import { useState } from 'react';

type ExpandedSection = 'context' | 'blast-radius' | 'patterns' | null;

interface IntelligenceBarProps {
  context: PRContextData;
  blastRadius: BlastRadiusData;
  patterns: HistoricalPattern;
  missionCount: number;
}

export default function IntelligenceBar({ context, blastRadius, patterns, missionCount }: IntelligenceBarProps) {
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const toggleSection = (section: ExpandedSection) => {
    setExpanded(expanded === section ? null : section);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security': return '#dc2626';
      case 'perf': return '#f59e0b';
      case 'bugfix': return '#059669';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div>
      {/* Collapsed Intelligence Bar */}
      {!expanded && (
        <div
          className="flex items-center gap-4 px-3 py-1.5 text-xs font-mono border-b"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <button
            onClick={() => toggleSection('context')}
            className="hover:underline transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            [i] Context
          </button>
          <span style={{ color: 'var(--text-muted)' }}>•</span>

          <button
            onClick={() => toggleSection('blast-radius')}
            className="hover:underline transition-colors"
            style={{ color: blastRadius.criticalWarning ? '#dc2626' : 'var(--text-secondary)' }}
          >
            [!] Blast Radius: {blastRadius.impact.services} services, {blastRadius.impact.endpoints} endpoints
          </button>
          <span style={{ color: 'var(--text-muted)' }}>•</span>

          <button
            onClick={() => toggleSection('patterns')}
            className="hover:underline transition-colors"
            style={{ color: patterns.bugRate > 30 ? '#f59e0b' : 'var(--text-secondary)' }}
          >
            [~] {patterns.similarPRs} similar PRs ({patterns.bugRate}% bug rate)
          </button>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            [demo-data]
          </span>

          {missionCount > 0 && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-tertiary)' }}>
                [●] {missionCount} focus
              </span>
            </>
          )}
        </div>
      )}

      {/* Expanded Context */}
      {expanded === 'context' && (
        <div
          className="border-b"
          style={{
            backgroundColor: 'var(--surface-base)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setExpanded(null)}
            className="w-full flex items-center justify-between px-3 py-1.5 border-b hover:opacity-80 transition-opacity text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              [i] Context ▼
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              [collapse ×]
            </span>
          </button>

          <div className="px-3 py-1.5 space-y-0.5 text-sm font-mono">
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ why:</span> {context.why}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ type:</span>{' '}
              <span style={{ color: getTypeColor(context.type) }}>{context.type}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ linked:</span>{' '}
              {context.linkedIssues.join(' • ')}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ stacks:</span>{' '}
              {context.stacks.join(', ')}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ affected:</span>{' '}
              {context.affectedAreas.join(', ')} ({context.totalFiles} files)
            </div>
          </div>
        </div>
      )}

      {/* Expanded Blast Radius */}
      {expanded === 'blast-radius' && (
        <div
          className="border-b"
          style={{
            backgroundColor: 'var(--surface-base)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setExpanded(null)}
            className="w-full flex items-center justify-between px-3 py-1.5 border-b hover:opacity-80 transition-opacity text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              [!] Blast Radius ▼
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              [collapse ×]
            </span>
          </button>

          <div className="px-3 py-1.5 space-y-0.5 text-sm font-mono">
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ impact:</span>{' '}
              {blastRadius.impact.services} services, {blastRadius.impact.endpoints} endpoints
              {blastRadius.impact.users && ` (${blastRadius.impact.users})`}
            </div>

            <div className="space-y-0.5">
              {blastRadius.dependencies.map((dep, idx) => (
                <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-primary)' }}>{dep.file}</span>
                    {dep.modified && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(220, 38, 38, 0.1)',
                          color: '#dc2626',
                        }}
                      >
                        MODIFIED
                      </span>
                    )}
                  </div>
                  {dep.importedBy && (
                    <div className="ml-3 mt-0.5 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <div>└─ imported by:</div>
                      {dep.importedBy.map((imp, impIdx) => (
                        <div key={impIdx} className="ml-4">
                          {impIdx === dep.importedBy!.length - 1 ? '└─' : '├─'} {imp.service} → {imp.endpoints} endpoints
                        </div>
                      ))}
                    </div>
                  )}
                  {dep.affects && (
                    <div className="ml-3 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      └─ affects: {dep.affects}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {blastRadius.criticalWarning && (
              <div
                className="px-3 py-2 rounded border text-xs"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.05)',
                  borderColor: 'rgba(220, 38, 38, 0.2)',
                  color: '#dc2626',
                }}
              >
                [!] {blastRadius.criticalWarning}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded Historical Patterns */}
      {expanded === 'patterns' && (
        <div
          className="border-b"
          style={{
            backgroundColor: 'var(--surface-base)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setExpanded(null)}
            className="w-full flex items-center justify-between px-3 py-1.5 border-b hover:opacity-80 transition-opacity text-left"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              [~] Historical Patterns ▼
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              [collapse ×]
            </span>
          </button>

          <div className="px-3 py-1.5 space-y-0.5 text-sm font-mono">
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ similar:</span>{' '}
              {patterns.similarPRs} PRs ({patterns.timeframe})
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ bug rate:</span>{' '}
              <span style={{ color: patterns.bugRate > 30 ? '#f59e0b' : 'var(--status-approved)' }}>
                {patterns.bugRate}%
              </span>{' '}
              ({patterns.incidents}/{patterns.similarPRs} had incidents)
            </div>

            {patterns.commonIssues.length > 0 && (
              <div>
                <div className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Common issues in similar PRs:
                </div>
                <div className="space-y-0.5 ml-2">
                  {patterns.commonIssues.map((issue, idx) => (
                    <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                      • {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patterns.relatedPRs.length > 0 && (
              <div>
                <div className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Related PRs:
                </div>
                <div className="space-y-0.5 ml-2">
                  {patterns.relatedPRs.map((relPr) => (
                    <div key={relPr.number} style={{ color: 'var(--text-secondary)' }}>
                      <div>
                        • #{relPr.number} {relPr.title}{' '}
                        <span style={{ color: 'var(--text-muted)' }}>({relPr.timeAgo})</span>
                      </div>
                      <div className="ml-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        └─ {relPr.outcome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
