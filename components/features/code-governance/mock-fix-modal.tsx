'use client';

import { useState, useEffect } from 'react';
import type { Violation } from '@/lib/services/code-governance/types';
import { generateMockFix, type MockFix } from '@/lib/services/code-governance/mock-fix-generator';
import { getViolationSeverityColor } from '@/lib/utils/severity-colors';

interface MockFixModalProps {
  violation: Violation;
  onClose: () => void;
}

type ModalState = 'generating' | 'showing' | 'applied';

export default function MockFixModal({ violation, onClose }: MockFixModalProps) {
  const [state, setState] = useState<ModalState>('generating');
  const [fix, setFix] = useState<MockFix | null>(null);
  const [generatingText, setGeneratingText] = useState('');

  // Simulate fix generation with typewriter effect
  useEffect(() => {
    const steps = [
      { text: '$ analyzing violation...', delay: 0 },
      { text: '$ scanning codebase patterns...', delay: 600 },
      { text: '$ generating fix...', delay: 1200 },
      { text: '$ validating solution...', delay: 1800 }
    ];

    const timeouts: NodeJS.Timeout[] = [];

    steps.forEach(step => {
      const timeout = setTimeout(() => {
        setGeneratingText(step.text);
      }, step.delay);
      timeouts.push(timeout);
    });

    // Generate the fix and transition to showing state
    const finalTimeout = setTimeout(() => {
      const generatedFix = generateMockFix(violation);
      setFix(generatedFix);
      setState('showing');
    }, 2000);
    timeouts.push(finalTimeout);

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [violation]);

  const handleApply = () => {
    setState('applied');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getConfidenceColor = (confidence: MockFix['confidence']) => {
    switch (confidence) {
      case 'high':
        return '#059669';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#dc2626';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto border rounded font-mono"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-default)',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              [AI FIX GENERATOR]
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded border"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                color: '#3b82f6'
              }}
            >
              DEMO MODE
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1 rounded hover:opacity-70 transition-opacity"
            style={{
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            [close ×]
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Violation Info */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                $ rule:
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {violation.rule}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: getViolationSeverityColor(violation.severity)
                }}
              >
                {violation.severity}
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>$ message:</span> {violation.message}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              $ {violation.component}:{violation.line || '?'}
            </div>
          </div>

          {/* Generating State */}
          {state === 'generating' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative inline-block">
                {/* Scanline animation */}
                <div
                  className="w-16 h-16 rounded border-2 relative overflow-hidden"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: 'linear-gradient(transparent 0%, var(--text-primary) 50%, transparent 100%)',
                      animation: 'scan 2s linear infinite'
                    }}
                  />
                  <style jsx>{`
                    @keyframes scan {
                      0% { transform: translateY(-100%); }
                      100% { transform: translateY(200%); }
                    }
                  `}</style>
                </div>
              </div>
              <div className="text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>
                {generatingText}
              </div>
            </div>
          )}

          {/* Showing Fix State */}
          {state === 'showing' && fix && (
            <div className="space-y-6">
              {/* Fix Title and Confidence */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fix.title}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${getConfidenceColor(fix.confidence)}20`,
                      color: getConfidenceColor(fix.confidence)
                    }}
                  >
                    {fix.confidence} confidence
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    (~{fix.timeSaved} saved)
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {fix.explanation}
                </p>
              </div>

              {/* Before Code */}
              <div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 border-b"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                    [− BEFORE]
                  </span>
                </div>
                <div
                  className="p-4 overflow-x-auto border-b"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <pre className="text-xs leading-relaxed">
                    <code style={{ color: 'var(--text-secondary)' }}>
                      {highlightSyntax(fix.beforeCode)}
                    </code>
                  </pre>
                </div>
              </div>

              {/* After Code */}
              <div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 border-b"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#059669' }}>
                    [+ AFTER]
                  </span>
                </div>
                <div
                  className="p-4 overflow-x-auto border-b"
                  style={{
                    backgroundColor: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <pre className="text-xs leading-relaxed">
                    <code style={{ color: 'var(--text-secondary)' }}>
                      {highlightSyntax(fix.afterCode)}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Demo Warning */}
              <div
                className="px-4 py-3 rounded border text-xs"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">[DEMO MODE]</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    This is a demonstration. No actual code will be modified.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleApply}
                  className="px-4 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: '#059669',
                    color: 'white'
                  }}
                >
                  [apply fix]
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded text-sm transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  [reject]
                </button>
              </div>
            </div>
          )}

          {/* Applied State */}
          {state === 'applied' && (
            <div className="py-12 text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2"
                style={{ borderColor: '#059669' }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="#059669"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold" style={{ color: '#059669' }}>
                  Fix Applied Successfully
                </div>
                <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  [DEMO - No actual changes made]
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function highlightSyntax(code: string): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    // Keywords
    const keywordRegex = /\b(public|private|protected|static|final|class|interface|extends|implements|return|if|else|for|while|try|catch|finally|throw|new|const|let|var|function|async|await|import|export|from|default|void|int|String|boolean|null)\b/g;

    // Strings
    const stringRegex = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g;

    // Comments
    const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;

    // Numbers
    const numberRegex = /\b(\d+)\b/g;

    let segments: Array<{ text: string; type: string }> = [{ text: line, type: 'normal' }];

    // Apply highlighting in order
    const patterns = [
      { regex: commentRegex, type: 'comment', color: '#6b7280' },
      { regex: stringRegex, type: 'string', color: '#059669' },
      { regex: keywordRegex, type: 'keyword', color: '#3b82f6' },
      { regex: numberRegex, type: 'number', color: '#d97706' }
    ];

    patterns.forEach(({ regex, type, color }) => {
      const newSegments: typeof segments = [];

      segments.forEach(segment => {
        if (segment.type !== 'normal') {
          newSegments.push(segment);
          return;
        }

        let lastIndex = 0;
        const text = segment.text;
        const matches = [...text.matchAll(regex)];

        matches.forEach(match => {
          if (match.index !== undefined && match.index > lastIndex) {
            newSegments.push({ text: text.slice(lastIndex, match.index), type: 'normal' });
          }
          if (match.index !== undefined) {
            newSegments.push({ text: match[0], type });
            lastIndex = match.index + match[0].length;
          }
        });

        if (lastIndex < text.length) {
          newSegments.push({ text: text.slice(lastIndex), type: 'normal' });
        }
      });

      segments = newSegments.length > 0 ? newSegments : segments;
    });

    return (
      <div key={lineIndex} className="flex">
        <span className="inline-block w-10 text-right mr-4 select-none" style={{ color: 'var(--text-muted)' }}>
          {lineIndex + 1}
        </span>
        <span>
          {segments.map((segment, i) => {
            const style: React.CSSProperties = {};

            switch (segment.type) {
              case 'keyword':
                style.color = '#3b82f6';
                style.fontWeight = 'bold';
                break;
              case 'string':
                style.color = '#059669';
                break;
              case 'comment':
                style.color = '#6b7280';
                style.fontStyle = 'italic';
                break;
              case 'number':
                style.color = '#d97706';
                break;
              default:
                style.color = 'var(--text-secondary)';
            }

            return (
              <span key={i} style={style}>
                {segment.text}
              </span>
            );
          })}
        </span>
      </div>
    );
  });
}
