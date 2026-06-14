import React from 'react';
import { router, usePage, useForm } from '@inertiajs/react';
import {
  ChevronRight, AlertTriangle, Plus, X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardGroup, CardRow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps } from '@/types';

interface CalfSummary {
  id: string;
  animal_id: string;
  name: string;
  tag_number: string;
  breed: string;
  sex: string;
  dam: string | null;
  dob: string;
  age_days: number;
  age_months: number;
  age_label: string;
  phase: string;
  alert_count: number;
  alerts: { severity: string; message: string }[];
}

interface Props extends PageProps {
  calves: CalfSummary[];
  total_calves: number;
  pre_weaning_count: number;
  alert_count: number;
  critical_alerts: { severity: string; message: string }[];
}

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  colostrum:    { label: 'Colostrum',    bg: '#FFF8E1', text: '#F9A825' },
  early_milk:   { label: 'Early Milk',   bg: '#FFF3E0', text: '#FF6D00' },
  pre_weaning:  { label: 'Pre-Weaning',  bg: '#E3F2FD', text: '#1565C0' },
  post_weaning: { label: 'Post-Weaning', bg: '#E8F5E9', text: '#2E7D32' },
  growing:      { label: 'Growing',      bg: '#F5F5F5', text: '#616161' },
};

export default function CalfManagementIndex() {
  const { calves, total_calves, pre_weaning_count, alert_count, critical_alerts } =
    usePage<Props>().props;

  const [showRegister, setShowRegister] = React.useState(false);

  return (
    <AppLayout title="Calf Management">
      {/* Green header */}
      <div className="bg-[#2E7D32] pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Calf Management</h1>
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox value={total_calves}     label="Total Calves" />
          <StatBox value={pre_weaning_count} label="Pre-Weaning" />
          <StatBox value={alert_count}       label="Alerts" alert={alert_count > 0} />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-28">

        {/* Critical alert banner */}
        {critical_alerts.length > 0 && (
          <div className="bg-[#FFF0F0] border border-[#FF3B30]/20 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#FF3B30] shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#DC2626]">
                {critical_alerts.length} critical alert{critical_alerts.length !== 1 ? 's' : ''}
              </p>
              {critical_alerts.slice(0, 2).map((a, i) => (
                <p key={i} className="text-[13px] text-[#DC2626]/80 mt-0.5 truncate">{a.message}</p>
              ))}
            </div>
          </div>
        )}

        {/* Calf list */}
        {calves.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[17px] font-semibold text-black">No calves registered</p>
            <p className="text-[15px] text-gray-500 mt-1">Tap the button below to register your first calf.</p>
          </div>
        ) : (
          <CardGroup>
            {calves.map(calf => {
              const phase = PHASE_STYLES[calf.phase] ?? PHASE_STYLES.growing;
              return (
                <CardRow
                  key={calf.id}
                  onClick={() => router.visit(`/calf-management/${calf.id}`)}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: phase.bg }}>
                    <span className="text-[13px] font-bold" style={{ color: phase.text }}>
                      {calf.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-black truncate">{calf.name}</p>
                      {calf.alert_count > 0 && (
                        <span className="h-4 w-4 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {calf.alert_count}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] truncate" style={{ color: 'rgba(60,60,67,0.5)' }}>
                      {calf.breed} · {calf.age_label}
                      {calf.dam ? ` · Dam: ${calf.dam}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: phase.bg, color: phase.text }}
                    >
                      {phase.label}
                    </span>
                    <ChevronRight className="h-4 w-4" style={{ color: 'rgba(60,60,67,0.25)' }} />
                  </div>
                </CardRow>
              );
            })}
          </CardGroup>
        )}
      </div>

      {/* Register button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-safe">
        <button
          onClick={() => setShowRegister(true)}
          className="w-full h-[52px] rounded-[14px] bg-[#2E7D32] text-white text-[17px] font-semibold flex items-center justify-center gap-2 shadow-lg active:opacity-80"
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Register New Calf
        </button>
      </div>

      {/* Register modal */}
      {showRegister && <RegisterCalfModal onClose={() => setShowRegister(false)} />}
    </AppLayout>
  );
}

// ── Register Calf Modal ────────────────────────────────────────────────────────

function RegisterCalfModal({ onClose }: { onClose: () => void }) {
  const { data, setData, post, processing, errors } = useForm({
    animal_id: '',
    dob: '',
    birth_weight_kg: '',
    dam_animal_id: '',
    sex: 'Female',
    housing_notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/calf-management', { onSuccess: onClose });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-4 pb-safe pt-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold">Register New Calf</h2>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Animal ID (UUID)" error={errors.animal_id}>
            <input
              type="text"
              className="form-input"
              placeholder="Paste animal UUID or select below"
              value={data.animal_id}
              onChange={e => setData('animal_id', e.target.value)}
            />
          </Field>
          <Field label="Date of Birth" error={errors.dob}>
            <input
              type="date"
              className="form-input"
              value={data.dob}
              onChange={e => setData('dob', e.target.value)}
            />
          </Field>
          <Field label="Birth Weight (kg)" error={errors.birth_weight_kg}>
            <input
              type="number"
              step="0.1"
              className="form-input"
              placeholder="e.g. 32.5"
              value={data.birth_weight_kg}
              onChange={e => setData('birth_weight_kg', e.target.value)}
            />
          </Field>
          <Field label="Dam (tag/name)" error={errors.dam_animal_id}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Daisy or KE001"
              value={data.dam_animal_id}
              onChange={e => setData('dam_animal_id', e.target.value)}
            />
          </Field>
          <Field label="Sex" error={errors.sex}>
            <select className="form-input" value={data.sex} onChange={e => setData('sex', e.target.value)}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </Field>
          <Field label="Housing Notes" error={errors.housing_notes}>
            <textarea
              className="form-input min-h-[80px]"
              placeholder="Pen number, bedding notes..."
              value={data.housing_notes}
              onChange={e => setData('housing_notes', e.target.value)}
            />
          </Field>
          <button
            type="submit"
            disabled={processing}
            className="w-full h-[52px] rounded-[14px] bg-[#2E7D32] text-white text-[17px] font-semibold disabled:opacity-50"
          >
            {processing ? 'Registering…' : 'Register Calf'}
          </button>
        </form>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatBox({ value, label, alert = false }: { value: number; label: string; alert?: boolean }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 text-center">
      <p className={clsx('text-[24px] font-bold', alert ? 'text-[#FF6B6B]' : 'text-white')}>{value}</p>
      <p className="text-[12px] text-white/70 mt-0.5">{label}</p>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="text-[14px] font-medium text-gray-700 block mb-1">{label}</label>
      {children}
      {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
