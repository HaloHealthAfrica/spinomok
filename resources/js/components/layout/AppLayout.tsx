import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import { PWAInstallBanner } from '@/components/offline/PWAInstallBanner';
import { SyncDrawer } from '@/components/offline/SyncDrawer';
import type { SharedProps } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { registerServiceWorker, getPendingCount } from '@/lib/sync/SyncService';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBottomNav?: boolean;
}

let swRegistered = false;
if (typeof window !== 'undefined' && !swRegistered) {
  swRegistered = true;
  registerServiceWorker().catch(() => null);
}

export function AppLayout({ children, title, showBottomNav = true }: AppLayoutProps) {
  const { auth, sync } = usePage<SharedProps>().props;
  const { setAuth } = useAuthStore();
  const { setPendingCount } = useSyncStore();
  const { pendingCount } = useNetworkStatus();
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false);

  useEffect(() => {
    if (auth?.user) {
      setAuth(auth.user, auth.farm, auth.role, auth.permissions);
    }
  }, [auth, setAuth]);

  useEffect(() => {
    if (sync) setPendingCount(sync.pending_count);
    getPendingCount().then(setPendingCount);
  }, [sync, setPendingCount]);

  return (
    /*
     * iOS app structure:
     *  - body background: #F2F2F7 (grouped background)
     *  - Offline/sync banner at very top
     *  - Scrollable content fills remaining space
     *  - Tab bar fixed at bottom with safe area
     */
    <div className="min-h-dvh flex flex-col" style={{ background: '#F2F2F7' }}>
      {/* System notification banner (offline/sync) */}
      <OfflineBanner onSyncBadgeClick={() => setSyncDrawerOpen(true)} />

      {/* Page content */}
      <main
        className={showBottomNav ? 'flex-1 pb-[calc(49px+env(safe-area-inset-bottom))]' : 'flex-1'}
        id="main-content"
        role="main"
      >
        {title && <title>{title} — SpinoMok FarmOps</title>}
        {children}
      </main>

      {showBottomNav && <BottomNav />}

      {/* PWA install prompt */}
      <PWAInstallBanner />

      {/* Sync drawer */}
      <SyncDrawer open={syncDrawerOpen} onClose={() => setSyncDrawerOpen(false)} />
    </div>
  );
}
