import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function AlertsIndex() {
  return (
    <AppLayout title="Alerts">
      <div className="px-4 py-8 text-center">
        <p className="text-4xl mb-3">🔔</p>
        <h1 className="text-lg font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Full alerts engine in Phase 3</p>
      </div>
    </AppLayout>
  );
}
