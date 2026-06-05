/**
 * Agent Observatory - Slide-in Drawer
 * Provides real-time observability into autonomous agent execution
 */

'use client';

import { useState } from 'react';
import type { OrchestratorState, ToolInvocation } from '../hooks/types';

interface AgentObservatoryProps {
  isOpen: boolean;
  orchestrator: OrchestratorState;
  onClose: () => void;
}

type Tab = 'live' | 'tools' | 'metrics';

const TASK_LABELS: Record<string, string> = {
  risk: 'Risk Assessment',
  missions: 'Review Missions',
  governance: 'Code Governance',
};

export default function AgentObservatory({
  isOpen,
  orchestrator,
  onClose,
}: AgentObservatoryProps) {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  if (!isOpen) return null;

  const { trace, tasks, startTime, endTime } = orchestrator;
  const totalDuration = endTime ? ((endTime - startTime) / 1000).toFixed(1) : '...';

  return (
    <div
      className="fixed top-0 right-0 h-full w-[450px] z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--surface-raised)',
        borderLeft: '1px solid var(--border-standard)',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            $ agent-observatory
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-2xl hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {(['live', 'tools', 'metrics'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 text-xs font-mono transition-colors"
            style={{
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : 'none',
            }}
          >
            [{tab}]
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'live' && (
          <LiveTraceView
            trace={trace}
            tasks={tasks}
            expandedToolId={expandedToolId}
            onToggleTool={setExpandedToolId}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsView
            tools={trace.tools}
            expandedToolId={expandedToolId}
            onToggleTool={setExpandedToolId}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsView
            orchestrator={orchestrator}
            totalDuration={totalDuration}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Live Trace View - Real-time execution timeline
 */
function LiveTraceView({
  trace,
  tasks,
  expandedToolId,
  onToggleTool,
}: {
  trace: OrchestratorState['trace'];
  tasks: OrchestratorState['tasks'];
  expandedToolId: string | null;
  onToggleTool: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Timeline visualization */}
      <div
        className="p-3 rounded border font-mono text-xs"
        style={{
          borderColor: 'var(--border-standard)',
          backgroundColor: 'var(--surface-base)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)' }} className="mb-2">
          execution-timeline
        </div>

        <div className="space-y-2">
          {trace.tools.map(tool => (
            <div key={tool.id}>
              <button
                onClick={() => onToggleTool(expandedToolId === tool.id ? null : tool.id)}
                className="w-full text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color:
                          tool.status === 'complete'
                            ? '#4ade80'
                            : tool.status === 'running'
                              ? '#3b82f6'
                              : '#dc2626',
                      }}
                    >
                      {tool.status === 'complete' ? '✓' : tool.status === 'running' ? '●' : '✗'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {tool.name}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {tool.duration ? `${tool.duration.toFixed(1)}s` : tool.status === 'running' ? 'running' : 'queued'}
                  </span>
                </div>
              </button>

              {/* Expanded tool details */}
              {expandedToolId === tool.id && (
                <div
                  className="mt-2 p-2 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div className="space-y-1">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>endpoint:</span> {tool.endpoint}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>started:</span>{' '}
                      {new Date(tool.startTime).toLocaleTimeString()}
                    </div>
                    {tool.duration && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>duration:</span> {tool.duration.toFixed(1)}s
                      </div>
                    )}
                    {tool.error && (
                      <div style={{ color: '#dc2626' }}>
                        <span style={{ color: 'var(--text-muted)' }}>error:</span> {tool.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Decisions */}
      {trace.decisions.length > 0 && (
        <div
          className="p-3 rounded border font-mono text-xs"
          style={{
            borderColor: 'var(--border-standard)',
            backgroundColor: 'var(--surface-base)',
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }} className="mb-2">
            decision-points
          </div>
          <div className="space-y-2">
            {trace.decisions.map(decision => (
              <div key={decision.id}>
                <div style={{ color: 'var(--text-primary)' }}>
                  {decision.decision}
                </div>
                <div style={{ color: 'var(--text-tertiary)' }} className="text-xs mt-1">
                  {decision.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tools View - Detailed tool invocation history
 */
function ToolsView({
  tools,
  expandedToolId,
  onToggleTool,
}: {
  tools: ToolInvocation[];
  expandedToolId: string | null;
  onToggleTool: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {tools.map(tool => (
        <div
          key={tool.id}
          className="p-3 rounded border font-mono text-xs"
          style={{
            borderColor: 'var(--border-standard)',
            backgroundColor: 'var(--surface-base)',
          }}
        >
          <button
            onClick={() => onToggleTool(expandedToolId === tool.id ? null : tool.id)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    color:
                      tool.status === 'complete' ? '#4ade80' : tool.status === 'error' ? '#dc2626' : '#3b82f6',
                  }}
                >
                  {tool.status === 'complete' ? '✓' : tool.status === 'error' ? '✗' : '●'}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{tool.name}</span>
              </div>
              <span style={{ color: 'var(--text-tertiary)' }}>
                {tool.duration ? `${tool.duration.toFixed(1)}s` : '...'}
              </span>
            </div>
            <div style={{ color: 'var(--text-tertiary)' }} className="text-xs mt-1">
              {tool.endpoint}
            </div>
          </button>

          {expandedToolId === tool.id && (
            <div className="mt-3 space-y-2">
              <div>
                <div style={{ color: 'var(--text-secondary)' }} className="mb-1">
                  input:
                </div>
                <pre
                  className="p-2 rounded overflow-x-auto"
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {JSON.stringify(tool.input, null, 2)}
                </pre>
              </div>

              {tool.output && (
                <div>
                  <div style={{ color: 'var(--text-secondary)' }} className="mb-1">
                    output:
                  </div>
                  <pre
                    className="p-2 rounded overflow-x-auto"
                    style={{
                      backgroundColor: 'var(--surface-raised)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {JSON.stringify(tool.output, null, 2)}
                  </pre>
                </div>
              )}

              {tool.error && (
                <div>
                  <div style={{ color: '#dc2626' }} className="mb-1">
                    error:
                  </div>
                  <div
                    className="p-2 rounded"
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                    }}
                  >
                    {tool.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {tools.length === 0 && (
        <div
          className="text-center py-8 text-xs font-mono"
          style={{ color: 'var(--text-tertiary)' }}
        >
          no tool invocations yet
        </div>
      )}
    </div>
  );
}

/**
 * Metrics View - Performance profiling
 */
function MetricsView({
  orchestrator,
  totalDuration,
}: {
  orchestrator: OrchestratorState;
  totalDuration: string;
}) {
  const { tasks, startTime, endTime } = orchestrator;

  // Calculate parallel efficiency
  const taskDurations = tasks.filter(t => t.duration).map(t => t.duration!);
  const totalSequentialTime = taskDurations.reduce((sum, d) => sum + d, 0);
  const actualTime = endTime ? (endTime - startTime) / 1000 : 0;
  const efficiency = actualTime > 0 ? Math.round((totalSequentialTime / (actualTime * tasks.length)) * 100) : 0;

  // Find bottleneck
  const bottleneck = tasks.reduce((max, task) =>
    (task.duration || 0) > (max.duration || 0) ? task : max
    , tasks[0]);

  return (
    <div className="space-y-3">
      {/* Performance Profile */}
      <div
        className="p-3 rounded border font-mono text-xs"
        style={{
          borderColor: 'var(--border-standard)',
          backgroundColor: 'var(--surface-base)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)' }} className="mb-3">
          performance-profile
        </div>

        <div className="space-y-2">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>total orchestration:</span>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{totalDuration}s</span>
          </div>

          {tasks.map(task => {
            const percentage = actualTime > 0 ? Math.round(((task.duration || 0) / actualTime) * 100) : 0;
            return (
              <div key={task.task}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {TASK_LABELS[task.task] || task.task}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {task.duration ? `${task.duration.toFixed(1)}s (${percentage}%)` : '...'}
                  </span>
                </div>
                {task.duration && (
                  <div className="h-2 rounded overflow-hidden" style={{ backgroundColor: 'var(--surface-raised)' }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#4ade80',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>parallelism:</span> {tasks.length} concurrent tasks
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>efficiency:</span>{' '}
              <span style={{ color: efficiency > 60 ? '#4ade80' : '#f59e0b' }}>
                {efficiency}%
              </span>{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>(ideal: 100%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      {bottleneck && bottleneck.duration && (
        <div
          className="p-3 rounded border font-mono text-xs"
          style={{
            borderColor: 'var(--border-standard)',
            backgroundColor: 'var(--surface-base)',
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }} className="mb-2">
            bottleneck-analysis
          </div>
          <div>
            <div style={{ color: '#f59e0b' }}>
              {TASK_LABELS[bottleneck.task] || bottleneck.task}
            </div>
            <div style={{ color: 'var(--text-tertiary)' }} className="mt-1">
              reason: AI model inference / external API
            </div>
            <div style={{ color: 'var(--text-tertiary)' }}>
              suggestion: implement caching for common patterns
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
