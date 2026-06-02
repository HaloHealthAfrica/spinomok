import React from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Save, User } from 'lucide-react';
import type { PageProps } from '@/types';

export default function ProfileSettings() {
  const { auth } = usePage<PageProps>().props;
  const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
    name:  auth.user?.name  ?? '',
    email: auth.user?.email ?? '',
    phone: auth.user?.phone ?? '',
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    patch('/profile', { preserveScroll: true });
  };

  return (
    <AppLayout title="My Profile" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/more')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white text-lg font-bold">My Profile</h1>
        </div>
      </div>

      <form onSubmit={submit} className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="h-6 w-6 text-primary-900" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{auth.user?.name}</p>
            <p className="text-sm text-gray-500">{auth.role?.replace('_', ' ') ?? 'Staff'}</p>
          </div>
        </div>

        <Field label="Full Name" value={data.name} error={errors.name} onChange={value => setData('name', value)} required />
        <Field label="Email" type="email" value={data.email} error={errors.email} onChange={value => setData('email', value)} required />
        <Field label="Phone" value={data.phone} error={errors.phone} onChange={value => setData('phone', value)} placeholder="+254..." />

        {recentlySuccessful && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">Profile saved.</p>
        )}

        <button
          type="submit"
          disabled={processing}
          className="w-full h-12 rounded-xl bg-primary-900 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {processing ? 'Saving...' : 'Save Profile'}
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
