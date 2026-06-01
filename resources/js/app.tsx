import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query/queryClient';
import './bootstrap'; // axios / csrf setup

// ── Static glob — Vite resolves all page components at build time ──────────────
// CRITICAL: must use import.meta.glob, NOT dynamic template literals.
// Template literals (`import(\`./pages/${name}.tsx\`)`) prevent Vite from
// statically analysing the import graph → no chunks emitted → blank page.
const pages = import.meta.glob('./pages/**/*.tsx');

// ── Error boundary — catches render errors in production ──────────────────────
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui', color: '#1B5E20' }}>
          <h2>🐄 SpinoMok FarmOps</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Something went wrong. Please refresh the page.
          </p>
          <pre style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
            {(this.state.error as Error).message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createInertiaApp({
  title: (title) => (title ? `${title} — SpinoMok FarmOps` : 'SpinoMok FarmOps'),

  resolve: (name) => {
    const page = pages[`./pages/${name}.tsx`];
    if (!page) throw new Error(`Inertia page not found: ${name}. Check the component path.`);
    return page() as Promise<{ default: unknown }>;
  },

  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App {...props} />
        </QueryClientProvider>
      </AppErrorBoundary>,
    );
  },

  progress: {
    color: '#1B5E20',
    showSpinner: false,
  },
});
