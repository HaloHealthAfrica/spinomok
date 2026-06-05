import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Milk, ClipboardList, Heart, PawPrint, Syringe, Baby, X } from 'lucide-react';
import { clsx } from 'clsx';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
}

const actions = [
  { label: 'Start Daily Report', icon: ClipboardList, href: '/reports/daily/new',    color: '#1B5E20' },
  { label: 'Record Milk',        icon: Milk,           href: '/milk-records/create',  color: '#007AFF' },
  { label: 'Health Event',       icon: Heart,           href: '/health/create',        color: '#FF3B30' },
  { label: 'Record AI Service',  icon: Syringe,         href: '/breeding/ai/new',      color: '#AF52DE' },
  { label: 'Record Calving',     icon: Baby,            href: '/breeding/calving/new', color: '#34C759' },
  { label: 'Add Animal',         icon: PawPrint,        href: '/animals/create',       color: '#FF9500' },
];

const TAP: React.CSSProperties = {
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  cursor: 'pointer',
};

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const navigate = (href: string) => {
    onClose();
    router.visit(href);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        aria-hidden="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Quick add"
        aria-modal="true"
        className="fixed bottom-0 inset-x-0 z-50 px-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-white rounded-[16px] overflow-hidden mb-3"
          style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.20)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(60,60,67,0.10)]">
            <p className="text-[15px] font-semibold text-black">Quick Add</p>
            <button onClick={onClose} style={{ background: 'rgba(120,120,128,0.16)', ...TAP }}
              className="h-7 w-7 rounded-full flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" style={{ color: 'rgba(60,60,67,0.6)' }} />
            </button>
          </div>

          {/* Use native <a> tags so iOS Safari treats as real tappable links */}
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <a
                key={action.href}
                href={action.href}
                onClick={(e) => { e.preventDefault(); navigate(action.href); }}
                className={clsx(
                  'flex items-center gap-4 px-4 min-h-[56px]',
                  'active:bg-[rgba(0,0,0,0.05)]',
                  i > 0 && 'border-t border-[rgba(60,60,67,0.08)]',
                )}
                style={TAP}
              >
                <div className="h-9 w-9 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{ background: `${action.color}1A` }}>
                  <Icon className="h-[18px] w-[18px]" style={{ color: action.color }} strokeWidth={1.8} />
                </div>
                <span className="text-[17px] text-black">{action.label}</span>
              </a>
            );
          })}
        </div>

        <button onClick={onClose} style={{ color: '#1B5E20', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', ...TAP }}
          className="w-full h-[56px] bg-white rounded-[16px] text-[17px] font-semibold active:bg-[rgba(0,0,0,0.04)]">
          Cancel
        </button>
      </div>
    </>
  );
}