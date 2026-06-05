'use client';

import PRQueue from '@/components/features/pr-queue/pr-queue';
import { LayoutWithNotifications } from './layout-with-notifications';

export default function Home() {
  return (
    <LayoutWithNotifications>
      <div className="container mx-auto h-full py-6 px-6">
        <PRQueue />
      </div>
    </LayoutWithNotifications>
  );
}
