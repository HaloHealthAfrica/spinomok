import React from 'react';
import { router } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft } from 'lucide-react';

export default function FarmSettings() {
  return (
    <AppLayout title="Farm Settings" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/more')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Farm Settings</h1>
        </div>
      </div>
      <div className="px-4 py-12 text-center">
        <p className="text-4xl mb-3">⚙️</p>
        <h2 className="text-lg font-bold text-gray-900">Farm Configuration</h2>
        <p className="text-sm text-gray-500 mt-2">Coming soon — farm name, WhatsApp number, pricing defaults</p>
      </div>
    </AppLayout>
  );
}
