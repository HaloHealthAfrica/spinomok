import React from 'react';
import { router } from '@inertiajs/react';
import { Milk, ClipboardList, Heart, PawPrint, Syringe, Baby } from 'lucide-react';

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
