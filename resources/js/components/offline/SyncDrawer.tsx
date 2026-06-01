import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, X, Wifi, WifiOff, Clock } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { runSync, getPendingCount } from '@/lib/sync/SyncService';
import { db } from '@/lib/db/database';
import { clsx } from 'clsx';
import { formatDate } from '@/utils/format';

interface SyncDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SyncDrawer({ open, onClose }: SyncDrawerProps) {
  const { isOnline, connectionType, isSyncing, pendingCount, lastSyncedAt } = useNetworkStatus();
  const [queueItems, setQueueItems] = useState<Awaited<ReturnType<typeof db.syncQueue.toArray>>>([]);
  const [failedItems, setFailedItems] = useState<typeof queueItems>([]);

  useEffect(() => {
    if (!open) return;
    db.syncQueue.toArray().then(items => {
      setQueueItems(items.filter(i => i.status === 'pending'));
      setFailedItems(items.filter(i => i.status === 'failed'));
    });
  }, [open, pendingCount]);

  const handleSyncNow = async () => {
    await runSync();
    const pending = await getPendingCount();
    useSyncStore.getState().setPendingCount(pending);
  };

  const clearFailed = async () => {
    await db.syncQueue.where('status').equals('failed').delete();
    setFailedItems([]);
  };

  if (!open) return null;

  const connectionLabel: Record<string, string> = {
    '4g': '4G / WiFi', '3g': '3G', '2g': '2G', 'slow-2g': 'Slow 2G', 'unknown': 'Connected',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Sync Status</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 pb-safe max-h-[70vh] overflow-y-auto">
          {/* Connection status */}
          <div className={clsx('flex items-center gap-3 rounded-xl p-3', isOnline ? 'bg-green-50' : 'bg-red-50')}>
            {isOnline
              ? <Wifi className="h-5 w-5 text-green-600 flex-shrink-0" />
              : <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0" />
            }
            <div>
              <p className={clsx('text-sm font-semibold', isOnline ? 'text-green-800' : 'text-red-800')}>
                {isOnline ? connectionLabel[connectionType] ?? 'Online' : 'Offline'}
              </p>
              {lastSyncedAt && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last synced: {new Date(lastSyncedAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Sync summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-800">{pendingCount}</p>
              <p className="text-xs text-amber-600">Pending</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-red-800">{failedItems.length}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-0.5" />
              <p className="text-xs text-green-600">Synced</p>
            </div>
          </div>

          {/* Sync Now button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
              isSyncing || !isOnline
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-900 text-white',
            )}
          >
            <RefreshCw className={clsx('h-4 w-4', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Syncing…' : !isOnline ? 'Offline — Cannot Sync' : 'Sync Now'}
          </button>

          {/* Pending items */}
          {queueItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Pending ({queueItems.length})</p>
              <div className="space-y-1.5">
                {queueItems.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-800 flex-1 capitalize">{item.operation} {item.entity.replace('_', ' ')}</p>
                    <p className="text-[10px] text-amber-500">{item.attemptCount} attempts</p>
                  </div>
                ))}
                {queueItems.length > 5 && (
                  <p className="text-xs text-gray-400 text-center">+ {queueItems.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Failed items */}
          {failedItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Failed ({failedItems.length})</p>
                <button onClick={clearFailed} className="text-xs text-red-500 font-medium">Clear all</button>
              </div>
              <div className="space-y-1.5">
                {failedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-red-800 capitalize">{item.operation} {item.entity.replace('_', ' ')}</p>
                      {item.error && <p className="text-[10px] text-red-500 truncate">{item.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storage estimate */}
          <StorageEstimate />
        </div>
      </div>
    </>
  );
}

function StorageEstimate() {
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) return;
    navigator.storage.estimate().then(est => {
      if (est.usage && est.quota) {
        setStorage({ used: est.usage, quota: est.quota });
      }
    });
  }, []);

  if (!storage) return null;

  const usedMB  = Math.round(storage.used / 1024 / 1024);
  const quotaMB = Math.round(storage.quota / 1024 / 1024);
  const pct     = Math.round((storage.used / storage.quota) * 100);

  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Local Storage</span>
        <span>{usedMB} MB / {quotaMB} MB ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
