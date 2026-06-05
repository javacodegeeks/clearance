'use client';

import type { Violation } from '@/lib/services/code-governance/types';
import { getViolationSeverityColor, getViolationTypeIcon } from '@/lib/utils/severity-colors';

interface ViolationScanlineProps {
  violation: Violation;
  onGenerateFix: (violation: Violation) => void;
  onJumpToFile: (filename: string, line?: number) => void;
}

export default function ViolationScanline({ violation, onGenerateFix, onJumpToFile }: ViolationScanlineProps) {

  // Extract filename from component path
  const getFilename = () => {
    const parts = violation.component.split(/[/:]/);
    return parts[parts.length - 1];
  };

  return (
    <div
      className="py-2 px-3 border-l-2 hover:bg-opacity-50 transition-colors"
      style={{
        borderLeftColor: getViolationSeverityColor(violation.severity),
        backgroundColor: 'var(--surface-base)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Violation info */}
        <div className="flex-1 space-y-1">
          {/* Header line */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span style={{ color: getViolationSeverityColor(violation.severity) }}>
              [{violation.severity}]
            </span>
            <span>{getViolationTypeIcon(violation.type)}</span>
            <button
              onClick={() => onJumpToFile(getFilename(), violation.line)}
              className="hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              {getFilename()}
              {violation.line && `:${violation.line}`}
            </button>
          </div>

          {/* Message */}
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {violation.message}
          </div>

          {/* Rule */}
          <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            rule: {violation.rule}
            {violation.effort && ` • effort: ${violation.effort}`}
          </div>

          {/* Tags */}
          {violation.tags && violation.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {violation.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-tertiary)',
                    fontSize: '10px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onGenerateFix(violation)}
            className="text-xs font-mono px-2 py-1 rounded border hover:bg-surface-elevated transition-colors"
            style={{
              borderColor: 'var(--border-standard)',
              color: 'var(--text-secondary)',
            }}
          >
            [generate fix]
          </button>
        </div>
      </div>
    </div>
  );
}
