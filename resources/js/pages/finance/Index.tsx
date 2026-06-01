import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Plus, TrendingUp, TrendingDown, Minus, ChevronRight,
  AlertTriangle, CheckCircle, DollarSign,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { clsx } from 'clsx';
import type {
  PageProps, FinanceKPIs, ProfitabilitySnapshot, Expense, Revenue,
  BreakEven, FinanceTrendPoint, MilkSale,
} from '@/types';
import { formatDate, formatKES } from '@/utils/format';

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
  feed: '🌾', vet: '🏥', veterinary: '🏥', labour: '👷', equipment: '🔧',
  utilities: '💡', land: '🌱', transport: '🚛', breeding: '🐂', other: '📦',
};

const REVENUE_ICONS: Record<string, string> = {
  milk_sales: '🥛', animal_sales: '🐄', manure_sales: '♻️',
  crop_sales: '🌿', subsidy: '🏛️', other: '💰',
};

export default function FinanceIndex() {
  const { kpis, snapshot, expenses, revenues, milk_sales_breakdown, trend, break_even, month } = usePage<FinanceIndexProps>().props;
  const [tab, setTab] = useState<Tab>('P&L');

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    router.get('/finance', { month: newMonth }, { preserveState: true, only: ['kpis', 'snapshot', 'expenses', 'revenues', 'milk_sales_breakdown', 'trend', 'break_even', 'month'] });
  };

  const isProfit = (kpis.net_profit ?? 0) >= 0;

  return (
    <AppLayout title="Finance">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-3">
          <h1 className="text-white text-xl font-bold">Finance</h1>
          <div className="flex gap-2">
            <button onClick={() => router.visit('/finance/expense/new')}
              className="bg-red-500/80 text-white px-3 py-1.5 rounded-full text-xs font-medium">+ Expense</button>
            <button onClick={() => router.visit('/finance/revenue/new')}
              className="bg-green-500/80 text-white px-3 py-1.5 rounded-full text-xs font-medium">+ Revenue</button>
          </div>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 mb-3">
          <button onClick={() => navigateMonth(-1)} className="text-white/70 px-2">‹</button>
          <p className="text-white font-semibold text-sm">{kpis.month_label}</p>
          <button onClick={() => navigateMonth(1)} disabled={month >= new Date().toISOString().slice(0, 7)}
            className="text-white/70 px-2 disabled:opacity-30">›</button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <KpiBox value={formatKES(kpis.total_revenue)} label="Revenue" icon={<TrendingUp className="h-4 w-4 text-green-300" />} />
          <KpiBox value={formatKES(kpis.total_expenses)} label="Expenses" icon={<TrendingDown className="h-4 w-4 text-red-300" />} />
          <div className={clsx('rounded-xl p-3 text-center', isProfit ? 'bg-green-500/20' : 'bg-red-500/20')}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {isProfit ? <TrendingUp className="h-4 w-4 text-green-300" /> : <TrendingDown className="h-4 w-4 text-red-300" />}
            </div>
            <p className={clsx('text-lg font-bold', isProfit ? 'text-green-200' : 'text-red-200')}>
              {isProfit ? '+' : ''}{formatKES(kpis.net_profit)}
            </p>
            <p className="text-primary-200 text-xs">Net Profit</p>
          </div>
        </div>

        {/* Cost per litre */}
        {kpis.cost_per_litre && (
          <div className="mt-2 flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
            <span className="text-primary-200 text-xs">Cost per Litre</span>
            <span className={clsx('text-sm font-bold', kpis.cost_per_litre > 35 ? 'text-amber-300' : 'text-green-300')}>
              KES {kpis.cost_per_litre} {kpis.cost_per_litre > 35 ? '⚠️' : '✓'}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-1 py-3 text-xs font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'P&L'       && <PLTab snapshot={snapshot} milkBreakdown={milk_sales_breakdown} trend={trend} />}
        {tab === 'Expenses'  && <ExpensesTab expenses={expenses} />}
        {tab === 'Revenue'   && <RevenueTab revenues={revenues} milkBreakdown={milk_sales_breakdown} />}
        {tab === 'Break-Even'&& <BreakEvenTab be={break_even} />}
      </div>
    </AppLayout>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab({ snapshot, milkBreakdown, trend }: {
  snapshot: ProfitabilitySnapshot;
  milkBreakdown: FinanceIndexProps['milk_sales_breakdown'];
  trend: FinanceTrendPoint[];
}) {
  const isProfit = (snapshot.net_profit ?? 0) >= 0;

  const plRows = [
    { label: '🥛 Milk Revenue',     value: snapshot.total_milk_revenue,  color: 'text-green-700' },
    { label: '💰 Other Revenue',    value: snapshot.total_other_revenue,  color: 'text-green-700' },
    { label: '= Total Revenue',     value: snapshot.total_revenue,        color: 'text-green-700 font-bold text-base', divider: true },
    { label: '🌾 Feed Costs',       value: -(snapshot.total_feed_cost ?? 0), color: 'text-red-600' },
    { label: '🏥 Veterinary',       value: -(snapshot.total_vet_cost ?? 0),  color: 'text-red-600' },
    { label: '= Gross Margin',      value: snapshot.gross_margin,         color: (snapshot.gross_margin ?? 0) >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold', divider: true },
    { label: '👷 Labour',           value: -(snapshot.total_labour_cost ?? 0), color: 'text-red-600' },
    { label: '🔧 Other Expenses',   value: -(snapshot.total_other_expenses ?? 0), color: 'text-red-600' },
    { label: '= Net Profit / Loss', value: snapshot.net_profit,           color: isProfit ? 'text-green-700 font-bold text-base' : 'text-red-600 font-bold text-base', divider: true },
  ];

  return (
    <>
      {/* P&L statement */}
      <Card padding="md">
        <p className="text-sm font-bold text-gray-900 mb-3">Income Statement</p>
        <div className="space-y-1.5">
          {plRows.map((row, i) => (
            <React.Fragment key={i}>
              {row.divider && <div className="border-t border-gray-200 my-2" />}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className={clsx('text-xs', row.color)}>
                  {row.value != null ? (row.value >= 0 ? '' : '−') + formatKES(Math.abs(row.value ?? 0)) : '—'}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Trend chart */}
      {trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">6-Month Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatKES(v)} />
              <Bar dataKey="revenue" fill="#16a34a" opacity={0.8} name="Revenue" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="#dc2626" opacity={0.7} name="Expenses" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="net_profit" stroke="#1B5E20" strokeWidth={2} dot={{ r: 3 }} name="Net Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Milk channel breakdown */}
      {milkBreakdown.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">Milk Revenue by Channel</p>
          <div className="space-y-2">
            {milkBreakdown.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.buyer?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{(row as unknown as { litres: number }).litres?.toFixed(1)} L</p>
                </div>
                <p className="text-sm font-bold text-green-700">{formatKES((row as unknown as { revenue: number }).revenue)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Total: {formatKES(total)}</p>
        <button onClick={() => router.visit('/finance/expense/new')}
          className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-full text-xs font-medium">
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </button>
      </div>

      {/* Category summary */}
      {Object.keys(byCategory).length > 0 && (
        <Card padding="md">
          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">By Category</p>
          <div className="space-y-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
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
        <Card className="text-center py-8">
          <p className="text-sm text-gray-500">No expenses recorded this month</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(expense => (
            <Card key={expense.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-lg">
                  {EXPENSE_ICONS[expense.category] ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(expense.expense_date)} · {expense.category}{expense.supplier ? ` · ${expense.supplier}` : ''}</p>
                </div>
                <p className="text-sm font-bold text-red-700 flex-shrink-0">{formatKES(expense.amount)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

function RevenueTab({ revenues, milkBreakdown }: {
  revenues: Revenue[];
  milkBreakdown: FinanceIndexProps['milk_sales_breakdown'];
}) {
  const milkTotal = milkBreakdown.reduce((s, r) => s + ((r as unknown as { revenue: number }).revenue ?? 0), 0);
  const otherTotal = revenues.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Non-milk Revenue: {formatKES(otherTotal)}</p>
        <button onClick={() => router.visit('/finance/revenue/new')}
          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-full text-xs font-medium">
          <Plus className="h-3.5 w-3.5" /> Add Revenue
        </button>
      </div>

      {/* Milk sales summary */}
      {milkBreakdown.length > 0 && (
        <Card padding="md" className="bg-green-50 border-green-200">
          <p className="text-xs font-semibold text-green-800 uppercase mb-2">Milk Sales — {formatKES(milkTotal)}</p>
          {milkBreakdown.map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-green-700 py-0.5">
              <span>{s.buyer?.name}</span>
              <span className="font-medium">{(s as unknown as { litres: number }).litres?.toFixed(1)} L → {formatKES((s as unknown as { revenue: number }).revenue)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Other revenues */}
      {revenues.length === 0 ? (
        <Card className="text-center py-6">
          <p className="text-sm text-gray-500">No other revenues this month</p>
        </Card>
      ) : (
        revenues.map(rev => (
          <Card key={rev.id} padding="sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">
                {REVENUE_ICONS[rev.category] ?? '💰'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{rev.description}</p>
                <p className="text-xs text-gray-500">{formatDate(rev.revenue_date)}{rev.buyer_name ? ` · ${rev.buyer_name}` : ''}</p>
              </div>
              <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatKES(rev.amount)}</p>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Break-Even Tab ───────────────────────────────────────────────────────────

function BreakEvenTab({ be }: { be: BreakEven }) {
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={clsx('rounded-xl p-4 flex items-center gap-3',
        be.is_profitable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
        {be.is_profitable
          ? <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          : <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
        }
        <div>
          <p className={clsx('text-sm font-bold', be.is_profitable ? 'text-green-900' : 'text-red-900')}>
            {be.is_profitable ? 'Above Break-Even ✓' : 'Below Break-Even ⚠️'}
          </p>
          {be.margin_above_be !== null && (
            <p className={clsx('text-xs mt-0.5', be.is_profitable ? 'text-green-700' : 'text-red-700')}>
              {be.is_profitable ? 'Producing ' : 'Deficit of '}
              <strong>{Math.abs(be.margin_above_be)} L/day</strong>
              {be.is_profitable ? ' above break-even' : ' below break-even'}
            </p>
          )}
        </div>
      </div>

      {/* Formula */}
      <Card padding="md">
        <p className="text-sm font-bold text-gray-900 mb-3">Break-Even Analysis</p>
        <div className="space-y-2">
          {[
            { label: 'Fixed Costs (Labour + Other)', value: formatKES(be.fixed_costs), note: 'Per month' },
            { label: 'Avg Milk Price', value: `KES ${be.price_per_litre}/L` },
            { label: 'Variable Cost per Litre', value: `KES ${be.var_cost_per_litre}/L` },
            { label: 'Contribution Margin', value: `KES ${be.contribution_margin}/L`, highlight: true },
            { label: 'Break-Even Litres', value: be.break_even_litres ? `${be.break_even_litres} L/month` : '—' },
            { label: 'Break-Even per Day', value: be.break_even_per_day ? `${be.break_even_per_day} L/day` : '—', highlight: true },
            { label: 'Current Production', value: be.current_per_day ? `${be.current_per_day} L/day` : '—' },
          ].map(row => (
            <div key={row.label} className={clsx('flex justify-between py-1.5', row.highlight ? 'border-t border-b border-gray-100' : '')}>
              <span className="text-xs text-gray-600">{row.label}</span>
              <span className={clsx('text-xs font-bold', row.highlight ? 'text-primary-900' : 'text-gray-900')}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md" className="bg-blue-50 border-blue-200">
        <p className="text-sm font-bold text-blue-900 mb-2">💡 Break-Even Formula</p>
        <p className="text-xs text-blue-700 font-mono">
          Break-Even = Fixed Costs ÷ (Price/L − Variable Cost/L)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Kenya target: Cost/litre &lt; KES 35 | Benchmark price: KES 38–55/L (channel dependent)
        </p>
      </Card>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function KpiBox({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-white text-sm font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-xs mt-0.5">{label}</p>
    </div>
  );
}
