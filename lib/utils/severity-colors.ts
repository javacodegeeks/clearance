
import type { Violation } from '@/lib/types/sonarqube';

export function getViolationSeverityColor(
  severity: Violation['severity']
): string {
  const colors: Record<Violation['severity'], string> = {
    BLOCKER: '#dc2626',
    CRITICAL: '#ea580c',
    MAJOR: '#f59e0b',
    MINOR: '#3b82f6',
    INFO: 'var(--text-muted)',
  };
  return colors[severity] ?? 'var(--text-secondary)';
}

export function getViolationTypeIcon(type: Violation['type']): string {
  const icons: Record<Violation['type'], string> = {
    BUG: '🐛',
    VULNERABILITY: '🔒',
    CODE_SMELL: '💨',
    SECURITY_HOTSPOT: '🔥',
  };
  return icons[type] ?? '•';
}

export function getPatternSeverityColor(
  severity: 'high' | 'medium' | 'low'
): string {
  const colors: Record<'high' | 'medium' | 'low', string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#3b82f6',
  };
  return colors[severity] ?? 'var(--text-secondary)';
}
