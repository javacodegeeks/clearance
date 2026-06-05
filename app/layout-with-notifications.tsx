'use client';

import React, { useState, useCallback } from 'react';
import { NotificationQueue, type Notification } from '@/components/layout';
import { missionGeneratorWorker } from '@/lib/features/missions/mission-generator-worker';

export function LayoutWithNotifications({ children }: { children: React.ReactNode }) {
  const [addNotificationCallback, setAddNotificationCallback] = useState<((n: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) => void) | null>(null);

  const handleAddNotification = useCallback((callback: (n: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) => void) => {
    setAddNotificationCallback(() => callback);

    // Wire up the mission generator worker to use this notification callback
    missionGeneratorWorker.setNotificationCallback((notification) => {
      callback({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        details: notification.details,
        actions: notification.actions,
        autoDismiss: notification.type === 'success'
      });
    });
  }, []);

  return (
    <>
      {children}
      <NotificationQueue onAddNotification={handleAddNotification} />
    </>
  );
}
