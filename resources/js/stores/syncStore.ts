import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
  setSyncing: (value: boolean) => void;
  setLastSyncedAt: (ts: string) => void;
  setPendingCount: (n: number) => void;
  setConflictCount: (n: number) => void;
  setOnline: (online: boolean) => void;
  incrementPending: () => void;
  decrementPending: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  conflictCount: 0,
  isOnline: navigator.onLine,

  setSyncing: (value) => set({ isSyncing: value }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  setPendingCount: (n) => set({ pendingCount: n }),
  setConflictCount: (n) => set({ conflictCount: n }),
  setOnline: (online) => set({ isOnline: online }),
  incrementPending: () => set({ pendingCount: get().pendingCount + 1 }),
  decrementPending: () => set({ pendingCount: Math.max(0, get().pendingCount - 1) }),
}));
