import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Never block UI — only show a small non-intrusive chip in the More page
  // The banner was overlapping action buttons on Breeding and other pages.
  // PWA install is accessible via Settings > Sync Status instead.
  if (isInstalled || dismissed || !canInstall) return null;

  // Render as a very small, non-fixed top notice (not overlapping any buttons)
  return (
    <div className="mx-4 mb-2 bg-primary-900 rounded-xl px-4 py-2.5 flex items-center gap-3">
      <span className="text-sm text-white flex-1">📲 Install FarmOps for faster access</span>
      <button
        onClick={install}
        className="h-7 px-3 bg-accent-500 text-white rounded-full text-xs font-semibold"
      >
        Install
      </button>
      <button onClick={() => setDismissed(true)} className="text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
