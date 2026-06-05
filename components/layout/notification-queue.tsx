'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'activity';
  title: string;
  message?: string;
  details?: string;
  timestamp: number;
  actions?: NotificationAction[];
  autoDismiss?: boolean;
  dismissed: boolean;
}

export interface NotificationAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

const ICON_MAP = {
  success: '+',
  info: 'i',
  warning: '!',
  error: 'x',
  activity: '>'
};

const COLOR_MAP = {
  success: 'var(--status-approved)',
  info: 'var(--text-secondary)',
  warning: '#f59e0b',
  error: 'var(--diff-deletion)',
  activity: '#f59e0b'
};

interface NotificationQueueProps {
  onAddNotification?: (callback: (n: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) => void) => void;
}

export function NotificationQueue({ onAddNotification }: NotificationQueueProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      dismissed: false
    };

    setNotifications(prev => {
      const updated = [...prev, newNotification];
      if (updated.length > 10) {
        return updated.slice(-10);
      }
      return updated;
    });

    if (notification.autoDismiss !== false) {
      setTimeout(() => dismissNotification(id), 10000);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (onAddNotification) {
      onAddNotification(addNotification);
    }
  }, [onAddNotification]);

  useEffect(() => {
    const timer = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setNotifications(prev =>
        prev.filter(n => n.timestamp > fiveMinutesAgo)
      );
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 rounded z-[9999]"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-standard)',
        width: isCollapsed ? 'auto' : '380px',
        maxHeight: isCollapsed ? 'auto' : '500px',
        overflow: isCollapsed ? 'visible' : 'auto'
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
        style={{
          color: 'var(--text-primary)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="font-mono font-medium" style={{ fontSize: '10px' }}>
          {isCollapsed ? `[${notifications.length}]` : 'background'}
        </span>
        <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          {isCollapsed ? '+' : '-'}
        </span>
      </div>

      {!isCollapsed && (
        <div className="px-3 py-2">

      {notifications.map((notification, index) => (
        <div key={notification.id}>
          {index > 0 && (
            <div
              className="h-px my-2"
              style={{
                backgroundColor: 'var(--border-subtle)'
              }}
            />
          )}

          <div className="relative pb-2">
            <button
              onClick={() => dismissNotification(notification.id)}
              className="absolute top-0 right-0 cursor-pointer hover:opacity-70 transition-opacity font-mono"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '9px',
                padding: '0 2px',
                lineHeight: 1
              }}
              aria-label="Dismiss notification"
            >
              x
            </button>

            <div className="flex items-start gap-2 mb-1">
              <span
                className="font-mono flex-shrink-0"
                style={{
                  color: COLOR_MAP[notification.type],
                  fontSize: '10px'
                }}
              >
                [{ICON_MAP[notification.type]}]
              </span>

              <div style={{ flex: 1 }}>
                <div
                  className="font-medium mb-1"
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '10px'
                  }}
                >
                  {notification.title}
                </div>

                {notification.message && (
                  <div
                    className="mb-1"
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '9px',
                      marginBottom: notification.details || notification.actions ? '4px' : 0
                    }}
                  >
                    {notification.message}
                  </div>
                )}

                {notification.details && (
                  <div
                    className="font-mono mb-1"
                    style={{
                      color: 'var(--text-tertiary)',
                      fontSize: '9px',
                      marginBottom: notification.actions ? '6px' : 0
                    }}
                  >
                    {notification.details}
                  </div>
                )}

                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {notification.actions.map((action, actionIndex) => {
                      const isPrimary = action.variant !== 'secondary';
                      return (
                        <button
                          key={actionIndex}
                          onClick={() => {
                            if (action.href) {
                              router.push(action.href);
                            } else if (action.onClick) {
                              action.onClick();
                            }
                            dismissNotification(notification.id);
                          }}
                          className={`font-mono rounded transition-colors ${
                            isPrimary ? 'px-2 py-0.5 font-medium' : 'px-1 py-0.5'
                          }`}
                          style={{
                            fontSize: '9px',
                            backgroundColor: isPrimary ? 'var(--surface-raised)' : 'transparent',
                            border: `1px solid ${isPrimary ? 'var(--border-standard)' : 'transparent'}`,
                            color: isPrimary ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
                            e.currentTarget.style.borderColor = 'var(--border-emphasis)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isPrimary ? 'var(--surface-raised)' : 'transparent';
                            e.currentTarget.style.borderColor = isPrimary ? 'var(--border-standard)' : 'transparent';
                          }}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
        </div>
      )}
    </div>
  );
}
