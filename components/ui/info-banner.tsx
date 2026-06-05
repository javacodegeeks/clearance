// Console-style info/warning banner
interface InfoBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export default function InfoBanner({ type, message, details, action, onDismiss }: InfoBannerProps) {
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: '#fee2e2',
          border: 'var(--diff-deletion)',
          text: '#991b1b',
          icon: '✗',
        };
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#f59e0b',
          text: '#92400e',
          icon: '⚠',
        };
      case 'success':
        return {
          bg: '#d1fae5',
          border: 'var(--status-approved)',
          text: '#065f46',
          icon: '✓',
        };
      default: // info
        return {
          bg: 'var(--surface-elevated)',
          border: 'var(--border-standard)',
          text: 'var(--text-primary)',
          icon: 'ℹ',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="rounded text-sm flex items-start gap-3 p-3"
      style={{
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
      }}
    >
      {/* Icon */}
      <span className="font-mono text-base leading-none mt-0.5">
        {styles.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{message}</div>
        {details && (
          <div className="mt-1 text-xs opacity-80">{details}</div>
        )}
      </div>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-3 py-1 rounded text-xs font-medium transition-colors shrink-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            border: `1px solid ${styles.border}`,
          }}
        >
          {action.label}
        </button>
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity shrink-0"
          style={{ color: styles.text }}
        >
          ×
        </button>
      )}
    </div>
  );
}
