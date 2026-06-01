import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query/queryClient';
import './bootstrap';

// Eager load — all pages bundled synchronously, no async import issues.
// This is the most reliable pattern for Inertia v3 + Vite.
const pages = import.meta.glob('./pages/**/*.tsx', { eager: true }) as Record<
  string,
  { default: React.ComponentType }
>;

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, message: e.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui' }}>
          <h1 style={{ color: '#1B5E20' }}>🐄 SpinoMok FarmOps</h1>
          <p style={{ color: '#666' }}>Something went wrong — please refresh.</p>
          <pre style={{ color: '#999', fontSize: 12, marginTop: 16 }}>{this.state.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createInertiaApp({
  title: (title) => title ? `${title} — SpinoMok FarmOps` : 'SpinoMok FarmOps',

  resolve: (name) => {
    const page = pages[`./pages/${name}.tsx`];
    if (!page) {
      console.error(`[Inertia] Page not found: ${name}`, Object.keys(pages));
      throw new Error(`Page not found: ${name}`);
    }
    return page;
  },

  setup({ el, App, props }) {
    createRoot(el).render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App {...props} />
        </QueryClientProvider>
      </ErrorBoundary>,
    );
  },

  progress: { color: '#1B5E20' },
});
