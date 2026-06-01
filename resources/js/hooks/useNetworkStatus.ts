import { useEffect, useState, useCallback } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { runSync } from '@/lib/sync/SyncService';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  dataSaver: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<NetworkStatus['connectionType']>('unknown');
  const [dataSaver, setDataSaver] = useState(false);

  const { isSyncing, pendingCount, lastSyncedAt, setOnline } = useSyncStore();

  const updateConnectionInfo = useCallback(() => {
    const conn = (navigator as Navigator & {
      connection?: { effectiveType: string; saveData: boolean };
    }).connection;

    if (conn) {
      const type = conn.effectiveType as NetworkStatus['connectionType'];
      setConnectionType(type ?? 'unknown');
      setDataSaver(conn.saveData ?? false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOnline(true);
      updateConnectionInfo();
      // Trigger sync after a brief delay to allow connection to stabilise
      setTimeout(() => runSync(), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateConnectionInfo();

    const conn = (navigator as Navigator & {
      connection?: { addEventListener: (e: string, fn: () => void) => void };
    }).connection;
    conn?.addEventListener('change', updateConnectionInfo);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, updateConnectionInfo]);

  return { isOnline, connectionType, dataSaver, isSyncing, pendingCount, lastSyncedAt };
}
