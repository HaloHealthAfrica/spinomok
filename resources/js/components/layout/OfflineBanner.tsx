import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncStore } from '@/stores/syncStore';
import { clsx } from 'clsx';

interface OfflineBannerProps {
  onSyncBadgeClick?: () => void;
}

/*
 * Apple-style inline system notification bar.
 * Uses system red for offline, system blue for syncing.
 * Matches iOS "no internet connection" banner aesthetic.
 */
export function OfflineBanner({ onSyncBadgeClick }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();
  const { isSyncing, pendingCount } = useSyncStore();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  if (isOnline && (isSyncing || pendingCount > 0)) {
    return (
      <button
        role="status"
        aria-live="polite"
        onClick={onSyncBadgeClick}
        className={clsx(
          'w-full flex items-center gap-2 px-4 py-2',
          'bg-[rgba(0,122,255,0.92)] backdrop-blur-sm text-white',
          'text-[13px] font-medium',
        )}
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span className="flex-1 text-left">
          {isSyncing
            ? `Syncing${pendingCount > 0 ? ` ${pendingCount} record${pendingCount !== 1 ? 's' : ''}` : ''}…`
            : `${pendingCount} pending — tap to view`}
        </span>
      </button>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'w-full flex items-center gap-2 px-4 py-2',
        'bg-[rgba(255,59,48,0.92)] backdrop-blur-sm text-white',
        'text-[13px] font-medium',
      )}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        No internet connection
        {pendingCount > 0 && ` · ${pendingCount} record${pendingCount !== 1 ? 's' : ''} queued`}
      </span>
    </div>
  );
}
