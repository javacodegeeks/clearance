import { CommentThread, CommentStats } from '@/lib/types/github';
import { useState } from 'react';

interface CommentsTabContentProps {
  threads: CommentThread[];
  stats: CommentStats;
  loading: boolean;
}

export default function CommentsTabContent({
  threads,
  stats,
  loading,
}: CommentsTabContentProps) {
  const [showResolved, setShowResolved] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());

  const toggleThread = (threadId: number) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  // Filter and sort threads - latest first
  const filteredThreads = (showResolved
    ? threads
    : threads.filter(t => !t.resolved)
  ).sort((a, b) => {
    // Get the most recent timestamp from each thread (either last reply or root comment)
    const aLatest = a.replies.length > 0
      ? new Date(a.replies[a.replies.length - 1].created_at).getTime()
      : new Date(a.root.created_at).getTime();
    const bLatest = b.replies.length > 0
      ? new Date(b.replies[b.replies.length - 1].created_at).getTime()
      : new Date(b.root.created_at).getTime();

    // Sort descending (latest first)
    return bLatest - aLatest;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
          Loading comments...
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4 font-mono" style={{ color: 'var(--text-tertiary)' }}>
          $
        </div>
        <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No comments
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No review comments have been made on this PR yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Comments ({stats.total})
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {stats.resolved} resolved · {stats.unresolved} unresolved
          </span>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="text-xs font-medium px-2 py-1 rounded border transition-colors"
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-standard)',
            backgroundColor: showResolved ? 'transparent' : 'var(--surface-raised)',
          }}
        >
          {showResolved ? 'Show unresolved only' : 'Show all'}
        </button>
      </div>

      {/* Thread List */}
      <div className="space-y-3">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No unresolved comments
            </div>
          </div>
        ) : (
          filteredThreads.map(thread => (
            <div
              key={thread.id}
              className="border rounded p-3 transition-colors"
              style={{
                borderColor: thread.resolved
                  ? 'var(--border-standard)'
                  : '#f59e0b',
                borderLeftWidth: thread.resolved ? '1px' : '3px',
                backgroundColor: 'var(--surface-base)',
              }}
            >
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: thread.resolved
                      ? 'var(--status-approved)'
                      : '#f59e0b',
                    color: 'white',
                  }}
                >
                  {thread.resolved ? '✓ Resolved' : 'Unresolved'}
                </span>

                {/* Code Reference */}
                {thread.path && (
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {thread.path}
                    {thread.line && `:${thread.line}`}
                  </span>
                )}
              </div>

              {/* Root Comment */}
              <div className="mb-2">
                <div className="flex items-start gap-2 mb-1">
                  <img
                    src={thread.root.user.avatar_url}
                    alt={thread.root.user.login}
                    className="w-5 h-5 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {thread.root.user.login}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(thread.root.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {thread.root.body}
                    </div>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {thread.replies.length > 0 && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    onClick={() => toggleThread(thread.id)}
                    className="text-xs font-medium flex items-center gap-1 mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>{expandedThreads.has(thread.id) ? '▼' : '▶'}</span>
                    <span>
                      {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </button>

                  {expandedThreads.has(thread.id) && (
                    <div className="space-y-2 ml-4 pl-3 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
                      {thread.replies.map(reply => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <img
                            src={reply.user.avatar_url}
                            alt={reply.user.login}
                            className="w-4 h-4 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                {reply.user.login}
                              </span>
                              <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div
                              className="text-sm whitespace-pre-wrap"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {reply.body}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* View on GitHub Link */}
              <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <a
                  href={thread.root.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  View on GitHub →
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
