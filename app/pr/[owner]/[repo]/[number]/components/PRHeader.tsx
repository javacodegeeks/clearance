import { PullRequest } from '@/lib/types/github';
import { formatDistanceToNow } from 'date-fns';

interface QueueContext {
  hasPrevious: boolean;
  hasNext: boolean;
  previous: { number: number; owner: string; repo: string } | null;
  next: { number: number; owner: string; repo: string } | null;
}

interface PRHeaderProps {
  pr: PullRequest;
  queueContext: QueueContext | null;
  onBackToQueue: () => void;
  onPreviousPR: () => void;
  onNextPR: () => void;
}

export default function PRHeader({
  pr,
  queueContext,
  onBackToQueue,
  onPreviousPR,
  onNextPR,
}: PRHeaderProps) {
  return (
    <div className="border-b px-6 py-3" style={{ flex: 'none', borderColor: 'var(--border-standard)' }}>
      {/* Row 1: Breadcrumb + Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBackToQueue}
          className="text-sm hover:underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ← Back to Queue
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousPR}
            disabled={!queueContext?.hasPrevious}
            className="px-3 py-1.5 text-sm font-mono border rounded transition-colors disabled:opacity-30"
            style={{
              borderColor: 'var(--border-standard)',
              color: 'var(--text-secondary)',
            }}
          >
            Previous PR (↑)
          </button>
          <button
            onClick={onNextPR}
            disabled={!queueContext?.hasNext}
            className="px-3 py-1.5 text-sm font-mono border rounded transition-colors disabled:opacity-30"
            style={{
              borderColor: 'var(--border-standard)',
              color: 'var(--text-secondary)',
            }}
          >
            Next PR (↓)
          </button>
        </div>
      </div>

      {/* Row 2: PR Identity */}
      <div className="flex items-baseline gap-2 mb-2">
        <h1 className="text-xl font-mono" style={{ color: 'var(--text-primary)' }}>
          PR #{pr.number}
        </h1>
        <a
          href={pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-xs font-mono border rounded hover:bg-surface-raised transition-colors"
          style={{
            borderColor: 'var(--border-standard)',
            color: 'var(--text-secondary)',
          }}
        >
          github ↗
        </a>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          {pr.repository}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span className="text-base" style={{ color: 'var(--text-primary)' }}>
          {pr.title}
        </span>
      </div>

      {/* Row 3: Metadata */}
      <div className="flex items-center gap-3 text-sm font-mono">
        <span style={{ color: 'var(--text-secondary)' }}>$ {pr.state}</span>
        <span style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          opened {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })} by @{pr.user.login}
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span style={{ color: 'var(--text-secondary)' }}>{pr.changed_files} files</span>
        <span style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span style={{ color: 'var(--status-approved)' }}>+{pr.additions}</span>
        <span style={{ color: 'var(--diff-deletion)' }}>−{pr.deletions}</span>
      </div>
    </div>
  );
}
