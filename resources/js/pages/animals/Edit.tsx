import React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { PageProps, Animal } from '@/types';

interface EditProps extends PageProps { animal: Animal; }

export default function AnimalsEdit() {
  const { animal } = usePage<EditProps>().props;

  const { data, setData, put, processing, errors } = useForm({
    tag_number: animal.tag_number,
    name: animal.name ?? '',
    sex: animal.sex,
    status: animal.status,
    breed: animal.breed,
    birth_date: animal.birth_date ?? '',
    weight_kg: animal.weight_kg?.toString() ?? '',
    notes: animal.notes ?? '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/animals/${animal.id}`);
  };

  return (
    <AppLayout title="Edit Animal">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit(`/animals/${animal.id}`)}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">
            Edit — {animal.name ?? animal.tag_number}
          </h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-4">
          <Input label="Ear Tag" value={data.tag_number} onChange={(e) => setData('tag_number', e.target.value)} error={errors.tag_number} required />
          <Input label="Name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} />
          <Select label="Status" value={data.status} onChange={(e) => setData('status', e.target.value)}
            options={[
              { value: 'calf', label: 'Calf' }, { value: 'heifer', label: 'Heifer' },
              { value: 'lactating', label: 'Lactating' }, { value: 'dry', label: 'Dry' },
              { value: 'bull', label: 'Bull' }, { value: 'sold', label: 'Sold' }, { value: 'dead', label: 'Dead' },
            ]}
          />
          <Input label="Current Weight" type="number" unit="kg" value={data.weight_kg} onChange={(e) => setData('weight_kg', e.target.value)} error={errors.weight_kg} />
          <textarea
            value={data.notes}
            onChange={(e) => setData('notes', e.target.value)}
            rows={3}
            placeholder="Notes..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
          <Button type="submit" fullWidth size="lg" loading={processing}>
            Save Changes
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
