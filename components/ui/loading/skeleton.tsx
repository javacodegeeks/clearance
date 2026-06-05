
interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}

export function SkeletonLoader({
  width = 'w-full',
  height = 'h-4',
  rounded = '',
  className = '',
}: SkeletonLoaderProps) {
  return (
    <div
      className={`skeleton ${width} ${height} ${rounded} ${className}`}
      style={{
        backgroundColor: 'var(--border-standard)',
        opacity: 0.3,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
}

export function SkeletonText({ lines = 3, lastLineWidth = 'w-3/4' }: SkeletonTextProps) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? lastLineWidth : 'w-full'}
          height="h-3"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="p-4 rounded border"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-standard)',
      }}
    >
      <div className="space-y-3">
        <SkeletonLoader width="w-32" height="h-4" />
        <SkeletonText lines={2} lastLineWidth="w-2/3" />
        <div className="flex gap-2">
          <SkeletonLoader width="w-16" height="h-6" rounded="rounded" />
          <SkeletonLoader width="w-20" height="h-6" rounded="rounded" />
        </div>
      </div>
    </div>
  );
}
