'use client';

import { useState } from 'react';
import type { Violation } from '@/lib/services/code-governance/types';
import ViolationScanline from './violation-scanline';

interface ViolationsListProps {
  violations: Violation[];
  onGenerateFix: (violation: Violation) => void;
  onJumpToFile: (filename: string, line?: number) => void;
}

export default function ViolationsList({ violations, onGenerateFix, onJumpToFile }: ViolationsListProps) {
  const [filterSeverity, setFilterSeverity] = useState<Violation['severity'] | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<Violation['type'] | 'ALL'>('ALL');

  const filteredViolations = violations.filter((v) => {
    if (filterSeverity !== 'ALL' && v.severity !== filterSeverity) return false;
    if (filterType !== 'ALL' && v.type !== filterType) return false;
    return true;
  });

  const severities: Array<Violation['severity'] | 'ALL'> = [
    'ALL',
    'BLOCKER',
    'CRITICAL',
    'MAJOR',
    'MINOR',
    'INFO',
  ];

  const types: Array<Violation['type'] | 'ALL'> = [
    'ALL',
    'BUG',
    'VULNERABILITY',
    'CODE_SMELL',
    'SECURITY_HOTSPOT',
  ];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-4 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            severity:
          </span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as Violation['severity'] | 'ALL')}
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: '1px solid var(--border-standard)',
              color: 'var(--text-primary)',
            }}
          >
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            type:
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as Violation['type'] | 'ALL')}
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--surface-base)',
              border: '1px solid var(--border-standard)',
              color: 'var(--text-primary)',
            }}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filteredViolations.length} / {violations.length} violations
        </span>
      </div>

      {/* Violations */}
      {filteredViolations.length === 0 ? (
        <div className="text-center py-8 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          [✓] no violations match filters
        </div>
      ) : (
        <div className="space-y-2">
          {filteredViolations.map((violation) => (
            <ViolationScanline
              key={violation.key}
              violation={violation}
              onGenerateFix={onGenerateFix}
              onJumpToFile={onJumpToFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
