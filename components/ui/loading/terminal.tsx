
interface TerminalLoaderProps {
  steps: string[];
  currentStep?: number; // 0-indexed, -1 means all complete
}

export function TerminalLoader({ steps, currentStep }: TerminalLoaderProps) {
  return (
    <div className="space-y-2 font-mono text-xs">
      {steps.map((step, i) => {
        const isComplete = currentStep !== undefined && i < currentStep;
        const isCurrent = currentStep !== undefined && i === currentStep;
        const isPending = currentStep !== undefined && i > currentStep;

        return (
          <div key={i} className="flex items-center gap-2">
            {/* Step indicator */}
            {isComplete && (
              <span style={{ color: 'var(--status-approved)' }}>
                [✓]
              </span>
            )}
            {isCurrent && (
              <div
                className="w-1 h-1 rounded-full animate-pulse"
                style={{
                  backgroundColor: 'var(--status-approved)',
                  animationDuration: '1s',
                }}
              />
            )}
            {isPending && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                [○]
              </span>
            )}
            {currentStep === undefined && (
              <div
                className="w-1 h-1 rounded-full animate-pulse"
                style={{
                  backgroundColor: 'var(--status-approved)',
                  animationDuration: `${1 + i * 0.2}s`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            )}

            {/* Step text */}
            <span
              style={{
                color: isComplete
                  ? 'var(--text-tertiary)'
                  : isCurrent
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface TerminalDotsProps {
  label?: string;
}

export function TerminalDots({ label }: TerminalDotsProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {label && (
        <span style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full animate-pulse"
            style={{
              backgroundColor: 'var(--text-secondary)',
              animationDuration: '1.4s',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
