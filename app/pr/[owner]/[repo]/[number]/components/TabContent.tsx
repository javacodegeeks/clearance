import type { Task } from '@/lib/storage/indexeddb-storage';
import { formatDistanceToNow } from 'date-fns';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface Check {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

export function CommitsTabContent({ commits }: { commits: Commit[] }) {
  return (
    <div className="space-y-3">
      {commits.map(commit => (
        <div
          key={commit.sha}
          className="p-4 border rounded"
          style={{ borderColor: 'var(--border-standard)' }}
        >
          <div className="font-mono text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            {commit.message}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            <span>{commit.author}</span>
            <span>•</span>
            <span>{commit.sha.slice(0, 7)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChecksTabContent({ checks }: { checks: Check[] }) {
  const getCheckIcon = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return '✓';
      if (conclusion === 'failure') return '✗';
      return '−';
    }
    return '⟳';
  };

  const getCheckColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'var(--status-approved)';
      if (conclusion === 'failure') return 'var(--diff-deletion)';
      return 'var(--text-tertiary)';
    }
    return 'var(--text-secondary)';
  };

  return (
    <div className="space-y-2">
      {checks.map((check, index) => (
        <div
          key={`${check.name}-${index}`}
          className="p-3 border rounded flex items-center justify-between"
          style={{ borderColor: 'var(--border-standard)' }}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono" style={{ color: getCheckColor(check.status, check.conclusion) }}>
              {getCheckIcon(check.status, check.conclusion)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {check.name}
            </span>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {check.conclusion || check.status}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TasksTabContentProps {
  tasks: Task[];
  taskInput: string;
  onTaskInputChange: (value: string) => void;
  onAddTask: () => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  taskShortcuts: string[];
  selectedShortcuts: string[];
  onToggleShortcut: (shortcut: string) => void;
  onAddSelectedShortcuts: () => void;
}

export function TasksTabContent({
  tasks,
  taskInput,
  onTaskInputChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  taskShortcuts,
  selectedShortcuts,
  onToggleShortcut,
  onAddSelectedShortcuts,
}: TasksTabContentProps) {
  return (
    <div>
      {tasks.length === 0 ? (
        /* Empty State with CTAs */
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md space-y-6">
            <div>
              <div className="text-4xl mb-3 font-mono" style={{ color: 'var(--text-tertiary)' }}>$</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No tasks yet
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Track review checklist items, follow-ups, or questions for this PR
              </p>
            </div>

            {/* Quick Add Shortcuts */}
            <div className="space-y-3">
              <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Quick add:
              </p>
              <div className="flex flex-col gap-2">
                {taskShortcuts.map((shortcut) => (
                  <button
                    key={shortcut}
                    onClick={() => onToggleShortcut(shortcut)}
                    className="px-3 py-2 rounded border text-left font-mono text-xs transition-all hover:bg-surface-raised"
                    style={{
                      backgroundColor: selectedShortcuts.includes(shortcut) ? 'var(--surface-raised)' : 'var(--surface-base)',
                      borderColor: selectedShortcuts.includes(shortcut) ? 'var(--border-emphasis)' : 'var(--border-subtle)',
                      color: selectedShortcuts.includes(shortcut) ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="mr-2">{selectedShortcuts.includes(shortcut) ? '☑' : '□'}</span>
                    <span>&gt; {shortcut}</span>
                  </button>
                ))}
              </div>
              {selectedShortcuts.length > 0 && (
                <button
                  onClick={onAddSelectedShortcuts}
                  className="w-full px-4 py-2 rounded text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--surface-base)',
                    border: '1px solid var(--text-primary)',
                  }}
                >
                  Add selected tasks ({selectedShortcuts.length})
                </button>
              )}
            </div>

            {/* Custom Task Input */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Or add custom task:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => onTaskInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddTask();
                    }
                  }}
                  placeholder="$ Add task for this PR..."
                  className="flex-1 p-2 rounded border font-mono text-sm"
                  style={{
                    borderColor: 'var(--border-standard)',
                    backgroundColor: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Task List with Input at Top */
        <>
          {/* Add Task */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => onTaskInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddTask();
                  }
                }}
                placeholder="$ Add task for this PR..."
                className="flex-1 p-3 rounded border font-mono text-sm"
                style={{
                  borderColor: 'var(--border-standard)',
                  backgroundColor: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={onAddTask}
                disabled={!taskInput.trim()}
                className="px-4 py-2 border rounded font-mono text-sm hover:bg-surface-raised transition-colors disabled:opacity-50"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="p-3 border rounded transition-all hover:bg-surface-raised group"
                style={{
                  borderColor: 'var(--border-subtle)',
                  opacity: task.completed ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => task.id && onToggleTask(task.id)}
                    className="mt-0.5 font-mono text-sm flex-shrink-0"
                    style={{ color: task.completed ? 'var(--status-approved)' : 'var(--text-secondary)' }}
                  >
                    {task.completed ? '✓' : '□'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {task.description}
                    </p>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(task.created_at, { addSuffix: true })}
                      {task.completed && task.completed_at && ' • Completed'}
                    </p>
                  </div>
                  <button
                    onClick={() => task.id && onDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-sm flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
