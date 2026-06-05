import { Task } from '@/lib/storage/indexeddb-storage';
import { CommentThread, CommentStats } from '@/lib/types/github';
import FilesTabContent from './FilesTabContent';
import { ChecksTabContent, CommitsTabContent, TasksTabContent } from './TabContent';
import CommentsTabContent from './CommentsTabContent';

type Tab = 'files' | 'commits' | 'checks' | 'comments' | 'tasks';

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

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  url: string;
}

interface PRDetails {
  commits: Commit[];
  checks: Check[];
  files: FileChange[];
}

const TASK_SHORTCUTS = [
  'Check test coverage',
  'Review security implications',
  'Verify docs updated',
];

interface FilesPanelProps {
  prNumber: number;
  activeTab: Tab;
  details: PRDetails | null;
  targetFile: string | null;
  expandedDirs: Set<string>;
  expandedFiles: Set<string>;
  tasks: Task[];
  taskInput: string;
  selectedShortcuts: string[];
  commentThreads: CommentThread[];
  commentStats: CommentStats;
  commentsLoading: boolean;
  onActiveTabChange: (tab: Tab) => void;
  onExpandedDirsChange: (dirs: Set<string>) => void;
  onExpandedFilesChange: (files: Set<string>) => void;
  onTaskInputChange: (value: string) => void;
  onAddTask: () => void;
  onToggleTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onToggleShortcut: (shortcut: string) => void;
  onAddSelectedShortcuts: () => void;
}

export default function FilesPanel({
  prNumber,
  activeTab,
  details,
  targetFile,
  expandedDirs,
  expandedFiles,
  tasks,
  taskInput,
  selectedShortcuts,
  commentThreads,
  commentStats,
  commentsLoading,
  onActiveTabChange,
  onExpandedDirsChange,
  onExpandedFilesChange,
  onTaskInputChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onToggleShortcut,
  onAddSelectedShortcuts,
}: FilesPanelProps) {
  const tabs = [
    { id: 'files' as Tab, label: 'Files', count: details?.files.length },
    { id: 'commits' as Tab, label: 'Commits', count: details?.commits.length },
    { id: 'checks' as Tab, label: 'Checks', count: details?.checks.length },
    { id: 'comments' as Tab, label: 'Comments', count: commentStats.total },
    { id: 'tasks' as Tab, label: 'Tasks', count: tasks.length },
  ];

  return (
    <div className="w-[35%] flex flex-col border-r" style={{ borderColor: 'var(--border-standard)' }}>
      {/* Tab Buttons */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onActiveTabChange(tab.id)}
            className="px-4 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: activeTab === tab.id ? 'var(--surface-raised)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--text-primary)' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'files' && details && (
          <FilesTabContent
            files={details.files}
            targetFile={targetFile}
            expandedDirs={expandedDirs}
            expandedFiles={expandedFiles}
            onExpandedDirsChange={onExpandedDirsChange}
            onExpandedFilesChange={onExpandedFilesChange}
            prNumber={prNumber}
          />
        )}
        {activeTab === 'commits' && details && (
          <CommitsTabContent commits={details.commits} />
        )}
        {activeTab === 'checks' && details && (
          <ChecksTabContent checks={details.checks} />
        )}
        {activeTab === 'comments' && (
          <CommentsTabContent
            threads={commentThreads}
            stats={commentStats}
            loading={commentsLoading}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTabContent
            tasks={tasks}
            taskInput={taskInput}
            onTaskInputChange={onTaskInputChange}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            taskShortcuts={TASK_SHORTCUTS}
            selectedShortcuts={selectedShortcuts}
            onToggleShortcut={onToggleShortcut}
            onAddSelectedShortcuts={onAddSelectedShortcuts}
          />
        )}
      </div>
    </div>
  );
}
