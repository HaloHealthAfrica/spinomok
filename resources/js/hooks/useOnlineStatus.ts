import { useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const setOnline = useSyncStore((s) => s.setOnline);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return isOnline;
}
