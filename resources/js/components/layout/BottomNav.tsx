import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard,
  PawPrint,
  Plus,
  BarChart2,
  Ellipsis,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/stores/uiStore';
import { QuickAddSheet } from './QuickAddSheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  pattern: RegExp;
}

const navItems: NavItem[] = [
  { label: 'Home',    href: '/dashboard', icon: LayoutDashboard, pattern: /^\/dashboard/ },
  { label: 'Animals', href: '/animals',   icon: PawPrint,        pattern: /^\/animals/ },
  { label: 'Reports', href: '/reports',   icon: BarChart2,       pattern: /^\/(reports|milk|breeding|health|calves|feed|finance|analytics)/ },
  { label: 'More',    href: '/more',      icon: Ellipsis,        pattern: /^\/more/ },
];

/*
 * Apple-style tab bar:
 *  - Frosted glass background (like iOS tab bar)
 *  - Hair-line top border (separator tint)
 *  - Active tab: filled icon + brand colour label
 *  - Inactive: gray system icon colour
 *  - FAB protrudes above the bar (standard iOS pattern)
 */
export function BottomNav() {
  const { url } = usePage();
  const { openQuickAdd, quickAddOpen, closeQuickAdd } = useUIStore();

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={clsx(
          'fixed bottom-0 inset-x-0 z-40',
          // Frosted glass — same as iOS tab bar
          'bg-[rgba(249,249,249,0.94)]',
          'backdrop-blur-[28px] backdrop-saturate-[180%]',
          '-webkit-backdrop-filter: saturate(180%) blur(28px)',
          // Hair-line separator on top
          'border-t border-[rgba(60,60,67,0.18)]',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-[49px]">  {/* iOS tab bar is 49pt */}
          {/* First two nav items */}
          {navItems.slice(0, 2).map((item) => (
            <NavTab key={item.href} item={item} isActive={item.pattern.test(url)} />
          ))}

          {/* Central FAB */}
          <div className="flex-1 flex justify-center items-center">
            <button
              onClick={openQuickAdd}
              aria-label="Quick add"
              aria-haspopup="dialog"
              className={clsx(
                // Apple-style circular action button
                'h-[56px] w-[56px] rounded-full',
                'bg-brand-900 text-white',
                // Subtle shadow — like iOS action button
                'shadow-[0_4px_16px_rgba(27,94,32,0.40),0_1px_4px_rgba(0,0,0,0.12)]',
                'flex items-center justify-center',
                '-mt-6',  // protrudes above nav bar
                'active:scale-[0.94] transition-transform duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              )}
            >
              <Plus className="h-[26px] w-[26px]" strokeWidth={2.2} />
            </button>
          </div>

          {/* Last two nav items */}
          {navItems.slice(2).map((item) => (
            <NavTab key={item.href} item={item} isActive={item.pattern.test(url)} />
          ))}
        </div>
      </nav>

      <QuickAddSheet open={quickAddOpen} onClose={closeQuickAdd} />
    </>
  );
}

function NavTab({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'flex-1 flex flex-col items-center justify-center gap-[3px]',
        'h-[49px]',
        'transition-colors duration-100',
        'focus-visible:outline-none',
        isActive ? 'text-brand-900' : 'text-[rgba(60,60,67,0.5)]',
      )}
    >
      <Icon
        className={clsx('h-[25px] w-[25px]', isActive && 'drop-shadow-[0_0_6px_rgba(27,94,32,0.3)]')}
        strokeWidth={isActive ? 2.2 : 1.6}
        // iOS uses filled icons for active, outlined for inactive
        fill={isActive ? 'currentColor' : 'none'}
        fillOpacity={isActive ? 0.15 : 0}
      />
      <span
        className={clsx(
          'text-[10px] font-medium tracking-[0.01em]',
          isActive ? 'text-brand-900' : 'text-[rgba(60,60,67,0.5)]',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
