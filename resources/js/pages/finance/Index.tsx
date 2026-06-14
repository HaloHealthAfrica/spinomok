import React, { useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Plus, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { PageProps, FinanceKPIs, ProfitabilitySnapshot, Expense, Revenue, BreakEven, FinanceTrendPoint, MilkSale } from '@/types';
import { formatKES, formatDate, today } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceIndexProps extends PageProps {
  kpis: FinanceKPIs;
  snapshot: ProfitabilitySnapshot;
  expenses: Expense[];
  revenues: Revenue[];
  milk_sales_breakdown: (MilkSale & { buyer?: { id: string; name: string; buyer_type: string } })[];
  trend: FinanceTrendPoint[];
  break_even: BreakEven;
  month: string;
}

const TABS = ['P&L', 'Expenses', 'Revenue', 'Break-Even'] as const;
type Tab = typeof TABS[number];

const EXPENSE_ICONS: Record<string, string> = {
  feed: '🌾', vet: '🏥', veterinary: '🏥', labour: '👷',
  equipment: '🔧', utilities: '💡', land: '🌱',
  transport: '🚛', breeding: '🐂', other: '📦',
};

const REVENUE_ICONS: Record<string, string> = {
  milk_sales: '🥛', animal_sales: '🐄', manure_sales: '♻️',
  crop_sales: '🌿', subsidy: '🏛️', other: '💰',
};

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Expense Modal ────────────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { value: 'feed',      label: '🌾 Feed' },
  { value: 'vet',       label: '🏥 Vet' },
  { value: 'labour',    label: '👷 Labour' },
  { value: 'equipment', label: '🔧 Equipment' },
  { value: 'utilities', label: '💡 Utilities' },
  { value: 'transport', label: '🚛 Transport' },
  { value: 'breeding',  label: '🐂 Breeding' },
  { value: 'other',     label: '📦 Other' },
];

