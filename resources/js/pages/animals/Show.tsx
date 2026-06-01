import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Edit2, Milk, Heart, Calendar, BarChart2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { PageProps, Animal } from '@/types';

interface AnimalShowProps extends PageProps {
  animal: Animal & {
    dam: Animal | null;
    sire: Animal | null;
    days_in_milk: number | null;
    current_lactation_number: number;
  };
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'breeding', label: 'Breeding', icon: Calendar },
  { id: 'production', label: 'Production', icon: Milk },
];

export default function AnimalsShow() {
  const { animal } = usePage<AnimalShowProps>().props;
  const [activeTab, setActiveTab] = useState('overview');

  const statusLabel: Record<string, string> = {
    lactating: 'Milking', dry: 'Dry', heifer: 'Heifer',
    calf: 'Calf', bull: 'Bull', culled: 'Culled', sold: 'Sold', dead: 'Dead',
  };

  return (
    <AppLayout title={animal.name ?? animal.tag_number}>
      {/* Header */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <button
            onClick={() => router.visit('/animals')}
            aria-label="Back to animals"
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.visit(`/animals/${animal.id}/edit`)}
            aria-label="Edit animal"
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        {/* Animal hero */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {(animal.name ?? animal.tag_number).slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">
              {animal.name ?? animal.tag_number}
            </h1>
            <p className="text-primary-200 text-sm">{animal.breed} · {animal.tag_number}</p>
            <div className="mt-1">
              <Badge variant={getStatusVariant(animal.status)} size="sm">
                {statusLabel[animal.status] ?? animal.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'text-primary-900 border-primary-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 space-y-3">
        {activeTab === 'overview' && (
          <OverviewTab animal={animal} />
        )}
        {activeTab === 'health' && (
          <PlaceholderTab label="Health History" emoji="🏥" phase="Phase 4" />
        )}
        {activeTab === 'breeding' && (
          <PlaceholderTab label="Breeding Records" emoji="🐄" phase="Phase 3" />
        )}
        {activeTab === 'production' && (
          <PlaceholderTab label="Production History" emoji="🥛" phase="Phase 2" />
        )}
      </div>
    </AppLayout>
  );
}

function OverviewTab({ animal }: { animal: AnimalShowProps['animal'] }) {
  const rows = [
    { label: 'Tag Number', value: animal.tag_number },
    { label: 'Sex', value: animal.sex === 'female' ? 'Female' : 'Male' },
    { label: 'Breed', value: animal.breed },
    { label: 'Date of Birth', value: animal.birth_date ? new Date(animal.birth_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { label: 'Current Weight', value: animal.weight_kg ? `${animal.weight_kg} kg` : '—' },
    { label: 'Parity (Calvings)', value: animal.parity.toString() },
    { label: 'Lactation #', value: animal.current_lactation_number.toString() },
    { label: 'Days in Milk', value: animal.days_in_milk != null ? `${animal.days_in_milk} days` : '—' },
    { label: 'Pregnant', value: animal.is_pregnant ? 'Yes' : 'No' },
    { label: 'Expected Calving', value: animal.expected_calving_date ? new Date(animal.expected_calving_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { label: 'Last Calving', value: animal.last_calving_date ? new Date(animal.last_calving_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { label: 'Dam (Mother)', value: animal.dam?.name ?? animal.dam?.tag_number ?? '—' },
    { label: 'Sire (Father)', value: animal.sire?.name ?? animal.sire?.tag_number ?? '—' },
    { label: 'Date Acquired', value: animal.date_acquired ? new Date(animal.date_acquired).toLocaleDateString('en-KE') : '—' },
  ].filter(r => r.value !== '—' || true);

  return (
    <Card padding="none">
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">{row.label}</span>
            <span className="text-sm font-medium text-gray-900 text-right max-w-[55%]">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PlaceholderTab({ label, emoji, phase }: { label: string; emoji: string; phase: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-4xl mb-3">{emoji}</p>
      <h3 className="text-base font-semibold text-gray-800">{label}</h3>
      <p className="text-sm text-gray-500 mt-1">Coming in {phase}</p>
    </div>
  );
}
