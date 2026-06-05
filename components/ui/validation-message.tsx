// Inline linter-style validation message
interface ValidationMessageProps {
  message: string;
  type?: 'error' | 'warning';
}

export default function ValidationMessage({ message, type = 'error' }: ValidationMessageProps) {
  const isError = type === 'error';

  return (
    <div
      className="flex items-start gap-2 mt-2 text-xs font-mono"
      style={{
        color: isError ? 'var(--diff-deletion)' : '#f59e0b',
      }}
    >
      <span className="shrink-0">{isError ? '✗' : '⚠'}</span>
      <span>{message}</span>
    </div>
  );
}
