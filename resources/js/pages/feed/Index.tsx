import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Plus, Package, TrendingDown, AlertTriangle, ShoppingCart,
  ChevronRight, Truck, Wheat, Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { clsx } from 'clsx';
import type { PageProps, FeedInventoryItem, FeedKPIs, FeedTransaction, FeedType } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

interface FeedIndexProps extends PageProps {
  inventory: FeedInventoryItem[];
  kpis: FeedKPIs;
  trend: { month: string; year: number; mon: number; cost: number }[];
  feedTypes: FeedType[];
  recentTransactions: FeedTransaction[];
  month: string;
}

const TABS = ['Stock', 'Costing', 'Transactions'] as const;
type Tab = typeof TABS[number];

const CATEGORY_COLORS: Record<string, string> = {
  roughage:    'bg-green-100 text-green-800',
  concentrate: 'bg-blue-100 text-blue-800',
  silage:      'bg-yellow-100 text-yellow-800',
  hay:         'bg-amber-100 text-amber-800',
  mineral:     'bg-purple-100 text-purple-800',
  supplement:  'bg-pink-100 text-pink-800',
};

export default function FeedIndex() {
  const { inventory, kpis, trend, feedTypes, recentTransactions, month } = usePage<FeedIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Stock');

  const criticalItems  = inventory.filter(i => i.is_critical);
  const lowItems       = inventory.filter(i => i.is_low && !i.is_critical);

  return (
    <AppLayout title="Feed Inventory">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Feed Management</h1>
          <button
            onClick={() => router.visit('/feed/receive')}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Receive Stock
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <KpiBox value={inventory.length} label="Feed Types" icon="🌾" />
          <KpiBox value={kpis.low_stock_count} label="Low Stock" icon="⚠️" alert={kpis.low_stock_count > 0} />
          <KpiBox
            value={kpis.feed_cost_per_litre !== null ? `KES ${kpis.feed_cost_per_litre}` : '—'}
            label="Cost/Litre MTD"
            icon="💧"
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'Stock'        && <StockTab inventory={inventory} criticalItems={criticalItems} lowItems={lowItems} />}
        {tab === 'Costing'      && <CostingTab kpis={kpis} trend={trend} />}
        {tab === 'Transactions' && <TransactionsTab transactions={recentTransactions} />}
      </div>

      {/* Quick actions */}
      <div className="sticky bottom-16 px-4 pb-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Receive',   icon: Truck,         href: '/feed/receive',  color: 'text-green-600 bg-green-50' },
            { label: 'Consume',   icon: TrendingDown,   href: '/feed/consume',  color: 'text-amber-600 bg-amber-50' },
            { label: 'Adjust',    icon: Package,        href: '/feed',          color: 'text-blue-600 bg-blue-50' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.href} onClick={() => router.visit(a.href)}
                className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70', a.color)}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

function StockTab({
  inventory, criticalItems, lowItems,
}: { inventory: FeedInventoryItem[]; criticalItems: FeedInventoryItem[]; lowItems: FeedInventoryItem[] }) {
  return (
    <>
      {/* Alerts */}
      {criticalItems.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Critical Stock ({criticalItems.length})
          </h2>
          <div className="space-y-2">
            {criticalItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {lowItems.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2">
            ⚠️ Low Stock ({lowItems.length})
          </h2>
          <div className="space-y-2">
            {lowItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {/* All items */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">All Feed Items</h2>
        {inventory.length === 0 ? (
          <Card className="text-center py-8">
            <Wheat className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800">No feed inventory yet</p>
            <button onClick={() => router.visit('/feed/receive')} className="mt-2 text-primary-900 text-sm font-medium underline">
              Receive first stock
            </button>
          </Card>
        ) : (
          <div className="space-y-2">
            {inventory
              .filter(i => !i.is_critical && !i.is_low)
              .concat(inventory.filter(i => i.is_low && !i.is_critical))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(item => <StockCard key={item.id} item={item} />)
            }
          </div>
        )}
      </section>

      {/* Kenyan feed reference */}
      <Card padding="md" className="bg-green-50 border-green-200">
        <p className="text-sm font-bold text-green-900 mb-2">🇰🇪 Typical Daily Ration</p>
        <p className="text-xs text-green-700 mb-1">Holstein-Friesian (500 kg, 20 L/day):</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-green-700">
          <span>• Napier grass: 40–50 kg</span>
          <span>• Dairy meal: 7–8 kg</span>
          <span>• Hay/silage: 10–15 kg</span>
          <span>• Minerals: 100 g</span>
          <span>• Water: 60–80 L</span>
          <span>• Concentrate rule: 1 kg / 3 L milk</span>
        </div>
      </Card>
    </>
  );
}

function StockCard({ item }: { item: FeedInventoryItem }) {
  const statusColor = item.is_critical ? 'bg-red-50 border-red-200'
    : item.is_low ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-gray-100';

  return (
    <button
      onClick={() => router.visit(`/feed/${item.id}`)}
      className={clsx('w-full rounded-xl border p-4 text-left shadow-sm', statusColor)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-700')}>
              {item.category}
            </span>
            {item.is_critical && <Badge variant="error" size="sm">CRITICAL</Badge>}
            {item.is_low && !item.is_critical && <Badge variant="warning" size="sm">Low</Badge>}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div>
              <p className="text-lg font-bold text-gray-900">{item.quantity_kg.toFixed(0)} <span className="text-sm font-normal text-gray-500">kg</span></p>
              {item.reorder_level_kg && (
                <p className="text-xs text-gray-400">Reorder at {item.reorder_level_kg} kg</p>
              )}
            </div>
            {item.days_remaining !== null && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className={clsx('font-medium', item.is_critical ? 'text-red-600' : item.is_low ? 'text-amber-600' : 'text-gray-600')}>
                  ~{item.days_remaining} days
                </span>
              </div>
            )}
            {item.avg_cost_per_kg && (
              <p className="text-xs text-gray-500">KES {item.avg_cost_per_kg}/kg</p>
            )}
          </div>

          {/* Stock bar */}
          {item.reorder_level_kg && (
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', item.is_critical ? 'bg-red-500' : item.is_low ? 'bg-amber-500' : 'bg-green-500')}
                style={{ width: `${Math.min(100, (item.quantity_kg / (item.reorder_level_kg * 3)) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Costing Tab ──────────────────────────────────────────────────────────────

function CostingTab({ kpis, trend }: { kpis: FeedKPIs; trend: { month: string; cost: number }[] }) {
  return (
    <>
      {/* Cost summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Feed Cost MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.month_purchase_cost)}</p>
          <p className="text-xs text-gray-400">Purchases this month</p>
        </Card>
        <Card padding="md" className={clsx(kpis.feed_cost_per_litre !== null && kpis.feed_cost_per_litre > 35 ? 'bg-amber-50 border-amber-200' : '')}>
          <p className="text-xs text-gray-500 mb-1">Feed Cost / Litre</p>
          <p className={clsx('text-lg font-bold', kpis.feed_cost_per_litre !== null && kpis.feed_cost_per_litre > 35 ? 'text-amber-700' : 'text-gray-900')}>
            {kpis.feed_cost_per_litre !== null ? `KES ${kpis.feed_cost_per_litre}` : '—'}
          </p>
          <p className="text-xs text-gray-400">Target: &lt; KES 35/L</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Milk Produced MTD</p>
          <p className="text-lg font-bold text-gray-900">{kpis.month_milk_litres.toFixed(0)} L</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Consumption Cost MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.month_consumption_cost)}</p>
          <p className="text-xs text-gray-400">Estimated usage cost</p>
        </Card>
      </div>

      {/* Monthly trend chart */}
      {trend.length > 1 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">6-Month Purchase Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatKES(v), 'Feed Cost']} />
              <Bar dataKey="cost" fill="#1B5E20" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Cost breakdown */}
      {kpis.cost_breakdown_30d.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">30-Day Cost Breakdown</p>
          <div className="space-y-2">
            {kpis.cost_breakdown_30d.map(item => {
              const total = kpis.cost_breakdown_30d.reduce((s, i) => s + i.total_cost, 0);
              const pct   = total > 0 ? Math.round((item.total_cost / total) * 100) : 0;
              return (
                <div key={item.feed_type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{item.feed_type}</span>
                    <span className="text-gray-500">{formatKES(item.total_cost)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {kpis.feed_cost_per_litre !== null && kpis.feed_cost_per_litre > 25 && (
        <Card padding="md" className="bg-blue-50 border-blue-200">
          <p className="text-sm font-bold text-blue-900 mb-1">Cost Optimization Tip</p>
          <p className="text-xs text-blue-700">
            Feed cost of KES {kpis.feed_cost_per_litre}/litre is {kpis.feed_cost_per_litre > 35 ? 'above' : 'close to'} the KES 35 target.
            Consider on-farm dairy meal formulation, which can save 15-25% vs commercial meal.
          </p>
        </Card>
      )}
    </>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab({ transactions }: { transactions: FeedTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm text-gray-600">No feed transactions yet</p>
      </Card>
    );
  }

  const typeLabel: Record<string, { label: string; color: string; sign: string }> = {
    purchase:    { label: 'Purchase',    color: 'text-green-700',  sign: '+' },
    harvest:     { label: 'Harvest',     color: 'text-green-700',  sign: '+' },
    consumption: { label: 'Consumed',    color: 'text-gray-600',   sign: '−' },
    adjustment:  { label: 'Adjustment',  color: 'text-blue-600',   sign: '±' },
    wastage:     { label: 'Wastage',     color: 'text-red-600',    sign: '−' },
  };

  return (
    <div className="space-y-2">
      {transactions.map(txn => {
        const meta = typeLabel[txn.transaction_type] ?? { label: txn.transaction_type, color: 'text-gray-600', sign: '' };
        return (
          <Card key={txn.id} padding="sm">
            <div className="flex items-center gap-3">
              <div className={clsx('h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                txn.transaction_type === 'purchase' || txn.transaction_type === 'harvest'
                  ? 'bg-green-100' : txn.transaction_type === 'wastage' ? 'bg-red-100' : 'bg-gray-100',
              )}>
                {meta.sign}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{txn.feed_type?.name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500">{meta.label} · {formatDate(txn.transaction_date)}</p>
                {txn.supplier && <p className="text-xs text-gray-400">{txn.supplier}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className={clsx('text-sm font-bold', meta.color)}>
                  {meta.sign}{Math.abs(txn.quantity_kg).toFixed(0)} kg
                </p>
                {txn.total_cost && <p className="text-xs text-gray-400">{formatKES(txn.total_cost)}</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function KpiBox({ value, label, icon, alert }: { value: number | string; label: string; icon: string; alert?: boolean }) {
  return (
    <div className={clsx('rounded-xl p-3 text-center', alert ? 'bg-red-500/20' : 'bg-white/10')}>
      <p className="text-lg">{icon}</p>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
      <p className="text-primary-200 text-xs mt-0.5">{label}</p>
    </div>
  );
}
