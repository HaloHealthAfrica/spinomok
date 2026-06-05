import React, { useState, useCallback, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { goBack } from '@/utils/navigation';
import {
  ArrowLeft, ArrowRight, Check, Milk, ShoppingCart, Heart, Wheat, FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';
import axios from 'axios';
import type { PageProps, DailyReport, AnimalMilkRecord, MilkBuyer } from '@/types';
import { formatDate, formatKES, formatLitres } from '@/utils/format';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface WizardProps extends PageProps {
  report: DailyReport;
  date: string;
  animal_records: AnimalMilkRecord[];
  milk_summary: { total_litres: number; morning_litres: number; midday_litres: number; evening_litres: number; cows_milked: number };
  buyers: MilkBuyer[];
  current_step: number;
}

const STEPS = [
  { num: 1, label: 'Milk',     icon: Milk,        color: 'text-blue-600' },
  { num: 2, label: 'Sales',    icon: ShoppingCart, color: 'text-green-600' },
  { num: 3, label: 'Health',   icon: Heart,        color: 'text-red-600' },
  { num: 4, label: 'Feed',     icon: Wheat,        color: 'text-amber-600' },
  { num: 5, label: 'Submit',   icon: FileText,     color: 'text-purple-600' },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Wizard Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function DailyReportCreate() {
  const { report, date, animal_records, milk_summary, buyers, current_step } = usePage<WizardProps>().props;

  const [step, setStep] = useState(current_step ?? 1);
  const [saving, setSaving] = useState(false);
  const [stepData, setStepData] = useState<Record<number, unknown>>(
    report.draft_data ? Object.fromEntries(
      Object.entries(report.draft_data).map(([k, v]) => [parseInt(k.replace('step_', '')), v])
    ) : {}
  );

  const saveStep = async (stepNum: number, data: unknown) => {
    setStepData(prev => ({ ...prev, [stepNum]: data }));
    // Best-effort save Ã¢â‚¬â€ data is held in local state even if server save fails
    await axios.patch(`/reports/daily/${report.id}/step`, { step: stepNum, data })
      .catch(() => null); // Data preserved in stepData state; server will get it on submit
  };

  const goNext = async (currentStepData: unknown) => {
    setSaving(true);
    await saveStep(step, currentStepData);
    setSaving(false);
    // Always advance Ã¢â‚¬â€ local state holds all data even if server save missed
    if (step < 5) setStep(s => s + 1);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async (finalData: unknown) => {
    setSaving(true);
    await saveStep(5, finalData);
    router.post(`/reports/daily/${report.id}/submit`, finalData as Record<string, string>);
  };

  return (
    <AppLayout title="Daily Report" showBottomNav={false}>
      {/* Top bar */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3 mb-4">
          <button
            onClick={() => goBack('/reports')}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Daily Report</h1>
            <p className="text-primary-300 text-xs">{formatDate(date)}</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <Step1Milk
            milkSummary={milk_summary}
            animalRecords={animal_records}
            initialData={stepData[1] as Step1Data | undefined}
            onNext={(data) => goNext(data)}
            saving={saving}
          />
        )}
        {step === 2 && (
          <Step2Sales
            buyers={buyers}
            milkTotal={milk_summary.total_litres}
            initialData={stepData[2] as Step2Data | undefined}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
            saving={saving}
          />
        )}
        {step === 3 && (
          <Step3Health
            initialData={stepData[3] as Step3Data | undefined}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
            saving={saving}
          />
        )}
        {step === 4 && (
          <Step4Feed
            initialData={stepData[4] as Step4Data | undefined}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
            saving={saving}
          />
        )}
        {step === 5 && (
          <Step5Submit
            date={date}
            stepData={stepData}
            milkSummary={milk_summary}
            report={report}
            onBack={goPrev}
            onSubmit={handleSubmit}
            saving={saving}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step Indicator Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done   = s.num < currentStep;
        const active = s.num === currentStep;
        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center">
              <div className={clsx(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-white text-primary-900' :
                         'bg-white/20 text-white/50',
              )}>
                {done ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <p className={clsx('text-[10px] mt-0.5', active ? 'text-white' : 'text-primary-300/70')}>
                {s.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mb-3 transition-colors',
                done ? 'bg-green-400' : 'bg-white/20',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step 1: Milk Production Confirmation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface Step1Data { confirmed: boolean; notes: string }

function Step1Milk({
  milkSummary, animalRecords, initialData, onNext, saving,
}: {
  milkSummary: WizardProps['milk_summary'];
  animalRecords: AnimalMilkRecord[];
  initialData?: Step1Data;
  onNext: (data: Step1Data) => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Ã°Å¸Â¥â€º Milk Production</h2>
        <p className="text-sm text-gray-500 mt-0.5">Review today's milk records</p>
      </div>

      {/* Summary card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-2xl font-bold text-blue-900">{milkSummary.total_litres.toFixed(1)} L</p>
        <p className="text-sm text-blue-600 mt-0.5">Total production today</p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-blue-600">Ã°Å¸Å’â€¦ {milkSummary.morning_litres.toFixed(1)}L</span>
          <span className="text-blue-600">Ã¢Ëœâ‚¬Ã¯Â¸Â {milkSummary.midday_litres.toFixed(1)}L</span>
          <span className="text-blue-600">Ã°Å¸Å’â€  {milkSummary.evening_litres.toFixed(1)}L</span>
        </div>
        <p className="text-xs text-blue-500 mt-2">{milkSummary.cows_milked} cow{milkSummary.cows_milked !== 1 ? 's' : ''} milked</p>
      </div>

      {milkSummary.total_litres === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
          No milk records found for today.{' '}
          <button onClick={() => router.visit('/milk-records/create')} className="font-medium underline">
            Record milk now Ã¢â€ â€™
          </button>
        </div>
      )}

      {/* Per-animal quick view */}
      {animalRecords.filter(r => r.daily_total > 0).length > 0 && (
        <div className="space-y-1.5">
          {animalRecords.filter(r => r.daily_total > 0).map(ar => (
            <div key={ar.animal_id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-sm text-gray-700">{ar.name ?? ar.tag_number}</p>
              <p className="text-sm font-bold text-primary-900">{ar.daily_total.toFixed(1)} L</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Milking Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any issues, sick cow, missed milking..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      <WizardFooter
        onNext={() => onNext({ confirmed: true, notes })}
        loading={saving}
        nextLabel="Confirm & Continue"
        showBack={false}
      />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step 2: Milk Sales Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface SaleEntry { buyer_id: string; litres: string; price: string }
interface Step2Data { sales: SaleEntry[]; notes: string }

function Step2Sales({
  buyers, milkTotal, initialData, onNext, onBack, saving,
}: {
  buyers: MilkBuyer[];
  milkTotal: number;
  initialData?: Step2Data;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [sales, setSales] = useState<SaleEntry[]>(
    initialData?.sales ?? [{ buyer_id: buyers[0]?.id ?? '', litres: '', price: buyers[0]?.default_price_per_litre?.toString() ?? '' }]
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const updateSale = (idx: number, field: keyof SaleEntry, value: string) => {
    setSales(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: value };
      // Auto-fill price when buyer changes
      if (field === 'buyer_id') {
        const buyer = buyers.find(b => b.id === value);
        updated.price = buyer?.default_price_per_litre?.toString() ?? '';
      }
      return updated;
    }));
  };

  const addSale = () => setSales(prev => [...prev, { buyer_id: buyers[0]?.id ?? '', litres: '', price: '' }]);
  const removeSale = (idx: number) => setSales(prev => prev.filter((_, i) => i !== idx));

  const totalSold = sales.reduce((sum, s) => sum + (parseFloat(s.litres) || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + ((parseFloat(s.litres) || 0) * (parseFloat(s.price) || 0)), 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Ã°Å¸â€™Â° Milk Sales</h2>
        <p className="text-sm text-gray-500">Available: {milkTotal.toFixed(1)} L produced today</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between">
        <span className="text-sm text-green-700">Sold: <strong>{totalSold.toFixed(1)} L</strong></span>
        <span className="text-sm text-green-700">Revenue: <strong>{formatKES(totalRevenue)}</strong></span>
      </div>

      {sales.map((sale, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Sale {idx + 1}</p>
            {sales.length > 1 && (
              <button onClick={() => removeSale(idx)} className="text-xs text-red-500">Remove</button>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Buyer / Channel</label>
            <select
              value={sale.buyer_id}
              onChange={e => updateSale(idx, 'buyer_id', e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {buyers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number" min="0" max="999" step="0.1" inputMode="decimal"
              placeholder="0.0" unit="L"
              value={sale.litres}
              onChange={e => updateSale(idx, 'litres', e.target.value)}
            />
            <Input
              label="Price / Litre"
              type="number" min="0" step="0.5" inputMode="decimal"
              placeholder="42" unit="KES"
              value={sale.price}
              onChange={e => updateSale(idx, 'price', e.target.value)}
            />
          </div>
          {sale.litres && sale.price && (
            <p className="text-xs text-green-700 font-medium">
              Total: {formatKES((parseFloat(sale.litres) || 0) * (parseFloat(sale.price) || 0))}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={addSale}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        + Add Another Buyer
      </button>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Sales Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Payment received, unsold milk details..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      <WizardFooter
        onNext={() => onNext({ sales, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Next: Health"
      />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step 3: Health Events Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface Step3Data { events: string; notes: string }

function Step3Health({
  initialData, onNext, onBack, saving,
}: {
  initialData?: Step3Data;
  onNext: (data: Step3Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [events, setEvents] = useState(initialData?.events ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Ã°Å¸ÂÂ¥ Herd Health</h2>
        <p className="text-sm text-gray-500">Record any health events today</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-600">
        <p className="font-medium mb-1">For detailed health records, use:</p>
        <button
          onClick={() => router.visit('/health/create')}
          className="text-primary-900 font-medium underline"
        >
          Health Events Ã¢â€ â€™ Add Event
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Health Events Today (optional)</label>
        <textarea
          value={events}
          onChange={e => setEvents(e.target.value)}
          rows={3}
          placeholder="e.g. Cow #3 (Bella) Ã¢â‚¬â€ mastitis check done, Cow #7 Ã¢â‚¬â€ dewormed..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">General Observations</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any unusual behaviour, injuries, treatment costs..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      <WizardFooter
        onNext={() => onNext({ events, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Next: Feed"
      />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step 4: Feed Usage Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface FeedEntry { feed_type: string; quantity: string; unit: string; cost: string }
interface Step4Data { feeds: FeedEntry[]; notes: string }

const FEED_TYPES = ['Napier Grass', 'Dairy Meal', 'Hay', 'Maize Silage', 'Oats', 'Minerals/Salt', 'Calf Pellets', 'Other'];

function Step4Feed({
  initialData, onNext, onBack, saving,
}: {
  initialData?: Step4Data;
  onNext: (data: Step4Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [feeds, setFeeds] = useState<FeedEntry[]>(
    initialData?.feeds ?? [{ feed_type: 'Napier Grass', quantity: '', unit: 'kg', cost: '' }]
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const updateFeed = (idx: number, field: keyof FeedEntry, value: string) => {
    setFeeds(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const totalCost = feeds.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Ã°Å¸Å’Â¾ Feed Usage</h2>
        <p className="text-sm text-gray-500">Record today's feed quantities and costs</p>
      </div>

      {totalCost > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-sm text-amber-700">Total Feed Cost Today: <strong>{formatKES(totalCost)}</strong></span>
        </div>
      )}

      {feeds.map((feed, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Feed {idx + 1}</p>
            {feeds.length > 1 && (
              <button onClick={() => setFeeds(prev => prev.filter((_, i) => i !== idx))} className="text-xs text-red-500">Remove</button>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Feed Type</label>
            <select
              value={feed.feed_type}
              onChange={e => updateFeed(idx, 'feed_type', e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {FEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number" min="0" step="0.5" inputMode="decimal"
              placeholder="40" unit="kg"
              value={feed.quantity}
              onChange={e => updateFeed(idx, 'quantity', e.target.value)}
            />
            <Input
              label="Cost"
              type="number" min="0" step="10" inputMode="decimal"
              placeholder="200" unit="KES"
              value={feed.cost}
              onChange={e => updateFeed(idx, 'cost', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => setFeeds(prev => [...prev, { feed_type: 'Hay', quantity: '', unit: 'kg', cost: '' }])}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        + Add Another Feed
      </button>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Feed Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Delivery received, quality issues, new feed batch..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      <WizardFooter
        onNext={() => onNext({ feeds, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Review & Submit"
      />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Step 5: Review & Submit Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const WEATHER_OPTIONS = ['Sunny', 'Partly Cloudy', 'Overcast', 'Rainy', 'Heavy Rain', 'Cold', 'Dry'];

function Step5Submit({
  date, stepData, milkSummary, report, onBack, onSubmit, saving,
}: {
  date: string;
  stepData: Record<number, unknown>;
  milkSummary: WizardProps['milk_summary'];
  report: DailyReport;
  onBack: () => void;
  onSubmit: (data: unknown) => void;
  saving: boolean;
}) {
  const [weather, setWeather] = useState(
    (report.draft_data?.step_5 as { weather?: string } | undefined)?.weather ?? 'Sunny'
  );
  const [managerNotes, setManagerNotes] = useState(
    (report.draft_data?.step_5 as { manager_notes?: string } | undefined)?.manager_notes ?? ''
  );

  const step2 = stepData[2] as Step2Data | undefined;
  const step4 = stepData[4] as Step4Data | undefined;

  const totalRevenue = step2?.sales.reduce((sum, s) => sum + ((parseFloat(s.litres) || 0) * (parseFloat(s.price) || 0)), 0) ?? 0;
  const totalFeedCost = step4?.feeds.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0) ?? 0;

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Ã°Å¸â€œâ€¹ Review & Submit</h2>
        <p className="text-sm text-gray-500">{formatDate(date)}</p>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <SummaryRow label="Ã°Å¸Â¥â€º Total Milk" value={`${milkSummary.total_litres.toFixed(1)} L`} />
        <SummaryRow label="Ã°Å¸Ââ€ž Cows Milked" value={milkSummary.cows_milked.toString()} />
        <SummaryRow label="Ã°Å¸â€™Â° Milk Revenue" value={formatKES(totalRevenue)} highlight={totalRevenue > 0} />
        <SummaryRow label="Ã°Å¸Å’Â¾ Feed Cost" value={formatKES(totalFeedCost)} />
        {totalRevenue > 0 && totalFeedCost > 0 && (
          <SummaryRow
            label="Ã°Å¸â€œÅ  Gross Margin"
            value={formatKES(totalRevenue - totalFeedCost)}
            highlight
          />
        )}
      </div>

      {/* Weather */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Weather Today</label>
        <div className="flex gap-2 flex-wrap">
          {WEATHER_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => setWeather(w)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                weather === w
                  ? 'bg-primary-900 text-white border-primary-900'
                  : 'bg-white text-gray-600 border-gray-300',
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Manager notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Manager Notes</label>
        <textarea
          value={managerNotes}
          onChange={e => setManagerNotes(e.target.value)}
          rows={3}
          placeholder="Overall farm observations for the day..."
          maxLength={1000}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{managerNotes.length}/1000</p>
      </div>

      {/* WhatsApp preview hint */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
        Ã°Å¸â€™Â¬ After submitting, a WhatsApp summary will be prepared for your farm owner.
      </div>

      {/* Buttons */}
      <div className="space-y-3 pb-4">
        <Button
          fullWidth size="lg"
          loading={saving}
          onClick={() => onSubmit({ weather, manager_notes: managerNotes })}
          className="bg-green-600 hover:bg-green-700"
        >
          Ã¢Å“â€œ Submit Daily Report
        </Button>
        <Button fullWidth variant="ghost" onClick={onBack} disabled={saving}>
          Ã¢â€ Â Back
        </Button>
      </div>
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Shared sub-components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function WizardFooter({
  onNext, onBack, loading, nextLabel, showBack = true,
}: {
  onNext: () => void;
  onBack?: () => void;
  loading: boolean;
  nextLabel: string;
  showBack?: boolean;
}) {
  return (
    <div className="flex gap-3 pb-4 pt-2">
      {showBack && (
        <Button
          variant="secondary"
          onClick={onBack}
          className="flex-shrink-0"
          style={{ touchAction: 'manipulation' } as React.CSSProperties}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <Button
        fullWidth
        onClick={onNext}
        loading={loading}
        rightIcon={<ArrowRight className="h-4 w-4" />}
        style={{ touchAction: 'manipulation' } as React.CSSProperties}
      >
        {nextLabel}
      </Button>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={clsx('text-sm font-semibold', highlight ? 'text-green-700' : 'text-gray-900')}>{value}</span>
    </div>
  );
}
