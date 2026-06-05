// Shared mission configuration constants
// Used across all mission-related components

import type { Mission } from '@/lib/types/github';

export const MISSION_PRIORITY_CONFIG = {
  high: {
    icon: '!',
    color: '#ef4444',
    label: 'HIGH',
    order: 0,
  },
  medium: {
    icon: '●',
    color: '#f59e0b',
    label: 'MEDIUM',
    order: 1,
  },
  low: {
    icon: '○',
    color: '#6b7280',
    label: 'LOW',
    order: 2,
  },
} as const;

export const MISSION_STATUS_CONFIG = {
  pending: {
    indicator: '[·]',
    label: 'Pending',
    order: 0,
  },
  complete: {
    indicator: '[✓]',
    label: 'Complete',
    order: 1,
  },
  skipped: {
    indicator: '[−]',
    label: 'Skipped',
    order: 2,
  },
} as const;

export function getMissionPriorityConfig(priority: Mission['priority']) {
  return MISSION_PRIORITY_CONFIG[priority];
}

export function getMissionStatusConfig(status: Mission['status']) {
  return MISSION_STATUS_CONFIG[status];
}

export function getMissionBorderColor(mission: Mission): string {
  if (mission.status === 'complete') {
    return 'var(--status-approved)';
  }
  return MISSION_PRIORITY_CONFIG[mission.priority].color;
}

export function getMissionOpacity(mission: Mission): number {
  if (mission.status === 'complete') return 0.6;
  if (mission.status === 'skipped') return 0.5;
  return 1;
}

export function getMissionBackgroundColor(mission: Mission): string {
  return mission.status === 'skipped' ? 'var(--surface-base)' : 'transparent';
}

export function sortMissionsByPriority(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => {
    return MISSION_PRIORITY_CONFIG[a.priority].order - MISSION_PRIORITY_CONFIG[b.priority].order;
  });
}

export function sortMissionsByStatus(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => {
    return MISSION_STATUS_CONFIG[a.status].order - MISSION_STATUS_CONFIG[b.status].order;
  });
}
