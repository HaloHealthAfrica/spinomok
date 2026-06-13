/**
 * SpinoMok FarmOps - Offline Sync Service
 *
 * Orchestrates all offline-to-online data movement:
 *   PUSH: Drains the IndexedDB sync queue to the server API
 *   PULL: Delta-fetches server changes since last sync per entity
 *
 * Triggered by:
 *   - window 'online' event
 *   - Service Worker 'SYNC_AVAILABLE' message
 *   - App launch (if > 5 min since last sync)
 *   - User taps "Sync Now"
 */

import axios from 'axios';
import { db, type DBAlert, type DBAnimal, type DBMilkRecord } from '@/lib/db/database';
import { useSyncStore } from '@/stores/syncStore';

const ENTITY_ENDPOINTS: Record<string, string> = {
  milk_records:        '/api/v1/milk-records',
};

const PULL_ENDPOINTS: Record<string, string> = {
  animals:        '/api/v1/sync/animals',
  milk_records:   '/api/v1/sync/milk-records',
  alerts:         '/api/v1/sync/alerts',
};

let syncInProgress = false;

/**
 * Register service worker and wire up message listeners.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Registered, scope:', reg.scope);

    // Listen for SW messages (connectivity restored, skip waiting)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_AVAILABLE') {
        runSync();
      }
    });

    // Register periodic background sync (Chrome only)
    if ('periodicSync' in reg) {
      try {
        await (reg as ServiceWorkerRegistration & {
          periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> }
        }).periodicSync.register('spinomok-periodic-sync', { minInterval: 60 * 60 * 1000 });
      } catch {
        // Not supported or permission denied.
      }
    }
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
  }
}

/**
 * Main sync runner - called whenever connectivity is detected.
 * Uses a lock to prevent concurrent runs.
 */
export async function runSync(): Promise<void> {
  if (syncInProgress || !navigator.onLine) return;

  syncInProgress = true;
  const store = useSyncStore.getState();
  store.setSyncing(true);

  try {
    // 1. PUSH: Send all queued offline operations
    await pushQueue();

    // 2. PULL: Fetch delta updates from server (animals + alerts)
    await pullDeltaUpdates();

    // Update last sync timestamp
    await db.syncMeta.put({ id: 'last_sync', lastSyncedAt: new Date().toISOString() });
    store.setLastSyncedAt(new Date().toISOString());
    store.setPendingCount(0);

    // Notify service worker to cache updated pages
    localStorage.setItem('spinomok_last_sync', new Date().toISOString());

  } catch (err) {
    console.error('[Sync] Failed:', err);
  } finally {
    syncInProgress = false;
    store.setSyncing(false);

    // Update pending count from queue
    const pending = await db.syncQueue.where('status').equals('pending').count();
    useSyncStore.getState().setPendingCount(pending);
  }
}

/**
 * PUSH phase: process queued operations FIFO.
 */
async function pushQueue(): Promise<void> {
  const queue = await db.syncQueue
    .where('status').equals('pending')
    .sortBy('createdAt');

  for (const op of queue) {
    try {
      const endpoint = ENTITY_ENDPOINTS[op.entity];
      if (!endpoint) continue;

      let response;
      switch (op.operation) {
        case 'CREATE':
          response = await axios.post(endpoint, op.payload);
          break;
        case 'UPDATE':
          response = await axios.put(`${endpoint}/${op.entityId}`, op.payload);
          break;
        case 'DELETE':
          response = await axios.delete(`${endpoint}/${op.entityId}`);
          break;
      }

      if (response?.status && response.status < 300) {
        if (op.entity === 'milk_records') {
          await db.milkRecords.update(op.entityId, {
            syncStatus: 'synced',
            locallyModifiedAt: null,
          });
        }
        await db.syncQueue.delete(op.id);
        useSyncStore.getState().decrementPending();
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;

      if (status === 409) {
        // Conflict - store for user resolution
        await db.syncQueue.update(op.id, { status: 'failed', error: 'Conflict with server version' });
      } else if (status && status >= 400 && status < 500) {
        // Client error - mark failed permanently
        await db.syncQueue.update(op.id, {
          status: 'failed',
          error: `Server rejected: ${status}`,
        });
      } else {
        // Network/server error - retry later (update attempt count)
        await db.syncQueue.update(op.id, {
          attemptCount: (op.attemptCount || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    }
  }
}

/**
 * PULL phase: fetch records updated since last sync per entity.
 */
async function pullDeltaUpdates(): Promise<void> {
  for (const [entity, endpoint] of Object.entries(PULL_ENDPOINTS)) {
    try {
      const meta = await db.syncMeta.get(entity);
      const since = meta?.lastSyncedAt ?? '2020-01-01T00:00:00Z';

      const { data } = await axios.get(endpoint, { params: { since } });

      if (data?.data) {
        await upsertToIndexedDB(entity, data.data);
        await db.syncMeta.put({ id: entity, lastSyncedAt: new Date().toISOString() });
      }
    } catch {
      // Non-critical - skip this entity, try next
    }
  }
}

/**
 * Upsert records from server into the appropriate IndexedDB store.
 */
async function upsertToIndexedDB(entity: string, records: unknown[]): Promise<void> {
  switch (entity) {
    case 'animals':
      await db.animals.bulkPut(
        records.map((r: unknown) => ({ ...(r as DBAnimal), syncStatus: 'synced' as const, locallyModifiedAt: null }))
      );
      break;
    case 'alerts':
      await db.alerts.bulkPut(
        records.map((r: unknown) => ({ ...(r as DBAlert), syncStatus: 'synced' as const }))
      );
      break;
    case 'milk_records':
      await db.milkRecords.bulkPut(
        records.map((r: unknown) => ({ ...(r as DBMilkRecord), syncStatus: 'synced' as const, locallyModifiedAt: null }))
      );
      break;
    default:
      break;
  }
}

/**
 * Enqueue an offline operation for later sync.
 */
export async function enqueueOperation(
  entity: string,
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): Promise<void> {
  const id = crypto.randomUUID();
  await db.syncQueue.add({
    id,
    entity,
    entityId,
    operation,
    payload,
    attemptCount: 0,
    lastAttemptAt: null,
    createdAt: new Date().toISOString(),
    status: 'pending',
    error: null,
  });
  useSyncStore.getState().incrementPending();

  // Register background sync with service worker
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
      .sync.register('spinomok-sync').catch(() => null);
  }
}

/**
 * Get count of pending items in the sync queue.
 */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.where('status').equals('pending').count();
}
