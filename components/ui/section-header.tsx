// Config-file style section header with completion status
interface SectionHeaderProps {
  title: string;
  description?: string;
  stepNumber?: number;
  isComplete?: boolean;
  isRequired?: boolean;
}

export default function SectionHeader({
  title,
  description,
  stepNumber,
  isComplete,
  isRequired = true
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Step indicator */}
      {stepNumber !== undefined && (
        <div
          className="flex items-center justify-center w-6 h-6 rounded text-xs font-mono shrink-0 mt-0.5"
          style={{
            backgroundColor: isComplete ? 'var(--status-approved)' : 'var(--surface-raised)',
            border: `1px solid ${isComplete ? 'var(--status-approved)' : 'var(--border-standard)'}`,
            color: isComplete ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {isComplete ? '✓' : stepNumber}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Title with required indicator */}
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {isRequired && !isComplete && (
            <span className="text-xs font-mono" style={{ color: 'var(--diff-deletion)' }}>
              *
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
