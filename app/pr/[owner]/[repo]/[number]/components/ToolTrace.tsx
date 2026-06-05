/**
 * Tool Trace Component
 * Displays AI investigation process in terminal style
 * Shows tool calls, arguments, duration, and results
 */

'use client';

import React from 'react';

export interface ToolExecution {
  tool: string;
  args: Record<string, any>;
  result?: any;
  duration?: number;
  status: 'running' | 'complete' | 'error';
  error?: string;
}

interface ToolTraceProps {
  executions: ToolExecution[];
  collapsed?: boolean;
  onToggle?: () => void;
}

// Tool icon mapping
const TOOL_ICONS: Record<string, string> = {
  search_changed_files: '🔍',
  get_mission_status: '📊',
  analyze_file_complexity: '📈',
  get_ci_status: '🔧',
  check_test_coverage: '🧪',
  validate_patterns: '🛡️',
};

// Tool display names
const TOOL_NAMES: Record<string, string> = {
  search_changed_files: 'search_changed_files',
  get_mission_status: 'get_mission_status',
  analyze_file_complexity: 'analyze_file_complexity',
  get_ci_status: 'get_ci_status',
  check_test_coverage: 'check_test_coverage',
  validate_patterns: 'validate_patterns',
};

export default function ToolTrace({ executions, collapsed = false, onToggle }: ToolTraceProps) {
  if (executions.length === 0) return null;

  // Collapsed view - badge summary
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 text-xs font-mono px-2 py-1 rounded border hover:opacity-80 transition-opacity"
        style={{
          borderColor: 'var(--border-standard)',
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--text-secondary)',
        }}
      >
        {executions.map((exec, idx) => (
          <span key={idx}>
            {TOOL_ICONS[exec.tool] || '⚙️'} {TOOL_NAMES[exec.tool]}
            {exec.duration && ` • ${exec.duration}ms`}
          </span>
        ))}
        <span style={{ color: 'var(--text-tertiary)' }}>[expand]</span>
      </button>
    );
  }

  // Expanded view - full trace
  return (
    <div
      className="border rounded font-mono text-xs mb-3"
      style={{
        borderColor: 'var(--border-standard)',
        backgroundColor: 'var(--surface-base)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          ┌─ Investigation ──────────────────┐
        </span>
        {onToggle && (
          <button
            onClick={onToggle}
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-tertiary)' }}
          >
            [collapse]
          </button>
        )}
      </div>

      {/* Tool executions */}
      <div className="p-3 space-y-2">
        {executions.map((exec, idx) => (
          <div key={idx}>
            {/* Tool invocation */}
            <div className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span>{exec.status === 'running' ? '⚡' : exec.status === 'complete' ? '✓' : '✗'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ color: exec.status === 'running' ? '#ffb000' : exec.status === 'complete' ? 'var(--status-approved)' : 'var(--diff-deletion)' }}>
                    {exec.status === 'running' ? 'Running' : exec.status === 'complete' ? 'Complete' : 'Error'}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {TOOL_NAMES[exec.tool] || exec.tool}
                  </span>
                  {exec.duration !== undefined && (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {exec.duration}ms
                    </span>
                  )}
                </div>

                {/* Arguments */}
                {Object.keys(exec.args).length > 0 && (
                  <div className="mt-1 pl-2 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {Object.entries(exec.args).map(([key, value]) => (
                      <div key={key}>
                        {key}: {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Result summary */}
                {exec.status === 'complete' && exec.result && (
                  <div className="mt-1 pl-2" style={{ color: 'var(--text-secondary)' }}>
                    {renderResultSummary(exec.tool, exec.result)}
                  </div>
                )}

                {/* Error */}
                {exec.status === 'error' && exec.error && (
                  <div className="mt-1 pl-2" style={{ color: 'var(--diff-deletion)' }}>
                    Error: {exec.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        └─────────────────────────────────┘
      </div>
    </div>
  );
}

// Render result summary based on tool type
function renderResultSummary(tool: string, result: any): React.ReactNode {
  switch (tool) {
    case 'search_changed_files':
      if (result.totalMatches === 0) {
        return `No matches found in ${result.filesSearched} files`;
      }
      return (
        <>
          Found {result.totalMatches} match{result.totalMatches !== 1 ? 'es' : ''} in {result.filesSearched} files
          {result.matches && result.matches.length > 0 && (
            <div className="mt-1 space-y-1">
              {result.matches.slice(0, 3).map((match: any, idx: number) => (
                <div key={idx} className="text-xs">
                  → {match.file}:{match.line}
                </div>
              ))}
              {result.matches.length > 3 && (
                <div className="text-xs">
                  ... and {result.matches.length - 3} more
                </div>
              )}
            </div>
          )}
        </>
      );

    case 'get_mission_status':
      if (result.totalCount === 0) {
        return 'No missions found';
      }
      return (
        <>
          Found {result.missions.length} mission{result.missions.length !== 1 ? 's' : ''} (total: {result.totalCount})
          {result.breakdown && (
            <div className="mt-1 space-y-0.5 text-xs">
              {result.breakdown.byPriority && Object.entries(result.breakdown.byPriority).map(([priority, count]) => (
                <div key={priority}>
                  {priority}: {count as number}
                </div>
              ))}
            </div>
          )}
        </>
      );

    case 'analyze_file_complexity':
      if (!result.found) {
        return 'File not found';
      }
      return (
        <>
          {result.file}: {result.additions} additions, {result.deletions} deletions
          {result.complexity && (
            <div className="mt-1 text-xs">
              {result.complexity.description}
            </div>
          )}
        </>
      );

    case 'get_ci_status':
      return (
        <>
          {result.summary}
          {result.checks && result.checks.length > 0 && (
            <div className="mt-1 space-y-0.5 text-xs">
              {result.checks.slice(0, 3).map((check: any, idx: number) => (
                <div key={idx}>
                  {check.conclusion === 'success' ? '✓' : check.conclusion === 'failure' ? '✗' : '○'} {check.name}
                </div>
              ))}
              {result.checks.length > 3 && (
                <div>... and {result.checks.length - 3} more checks</div>
              )}
            </div>
          )}
        </>
      );

    case 'check_test_coverage':
      return (
        <>
          {result.summary}
          {result.files && result.files.length > 0 && (
            <div className="mt-1 space-y-0.5 text-xs">
              {result.files.filter((f: any) => f.coverage === 'poor').slice(0, 3).map((file: any, idx: number) => (
                <div key={idx} style={{ color: 'var(--diff-deletion)' }}>
                  ✗ {file.file} - {file.reason}
                </div>
              ))}
              {result.files.filter((f: any) => f.hasTests).slice(0, 2).map((file: any, idx: number) => (
                <div key={idx} style={{ color: 'var(--status-approved)' }}>
                  ✓ {file.file} - has tests
                </div>
              ))}
            </div>
          )}
        </>
      );

    case 'validate_patterns':
      const highViolations = result.violations?.filter((v: any) => v.severity === 'high') || [];
      const mediumViolations = result.violations?.filter((v: any) => v.severity === 'medium') || [];
      return (
        <>
          {result.summary}
          {result.violations && result.violations.length > 0 && (
            <div className="mt-1 space-y-0.5 text-xs">
              {highViolations.slice(0, 2).map((v: any, idx: number) => (
                <div key={idx} style={{ color: 'var(--diff-deletion)' }}>
                  ⚠ HIGH: {v.pattern} in {v.file}:{v.line}
                </div>
              ))}
              {mediumViolations.slice(0, 2).map((v: any, idx: number) => (
                <div key={idx} style={{ color: '#f59e0b' }}>
                  ⚠ MED: {v.pattern} in {v.file}:{v.line}
                </div>
              ))}
              {result.violations.length > 4 && (
                <div>... and {result.violations.length - 4} more issues</div>
              )}
            </div>
          )}
        </>
      );

    default:
      return JSON.stringify(result, null, 2).slice(0, 100);
  }
}
