// Browser notification service for code governance

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export class NotificationService {
  private static instance: NotificationService | null = null;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.log('[NotificationService] Notifications not supported');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('[NotificationService] Permission:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('[NotificationService] Error requesting permission:', error);
      return 'denied';
    }
  }

  async show(options: NotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[NotificationService] Notifications not supported');
      return false;
    }

    if (this.permission !== 'granted') {
      console.log('[NotificationService] Permission not granted');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon.png',
        badge: options.badge || '/badge.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: false, // Auto-close after default timeout
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('[NotificationService] Error showing notification:', error);
      return false;
    }
  }

  async notifyViolation(params: {
    prNumber: number;
    owner: string;
    repo: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }): Promise<boolean> {
    const { prNumber, owner, repo, severity, message } = params;

    const severityEmoji = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : 'ℹ️';
    const title = `${severityEmoji} Code Governance Alert`;
    const body = `PR #${prNumber} (${owner}/${repo})\n${message}`;

    return this.show({
      title,
      body,
      tag: `pr-${owner}-${repo}-${prNumber}`,
      data: { prNumber, owner, repo, severity },
    });
  }

  async notifyScanComplete(params: {
    prNumber: number;
    owner: string;
    repo: string;
    violationCount: number;
  }): Promise<boolean> {
    const { prNumber, owner, repo, violationCount } = params;

    const title = violationCount === 0 ? '✓ Code Scan Complete' : '⚠️ Code Scan Complete';
    const body =
      violationCount === 0
        ? `PR #${prNumber} (${owner}/${repo})\nNo violations found`
        : `PR #${prNumber} (${owner}/${repo})\n${violationCount} violation${violationCount !== 1 ? 's' : ''} detected`;

    return this.show({
      title,
      body,
      tag: `scan-${owner}-${repo}-${prNumber}`,
      data: { prNumber, owner, repo, violationCount },
    });
  }

  async showStalePRAlert(pr: { number: number; title: string; repository: string }, hours: number): Promise<boolean> {
    return this.show({
      title: `⏱ Stale PR #${pr.number}`,
      body: `${pr.title} — no activity for ${hours}h (${pr.repository})`,
      tag: `stale-${pr.repository}-${pr.number}`,
      data: { prNumber: pr.number, repository: pr.repository },
    });
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
