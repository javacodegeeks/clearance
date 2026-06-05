import { Mission } from '@/lib/types/github';
import {
  getMissionPriorityConfig,
  getMissionStatusConfig,
  getMissionBorderColor,
  getMissionOpacity,
  getMissionBackgroundColor,
} from '@/lib/config/constants/mission-config';

interface MissionCardProps {
  mission: Mission;
  onStatusChange: (status: 'pending' | 'complete' | 'skipped') => void;
  onAskAI: () => void;
  onJumpToFile: () => void;
}

export default function MissionCard({ mission, onStatusChange, onAskAI, onJumpToFile }: MissionCardProps) {
  const priorityConfig = getMissionPriorityConfig(mission.priority);
  const statusConfig = getMissionStatusConfig(mission.status);

  return (
    <div
      className="p-3 rounded border text-sm"
      style={{
        borderColor: getMissionBorderColor(mission),
        backgroundColor: getMissionBackgroundColor(mission),
        opacity: getMissionOpacity(mission),
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-baseline gap-2 font-mono">
          <span style={{ color: priorityConfig.color }}>[{priorityConfig.icon}]</span>
          <span style={{ color: 'var(--text-primary)' }}>{mission.priority.toUpperCase()}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>•</span>
          <span style={{ color: 'var(--text-primary)' }}>{mission.category.toUpperCase().replace('-', ' ')}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {statusConfig.indicator}
        </span>
      </div>

      {/* File Location */}
      <div className="mb-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
        {mission.file}{mission.line && `:${mission.line}`}
      </div>

      {/* Why */}
      <p className="mb-3" style={{ color: 'var(--text-primary)' }}>
        {mission.why}
      </p>

      {/* Tasks */}
      {mission.tasks.length > 0 && (
        <div className="mb-3 space-y-1 text-xs">
          {mission.tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono">→</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onJumpToFile}
          className="px-2 py-1 text-xs font-mono border rounded hover:bg-surface-raised transition-colors"
          style={{
            borderColor: 'var(--border-standard)',
            color: 'var(--text-primary)',
          }}
        >
          Jump to File
        </button>
        <button
          onClick={onAskAI}
          className="px-2 py-1 text-xs font-mono border rounded hover:bg-surface-raised transition-colors"
          style={{
            borderColor: 'var(--border-standard)',
            color: 'var(--text-primary)',
          }}
        >
          Ask reviewd
        </button>
        <button
          onClick={() => onStatusChange(mission.status === 'complete' ? 'pending' : 'complete')}
          className="px-2 py-1 text-xs font-mono border rounded hover:bg-surface-raised transition-colors"
          style={{
            borderColor: 'var(--border-standard)',
            color: mission.status === 'complete' ? 'var(--status-approved)' : 'var(--text-secondary)',
          }}
        >
          {mission.status === 'complete' ? 'Completed' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}
