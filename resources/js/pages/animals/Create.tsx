import React from 'react';
import { useForm } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const breedOptions = [
  { value: 'Friesian', label: 'Holstein-Friesian' },
  { value: 'Ayrshire', label: 'Ayrshire' },
  { value: 'Jersey', label: 'Jersey' },
  { value: 'Guernsey', label: 'Guernsey' },
  { value: 'Brown Swiss', label: 'Brown Swiss' },
  { value: 'Sahiwal', label: 'Sahiwal' },
  { value: 'Crossbreed', label: 'Crossbreed / Grade' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: 'calf', label: 'Calf (0–6 months)' },
  { value: 'heifer', label: 'Heifer (6+ months, not calved)' },
  { value: 'lactating', label: 'Lactating Cow' },
  { value: 'dry', label: 'Dry Cow' },
  { value: 'bull', label: 'Bull' },
];

export default function AnimalsCreate() {
  const { data, setData, post, processing, errors } = useForm({
    tag_number: '',
    name: '',
    sex: 'female',
    status: 'calf',
    breed: 'Crossbreed',
    birth_date: '',
    date_acquired: '',
    acquisition_cost: '',
    acquisition_source: '',
    weight_kg: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/animals');
  };

  return (
    <AppLayout title="Add Animal">
      {/* Top bar */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => router.visit('/animals')}
            aria-label="Go back"
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Register Animal</h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="px-4 py-4 space-y-6">

          {/* Identity */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Identity
            </h2>
            <div className="space-y-4">
              <Input
                label="Ear Tag / ID Number"
                placeholder="e.g. SPM-2026-009"
                value={data.tag_number}
                onChange={(e) => setData('tag_number', e.target.value)}
                error={errors.tag_number}
                required
              />
              <Input
                label="Name (optional)"
                placeholder="e.g. Daisy"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Sex"
                  value={data.sex}
                  onChange={(e) => setData('sex', e.target.value)}
                  options={[
                    { value: 'female', label: 'Female (Cow/Heifer)' },
                    { value: 'male', label: 'Male (Bull/Steer)' },
                  ]}
                  required
                />
                <Select
                  label="Status"
                  value={data.status}
                  onChange={(e) => setData('status', e.target.value)}
                  options={statusOptions}
                  required
                />
              </div>
              <Select
                label="Breed"
                value={data.breed}
                onChange={(e) => setData('breed', e.target.value)}
                options={breedOptions}
                required
              />
            </div>
          </section>

          {/* Physical */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Physical Details
            </h2>
            <div className="space-y-4">
              <Input
                label="Date of Birth"
                type="date"
                value={data.birth_date}
                onChange={(e) => setData('birth_date', e.target.value)}
                error={errors.birth_date}
                max={new Date().toISOString().split('T')[0]}
              />
              <Input
                label="Current Weight"
                type="number"
                min="5"
                max="1200"
                step="0.5"
                placeholder="350"
                unit="kg"
                value={data.weight_kg}
                onChange={(e) => setData('weight_kg', e.target.value)}
                error={errors.weight_kg}
              />
            </div>
          </section>

          {/* Acquisition */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Acquisition
            </h2>
            <div className="space-y-4">
              <Input
                label="Date Acquired"
                type="date"
                value={data.date_acquired}
                onChange={(e) => setData('date_acquired', e.target.value)}
                error={errors.date_acquired}
                max={new Date().toISOString().split('T')[0]}
                hint="Leave blank if born on this farm"
              />
              <Input
                label="Purchase Price"
                type="number"
                min="0"
                placeholder="45000"
                unit="KES"
                value={data.acquisition_cost}
                onChange={(e) => setData('acquisition_cost', e.target.value)}
                error={errors.acquisition_cost}
              />
              <Input
                label="Seller / Source"
                placeholder="e.g. Nakuru Livestock Market"
                value={data.acquisition_source}
                onChange={(e) => setData('acquisition_source', e.target.value)}
                error={errors.acquisition_source}
              />
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Notes (optional)
            </label>
            <textarea
              value={data.notes}
              onChange={(e) => setData('notes', e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Any additional observations..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none"
            />
            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes}</p>}
          </section>

          <Button type="submit" fullWidth size="lg" loading={processing} className="mb-4">
            Register Animal
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
