import React from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { canInstall, isInstalled, isIOS, showIOSBanner, install, dismissIOSBanner } = usePWAInstall();

  if (isInstalled) return null;

  // iOS install instructions
  if (isIOS && showIOSBanner) {
    return (
      <div className="fixed bottom-20 inset-x-4 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
        <button
          onClick={dismissIOSBanner}
          className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center text-gray-400"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-900 flex items-center justify-center flex-shrink-0 text-2xl">
            🐄
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Install FarmOps</p>
            <p className="text-xs text-gray-500 mt-1">
              Tap{' '}
              <Share className="h-3.5 w-3.5 inline text-blue-500" />
              {' '}then <strong>"Add to Home Screen"</strong> to install.
            </p>
            <p className="text-xs text-primary-700 mt-1 font-medium">
              Works offline in the farm fields ✓
            </p>
          </div>
        </div>
        {/* Arrow pointing up toward share button */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
      </div>
    );
  }

  // Android/Desktop install prompt
  if (canInstall) {
    return (
      <div className="fixed bottom-20 inset-x-4 bg-primary-900 rounded-2xl shadow-xl p-4 z-50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-xl">
          🐄
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold">Install FarmOps</p>
          <p className="text-primary-200 text-xs">Works offline · Fast · Home screen access</p>
        </div>
        <button
          onClick={install}
          className="h-9 px-4 bg-accent-500 text-white rounded-full text-sm font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Download className="h-4 w-4" />
          Install
        </button>
      </div>
    );
  }

  return null;
}
