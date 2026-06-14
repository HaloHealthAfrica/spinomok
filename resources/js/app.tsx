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
  { hasError: boolean; message: string; stack: string; componentStack: string }
> {
  state = { hasError: false, message: '', stack: '', componentStack: '' };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, message: e.message, stack: e.stack ?? '' };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[FarmOps Error]', error, info);
    this.setState({ componentStack: info.componentStack ?? '' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'system-ui', background: '#fff', minHeight: '100dvh' }}>
          <h1 style={{ color: '#1B5E20', fontSize: 18, marginBottom: 8 }}>FarmOps — App Error</h1>
          <p style={{ color: '#333', marginBottom: 12 }}>
            Something went wrong. Screenshot this page and send to support, then tap Refresh.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}
          >
            Refresh App
          </button>
          <details open style={{ marginTop: 8 }}>
            <summary style={{ color: '#666', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>Error details</summary>
            <pre style={{ color: '#c00', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#fff5f5', padding: 12, borderRadius: 6, border: '1px solid #fcc' }}>
              {this.state.message}{'\n\n'}{this.state.stack}
            </pre>
            <pre style={{ color: '#555', fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f5f5f5', padding: 12, borderRadius: 6, border: '1px solid #ddd', marginTop: 8 }}>
              Component stack:{'\n'}{this.state.componentStack}
            </pre>
          </details>
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
