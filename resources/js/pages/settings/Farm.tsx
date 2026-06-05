import React from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import type { PageProps } from '@/types';
import { goBack } from '@/utils/navigation';

export default function FarmSettings() {
  const { auth } = usePage<PageProps>().props;
  const farm = auth.farm;

  // Guard: farm context not yet loaded
  if (!farm) {
    return (
      <AppLayout title="Farm Settings" showBottomNav={false}>
        <div className="p-8 text-center text-gray-500">Loading farm settingsâ€¦</div>
      </AppLayout>
    );
  }

  const settings = farm.settings ?? {};
  const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
    name: farm.name ?? '',
    owner_name: farm.owner_name ?? '',
    county: farm.county ?? '',
    sub_county: farm.sub_county ?? '',
    phone: farm.phone ?? '',
    email: farm.email ?? '',
    default_milk_price: String(settings.default_milk_price ?? ''),
    whatsapp_number: String(settings.whatsapp_number ?? ''),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    patch('/settings/farm', { preserveScroll: true });
  };

  return (
    <AppLayout title="Farm Settings" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/more')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">Farm Settings</h1>
        </div>
      </div>

      <form onSubmit={submit} className="px-4 py-4 space-y-5">
        <div className="bg-white rounded-xl p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary-900" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{farm.name}</p>
            <p className="text-sm text-gray-500">{farm.subscription_plan} plan</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Farm Details</h2>
          <Field label="Farm Name" value={data.name} error={errors.name} onChange={value => setData('name', value)} required />
          <Field label="Owner Name" value={data.owner_name} error={errors.owner_name} onChange={value => setData('owner_name', value)} required />
          <Field label="County" value={data.county} error={errors.county} onChange={value => setData('county', value)} required />
          <Field label="Sub County" value={data.sub_county} error={errors.sub_county} onChange={value => setData('sub_county', value)} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact & Defaults</h2>
          <Field label="Farm Phone" value={data.phone} error={errors.phone} onChange={value => setData('phone', value)} placeholder="+254..." />
          <Field label="Farm Email" type="email" value={data.email} error={errors.email} onChange={value => setData('email', value)} />
          <Field label="Default Milk Price" type="number" value={data.default_milk_price} error={errors.default_milk_price} onChange={value => setData('default_milk_price', value)} placeholder="42" />
          <Field label="WhatsApp Number" value={data.whatsapp_number} error={errors.whatsapp_number} onChange={value => setData('whatsapp_number', value)} placeholder="+254..." />
        </section>

        {recentlySuccessful && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">Farm settings saved.</p>
        )}

        <button
          type="submit"
          disabled={processing}
          className="w-full h-12 rounded-xl bg-primary-900 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {processing ? 'Saving...' : 'Save Farm Settings'}
        </button>
      </form>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
