import { router } from '@inertiajs/react';

/**
 * Navigate back correctly in a PWA/SPA context.
 *
 * Uses history.back() when there is previous history (avoids creating a new
 * forward entry). Falls back to router.visit(fallback) on the first page load
 * or when history is empty (e.g. deep-linked directly).
 *
 * Using router.visit() with { replace: true } as the fallback means we replace
 * the current entry rather than pushing yet another one.
 */
export function goBack(fallback: string = '/dashboard'): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    router.visit(fallback, { replace: true });
  }
}
