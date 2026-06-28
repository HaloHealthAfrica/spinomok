import React, { useState } from 'react';
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

// ──── Types ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

interface MilkSaleToday {
  id: string;
  milk_buyer_id: string;
  quantity_litres: number;
  price_per_litre: number;
  total_amount: number;
  payment_method: string;
  buyer?: { id: string; name: string; buyer_type: string };
}

interface WizardProps extends PageProps {
  report: DailyReport;
  date: string;
  animal_records: AnimalMilkRecord[];
  milk_summary: { total_litres: number; morning_litres: number; midday_litres: number; evening_litres: number; cows_milked: number };
  buyers: MilkBuyer[];
  milk_sales_today: MilkSaleToday[];
  herd_counts: HerdCounts;
  animals: ReportAnimal[];
  current_step: number;
}

interface ReportAnimal {
  id: string;
  tag_number: string;
  name: string | null;
  status: string;
}

interface HerdCounts {
  calves: number;
  heifers: number;
  lactating: number;
  dry: number;
  bulls: number;
}

const STEPS = [
  { num: 1, label: 'Milk',     icon: Milk,        color: 'text-blue-600' },
  { num: 2, label: 'Sales',    icon: ShoppingCart, color: 'text-green-600' },
  { num: 3, label: 'Health',   icon: Heart,        color: 'text-red-600' },
  { num: 4, label: 'Feed',     icon: Wheat,        color: 'text-amber-600' },
  { num: 5, label: 'Submit',   icon: FileText,     color: 'text-purple-600' },
];