const REVENUE_CATS = [
  { value: 'animal_sales', label: '🐄 Animal Sales' },
  { value: 'manure_sales', label: '♻️ Manure' },
  { value: 'crop_sales',   label: '🌿 Crop/Fodder' },
  { value: 'subsidy',      label: '🏛️ Subsidy' },
  { value: 'other',        label: '💰 Other' },
];

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const { data, setData, post, processing, errors } = useForm({
    category: 'feed',
    expense_date: today(),
    description: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/finance/expense', {
      onSuccess: onClose,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '16px 16px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Record Expense</span>
          <button type="button" onClick={onClose} style={{ padding: 8, touchAction: 'manipulation' }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <form onSubmit={submit} noValidate style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {EXPENSE_CATS.map(c => (
                <button key={c.value} type="button"
                  onClick={() => setData('category', c.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
                    borderColor: data.category === c.value ? '#DC2626' : '#E5E7EB',
                    background: data.category === c.value ? '#DC2626' : '#fff',
                    color: data.category === c.value ? '#fff' : '#374151',
                    fontSize: 13, fontWeight: 500, textAlign: 'left',
                    touchAction: 'manipulation',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={data.expense_date} max={today()}
              onChange={e => setData('expense_date', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" value={data.description} placeholder="e.g. Dairy meal 50 kg"
              onChange={e => setData('description', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: `1.5px solid ${errors.description ? '#EF4444' : '#E5E7EB'}`, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            {errors.description && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.description}</p>}
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Amount (KES) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="number" inputMode="decimal" min="1" step="1" value={data.amount} placeholder="0"
              onChange={e => setData('amount', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: `1.5px solid ${errors.amount ? '#EF4444' : '#E5E7EB'}`, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            {errors.amount && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.amount}</p>}
          </div>

          {/* Payment */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Payment Method</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'mpesa', 'bank', 'credit'].map(m => (
                <button key={m} type="button" onClick={() => setData('payment_method', m)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid',
                    borderColor: data.payment_method === m ? '#1B5E20' : '#E5E7EB',
                    background: data.payment_method === m ? '#1B5E20' : '#fff',
                    color: data.payment_method === m ? '#fff' : '#6B7280',
                    fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
                    touchAction: 'manipulation',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Additional details..."
              style={{ width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '10px 12px', fontSize: 16, resize: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={processing || !data.description || !data.amount}
            style={{
              height: 52, width: '100%', borderRadius: 12, border: 'none',
              background: processing || !data.description || !data.amount ? '#9CA3AF' : '#DC2626',
              color: '#fff', fontSize: 16, fontWeight: 700,
              touchAction: 'manipulation', cursor: processing ? 'wait' : 'pointer',
            }}>
            {processing ? 'Saving…' : `Record Expense${data.amount ? ` — KES ${Number(data.amount).toLocaleString()}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function RevenueModal({ onClose }: { onClose: () => void }) {
  const { data, setData, post, processing, errors } = useForm({
    category: 'animal_sales',
    revenue_date: today(),
    description: '',
    amount: '',
    buyer_name: '',
    payment_method: 'cash',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/finance/revenue', {
      onSuccess: onClose,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '16px 16px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Record Revenue</span>
          <button type="button" onClick={onClose} style={{ padding: 8, touchAction: 'manipulation' }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <form onSubmit={submit} noValidate style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Revenue Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {REVENUE_CATS.map(c => (
                <button key={c.value} type="button"
                  onClick={() => setData('category', c.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
                    borderColor: data.category === c.value ? '#16A34A' : '#E5E7EB',
                    background: data.category === c.value ? '#16A34A' : '#fff',
                    color: data.category === c.value ? '#fff' : '#374151',
                    fontSize: 13, fontWeight: 500, textAlign: 'left',
                    touchAction: 'manipulation',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={data.revenue_date} max={today()}
              onChange={e => setData('revenue_date', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" value={data.description} placeholder="e.g. Bull calf sold"
              onChange={e => setData('description', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: `1.5px solid ${errors.description ? '#EF4444' : '#E5E7EB'}`, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            {errors.description && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.description}</p>}
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Amount (KES) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="number" inputMode="decimal" min="1" step="1" value={data.amount} placeholder="0"
              onChange={e => setData('amount', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: `1.5px solid ${errors.amount ? '#EF4444' : '#E5E7EB'}`, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            {errors.amount && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.amount}</p>}
          </div>

          {/* Buyer */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Buyer Name (optional)</label>
            <input type="text" value={data.buyer_name} placeholder="e.g. Nakuru Market"
              onChange={e => setData('buyer_name', e.target.value)}
              style={{ height: 48, width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>

          {/* Payment */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Payment Method</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'mpesa', 'bank', 'credit'].map(m => (
                <button key={m} type="button" onClick={() => setData('payment_method', m)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid',
                    borderColor: data.payment_method === m ? '#1B5E20' : '#E5E7EB',
                    background: data.payment_method === m ? '#1B5E20' : '#fff',
                    color: data.payment_method === m ? '#fff' : '#6B7280',
                    fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
                    touchAction: 'manipulation',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
              placeholder="Additional details..."
              style={{ width: '100%', borderRadius: 10, border: '1.5px solid #E5E7EB', padding: '10px 12px', fontSize: 16, resize: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={processing || !data.description || !data.amount}
            style={{
              height: 52, width: '100%', borderRadius: 12, border: 'none',
              background: processing || !data.description || !data.amount ? '#9CA3AF' : '#16A34A',
              color: '#fff', fontSize: 16, fontWeight: 700,
              touchAction: 'manipulation', cursor: processing ? 'wait' : 'pointer',
            }}>
            {processing ? 'Saving…' : `Record Revenue${data.amount ? ` — KES ${Number(data.amount).toLocaleString()}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceIndex() {
  const { kpis, snapshot, expenses, revenues, milk_sales_breakdown, break_even, month } =
    usePage<FinanceIndexProps>().props;

  const [tab, setTab] = useState<Tab>('Expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const navigateMonth = (dir: -1 | 1) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    router.get('/finance', { month: next }, {
      preserveState: true,
      only: ['kpis', 'snapshot', 'expenses', 'revenues', 'milk_sales_breakdown', 'trend', 'break_even', 'month'],
    });
  };

  const isProfit = (kpis.net_profit ?? 0) >= 0;

  return (
    <AppLayout title="Finance">
      {/* ── Header ── */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-3">
          <h1 className="text-white text-xl font-bold">Finance</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              style={{ touchAction: 'manipulation' }}
              className="bg-red-500 text-white px-3 py-2 rounded-full text-xs font-semibold active:opacity-80 min-h-[36px]"
            >
              + Expense
            </button>
            <button
              type="button"
              onClick={() => setShowRevenueModal(true)}
              style={{ touchAction: 'manipulation' }}
              className="bg-green-500 text-white px-3 py-2 rounded-full text-xs font-semibold active:opacity-80 min-h-[36px]"
            >
              + Revenue
            </button>
          </div>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 mb-3">
          <button onClick={() => navigateMonth(-1)} className="text-white/80 w-8 text-lg">‹</button>
          <span className="text-white font-semibold text-sm">{kpis.month_label}</span>
          <button
            onClick={() => navigateMonth(1)}
            disabled={month >= new Date().toISOString().slice(0, 7)}
            className="text-white/80 w-8 text-lg disabled:opacity-30"
          >
            ›
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <TrendingUp className="h-4 w-4 text-green-300 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{formatKES(kpis.total_revenue)}</p>
            <p className="text-primary-200 text-xs">Revenue</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <TrendingDown className="h-4 w-4 text-red-300 mx-auto mb-1" />
            <p className="text-white text-sm font-bold">{formatKES(kpis.total_expenses)}</p>
            <p className="text-primary-200 text-xs">Expenses</p>
          </div>
          <div className={clsx('rounded-xl p-3 text-center', isProfit ? 'bg-green-500/20' : 'bg-red-500/20')}>
            {isProfit
              ? <TrendingUp className="h-4 w-4 text-green-300 mx-auto mb-1" />
              : <TrendingDown className="h-4 w-4 text-red-300 mx-auto mb-1" />}
            <p className={clsx('text-sm font-bold', isProfit ? 'text-green-200' : 'text-red-200')}>
              {isProfit ? '+' : ''}{formatKES(kpis.net_profit)}
            </p>
            <p className="text-primary-200 text-xs">Net Profit</p>
          </div>
        </div>

        {/* Cost per litre */}
        {kpis.cost_per_litre != null && (
          <div className="mt-2 flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
            <span className="text-primary-200 text-xs">Cost per Litre</span>
            <span className={clsx('text-sm font-bold', kpis.cost_per_litre > 35 ? 'text-amber-300' : 'text-green-300')}>
              KES {kpis.cost_per_litre.toFixed(2)} {kpis.cost_per_litre > 35 ? '⚠️' : '✓'}
            </span>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-3 text-xs font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-4 space-y-4 pb-24">
        {tab === 'P&L'        && <PLTab snapshot={snapshot} milkBreakdown={milk_sales_breakdown} />}
        {tab === 'Expenses'   && <ExpensesTab expenses={expenses} onAdd={() => setShowExpenseModal(true)} />}
        {tab === 'Revenue'    && <RevenueTab revenues={revenues} milkBreakdown={milk_sales_breakdown} onAdd={() => setShowRevenueModal(true)} />}
        {tab === 'Break-Even' && <BreakEvenTab be={break_even} />}
      </div>

      {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} />}
      {showRevenueModal && <RevenueModal onClose={() => setShowRevenueModal(false)} />}
    </AppLayout>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab({
  snapshot,
  milkBreakdown,
}: {
  snapshot: ProfitabilitySnapshot;
  milkBreakdown: FinanceIndexProps['milk_sales_breakdown'];
}) {
  const netProfit = snapshot.net_profit ?? 0;
  const isProfit = netProfit >= 0;

  const rows: { label: string; value: number | null | undefined; bold?: boolean; divider?: boolean; color?: string }[] = [
    { label: '🥛 Milk Revenue',      value: snapshot.total_milk_revenue,   color: 'text-green-700' },
    { label: '💰 Other Revenue',     value: snapshot.total_other_revenue,  color: 'text-green-700' },
    { label: '= Total Revenue',      value: snapshot.total_revenue,        color: 'text-green-700', bold: true, divider: true },
    { label: '🌾 Feed Costs',        value: snapshot.total_feed_cost,      color: 'text-red-600' },
    { label: '🏥 Veterinary',        value: snapshot.total_vet_cost,       color: 'text-red-600' },
    { label: '= Gross Margin',       value: snapshot.gross_margin,         color: (snapshot.gross_margin ?? 0) >= 0 ? 'text-green-700' : 'text-red-600', bold: true, divider: true },
    { label: '👷 Labour',            value: snapshot.total_labour_cost,    color: 'text-red-600' },
    { label: '🔧 Other Expenses',    value: snapshot.total_other_expenses, color: 'text-red-600' },
    { label: '= Net Profit / Loss',  value: snapshot.net_profit,           color: isProfit ? 'text-green-700' : 'text-red-600', bold: true, divider: true },
  ];

  const fmt = (v: number | null | undefined, isExpense = false) => {
    if (v == null) return '—';
    const abs = Math.abs(v);
    const prefix = isExpense && v > 0 ? '−' : v < 0 ? '−' : '';
    return prefix + formatKES(abs);
  };

  return (
    <>
      <Card padding="md">
        <p className="text-sm font-bold text-gray-900 mb-3">Income Statement</p>
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <React.Fragment key={i}>
              {row.divider && <div className="border-t border-gray-200 my-2" />}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className={clsx('text-xs', row.bold && 'font-bold text-sm', row.color ?? 'text-gray-900')}>
                  {fmt(row.value)}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {milkBreakdown.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Milk Revenue by Channel</p>
          <div className="space-y-2">
            {milkBreakdown.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.buyer?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{Number(row.quantity_litres).toFixed(1)} L</p>
                </div>
                <p className="text-sm font-bold text-green-700">{formatKES(Number(row.total_amount))}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ expenses, onAdd }: { expenses: Expense[]; onAdd: () => void }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Total: {formatKES(total)}</p>
        <button
          type="button"
          onClick={onAdd}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-full text-xs font-semibold active:opacity-80 min-h-[36px]"
        >
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </button>
      </div>

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <Card padding="md">
          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">By Category</p>
          <div className="space-y-2">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => {
                const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{EXPENSE_ICONS[cat] ?? '📦'} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                      <span className="font-medium">{formatKES(amt)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-2xl mb-2">💸</p>
          <p className="text-sm font-medium text-gray-700">No expenses this month</p>
          <p className="text-xs text-gray-400 mt-1">Tap "+ Add Expense" to record one</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <Card key={exp.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-lg">
                  {EXPENSE_ICONS[exp.category] ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(exp.expense_date)} · {exp.category}
                    {exp.supplier ? ` · ${exp.supplier}` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-red-700 flex-shrink-0">{formatKES(Number(exp.amount))}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

function RevenueTab({
  revenues,
  milkBreakdown,
  onAdd,
}: {
  revenues: Revenue[];
  milkBreakdown: FinanceIndexProps['milk_sales_breakdown'];
  onAdd: () => void;
}) {
  const milkTotal = milkBreakdown.reduce((s, r) => s + Number(r.total_amount), 0);
  const otherTotal = revenues.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          {revenues.length > 0 ? `Other Revenue: ${formatKES(otherTotal)}` : 'No other revenue'}
        </p>
        <button
          type="button"
          onClick={onAdd}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-full text-xs font-semibold active:opacity-80 min-h-[36px]"
        >
          <Plus className="h-3.5 w-3.5" /> Add Revenue
        </button>
      </div>

      {/* Milk sales summary */}
      {milkBreakdown.length > 0 && (
        <Card padding="md" className="bg-green-50 border border-green-200">
          <p className="text-xs font-semibold text-green-800 uppercase mb-2">
            Milk Sales — {formatKES(milkTotal)}
          </p>
          {milkBreakdown.map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-green-700 py-0.5">
              <span>{s.buyer?.name ?? 'Unknown'}</span>
              <span className="font-medium">
                {Number(s.quantity_litres).toFixed(1)} L → {formatKES(Number(s.total_amount))}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Other revenues list */}
      {revenues.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-2xl mb-2">💰</p>
          <p className="text-sm font-medium text-gray-700">No other revenue this month</p>
          <p className="text-xs text-gray-400 mt-1">Tap "+ Add Revenue" to record one</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {revenues.map(rev => (
            <Card key={rev.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">
                  {REVENUE_ICONS[rev.category] ?? '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{rev.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(rev.revenue_date)}
                    {rev.buyer_name ? ` · ${rev.buyer_name}` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatKES(Number(rev.amount))}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Break-Even Tab ───────────────────────────────────────────────────────────

function BreakEvenTab({ be }: { be: BreakEven }) {
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={clsx(
        'rounded-xl p-4 flex items-center gap-3',
        be.is_profitable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200',
      )}>
        {be.is_profitable
          ? <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          : <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />}
        <div>
          <p className={clsx('text-sm font-bold', be.is_profitable ? 'text-green-900' : 'text-red-900')}>
            {be.is_profitable ? 'Above Break-Even ✓' : 'Below Break-Even ⚠️'}
          </p>
          {be.margin_above_be != null && (
            <p className={clsx('text-xs mt-0.5', be.is_profitable ? 'text-green-700' : 'text-red-700')}>
              {be.is_profitable ? 'Producing ' : 'Deficit of '}
              <strong>{Math.abs(be.margin_above_be)} L/day</strong>
              {be.is_profitable ? ' above break-even' : ' below break-even'}
            </p>
          )}
        </div>
      </div>

      <Card padding="md">
        <p className="text-sm font-bold text-gray-900 mb-3">Break-Even Analysis</p>
        <div className="space-y-2">
          {[
            { label: 'Fixed Costs (Labour + Other)',  value: formatKES(be.fixed_costs),                                   note: 'Per month' },
            { label: 'Avg Milk Price',                value: `KES ${be.price_per_litre.toFixed(2)}/L` },
            { label: 'Variable Cost per Litre',       value: `KES ${be.var_cost_per_litre.toFixed(2)}/L` },
            { label: 'Contribution Margin',           value: `KES ${be.contribution_margin.toFixed(2)}/L`, highlight: true },
            { label: 'Break-Even Litres',             value: be.break_even_litres ? `${be.break_even_litres} L/month` : '—' },
            { label: 'Break-Even per Day',            value: be.break_even_per_day ? `${be.break_even_per_day} L/day` : '—', highlight: true },
            { label: 'Current Production',            value: be.current_per_day ? `${be.current_per_day} L/day` : '—' },
          ].map(row => (
            <div key={row.label} className={clsx('flex justify-between py-1.5', row.highlight ? 'border-t border-b border-gray-100' : '')}>
              <span className="text-xs text-gray-600">{row.label}</span>
              <span className={clsx('text-xs font-bold', row.highlight ? 'text-primary-900' : 'text-gray-900')}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md" className="bg-blue-50 border border-blue-200">
        <p className="text-sm font-bold text-blue-900 mb-2">💡 Break-Even Formula</p>
        <p className="text-xs text-blue-700 font-mono">
          Break-Even = Fixed Costs ÷ (Price/L − Variable Cost/L)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Kenya target: Cost/litre &lt; KES 35 · Benchmark price: KES 38–55/L
        </p>
      </Card>
    </div>
  );
}
