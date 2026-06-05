import { Mission, PullRequest } from '@/lib/types/github';
import InfoBanner from '@/components/ui/info-banner';
import { TerminalLoader } from '@/components/ui';
import MissionCard from './MissionCard';
import { useState, useEffect } from 'react';

// Calculate estimated review time based on missions and risk
function calculateReviewTime(missions: Mission[], riskScore?: number): string {
  if (missions.length === 0) return '~5m';

  // Base time: 5 minutes for orientation
  let timeMinutes = 5;

  // Add time per mission based on priority
  missions.forEach(mission => {
    if (mission.priority === 'high') timeMinutes += 10;
    else if (mission.priority === 'medium') timeMinutes += 5;
    else timeMinutes += 3;
  });

  // Apply risk multiplier
  if (riskScore !== undefined) {
    const riskLevel = riskScore < 4 ? 'low' : riskScore < 7 ? 'medium' : 'high';
    if (riskLevel === 'high') timeMinutes *= 1.5;
    else if (riskLevel === 'medium') timeMinutes *= 1.2;
  }

  const rounded = Math.ceil(timeMinutes);

  // Format: ~Xm or ~Xh Ym
  if (rounded < 60) {
    return `~${rounded}m`;
  } else {
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
  }
}

interface ReviewMissionsPanelProps {
  pr: PullRequest | null;
  missions: Mission[];
  missionsExpanded: boolean;
  missionsLoading: boolean;
  missionsError: string | null;
  missionsGenerated: boolean;
  isAzureConfigured: boolean;
  highPriorityCount: number;
  onToggleMissions: () => void;
  onGenerateMissions: () => void;
  onMissionStatusChange: (missionId: string, status: 'pending' | 'complete' | 'skipped') => void;
  onAskAI: (mission: Mission) => void;
  onJumpToFile: (filename: string, line?: number) => void;
}

export default function ReviewMissionsPanel({
  pr,
  missions,
  missionsExpanded,
  missionsLoading,
  missionsError,
  missionsGenerated,
  isAzureConfigured,
  highPriorityCount,
  onToggleMissions,
  onGenerateMissions,
  onMissionStatusChange,
  onAskAI,
  onJumpToFile,
}: ReviewMissionsPanelProps) {
  // Step progression for loading animation
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!missionsLoading) {
      setCurrentStep(0);
      return;
    }

    // Simulate step progression
    const timer1 = setTimeout(() => setCurrentStep(1), 800);
    const timer2 = setTimeout(() => setCurrentStep(2), 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [missionsLoading]);
  return (
    <div className="border-b p-3" style={{ borderColor: 'var(--border-subtle)', borderBottom: 'none' }}>
      <button
        onClick={onToggleMissions}
        className="flex items-center justify-between w-full mb-2 text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {missionsExpanded ? '[−]' : '[+]'}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Review Focus
          </span>
          {missions.length > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
            }}>
              {missions.length}
            </span>
          )}
        </div>
        {missions.length > 0 && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {calculateReviewTime(missions, pr?.risk_score)}
          </span>
        )}
      </button>

      {missionsExpanded && (
        <div className="custom-scrollbar" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {/* Not yet generated - show Generate button */}
          {!missionsGenerated && missions.length === 0 && !missionsLoading && (
            <div className="text-center py-4">
              {pr?.review_status === 'merged' || pr?.state === 'closed' ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No missions for merged/closed PRs
                </p>
              ) : (
                <>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    AI-powered review guidance
                  </p>
                  <button
                    onClick={onGenerateMissions}
                    disabled={!isAzureConfigured}
                    className="px-4 py-2 border rounded font-mono text-sm hover:bg-surface-raised transition-colors disabled:opacity-50"
                    style={{
                      borderColor: 'var(--border-standard)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Generate Missions
                  </button>
                  {!isAzureConfigured && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      Configure Azure OpenAI in settings
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Generated with 0 missions - show clean PR message */}
          {missionsGenerated && missions.length === 0 && !missionsLoading && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">
                <span className="text-2xl" style={{ color: 'var(--status-approved)' }}>✓</span>
              </div>
              <p className="text-sm font-mono mb-2" style={{ color: 'var(--status-approved)' }}>
                PR looks clean
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                No critical concerns found in this review
              </p>
              {!(pr?.review_status === 'merged' || pr?.state === 'closed') && (
                <button
                  onClick={onGenerateMissions}
                  className="text-xs font-mono px-3 py-1 border rounded hover:bg-surface-raised transition-colors"
                  style={{
                    borderColor: 'var(--border-standard)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Regenerate
                </button>
              )}
            </div>
          )}

          {missionsLoading && (
            <div className="py-6 px-4">
              <TerminalLoader
                steps={[
                  `$ analyzing ${pr?.changed_files || 0} files`,
                  '$ identifying patterns',
                  '$ generating review guidance'
                ]}
                currentStep={currentStep}
              />
            </div>
          )}

          {missionsError && (
            <InfoBanner type="error" message={missionsError} />
          )}

          {missions.length > 0 && (
            <>
              {highPriorityCount > 0 && (
                <div className="text-xs mb-2 font-mono" style={{ color: '#ef4444' }}>
                  {highPriorityCount} high priority
                </div>
              )}
              <div className="space-y-2 mb-2">
                {missions.map(mission => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onStatusChange={(status) => onMissionStatusChange(mission.id, status)}
                    onAskAI={() => onAskAI(mission)}
                    onJumpToFile={() => onJumpToFile(mission.file, mission.line)}
                  />
                ))}
              </div>
              {!(pr?.review_status === 'merged' || pr?.state === 'closed') && (
                <button
                  onClick={onGenerateMissions}
                  className="w-full px-3 py-2 border rounded font-mono text-xs hover:bg-surface-raised transition-colors"
                  style={{
                    borderColor: 'var(--border-standard)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Regenerate Missions
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!missionsExpanded && missions.length > 0 && (
        <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {highPriorityCount > 0 && `${highPriorityCount} high priority`}
        </div>
      )}
    </div>
  );
}
