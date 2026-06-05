// Terminal-style empty state component
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  reasons?: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = '$', title, description, reasons, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6"
      style={{
        color: 'var(--text-secondary)',
        borderRadius: '4px',
      }}
    >
      {/* Terminal prompt style */}
      <div
        className="font-mono text-sm mb-3"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {icon}
      </div>

      {/* Main message */}
      <div
        className="text-base font-medium mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </div>

      {/* Description */}
      {description && (
        <div
          className="text-sm mb-4 text-center max-w-md"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </div>
      )}

      {/* Reasons list (terminal output style) */}
      {reasons && reasons.length > 0 && (
        <div
          className="text-sm font-mono mb-6 text-left"
          style={{
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '12px 16px',
          }}
        >
          {reasons.map((reason, idx) => (
            <div key={idx} className="mb-1 last:mb-0">
              <span style={{ color: 'var(--text-muted)' }}>•</span> {reason}
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-standard)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
