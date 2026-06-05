import { InlinePulse, StatusIndicator } from '@/components/ui';
import InfoBanner from '@/components/ui/info-banner';
import { TechStack } from '@/lib/features/review-standards/review-standards';
import { formatTechStackList } from '@/lib/features/review-standards/review-standards-prompt';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolTrace, { type ToolExecution } from './ToolTrace';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTime?: number;
  isStreaming?: boolean;
  aborted?: boolean;
  toolExecutions?: ToolExecution[];
}

interface ChatPanelProps {
  prNumber: number;
  messages: Message[];
  userInput: string;
  aiLoading: boolean;
  aiError: string;
  isAzureConfigured: boolean;
  streamingCharCount: number;
  isStreamActive: boolean;
  showClearConfirm: boolean;
  showQuickReview: boolean;
  detectedTechStacks: TechStack[];
  onUserInputChange: (value: string) => void;
  onSendMessage: () => void;
  onClearChat: () => void;
  onShowClearConfirm: (show: boolean) => void;
  onQuickReview: () => void;
  onDismissQuickReview: (dismissType: 'this-pr' | 'temporary') => void;
}

export default function ChatPanel({
  prNumber,
  messages,
  userInput,
  aiLoading,
  aiError,
  isAzureConfigured,
  streamingCharCount,
  isStreamActive,
  showClearConfirm,
  showQuickReview,
  detectedTechStacks,
  onUserInputChange,
  onSendMessage,
  onClearChat,
  onShowClearConfirm,
  onQuickReview,
  onDismissQuickReview,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debug: Log streaming state changes
  useEffect(() => {
    if (isStreamActive) {
      console.log('[ChatPanel] Streaming active, count:', streamingCharCount);
    }
  }, [isStreamActive, streamingCharCount]);

  return (
    <div className="w-[40%] h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-3 border-b flex items-center justify-between" style={{ flex: 'none', borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          $ reviewd
        </h2>
        {/* Clear chat button - only show if messages exist */}
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            {!showClearConfirm ? (
              <button
                onClick={() => onShowClearConfirm(true)}
                className="text-xs font-mono hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-tertiary)' }}
                title="Clear conversation"
              >
                [clear]
              </button>
            ) : (
              <>
                <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  clear chat?
                </span>
                <button
                  onClick={onClearChat}
                  className="text-xs font-mono hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--diff-deletion)' }}
                >
                  yes
                </button>
                <button
                  onClick={() => onShowClearConfirm(false)}
                  className="text-xs font-mono hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  no
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Context Info */}
      <div className="px-3 py-2 text-xs font-mono border-b" style={{
        backgroundColor: 'var(--surface-raised)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-tertiary)'
      }}>
        [i] context: pr title + description + max 10 files (100 lines each)
      </div>

      {/* Scrollable Chat Messages */}
      <div className="border-t p-3" style={{ flex: '1', minHeight: 0, borderColor: 'var(--border-standard)' }}>
        <div className="space-y-4 custom-scrollbar" style={{ maxHeight: '59vh', overflowY: 'auto' }}>
          {/* Quick Review Prompt - Terminal Style */}
          {showQuickReview && messages.length === 0 && (
            <div className="py-3 font-mono text-sm space-y-1.5">
              <div className="flex items-start gap-2">
                <span style={{ color: 'var(--text-muted)' }}>$</span>
                <div className="flex-1">
                  <div style={{ color: 'var(--text-secondary)' }} className="mb-1">
                    detected {formatTechStackList(detectedTechStacks)} code
                  </div>
                  <button
                    onClick={onQuickReview}
                    disabled={!isAzureConfigured}
                    title={!isAzureConfigured ? 'Configure Azure OpenAI in settings' : 'Check against best practices'}
                    className="hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    reviewd --review-standards
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}> # check against best practices</span>
                </div>
              </div>

              <div className="text-xs" style={{ color: 'var(--text-tertiary)', paddingLeft: '8px' }}>
                <button
                  onClick={() => onDismissQuickReview('this-pr')}
                  className="hover:underline transition-colors"
                >
                  [dismiss]
                </button>
              </div>

              {!isAzureConfigured && (
                <div className="text-xs" style={{ color: 'var(--text-muted)', paddingLeft: '8px' }}>
                  ⚠ configure azure openai in settings
                </div>
              )}
            </div>
          )}

          {messages.length === 0 && !showQuickReview && (
            <div className="text-center py-8 space-y-3">
              {isAzureConfigured ? (
                <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  [reviewd] ready
                </p>
              ) : (
                <>
                  <div className="text-2xl font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                    [⚠]
                  </div>
                  <div className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                    AI not configured
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    Configure Azure OpenAI in{' '}
                    <a
                      href="/settings"
                      className="underline hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      settings
                    </a>
                    {' '}to chat with reviewd
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-1.5">
              {/* Terminal-style message header */}
              <div className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {msg.role === 'user' ? (
                  `$ you@pr-${prNumber}`
                ) : (
                  <>
                    {msg.isStreaming ? (
                      `> reviewd [streaming]`
                    ) : msg.aborted ? (
                      <span style={{ color: 'var(--diff-deletion)' }}>
                        {`> reviewd [✗ ${msg.responseTime?.toFixed(1) || '0.0'}s]`}
                      </span>
                    ) : msg.responseTime ? (
                      `> reviewd [✓ ${msg.responseTime.toFixed(1)}s]`
                    ) : (
                      `> reviewd [✓]`
                    )}
                  </>
                )}
                {' • '}
                {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
              </div>

              {/* Tool Trace - show before AI response */}
              {msg.role === 'assistant' && msg.toolExecutions && msg.toolExecutions.length > 0 && (
                <ToolTrace executions={msg.toolExecutions} />
              )}

              <div
                className="pl-2 text-sm markdown-content"
                style={{
                  borderLeft: msg.role === 'user'
                    ? '2px solid var(--border-standard)'
                    : msg.isStreaming
                      ? '2px dashed var(--border-standard)'
                      : 'none',
                  color: 'var(--text-primary)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  overflowX: 'auto',
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                {/* Blinking cursor during streaming */}
                {msg.isStreaming && <InlinePulse variant="cursor" />}
                {/* Interrupted indicator */}
                {msg.aborted && (
                  <div className="font-mono text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    [interrupted]
                  </div>
                )}
              </div>
            </div>
          ))}

          {aiLoading && !isStreamActive && (
            <div className="flex items-center gap-2">
              <StatusIndicator status="active" pulse label="reviewd connecting..." />
            </div>
          )}

          {isStreamActive && (
            <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              [●] streaming... {streamingCharCount} chars
            </div>
          )}

          {aiError && (
            <InfoBanner type="error" message={aiError} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Chat Input */}
      <div style={{ flex: 'none' }}>
        <div className="border-t p-3" style={{ borderColor: 'var(--border-standard)' }}>
          <textarea
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="$ query..."
            rows={3}
            disabled={!isAzureConfigured || aiLoading}
            className="w-full p-3 rounded border font-mono text-sm resize-none"
            style={{
              borderColor: 'var(--border-standard)',
              backgroundColor: 'var(--surface-base)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isAzureConfigured ? 'Enter to send, Shift+Enter for new line' : 'Configure Azure OpenAI in settings'}
            </span>
            <button
              onClick={onSendMessage}
              disabled={!userInput.trim() || !isAzureConfigured || aiLoading}
              className="px-3 py-1.5 border rounded font-mono text-sm hover:bg-surface-raised transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--border-standard)',
                color: 'var(--text-primary)',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
