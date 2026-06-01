import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query/queryClient';
import './app'; // axios / csrf setup

createInertiaApp({
  title: (title) => (title ? `${title} — SpinoMok FarmOps` : 'SpinoMok FarmOps'),
  resolve: (name) =>
    import(`./pages/${name}.tsx`).then((module) => module.default),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <QueryClientProvider client={queryClient}>
        <App {...props} />
      </QueryClientProvider>,
    );
  },
  progress: {
    color: '#1B5E20',
    showSpinner: false,
  },
});
