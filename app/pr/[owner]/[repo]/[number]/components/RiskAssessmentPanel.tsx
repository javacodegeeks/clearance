import { PullRequest } from '@/lib/types/github';
import { EnhancedRiskBreakdown } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import RiskBreakdownPanel from '@/components/features/risk-assessment/risk-breakdown-panel';
import { LoadingSpinner } from '@/components/ui';

interface RiskAssessmentPanelProps {
  pr: PullRequest;
  riskExpanded: boolean;
  enhancedRisk: EnhancedRiskBreakdown | null;
  riskBreakdownLoading: boolean;
  riskBreakdownError: string | null;
  onToggleRisk: () => void;
}

export default function RiskAssessmentPanel({
  pr,
  riskExpanded,
  enhancedRisk,
  riskBreakdownLoading,
  riskBreakdownError,
  onToggleRisk,
}: RiskAssessmentPanelProps) {
  return (
    <div className="border-b p-3" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        onClick={onToggleRisk}
        className="flex items-center justify-between w-full mb-2 text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {riskExpanded ? '[−]' : '[+]'}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Risk Assessment
          </span>
        </div>
      </button>

      {riskExpanded && (
        <div>
          {riskBreakdownLoading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" label="analyzing risk..." />
            </div>
          )}

          {riskBreakdownError && (
            <div
              className="text-xs font-mono p-2 rounded"
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #dc2626',
              }}
            >
              {riskBreakdownError}
            </div>
          )}

          {enhancedRisk && !riskBreakdownLoading && !riskBreakdownError && (
            <RiskBreakdownPanel breakdown={enhancedRisk} />
          )}
        </div>
      )}
    </div>
  );
}
