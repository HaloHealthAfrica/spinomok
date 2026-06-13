import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Trash2, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { runSync } from '@/lib/sync/SyncService';
import { db } from '@/lib/db/database';

export default function SyncSettings() {
  const { isOnline, connectionType, isSyncing, lastSyncedAt } = useNetworkStatus();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    refreshStats();
    if ('storage' in navigator) {
      navigator.storage.estimate().then(e => {
        if (e.usage && e.quota) setStorageInfo({ used: e.usage, quota: e.quota });
      });
    }
  }, []);

  const refreshStats = async () => {
    const all     = await db.syncQueue.count();
    const pending = await db.syncQueue.where('status').equals('pending').count();
    const failed  = await db.syncQueue.where('status').equals('failed').count();
    setQueueStats({ total: all, pending, failed });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await runSync();
    await refreshStats();
    setSyncing(false);
  };

  const clearFailed = async () => {
    await db.syncQueue.where('status').equals('failed').delete();
    await refreshStats();
  };

  const clearAll = async () => {
    if (!confirm('Clear all local sync data? This cannot be undone.')) return;
    await db.syncQueue.clear();
    await refreshStats();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  return (
    <AppLayout title="Sync Status" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/more')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Sync Status</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Connection status */}
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Connection Status</p>
          <div className={clsx('flex items-center gap-3 rounded-xl p-3', isOnline ? 'bg-green-50' : 'bg-red-50')}>
            {isOnline
              ? <Wifi className="h-6 w-6 text-green-600" />
              : <WifiOff className="h-6 w-6 text-red-600" />
            }
            <div>
              <p className={clsx('text-sm font-bold', isOnline ? 'text-green-900' : 'text-red-900')}>
                {isOnline ? `Online (${connectionType})` : 'Offline'}
              </p>
              {lastSyncedAt && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Last synced: {new Date(lastSyncedAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          <Button
            fullWidth
            className="mt-3"
            loading={syncing || isSyncing}
            disabled={!isOnline}
            onClick={handleSyncNow}
            leftIcon={<RefreshCw className={clsx('h-4 w-4', (syncing || isSyncing) && 'animate-spin')} />}
          >
            {syncing || isSyncing ? 'Syncingâ€¦' : 'Sync Now'}
          </Button>
        </Card>

        {/* Sync queue */}
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Sync Queue</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Pending', value: queueStats.pending, color: 'bg-amber-50 text-amber-800 border-amber-200' },
              { label: 'Failed', value: queueStats.failed, color: 'bg-red-50 text-red-800 border-red-200' },
              { label: 'Total', value: queueStats.total, color: 'bg-gray-50 text-gray-800 border-gray-200' },
            ].map(s => (
              <div key={s.label} className={clsx('border rounded-xl p-3 text-center', s.color)}>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs">{s.label}</p>
              </div>
            ))}
          </div>
          {queueStats.failed > 0 && (
            <button onClick={clearFailed} className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <Trash2 className="h-3.5 w-3.5" /> Clear {queueStats.failed} failed record(s)
            </button>
          )}
        </Card>

        {/* Push notifications */}
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Push Notifications</p>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Push alerts are not configured
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Farm alerts will appear inside the app for now. Browser push alerts will be available after server push support is configured.
              </p>
            </div>
          </div>
        </Card>

        {/* PWA Install */}
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">App Installation</p>
          {isInstalled ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">Installed âœ“</p>
                <p className="text-xs text-gray-500">FarmOps is installed on this device</p>
              </div>
            </div>
          ) : canInstall ? (
            <>
              <p className="text-sm text-gray-600 mb-3">Install FarmOps on this device for faster loading and a home screen shortcut.</p>
              <Button fullWidth onClick={install} leftIcon={<Download className="h-4 w-4" />}>
                Install FarmOps
              </Button>
            </>
          ) : isIOS ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Install on iPhone / iPad:</p>
              <p>1. Tap the Share button (â†‘) in Safari</p>
              <p>2. Scroll down and tap "Add to Home Screen"</p>
              <p>3. Tap "Add" to confirm</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Open this page in Chrome on Android for the install option.</p>
          )}
        </Card>

        {/* Storage */}
        {storageInfo && (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Local Storage</p>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Used: {formatBytes(storageInfo.used)}</span>
              <span>Available: {formatBytes(storageInfo.quota - storageInfo.used)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full"
                style={{ width: `${Math.min(100, (storageInfo.used / storageInfo.quota) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              FarmOps stores selected synced records locally. Only queued milk entries should be treated as offline-ready in this release.
            </p>
          </Card>
        )}

        {/* Danger zone */}
        <Card padding="md" className="border-red-200">
          <p className="text-sm font-bold text-red-800 mb-3">Data Management</p>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 text-sm text-red-600 font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Clear all pending sync records
          </button>
          <p className="text-xs text-gray-400 mt-1">Only clears the local sync queue. Your farm data on the server is not affected.</p>
        </Card>
      </div>
    </AppLayout>
  );
}
