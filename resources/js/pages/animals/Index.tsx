import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, Animal, AnimalStatus } from '@/types';

interface AnimalsIndexProps extends PageProps {
  animals: {
    data: Animal[];
    meta: { total: number; current_page: number; last_page: number };
  };
  filters: { search: string; status: AnimalStatus | '' };
  summary: { total: number; lactating: number; dry: number; pregnant: number; calves: number };
}

const STATUS_FILTERS = [
  { label: 'All',     value: '' as const },
  { label: 'Milking', value: 'lactating' as const },
  { label: 'Dry',     value: 'dry' as const },
  { label: 'Heifers', value: 'heifer' as const },
  { label: 'Calves',  value: 'calf' as const },
];

const STATUS_LABELS: Record<string, string> = {
  lactating: 'Milking', dry: 'Dry', heifer: 'Heifer', calf: 'Calf', bull: 'Bull',
};

export default function AnimalsIndex() {
  const { animals, filters, summary } = usePage<AnimalsIndexProps>().props;
  const [search, setSearch] = useState(filters.search);

  const applyFilter = (newFilters: Partial<typeof filters>) => {
    router.get('/animals', { ...filters, ...newFilters }, {
      preserveState: true, preserveScroll: true, only: ['animals', 'filters'],
    });
  };

  return (
    <AppLayout title="Animals">
      {/* ── Large title header ── */}
      <header className="px-4 pt-[env(safe-area-inset-top)] pt-3 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[34px] font-bold tracking-[-0.5px] text-black">Animals</h1>
          <a
            href="/animals/create"
            onClick={(e) => { e.preventDefault(); router.visit('/animals/create'); }}
            aria-label="Add animal"
            className="h-9 w-9 rounded-full bg-brand-900 flex items-center justify-center shadow-[0_2px_8px_rgba(27,94,32,0.35)]"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
          </a>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
          {[
            { label: 'Total',   value: summary.total,     color: 'rgba(0,0,0,0.6)' },
            { label: 'Milking', value: summary.lactating,  color: '#34C759' },
            { label: 'Dry',     value: summary.dry,        color: 'rgba(0,0,0,0.45)' },
            { label: 'Pregnant',value: summary.pregnant,   color: '#FF9500' },
            { label: 'Calves',  value: summary.calves,     color: '#007AFF' },
          ].map(s => (
            <div
              key={s.label}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: 'rgba(120,120,128,0.12)' }}
            >
              <span className="text-[13px] font-semibold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[13px]" style={{ color: 'rgba(60,60,67,0.5)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Search + filter bar (sticky) ── */}
      <div
        className="px-4 py-2 space-y-2 sticky top-0 z-10"
        style={{ background: 'rgba(242,242,247,0.94)', backdropFilter: 'blur(20px)' }}
      >
        {/* Search field — iOS-style pill */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'rgba(60,60,67,0.4)' }}
          />
          <input
            type="search"
            placeholder="Search animals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => applyFilter({ search })}
            onKeyDown={e => e.key === 'Enter' && applyFilter({ search })}
            className={clsx(
              'w-full h-[36px] pl-9 pr-4 rounded-[10px] text-[15px]',
              'bg-[rgba(118,118,128,0.12)]',
              'focus:outline-none focus:bg-white focus:ring-[2px] focus:ring-brand-500/30 focus:shadow-sm',
              'transition-all duration-150',
              'placeholder:text-[rgba(60,60,67,0.5)]',
            )}
          />
        </div>

        {/* Filter chips — iOS segmented style */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => applyFilter({ status: f.value })}
              className={clsx(
                'shrink-0 h-[32px] px-3.5 rounded-full text-[13px] font-medium transition-all duration-100',
                filters.status === f.value
                  ? 'bg-brand-900 text-white shadow-sm'
                  : 'bg-[rgba(118,118,128,0.12)] text-black/70 active:bg-[rgba(118,118,128,0.20)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Animal list — Inset grouped style ── */}
      <div className="px-4 py-3">
        {animals.data.length === 0 ? (
          <EmptyState hasFilter={!!(filters.search || filters.status)} />
        ) : (
          <div
            className="bg-white rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          >
            {animals.data.map((animal, i) => (
              <AnimalRow
                key={animal.id}
                animal={animal}
                isLast={i === animals.data.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AnimalRow({ animal, isLast }: { animal: Animal; isLast: boolean }) {
  const initials = (animal.name ?? animal.tag_number).slice(0, 2).toUpperCase();
  const badgeVariant = {
    lactating: 'success' as const,
    dry:       'neutral' as const,
    heifer:    'info' as const,
    calf:      'primary' as const,
    bull:      'neutral' as const,
    culled:    'error' as const,
    sold:      'error' as const,
    dead:      'error' as const,
  }[animal.status] ?? 'neutral' as const;

  return (
    <button
      onClick={() => router.visit(`/animals/${animal.id}`)}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 text-left',
        'active:bg-[rgba(0,0,0,0.04)] transition-colors duration-75',
        'min-h-[56px]',
        !isLast && 'border-b border-[rgba(60,60,67,0.10)]',
        'pl-4',  // inset separator starts at 70px (after avatar)
      )}
    >
      {/* Avatar */}
      <div className="h-[44px] w-[44px] rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
        {animal.photo_url ? (
          <img src={animal.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[14px] font-bold text-brand-900">{initials}</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-medium text-black truncate">
          {animal.name ?? animal.tag_number}
        </p>
        <p className="text-[14px] truncate" style={{ color: 'rgba(60,60,67,0.5)' }}>
          {animal.breed} · {animal.tag_number}
        </p>
        {animal.is_pregnant && animal.expected_calving_date && (
          <p className="text-[12px] font-medium mt-0.5" style={{ color: '#FF9500' }}>
            Due {new Date(animal.expected_calving_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={badgeVariant} size="sm">
          {STATUS_LABELS[animal.status] ?? animal.status}
        </Badge>
        <ChevronRight className="h-4 w-4" style={{ color: 'rgba(60,60,67,0.25)' }} />
      </div>
    </button>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-[rgba(120,120,128,0.12)] flex items-center justify-center mb-4 text-4xl">
        🐄
      </div>
      <h3 className="text-[17px] font-semibold text-black">
        {hasFilter ? 'No results' : 'No animals yet'}
      </h3>
      <p className="text-[15px] mt-1 max-w-[240px]" style={{ color: 'rgba(60,60,67,0.5)' }}>
        {hasFilter ? 'Try adjusting your search or filter.' : 'Add your first animal to get started.'}
      </p>
      {!hasFilter && (
        <button
          onClick={() => router.visit('/animals/create')}
          className="mt-5 h-[44px] px-6 bg-brand-900 text-white rounded-[12px] text-[17px] font-medium"
        >
          Add Animal
        </button>
      )}
    </div>
  );
}
