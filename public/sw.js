/**
 * SpinoMok FarmOps - Service Worker
 * Offline-first PWA for Kenyan dairy farms
 *
 * Strategy summary:
 *   - App shell (HTML/CSS/JS bundles) - Cache First (pre-cached at install)
 *   - API reads - Network First with 4s timeout, then IndexedDB fallback
 *   - Images - Cache First, 30-day expiry, max 100 entries
 *   - Fonts - Cache First, 1-year expiry
 *   - Offline mutations - Background Sync queue
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE   = `spinomok-shell-${CACHE_VERSION}`;
const API_CACHE     = `spinomok-api-${CACHE_VERSION}`;
const IMAGE_CACHE   = `spinomok-images-${CACHE_VERSION}`;
const FONT_CACHE    = `spinomok-fonts-${CACHE_VERSION}`;

const SYNC_TAG      = 'spinomok-sync';

// Shell resources to pre-cache
// Populated by Vite build; for now we cache the root and known static paths
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS.filter(u => !u.includes('undefined'))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install if offline.html isn't there yet
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('spinomok-') && ![SHELL_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch interception
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension URLs
  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Fonts (Google Fonts, local)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(cacheFirst(request, FONT_CACHE, 365 * 24 * 60 * 60));
    return;
  }

  // Vite build assets (content-hashed, safe to cache forever)
  if (url.pathname.startsWith('/build/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE, 365 * 24 * 60 * 60));
    return;
  }

  // Images
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 30 * 24 * 60 * 60, 100));
    return;
  }

  // API responses - Network First with 4s timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 4000));
    return;
  }

  // Inertia navigation - Network First, fall back to app shell
  if (request.headers.get('X-Inertia')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/') || caches.match('/offline.html'))
    );
    return;
  }

  // HTML navigation - Network First, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request) ||
          caches.match('/') ||
          caches.match('/offline.html')
        )
    );
    return;
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // The actual queue processing happens in the app via the SyncService.
  // Here we just notify all clients that connectivity has returned.
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type: 'SYNC_AVAILABLE' }));
}

// Push notification display. Device subscription is disabled until backend push support exists.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SpinoMok FarmOps', body: event.data.text(), data: {} };
  }

  const { title, body, icon, badge, tag, requireInteraction, data, actions } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'SpinoMok FarmOps', {
      body:             body || '',
      icon:             icon || '/icons/icon.svg',
      badge:            badge || '/icons/icon.svg',
      tag:              tag || 'spinomok-general',
      requireInteraction: requireInteraction || false,
      vibrate:          [200, 100, 200],
      data:             data || {},
      actions:          actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.action_url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existingClient = clients.find(c => c.url.includes(self.location.origin));
        if (existingClient) {
          existingClient.focus();
          existingClient.navigate(actionUrl);
        } else {
          self.clients.openWindow(actionUrl);
        }
      })
  );
});

// Message handler (from app)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }
});

// Cache strategy helpers

async function cacheFirst(request, cacheName, maxAgeSeconds, maxEntries = 500) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  if (cached) {
    // Check age
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      if (age < maxAgeSeconds) return cached;
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      // Prune if needed
      if (maxEntries) pruneCache(cache, maxEntries);
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  const networkPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeoutMs)
  );

  try {
    return await Promise.race([networkPromise, timeoutPromise]);
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function pruneCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(k => cache.delete(k)));
  }
}
