/**
 * Agent Orchestrator Panel
 * Displays autonomous agent's reasoning and parallel execution status
 */

'use client';

import { useState } from 'react';
import type { OrchestratorState } from '../hooks/types';

interface AgentOrchestratorProps {
  orchestrator: OrchestratorState;
  onToggleObservatory: () => void;
}

type AnalysisTask = 'risk' | 'missions' | 'governance';

const TASK_LABELS: Record<AnalysisTask, string> = {
  risk: 'risk-assessment',
  missions: 'review-focus',
  governance: 'code-governance',
};

const TASK_ICONS: Record<string, string> = {
  queued: '$',
  running: '●',
  complete: '✓',
  error: '✗',
};

export default function AgentOrchestrator({ orchestrator, onToggleObservatory }: AgentOrchestratorProps) {
  const [expanded, setExpanded] = useState(true);

  const { active, reasoning, tasks, startTime, endTime } = orchestrator;

  // Calculate total duration
  const totalDuration = endTime ? ((endTime - startTime) / 1000).toFixed(1) : '...';

  // Count completed tasks
  const completedCount = tasks.filter(t => t.status === 'complete').length;
  const totalCount = tasks.length;

  // Count warnings (errors)
  const warningCount = tasks.filter(t => t.status === 'error').length;

  // Determine overall status
  const isComplete = !active && completedCount === totalCount;
  const hasErrors = warningCount > 0;

  if (tasks.length === 0) {
    return null; // Don't show orchestrator before analysis starts
  }

  return (
    <div
      className="border-b"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--surface-base)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ backgroundColor: expanded ? 'var(--surface-base)' : 'transparent' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {expanded ? '[−]' : '[+]'}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            autonomous-analysis
          </span>
          {active && (
            <span className="text-xs font-mono" style={{ color: '#4ade80' }}>
              [●]
            </span>
          )}
          {isComplete && (
            <span className="text-xs font-mono" style={{ color: '#6b7280' }}>
              [✓]
            </span>
          )}
        </button>
        <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {isComplete && (
            <>
              <span>{totalDuration}s</span>
              <span>
                {completedCount}/{totalCount}
              </span>
            </>
          )}
          {active && (
            <span>
              {completedCount}/{totalCount}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleObservatory();
            }}
            className="px-2 py-0.5 rounded border hover:opacity-80 transition-opacity"
            style={{
              borderColor: 'var(--border-standard)',
              color: 'var(--text-primary)',
            }}
          >
            [obs]
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Active State */}
          {active && (
            <>
              {/* Tasks */}
              <div className="space-y-1.5">
                {tasks.map(task => (
                  <div
                    key={task.task}
                    className="flex items-center justify-between font-mono text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          color:
                            task.status === 'complete'
                              ? '#4ade80'
                              : task.status === 'running'
                              ? '#f59e0b'
                              : task.status === 'error'
                              ? '#dc2626'
                              : '#6b7280',
                        }}
                      >
                        {TASK_ICONS[task.status]}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {TASK_LABELS[task.task]}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {task.status === 'running' && 'running'}
                      {task.status === 'queued' && 'queued'}
                      {task.status === 'complete' && task.duration && `${task.duration.toFixed(1)}s`}
                      {task.status === 'error' && 'failed'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              {reasoning && (
                <div
                  className="text-xs font-mono pt-2 border-t"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>agent:</div>
                  {reasoning.split('\n').map((line, idx) => (
                    <div key={idx} className="pl-2">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Complete State */}
          {isComplete && (
            <div className="space-y-3">
              {/* Summary */}
              <div
                className="flex items-center justify-between text-xs font-mono pb-2 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span style={{ color: hasErrors ? '#dc2626' : '#4ade80' }}>
                  {hasErrors ? '[!]' : '[✓]'} {hasErrors ? 'completed with errors' : 'complete'}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>{totalDuration}s</span>
              </div>

              {/* Task Results */}
              <div className="space-y-1.5">
                {tasks.map(task => (
                  <div key={task.task} className="space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: task.status === 'complete' ? '#4ade80' : '#dc2626',
                          }}
                        >
                          {TASK_ICONS[task.status]}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {TASK_LABELS[task.task]}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {task.duration ? `${task.duration.toFixed(1)}s` : ''}
                      </span>
                    </div>
                    {task.summary && (
                      <div
                        className="text-xs font-mono pl-5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        → {task.summary}
                      </div>
                    )}
                    {task.error && (
                      <div
                        className="text-xs font-mono pl-5"
                        style={{ color: '#dc2626' }}
                      >
                        → {task.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reasoning (collapsed view) */}
              {reasoning && (
                <div
                  className="text-xs font-mono pt-2 border-t"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>reasoning:</div>
                  <div className="pl-2">{reasoning.split('\n')[0]}</div>
                </div>
              )}

              {/* Warnings Summary */}
              {hasErrors && (
                <div
                  className="text-xs font-mono pt-2 border-t"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: '#dc2626',
                  }}
                >
                  {warningCount} analysis {warningCount === 1 ? 'failed' : 'failures'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
