import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { SharedProps } from '@/types';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

export function FlashToast() {
  const { flash } = usePage<SharedProps>().props;
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const incoming: { type: ToastType; message: string }[] = [];
    if (flash?.success) incoming.push({ type: 'success', message: flash.success });
    if (flash?.error)   incoming.push({ type: 'error',   message: flash.error });
    if (flash?.warning) incoming.push({ type: 'warning', message: flash.warning });

    if (incoming.length === 0) return;

    const newToasts = incoming.map(t => ({ ...t, id: ++toastId }));
    setToasts(prev => [...prev, ...newToasts]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => !newToasts.some(n => n.id === t.id)));
    }, 4000);

    return () => clearTimeout(timer);
  }, [flash?.success, flash?.error, flash?.warning]);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 px-4 pt-safe-top pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg pointer-events-auto',
            'animate-slide-down',
            toast.type === 'success' && 'bg-green-600 text-white',
            toast.type === 'error'   && 'bg-red-600 text-white',
            toast.type === 'warning' && 'bg-amber-500 text-white',
          )}
        >
          <span className="mt-0.5 flex-shrink-0">
            {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {toast.type === 'error'   && <XCircle     className="h-5 w-5" />}
            {toast.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
          </span>
          <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="mt-0.5 flex-shrink-0 opacity-70 active:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
