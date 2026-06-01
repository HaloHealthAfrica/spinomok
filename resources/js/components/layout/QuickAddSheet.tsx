import React from 'react';
import { router } from '@inertiajs/react';
import { Milk, ClipboardList, Heart, PawPrint, Syringe, Baby } from 'lucide-react';
import { clsx } from 'clsx';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
}

const actions = [
  { label: 'Start Daily Report', icon: ClipboardList, href: '/reports/daily/new',    color: '#1B5E20' },
  { label: 'Record Milk',        icon: Milk,           href: '/milk-records/create',  color: '#007AFF' },
  { label: 'Health Event',       icon: Heart,          href: '/health/create',        color: '#FF3B30' },
  { label: 'Record AI Service',  icon: Syringe,        href: '/breeding/ai/new',      color: '#AF52DE' },
  { label: 'Record Calving',     icon: Baby,           href: '/breeding/calving/new', color: '#34C759' },
  { label: 'Add Animal',         icon: PawPrint,       href: '/animals/new',          color: '#FF9500' },
];

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  if (!open) return null;

  const navigate = (href: string) => {
    onClose();
    router.visit(href);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Quick add"
        aria-modal="true"
        className="fixed bottom-0 inset-x-0 z-50 px-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div
          className="bg-white rounded-[14px] overflow-hidden mb-3"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        >
          <div className="px-4 pt-4 pb-3 text-center border-b border-[rgba(60,60,67,0.10)]">
            <p className="text-[13px]" style={{ color: 'rgba(60,60,67,0.5)' }}>Quick Add</p>
          </div>

          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className={clsx(
                  'w-full flex items-center gap-4 px-4 py-3.5 text-left min-h-[56px]',
                  'active:bg-[rgba(0,0,0,0.04)] transition-colors duration-75',
                  i > 0 && 'border-t border-[rgba(60,60,67,0.10)]',
                )}
              >
                <div
                  className="h-[36px] w-[36px] rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ background: `${action.color}18` }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: action.color }} strokeWidth={1.8} />
                </div>
                <span className="text-[17px] text-black">{action.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full h-[56px] bg-white rounded-[14px] text-[17px] font-semibold active:bg-[rgba(0,0,0,0.04)] transition-colors duration-75"
          style={{ color: '#1B5E20', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
}

const actions = [
  { label: 'Daily Report', icon: ClipboardList, href: '/reports/daily/new',    color: 'text-primary-900 bg-primary-50' },
  { label: 'Record Milk',  icon: Milk,           href: '/milk-records/create',  color: 'text-blue-700 bg-blue-50' },
  { label: 'Health Event', icon: Heart,           href: '/health/create',        color: 'text-red-700 bg-red-50' },
  { label: 'Record AI',    icon: Syringe,         href: '/breeding/ai/new',      color: 'text-purple-700 bg-purple-50' },
  { label: 'Calving',      icon: Baby,            href: '/breeding/calving/new', color: 'text-green-700 bg-green-50' },
  { label: 'Add Animal',   icon: PawPrint,        href: '/animals/new',          color: 'text-amber-700 bg-amber-50' },
];

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  if (!open) return null;

  const navigate = (href: string) => {
    onClose();
    router.visit(href);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Quick add"
        aria-modal="true"
        className={clsx(
          'fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl pb-safe',
          'transform transition-transform duration-300',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Quick Add</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-8">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-xl p-4',
                  'active:opacity-70 transition-opacity',
                  action.color,
                )}
              >
                <Icon className="h-7 w-7" />
                <span className="text-xs font-medium text-center leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