// ──── Main Wizard Component ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export default function DailyReportCreate() {
  const { report, date, animal_records, milk_summary, buyers, milk_sales_today, herd_counts, animals, current_step } = usePage<WizardProps>().props;

  const [step, setStep] = useState(current_step ?? 1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stepData, setStepData] = useState<Record<number, unknown>>(
    report.draft_data ? Object.fromEntries(
      Object.entries(report.draft_data).map(([k, v]) => [parseInt(k.replace('step_', '')), v])
    ) : {}
  );

  const saveStep = async (stepNum: number, data: unknown) => {
    setStepData(prev => ({ ...prev, [stepNum]: data }));
    // Best-effort save — data is held in local state even if server save fails
    await axios.patch(`/reports/daily/${report.id}/step`, { step: stepNum, data })
      .catch(() => null); // Data preserved in stepData state; server will get it on submit
  };

  const saveStepReliably = async (stepNum: number, data: unknown) => {
    const nextStepData = { ...stepData, [stepNum]: data };
    setStepData(nextStepData);
    setSaveError(null);

    try {
      await axios.patch(`/reports/daily/${report.id}/step`, { step: stepNum, data });
      return nextStepData;
    } catch {
      setSaveError('Could not save this step. Please check your connection and try again.');
      setSaving(false);
      throw new Error('Daily report step save failed.');
    }
  };

  const goNext = async (currentStepData: unknown) => {
    setSaving(true);
    await saveStepReliably(step, currentStepData);
    setSaving(false);
    // Always advance — local state holds all data even if server save missed
    if (step < 5) setStep(s => s + 1);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async (finalData: unknown) => {
    setSaving(true);
    const nextStepData = await saveStepReliably(5, finalData);
    router.post(`/reports/daily/${report.id}/submit`, {
      ...(finalData as Record<string, string>),
      draft_data: nextStepData,
    });
  };

  return (
    <AppLayout title="Daily Report">
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
        {saveError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {saveError}
          </div>
        )}
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
            date={date}
            salesToday={milk_sales_today}
            initialData={stepData[2] as Step2Data | undefined}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
            saving={saving}
          />
        )}
        {step === 3 && (
          <Step3Health
            date={date}
            herdCounts={herd_counts}
            animals={animals}
            animalRecords={animal_records}
            milkSummary={milk_summary}
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

// ──── Step Indicator ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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

// ──── Step 1: Milk Production Confirmation ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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
        <h2 className="text-lg font-bold text-gray-900">🥛 Milk Production</h2>
        <p className="text-sm text-gray-500 mt-0.5">Review today's milk records</p>
      </div>

      {/* Summary card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-2xl font-bold text-blue-900">{milkSummary.total_litres.toFixed(1)} L</p>
        <p className="text-sm text-blue-600 mt-0.5">Total production today</p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-blue-600">🌅 {milkSummary.morning_litres.toFixed(1)}L</span>
          <span className="text-blue-600">☀️ {milkSummary.midday_litres.toFixed(1)}L</span>
          <span className="text-blue-600">🌆 {milkSummary.evening_litres.toFixed(1)}L</span>
        </div>
        <p className="text-xs text-blue-500 mt-2">{milkSummary.cows_milked} cow{milkSummary.cows_milked !== 1 ? 's' : ''} milked</p>
      </div>

      {milkSummary.total_litres === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
          No milk records found for today.{' '}
          <button onClick={() => router.visit('/milk-records/create')} className="font-medium underline">
            Record milk now →
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

// ──── Step 2: Milk Sales ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

interface SaleEntry { buyer_id: string; channel_label: string; litres: string; price: string }
interface Step2Data { sales?: SaleEntry[]; reviewed?: boolean; notes: string }

const SALE_CHANNELS = [
  { label: 'Farm Gate',    type: 'direct',      icon: '🏡', defaultPrice: 65 },
  { label: 'Sacco',        type: 'cooperative', icon: '🤝', defaultPrice: 43 },
  { label: 'Brookside',    type: 'processor',   icon: '🏭', defaultPrice: 42 },
  { label: 'New KCC',      type: 'processor',   icon: '🏭', defaultPrice: 40 },
  { label: 'Home Use',     type: 'home_use',    icon: '🏠', defaultPrice: 0  },
  { label: 'Calf Feeding', type: 'calf_feeding',icon: '🐄', defaultPrice: 0  },
];

function resolveChannel(buyers: MilkBuyer[], channelType: string): { buyer_id: string; price: string } {
  const buyer = buyers.find(b => b.buyer_type === channelType);
  const fallback = SALE_CHANNELS.find(c => c.type === channelType);
  return {
    buyer_id: buyer?.id ?? '',
    price: buyer?.default_price_per_litre != null
      ? buyer.default_price_per_litre.toString()
      : (fallback?.defaultPrice ?? 0).toString(),
  };
}

function Step2SalesDraft({
  buyers, milkTotal, initialData, onNext, onBack, saving,
}: {
  buyers: MilkBuyer[];
  milkTotal: number;
  initialData?: Step2Data;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const defaultChannel = SALE_CHANNELS[0];
  const defaultResolved = resolveChannel(buyers, defaultChannel.type);

  const [sales, setSales] = useState<SaleEntry[]>(
    initialData?.sales ?? [{
      buyer_id: defaultResolved.buyer_id,
      channel_label: defaultChannel.label,
      litres: '',
      price: defaultResolved.price,
    }]
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const updateSale = (idx: number, field: keyof SaleEntry, value: string) => {
    setSales(prev => prev.map((s, i) => i !== idx ? s : { ...s, [field]: value }));
  };

  const selectChannel = (idx: number, channel: typeof SALE_CHANNELS[number]) => {
    const resolved = resolveChannel(buyers, channel.type);
    setSales(prev => prev.map((s, i) => i !== idx ? s : {
      ...s,
      channel_label: channel.label,
      buyer_id: resolved.buyer_id,
      price: resolved.price,
    }));
  };

  const addSale = () => {
    const resolved = resolveChannel(buyers, defaultChannel.type);
    setSales(prev => [...prev, { buyer_id: resolved.buyer_id, channel_label: defaultChannel.label, litres: '', price: resolved.price }]);
  };
  const removeSale = (idx: number) => setSales(prev => prev.filter((_, i) => i !== idx));

  const totalSold = sales.reduce((sum, s) => sum + (parseFloat(s.litres) || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + ((parseFloat(s.litres) || 0) * (parseFloat(s.price) || 0)), 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🛒 Milk Sales</h2>
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

          {/* Channel chips */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Channel</label>
            <div className="flex flex-wrap gap-2">
              {SALE_CHANNELS.map(ch => (
                <button
                  key={ch.label}
                  type="button"
                  onClick={() => selectChannel(idx, ch)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    sale.channel_label === ch.label
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400',
                  )}
                >
                  <span>{ch.icon}</span>
                  {ch.label}
                </button>
              ))}
            </div>
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
        + Add Another Sale
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

void Step2SalesDraft;

// ──── Step 3: Health Events ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Step2Sales({
  buyers, milkTotal, date, salesToday, initialData, onNext, onBack, saving,
}: {
  buyers: MilkBuyer[];
  milkTotal: number;
  date: string;
  salesToday: MilkSaleToday[];
  initialData?: Step2Data;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [sales, setSales] = useState<MilkSaleToday[]>(salesToday);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const defaultBuyer = buyers[0];
  const [newBuyerId, setNewBuyerId] = useState(defaultBuyer?.id ?? '');
  const [newLitres, setNewLitres] = useState('');
  const [newPrice, setNewPrice] = useState(
    defaultBuyer?.default_price_per_litre?.toString() ?? '42'
  );
  const [newPayment, setNewPayment] = useState('cash');

  const totalSold = sales.reduce((s, r) => s + Number(r.quantity_litres), 0);
  const totalRevenue = sales.reduce((s, r) => s + Number(r.total_amount), 0);

  const selectBuyer = (id: string) => {
    setNewBuyerId(id);
    const b = buyers.find(b => b.id === id);
    if (b?.default_price_per_litre) setNewPrice(b.default_price_per_litre.toString());
  };

  const submitSale = async () => {
    if (!newBuyerId || !newLitres || parseFloat(newLitres) <= 0) {
      setFormError('Enter litres sold and select a buyer.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await axios.post('/milk-sales', {
        milk_buyer_id: newBuyerId,
        sale_date: date,
        quantity_litres: parseFloat(newLitres),
        price_per_litre: parseFloat(newPrice) || 0,
        payment_method: newPayment,
      });
      const sale = res.data.sale as MilkSaleToday;
      setSales(prev => [...prev, sale]);
      setNewLitres('');
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Failed to save sale. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🛒 Milk Sales</h2>
        <p className="text-sm text-gray-500">Record sales for {formatDate(date)}</p>
      </div>

      {/* Summary strip */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-green-600">Produced</p>
          <p className="text-sm font-bold text-green-900">{milkTotal.toFixed(1)} L</p>
        </div>
        <div>
          <p className="text-xs text-green-600">Sold</p>
          <p className="text-sm font-bold text-green-900">{totalSold.toFixed(1)} L</p>
        </div>
        <div>
          <p className="text-xs text-green-600">Revenue</p>
          <p className="text-sm font-bold text-green-900">{formatKES(totalRevenue)}</p>
        </div>
      </div>

      {/* Existing sales */}
      {sales.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500">
          No sales recorded yet for today
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map((s, i) => (
            <div key={s.id ?? i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.buyer?.name ?? 'Buyer'}</p>
                <p className="text-xs text-gray-500">{Number(s.quantity_litres).toFixed(1)} L @ KES {Number(s.price_per_litre).toFixed(0)}/L · {s.payment_method}</p>
              </div>
              <p className="text-sm font-bold text-green-700">{formatKES(Number(s.total_amount))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add sale form */}
      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">New Sale</p>

          {/* Buyer selection */}
          {buyers.length > 0 ? (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Buyer</label>
              <div className="flex flex-wrap gap-2">
                {buyers.map(b => (
                  <button key={b.id} type="button"
                    onClick={() => selectBuyer(b.id)}
                    style={{ touchAction: 'manipulation' }}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      newBuyerId === b.id
                        ? 'bg-primary-900 text-white border-primary-900'
                        : 'bg-white text-gray-600 border-gray-300',
                    )}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No buyers configured. Ask a manager to add milk buyers first.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Litres Sold" type="number" min="0.1" step="0.1" inputMode="decimal"
              placeholder="0.0" unit="L"
              value={newLitres} onChange={e => setNewLitres(e.target.value)} />
            <Input label="Price / Litre" type="number" min="0" step="1" inputMode="decimal"
              placeholder="42" unit="KES"
              value={newPrice} onChange={e => setNewPrice(e.target.value)} />
          </div>

          {newLitres && newPrice && (
            <p className="text-xs text-green-700 font-medium">
              Total: {formatKES((parseFloat(newLitres) || 0) * (parseFloat(newPrice) || 0))}
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Payment</label>
            <div className="flex gap-2">
              {['cash', 'mpesa', 'bank', 'credit'].map(m => (
                <button key={m} type="button" onClick={() => setNewPayment(m)}
                  style={{ touchAction: 'manipulation' }}
                  className={clsx(
                    'flex-1 py-2 rounded-xl border text-xs font-medium capitalize',
                    newPayment === m ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-200',
                  )}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600">
              Cancel
            </button>
            <button type="button" onClick={submitSale} disabled={submitting || !newLitres || !newBuyerId}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-3 rounded-xl bg-primary-900 text-white text-sm font-semibold disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save Sale'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}
          style={{ touchAction: 'manipulation' }}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 active:border-primary-400 active:text-primary-600">
          + Add Milk Sale
        </button>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Sales Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Unpaid buyer, unsold milk, payment follow-up..."
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
      </div>

      <WizardFooter
        onNext={() => onNext({ reviewed: true, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Next: Health"
      />
    </div>
  );
}

type HerdGroupKey = 'calves' | 'heifers' | 'lactating' | 'dry' | 'bulls';
type IndicatorKey = 'eating' | 'alert' | 'water' | 'diarrhea' | 'cough' | 'injuries' | 'lameness' | 'behavior';
type AuditKey = 'equipment' | 'teats' | 'post_dip' | 'filtered' | 'stored' | 'area';
type WaterKey = 'available' | 'clean' | 'leaks';

interface HerdCountEntry { expected: number; present: string }
interface GroupHealthEntry { indicators: Record<IndicatorKey, boolean>; notes: string }
interface SickAnimalEntry { animal_id: string; problem: string; severity: 'Low' | 'Medium' | 'High'; treatment: string; vet_required: boolean; status: string }
interface ReproEntry { heat: string; ai: string; pd_due: string; expected_calvings: string; new_calvings: string; abortions: string; notes: string }
interface Step3Data {
  form_name?: string;
  inspection_date?: string;
  herd_counts?: Record<HerdGroupKey, HerdCountEntry>;
  group_health?: Record<HerdGroupKey, GroupHealthEntry>;
  sick_animals?: SickAnimalEntry[];
  reproduction?: ReproEntry;
  milking_audit?: Record<AuditKey, boolean>;
  morning_milk?: Record<string, string>;
  water_audit?: Record<WaterKey, boolean>;
  water_comments?: string;
  critical_alerts?: string[];
  alert_explanation?: string;
  generated_summary?: string;
  notes_summary?: string;
  events?: string;
  notes?: string;
}

const HERD_GROUPS: { key: HerdGroupKey; label: string; countKey: keyof HerdCounts }[] = [
  { key: 'calves', label: 'Calves', countKey: 'calves' },
  { key: 'heifers', label: 'Heifers', countKey: 'heifers' },
  { key: 'lactating', label: 'Lactating Cows', countKey: 'lactating' },
  { key: 'dry', label: 'Dry Cows', countKey: 'dry' },
  { key: 'bulls', label: 'Bulls', countKey: 'bulls' },
];
const HEALTH_INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: 'eating', label: 'Eating normally' },
  { key: 'alert', label: 'Active/alert' },
  { key: 'water', label: 'Drinking water' },
  { key: 'diarrhea', label: 'No diarrhea' },
  { key: 'cough', label: 'No cough' },
  { key: 'injuries', label: 'No injuries' },
  { key: 'lameness', label: 'No lameness' },
  { key: 'behavior', label: 'Normal behavior' },
];
const SICK_PROBLEMS = ['Mastitis', 'Lameness', 'Fever', 'Pneumonia', 'Diarrhea', 'Injury', 'Retained placenta', 'Milk fever', 'Ketosis', 'Poor appetite', 'Other'];
const AUDIT_ITEMS: { key: AuditKey; label: string }[] = [
  { key: 'equipment', label: 'Milking equipment cleaned' },
  { key: 'teats', label: 'Teats cleaned before milking' },
  { key: 'post_dip', label: 'Post-dip completed' },
  { key: 'filtered', label: 'Milk filtered' },
  { key: 'stored', label: 'Milk stored correctly' },
  { key: 'area', label: 'Milking area cleaned' },
];
const ALERT_OPTIONS = ['Sick animal', 'Mastitis', 'Calving problem', 'Milk drop', 'Feed shortage', 'Water shortage', 'Injury', 'Missing animal', 'Abortion', 'Other'];

function Step3Health({
  date, herdCounts, animals, animalRecords, milkSummary, initialData, onNext, onBack, saving,
}: {
  date: string;
  herdCounts: HerdCounts;
  animals: ReportAnimal[];
  animalRecords: AnimalMilkRecord[];
  milkSummary: WizardProps['milk_summary'];
  initialData?: Step3Data;
  onNext: (data: Step3Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const defaultHerd = HERD_GROUPS.reduce((acc, group) => ({
    ...acc,
    [group.key]: { expected: herdCounts[group.countKey], present: String(herdCounts[group.countKey]) },
  }), {} as Record<HerdGroupKey, HerdCountEntry>);
  const defaultHealth = HERD_GROUPS.reduce((acc, group) => ({
    ...acc,
    [group.key]: {
      indicators: HEALTH_INDICATORS.reduce((flags, indicator) => ({ ...flags, [indicator.key]: true }), {} as Record<IndicatorKey, boolean>),
      notes: '',
    },
  }), {} as Record<HerdGroupKey, GroupHealthEntry>);
  const defaultMilk = animalRecords.reduce((acc, record) => ({
    ...acc,
    [record.animal_id]: record.morning?.litres ? String(record.morning.litres) : '',
  }), {} as Record<string, string>);

  const [herd, setHerd] = useState(initialData?.herd_counts ?? defaultHerd);
  const [groupHealth, setGroupHealth] = useState(initialData?.group_health ?? defaultHealth);
  const [sickAnimals, setSickAnimals] = useState<SickAnimalEntry[]>(initialData?.sick_animals ?? []);
  const [repro, setRepro] = useState<ReproEntry>(initialData?.reproduction ?? { heat: '0', ai: '0', pd_due: '0', expected_calvings: '0', new_calvings: '0', abortions: '0', notes: '' });
  const [milkingAudit, setMilkingAudit] = useState<Record<AuditKey, boolean>>(initialData?.milking_audit ?? { equipment: true, teats: true, post_dip: true, filtered: true, stored: true, area: true });
  const [morningMilk, setMorningMilk] = useState<Record<string, string>>(initialData?.morning_milk ?? defaultMilk);
  const [waterAudit, setWaterAudit] = useState<Record<WaterKey, boolean>>(initialData?.water_audit ?? { available: true, clean: true, leaks: true });
  const [waterComments, setWaterComments] = useState(initialData?.water_comments ?? '');
  const [criticalAlerts, setCriticalAlerts] = useState<string[]>(initialData?.critical_alerts ?? []);
  const [alertExplanation, setAlertExplanation] = useState(initialData?.alert_explanation ?? '');

  const lactatingRecords = animalRecords.filter(record => animals.find(a => a.id === record.animal_id)?.status === 'lactating' || record.daily_total > 0);
  const missingAnimals = HERD_GROUPS.reduce((sum, group) => sum + missingCount(herd[group.key]), 0);
  const highSeverity = sickAnimals.filter(entry => entry.severity === 'High').length;
  const abortions = Number(repro.abortions || 0);
  const waterIssues = Object.values(waterAudit).filter(value => !value).length;
  const auditPasses = Object.values(milkingAudit).filter(Boolean).length;
  const compliance = Math.round((auditPasses / AUDIT_ITEMS.length) * 100);
  const milkValues = Object.values(morningMilk).map(Number).filter(v => !Number.isNaN(v) && v > 0);
  const totalMorningMilk = milkValues.reduce((sum, v) => sum + v, 0);
  const avgMorningMilk = milkValues.length ? totalMorningMilk / milkValues.length : 0;
  const producers = lactatingRecords.map(record => ({
    label: record.name ?? record.tag_number,
    litres: Number(morningMilk[record.animal_id] || 0),
  })).filter(row => row.litres > 0).sort((a, b) => b.litres - a.litres);
  const generatedAlerts = [
    ...(missingAnimals > 0 ? ['Missing animal'] : []),
    ...(highSeverity > 0 ? ['Sick animal'] : []),
    ...(abortions > 0 ? ['Abortion'] : []),
    ...(waterIssues > 0 ? ['Water shortage'] : []),
  ];
  const selectedAlerts = Array.from(new Set([...criticalAlerts, ...generatedAlerts]));
  const summary = buildInspectionSummary(date, herd, sickAnimals, selectedAlerts, repro, totalMorningMilk, avgMorningMilk, compliance, waterIssues);

  const submitData: Step3Data = {
    form_name: 'AM Herd Health & Milking Inspection',
    inspection_date: date,
    herd_counts: herd,
    group_health: groupHealth,
    sick_animals: sickAnimals,
    reproduction: repro,
    milking_audit: milkingAudit,
    morning_milk: morningMilk,
    water_audit: waterAudit,
    water_comments: waterComments,
    critical_alerts: selectedAlerts,
    alert_explanation: alertExplanation,
    generated_summary: summary,
    notes_summary: summary,
    notes: alertExplanation,
  };

  const notesSummary = '';
  const notes = '';
  const setNotesSummary = (_value: string) => {};
  const setNotes = (_value: string) => {};

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">AM Herd Health & Milking Inspection</h2>
        <p className="text-sm text-gray-500">Morning inspection window: 5:00 AM - 9:00 AM</p>
      </div>

      {missingAnimals > 0 && <AlertBanner tone="red" text="Animal count mismatch detected." />}
      {highSeverity > 0 && <AlertBanner tone="red" text="High severity sick animal requires urgent follow-up." />}
      {abortions > 0 && <AlertBanner tone="red" text="Abortion reported. Urgent alert required." />}
      {waterIssues > 0 && <AlertBanner tone="amber" text="Water audit issue detected." />}

      <InspectionSection title="1. Herd Count Verification">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] bg-gray-50 px-3 py-2 text-xs font-bold uppercase text-gray-500">
            <span>Group</span><span className="text-center">Expected</span><span className="text-center">Present</span><span className="text-center">Missing</span>
          </div>
          {HERD_GROUPS.map(group => {
            const row = herd[group.key];
            const missing = missingCount(row);
            return (
              <div key={group.key} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] items-center border-t border-gray-100 px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{group.label}</span>
                <span className="text-center text-gray-600">{row.expected}</span>
                <input type="number" min="0" value={row.present} onChange={e => setHerd(prev => ({ ...prev, [group.key]: { ...prev[group.key], present: e.target.value } }))} className="mx-auto h-9 w-16 rounded-lg border border-gray-300 text-center text-sm" />
                <span className={clsx('text-center font-bold', missing > 0 ? 'text-red-600' : 'text-green-700')}>{missing}</span>
              </div>
            );
          })}
        </div>
      </InspectionSection>

      <InspectionSection title="2. Group Health Assessment">
        {HERD_GROUPS.map(group => {
          const score = healthScore(groupHealth[group.key]);
          return (
            <div key={group.key} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{group.label}</p>
                <ScoreBadge score={score} total={8} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HEALTH_INDICATORS.map(indicator => (
                  <YesNoToggle key={indicator.key} label={indicator.label} value={groupHealth[group.key].indicators[indicator.key]} onChange={value => setGroupHealth(prev => ({ ...prev, [group.key]: { ...prev[group.key], indicators: { ...prev[group.key].indicators, [indicator.key]: value } } }))} />
                ))}
              </div>
              <textarea value={groupHealth[group.key].notes} onChange={e => setGroupHealth(prev => ({ ...prev, [group.key]: { ...prev[group.key], notes: e.target.value } }))} rows={2} placeholder="Observations" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none" />
            </div>
          );
        })}
      </InspectionSection>

      <InspectionSection title="3. Sick Animals Register">
        {sickAnimals.map((entry, idx) => (
          <div key={idx} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Sick Animal {idx + 1}</p>
              <button type="button" onClick={() => setSickAnimals(prev => prev.filter((_, i) => i !== idx))} className="text-xs font-medium text-red-600">Remove</button>
            </div>
            <select value={entry.animal_id} onChange={e => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, animal_id: e.target.value } : row))} className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm">
              {animals.map(animal => <option key={animal.id} value={animal.id}>{animal.tag_number}{animal.name ? ` - ${animal.name}` : ''}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={entry.problem} onChange={e => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, problem: e.target.value } : row))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm">
                {SICK_PROBLEMS.map(problem => <option key={problem} value={problem}>{problem}</option>)}
              </select>
              <select value={entry.severity} onChange={e => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, severity: e.target.value as SickAnimalEntry['severity'] } : row))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm">
                {['Low', 'Medium', 'High'].map(severity => <option key={severity} value={severity}>{severity}</option>)}
              </select>
            </div>
            <textarea value={entry.treatment} onChange={e => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, treatment: e.target.value } : row))} rows={2} placeholder="Treatment given" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <YesNoToggle label="Vet required" value={entry.vet_required} onChange={value => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, vet_required: value } : row))} />
              <select value={entry.status} onChange={e => setSickAnimals(prev => prev.map((row, i) => i === idx ? { ...row, status: e.target.value } : row))} className="h-11 rounded-xl border border-gray-300 px-3 text-sm">
                {['Under observation', 'Treated', 'Escalated'].map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setSickAnimals(prev => [...prev, { animal_id: animals[0]?.id ?? '', problem: 'Mastitis', severity: 'Low', treatment: '', vet_required: false, status: 'Under observation' }])} className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600">+ Add Sick Animal</button>
      </InspectionSection>

      <InspectionSection title="4. Reproduction Monitoring">
        <div className="grid grid-cols-2 gap-3">
          <SmallNumber label="Cows in heat" value={repro.heat} onChange={value => setRepro(prev => ({ ...prev, heat: value }))} />
          <SmallNumber label="AI performed" value={repro.ai} onChange={value => setRepro(prev => ({ ...prev, ai: value }))} />
          <SmallNumber label="PD checks due" value={repro.pd_due} onChange={value => setRepro(prev => ({ ...prev, pd_due: value }))} />
          <SmallNumber label="Expected calvings" value={repro.expected_calvings} onChange={value => setRepro(prev => ({ ...prev, expected_calvings: value }))} />
          <SmallNumber label="New calvings" value={repro.new_calvings} onChange={value => setRepro(prev => ({ ...prev, new_calvings: value }))} />
          <SmallNumber label="Abortions" value={repro.abortions} onChange={value => setRepro(prev => ({ ...prev, abortions: value }))} />
        </div>
        <textarea value={repro.notes} onChange={e => setRepro(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Additional reproduction notes" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none" />
      </InspectionSection>

      <InspectionSection title="5. Milking Process Audit">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span className="text-sm font-medium text-gray-700">Milking Compliance Score</span>
          <span className={clsx('text-sm font-bold', complianceClass(compliance))}>{auditPasses}/6 ({compliance}%)</span>
        </div>
        {AUDIT_ITEMS.map(item => <PassFailToggle key={item.key} label={item.label} value={milkingAudit[item.key]} onChange={value => setMilkingAudit(prev => ({ ...prev, [item.key]: value }))} />)}
      </InspectionSection>

      <InspectionSection title="6. Morning Milk Production">
        <div className="grid grid-cols-2 gap-2">
          <KpiMini label="Total Milk" value={`${totalMorningMilk.toFixed(1)} L`} />
          <KpiMini label="Average Milk" value={`${avgMorningMilk.toFixed(1)} L/cow`} />
          <KpiMini label="Highest Producer" value={producers[0] ? `${producers[0].label} ${producers[0].litres.toFixed(1)}L` : '-'} />
          <KpiMini label="Lowest Producer" value={producers[producers.length - 1] ? `${producers[producers.length - 1].label} ${producers[producers.length - 1].litres.toFixed(1)}L` : '-'} />
        </div>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200">
          {lactatingRecords.map(record => (
            <div key={record.animal_id} className="flex items-center justify-between border-b border-gray-100 px-3 py-2 last:border-b-0">
              <span className="min-w-0 truncate text-sm text-gray-700">{record.tag_number}{record.name ? ` - ${record.name}` : ''}</span>
              <input type="number" min="0" step="0.1" value={morningMilk[record.animal_id] ?? ''} onChange={e => setMorningMilk(prev => ({ ...prev, [record.animal_id]: e.target.value }))} className="h-10 w-24 rounded-lg border border-gray-300 px-2 text-right text-sm" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => router.visit('/milk-records/create?date=' + date)} className="text-sm font-medium text-primary-900 underline">Open full milk entry</button>
        {milkSummary.morning_litres > 0 && totalMorningMilk < milkSummary.morning_litres * 0.8 && <AlertBanner tone="amber" text="Morning milk is more than 20% below the saved morning total." />}
      </InspectionSection>

      <InspectionSection title="7. Water Audit">
        <YesNoToggle label="Water available" value={waterAudit.available} onChange={value => setWaterAudit(prev => ({ ...prev, available: value }))} />
        <YesNoToggle label="Water troughs clean" value={waterAudit.clean} onChange={value => setWaterAudit(prev => ({ ...prev, clean: value }))} />
        <YesNoToggle label="No leaks" value={waterAudit.leaks} onChange={value => setWaterAudit(prev => ({ ...prev, leaks: value }))} />
        <textarea value={waterComments} onChange={e => setWaterComments(e.target.value)} rows={2} placeholder="Additional water comments" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none" />
      </InspectionSection>

      <InspectionSection title="8. Critical Alerts">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCriticalAlerts([])} className={clsx('rounded-full border px-3 py-2 text-xs font-medium', criticalAlerts.length === 0 ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-600')}>No alerts</button>
          {ALERT_OPTIONS.map(alert => (
            <button key={alert} type="button" onClick={() => setCriticalAlerts(prev => prev.includes(alert) ? prev.filter(a => a !== alert) : [...prev, alert])} className={clsx('rounded-full border px-3 py-2 text-xs font-medium', selectedAlerts.includes(alert) ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-300 bg-white text-gray-600')}>{alert}</button>
          ))}
        </div>
        {selectedAlerts.length > 0 && <textarea value={alertExplanation} onChange={e => setAlertExplanation(e.target.value)} rows={3} placeholder="Required explanation for selected alerts" className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm resize-none" />}
      </InspectionSection>

      <InspectionSection title="Morning Farm Summary">
        <pre className="whitespace-pre-wrap rounded-xl bg-gray-900 p-3 text-xs leading-5 text-white">{summary}</pre>
      </InspectionSection>

      <WizardFooter onNext={() => onNext(submitData)} onBack={onBack} loading={saving} nextLabel="Next: Feed" />
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🏥 Herd Health</h2>
        <p className="text-sm text-gray-500">Add report notes; structured cases belong in Health Events.</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-600">
        <p className="font-medium mb-1">For detailed health records, use:</p>
        <button
          onClick={() => router.visit('/health/create')}
          className="text-primary-900 font-medium underline"
        >
          Open Health Event Form
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Health Notes for Daily Report (optional)</label>
        <textarea
          value={notesSummary}
          onChange={e => setNotesSummary(e.target.value)}
          rows={3}
          placeholder="e.g. Cow #3 (Bella) — mastitis check done, Cow #7 — dewormed..."
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
        onNext={() => onNext({ notes_summary: notesSummary, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Next: Feed"
      />
    </div>
  );
}

// ──── Step 4: Feed Usage ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function InspectionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function YesNoToggle({
  label, value, onChange, yesLabel = 'Yes', noLabel = 'No',
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
      <p className="mb-2 text-xs font-medium text-gray-700">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={() => onChange(true)} className={clsx('rounded-lg py-2 text-xs font-bold', value ? 'bg-green-600 text-white' : 'bg-white text-gray-500')}>{yesLabel}</button>
        <button type="button" onClick={() => onChange(false)} className={clsx('rounded-lg py-2 text-xs font-bold', !value ? 'bg-red-600 text-white' : 'bg-white text-gray-500')}>{noLabel}</button>
      </div>
    </div>
  );
}

function PassFailToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <YesNoToggle label={label} value={value} onChange={onChange} yesLabel="Pass" noLabel="Fail" />;
}

function SmallNumber({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-3 text-sm text-gray-900" />
    </label>
  );
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const tone = score >= 7 ? 'bg-green-50 text-green-700 border-green-200' : score >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';
  return <span className={clsx('rounded-full border px-2 py-1 text-xs font-bold', tone)}>{score}/{total}</span>;
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AlertBanner({ tone, text }: { tone: 'red' | 'amber'; text: string }) {
  const styles = tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  return <div className={clsx('rounded-xl border px-3 py-2 text-sm font-medium', styles)}>{text}</div>;
}

function missingCount(row: HerdCountEntry): number {
  return Math.max(0, row.expected - (Number(row.present) || 0));
}

function healthScore(group: GroupHealthEntry): number {
  return Object.values(group.indicators).filter(Boolean).length;
}

function complianceClass(score: number): string {
  if (score >= 90) return 'text-green-700';
  if (score >= 70) return 'text-amber-700';
  return 'text-red-700';
}

function buildInspectionSummary(
  date: string,
  herd: Record<HerdGroupKey, HerdCountEntry>,
  sickAnimals: SickAnimalEntry[],
  alerts: string[],
  repro: ReproEntry,
  totalMilk: number,
  avgMilk: number,
  milkingCompliance: number,
  waterIssues: number,
): string {
  const totalHerd = HERD_GROUPS.reduce((sum, group) => sum + herd[group.key].expected, 0);
  const missing = HERD_GROUPS.reduce((sum, group) => sum + missingCount(herd[group.key]), 0);

  return [
    `Morning Farm Summary - ${formatDate(date)}`,
    '',
    `Herd: Total ${totalHerd}, Missing ${missing}`,
    `Health: Sick ${sickAnimals.length}, Treatments ${sickAnimals.filter(a => a.treatment.trim()).length}, Urgent alerts ${alerts.length}`,
    `Reproduction: Heat ${repro.heat || 0}, AI ${repro.ai || 0}, Calvings ${repro.new_calvings || 0}, Abortions ${repro.abortions || 0}`,
    `Milk: Lactating ${herd.lactating.expected}, Morning total ${totalMilk.toFixed(1)} L, Average ${avgMilk.toFixed(1)} L/cow`,
    `Operations: Milking compliance ${milkingCompliance}%, Water compliance ${waterIssues === 0 ? '100%' : 'Needs attention'}`,
    '',
    `Escalations: ${alerts.length ? alerts.join(', ') : 'None'}`,
  ].join('\n');
}

interface FeedEntry { feed_type: string; quantity: string; unit: string; cost: string }
interface Step4Data { feeds?: FeedEntry[]; reviewed?: boolean; notes: string }

const FEED_TYPES = ['Napier Grass', 'Dairy Meal', 'Hay', 'Maize Silage', 'Oats', 'Minerals/Salt', 'Calf Pellets', 'Other'];

function Step4FeedDraft({
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
        <h2 className="text-lg font-bold text-gray-900">🌾 Feed Usage</h2>
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

void Step4FeedDraft;

// ──── Step 5: Review & Submit ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Step4Feed({
  initialData, onNext, onBack, saving,
}: {
  initialData?: Step4Data;
  onNext: (data: Step4Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Feed Usage</h2>
        <p className="text-sm text-gray-500">Confirm feed movements were recorded in inventory.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm text-gray-700">
          Feed cost in the submitted daily report is calculated from saved feed inventory transactions for this date.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.visit('/feed/consume')}
            style={{ touchAction: 'manipulation' }}
            className="py-3 rounded-xl bg-primary-900 text-white text-sm font-semibold active:opacity-80 min-h-[48px]"
          >
            Record Usage
          </button>
          <button
            type="button"
            onClick={() => router.visit('/feed/receive')}
            style={{ touchAction: 'manipulation' }}
            className="py-3 rounded-xl border border-primary-900 text-primary-900 text-sm font-semibold active:bg-primary-50 min-h-[48px]"
          >
            Record Stock
          </button>
        </div>
      </div>

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
        onNext={() => onNext({ reviewed: true, notes })}
        onBack={onBack}
        loading={saving}
        nextLabel="Review & Submit"
      />
    </div>
  );
}

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
  void stepData;

  const [weather, setWeather] = useState(
    (report.draft_data?.step_5 as { weather?: string } | undefined)?.weather ?? 'Sunny'
  );
  const [managerNotes, setManagerNotes] = useState(
    (report.draft_data?.step_5 as { manager_notes?: string } | undefined)?.manager_notes ?? ''
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📋 Review & Submit</h2>
        <p className="text-sm text-gray-500">{formatDate(date)}</p>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <SummaryRow label="🥛 Total Milk" value={`${milkSummary.total_litres.toFixed(1)} L`} />
        <SummaryRow label="🐄 Cows Milked" value={milkSummary.cows_milked.toString()} />
        <SummaryRow label="Milk Revenue" value="Calculated from Milk Sales on submit" />
        <SummaryRow label="Feed Cost" value="Calculated from Feed Inventory on submit" />
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
        💬 After submitting, a WhatsApp summary will be prepared for your farm owner.
      </div>

      {/* Buttons */}
      <div className="space-y-3 pb-4">
        <Button
          fullWidth size="lg"
          loading={saving}
          onClick={() => onSubmit({ weather, manager_notes: managerNotes })}
          className="bg-green-600 hover:bg-green-700"
        >
          ✓ Submit Daily Report
        </Button>
        <Button fullWidth variant="ghost" onClick={onBack} disabled={saving}>
          ← Back
        </Button>
      </div>
    </div>
  );
}

// ──── Shared sub-components ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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
