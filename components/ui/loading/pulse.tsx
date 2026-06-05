
interface InlinePulseProps {
  variant?: 'cursor' | 'dot' | 'ellipsis';
}

export function InlinePulse({ variant = 'cursor' }: InlinePulseProps) {
  if (variant === 'cursor') {
    return (
      <span
        className="inline-block w-[2px] h-4 ml-1 animate-pulse"
        style={{
          backgroundColor: 'var(--text-secondary)',
          animationDuration: '1s',
        }}
      />
    );
  }

  if (variant === 'dot') {
    return (
      <span
        className="inline-block w-1 h-1 rounded-full ml-1 animate-pulse"
        style={{
          backgroundColor: 'var(--text-secondary)',
          animationDuration: '1s',
        }}
      />
    );
  }

  // ellipsis variant
  return (
    <span className="inline-flex ml-1 gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{
            color: 'var(--text-secondary)',
            animationDuration: '1.4s',
            animationDelay: `${i * 0.2}s`,
          }}
        >
          .
        </span>
      ))}
    </span>
  );
}

interface StatusIndicatorProps {
  status: 'active' | 'success' | 'warning' | 'error' | 'neutral';
  pulse?: boolean;
  label?: string;
}

export function StatusIndicator({ status, pulse = false, label }: StatusIndicatorProps) {
  const colorMap = {
    active: 'var(--status-approved)',
    success: 'var(--status-approved)',
    warning: '#f59e0b',
    error: 'var(--diff-deletion)',
    neutral: 'var(--text-secondary)',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${pulse ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: colorMap[status],
          animationDuration: pulse ? '2s' : undefined,
        }}
      />
      {label && (
        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
