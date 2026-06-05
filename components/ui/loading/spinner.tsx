
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-[1.5px]',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
  };

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div className={`flex items-center ${containerClasses[size]}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]}`}
        style={{
          borderColor: 'var(--border-standard)',
          borderTopColor: 'var(--text-primary)',
          animationDuration: '0.8s',
        }}
      />
      {label && (
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
