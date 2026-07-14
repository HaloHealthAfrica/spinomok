import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Plus, TrendingDown, AlertTriangle, Truck, Wheat, Clock, ChevronRight, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import type { PageProps, FeedInventoryItem, FeedKPIs, FeedTransaction, FeedType } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const TXN_META: Record<string, { label: string; color: string; sign: string; bg: string }> = {
  purchase:    { label: 'Purchase',   color: 'text-green-700', sign: '+', bg: 'bg-green-100' },
  harvest:     { label: 'Harvest',    color: 'text-green-700', sign: '+', bg: 'bg-green-100' },
  consumption: { label: 'Consumed',   color: 'text-amber-700', sign: '-', bg: 'bg-amber-100' },
  adjustment:  { label: 'Adjustment', color: 'text-blue-600',  sign: '+/-', bg: 'bg-blue-100' },
  wastage:     { label: 'Wastage',    color: 'text-red-600',   sign: '-', bg: 'bg-red-100' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedIndex() {
  const { inventory, kpis, trend, recentTransactions } = usePage<FeedIndexProps>().props;
  const [tab, setTab] = useState<Tab>('Stock');

  const criticalItems = inventory.filter(i => i.is_critical);
  const lowItems      = inventory.filter(i => i.is_low && !i.is_critical);
  const okItems       = inventory.filter(i => !i.is_low && !i.is_critical);

  return (
    <AppLayout title="Feed Management">
      {/* ── Header ── */}
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Feed Management</h1>
          <button
            onClick={() => router.visit('/feed/receive')}
            className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-semibold active:opacity-80"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Receive Stock
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg">🌾</p>
            <p className="text-white text-lg font-bold leading-tight">{inventory.length}</p>
            <p className="text-primary-200 text-xs mt-0.5">Feed Types</p>
          </div>
          <div className={clsx('rounded-xl p-3 text-center', kpis.low_stock_count > 0 ? 'bg-red-500/20' : 'bg-white/10')}>
            <p className="text-lg">⚠️</p>
            <p className="text-white text-lg font-bold leading-tight">{kpis.low_stock_count}</p>
            <p className="text-primary-200 text-xs mt-0.5">Low Stock</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg">💧</p>
            <p className="text-white text-lg font-bold leading-tight">
              {kpis.feed_cost_per_litre != null ? `KES ${kpis.feed_cost_per_litre}` : '—'}
            </p>
            <p className="text-primary-200 text-xs mt-0.5">Lactating Cost/L</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-white border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'text-primary-900 border-primary-900' : 'text-gray-500 border-transparent',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-4 space-y-4 pb-32">
        {tab === 'Stock'        && <StockTab inventory={inventory} criticalItems={criticalItems} lowItems={lowItems} okItems={okItems} />}
        {tab === 'Costing'      && <CostingTab kpis={kpis} trend={trend} />}
        {tab === 'Transactions' && <TransactionsTab transactions={recentTransactions} />}
      </div>

      {/* ── Quick actions ── */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pointer-events-none">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-3 gap-2 pointer-events-auto">
          <QuickBtn
            label="Receive"
            icon={<Truck className="h-5 w-5" />}
            color="text-green-700 bg-green-50"
            onClick={() => router.visit('/feed/receive')}
          />
          <QuickBtn
            label="Consume"
            icon={<TrendingDown className="h-5 w-5" />}
            color="text-amber-700 bg-amber-50"
            onClick={() => router.visit('/feed/consume')}
          />
          <QuickBtn
            label="Inventory"
            icon={<Package className="h-5 w-5" />}
            color="text-blue-700 bg-blue-50"
            onClick={() => setTab('Stock')}
          />
        </div>
      </div>
    </AppLayout>
  );
}

function QuickBtn({ label, icon, color, onClick }: { label: string; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx('flex flex-col items-center gap-1 rounded-xl py-3 active:opacity-70', color)}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

function StockTab({
  inventory, criticalItems, lowItems, okItems,
}: {
  inventory: FeedInventoryItem[];
  criticalItems: FeedInventoryItem[];
  lowItems: FeedInventoryItem[];
  okItems: FeedInventoryItem[];
}) {
  if (inventory.length === 0) {
    return (
      <Card className="text-center py-10">
        <Wheat className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-800">No feed inventory yet</p>
        <p className="text-xs text-gray-500 mt-1 mb-3">Start by receiving your first stock delivery</p>
        <button
          onClick={() => router.visit('/feed/receive')}
          className="bg-primary-900 text-white px-4 py-2 rounded-full text-sm font-semibold"
        >
          Receive Stock
        </button>
      </Card>
    );
  }

  return (
    <>
      {criticalItems.length > 0 && (
        <section>
          <p className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Critical Stock ({criticalItems.length})
          </p>
          <div className="space-y-2">
            {criticalItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {lowItems.length > 0 && (
        <section>
          <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Low Stock ({lowItems.length})
          </p>
          <div className="space-y-2">
            {lowItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {okItems.length > 0 && (
        <section>
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">All Items</p>
          <div className="space-y-2">
            {okItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      <Card padding="md" className="bg-green-50 border border-green-200">
        <p className="text-sm font-bold text-green-900 mb-2">🇰🇪 Typical Daily Ration</p>
        <p className="text-xs text-green-700 mb-1">Holstein-Friesian (500 kg, 20 L/day):</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-green-700">
          <span>• Napier grass: 40–50 kg</span>
          <span>• Dairy meal: 7–8 kg</span>
          <span>• Hay/silage: 10–15 kg</span>
          <span>• Minerals: 100 g</span>
          <span>• Water: 60–80 L</span>
          <span>• 1 kg meal per 3 L milk</span>
        </div>
      </Card>
    </>
  );
}

function StockCard({ item }: { item: FeedInventoryItem }) {
  return (
    <button
      onClick={() => router.visit(`/feed/${item.id}`)}
      className={clsx(
        'w-full rounded-xl border p-4 text-left shadow-sm active:opacity-80',
        item.is_critical ? 'bg-red-50 border-red-200'
          : item.is_low  ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-100',
      )}
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
              <p className="text-lg font-bold text-gray-900">
                {Number(item.quantity_kg).toFixed(0)} <span className="text-sm font-normal text-gray-500">kg</span>
              </p>
              {item.reorder_level_kg != null && (
                <p className="text-xs text-gray-400">Reorder at {item.reorder_level_kg} kg</p>
              )}
            </div>
            {item.days_remaining != null && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className={clsx('font-medium', item.is_critical ? 'text-red-600' : item.is_low ? 'text-amber-600' : 'text-gray-600')}>
                  ~{item.days_remaining} days
                </span>
              </div>
            )}
            {item.avg_cost_per_kg != null && (
              <p className="text-xs text-gray-500">KES {item.avg_cost_per_kg}/kg</p>
            )}
          </div>

          {item.reorder_level_kg != null && (
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', item.is_critical ? 'bg-red-500' : item.is_low ? 'bg-amber-500' : 'bg-green-500')}
                style={{ width: `${Math.min(100, (Number(item.quantity_kg) / (item.reorder_level_kg * 3)) * 100)}%` }}
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
  const overTarget = kpis.feed_cost_per_litre != null && kpis.feed_cost_per_litre > 35;
  const maxCost = trend.length > 0 ? Math.max(...trend.map(t => t.cost), 1) : 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Feed Cost MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.month_purchase_cost)}</p>
          <p className="text-xs text-gray-400">Purchases this month</p>
        </Card>
        <Card padding="md" className={clsx(overTarget ? 'bg-amber-50 border border-amber-200' : '')}>
          <p className="text-xs text-gray-500 mb-1">Lactating Feed Cost / Litre</p>
          <p className={clsx('text-lg font-bold', overTarget ? 'text-amber-700' : 'text-gray-900')}>
            {kpis.feed_cost_per_litre != null ? `KES ${kpis.feed_cost_per_litre}` : '—'}
          </p>
          <p className="text-xs text-gray-400">Excludes heifers, calves, dry cows</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Milk Produced MTD</p>
          <p className="text-lg font-bold text-gray-900">{Number(kpis.month_milk_litres ?? 0).toFixed(0)} L</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Lactating Feed MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.lactating_consumption_cost)}</p>
          <p className="text-xs text-gray-400">Milk-producing cows</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Other Herd Feed MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.other_herd_consumption_cost)}</p>
          <p className="text-xs text-gray-400">Heifers, calves, dry cows, all</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Total Consumption MTD</p>
          <p className="text-lg font-bold text-gray-900">{formatKES(kpis.month_consumption_cost)}</p>
          <p className="text-xs text-gray-400">All feed usage cost</p>
        </Card>
      </div>

      {/* Simple bar chart (no Recharts) */}
      {trend.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-4">6-Month Purchase Trend</p>
          <div className="flex items-end gap-2 h-32">
            {trend.map((t, i) => {
              const pct = maxCost > 0 ? (t.cost / maxCost) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-[9px] text-gray-500">{formatKES(t.cost, 0).replace('KES ', '')}</p>
                  <div className="w-full bg-gray-100 rounded-t-sm overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-primary-700 rounded-t-sm transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center leading-tight">{t.month.split(' ')[0]}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Cost breakdown */}
      {kpis.cost_breakdown_30d.length > 0 && (
        <Card padding="md">
          <p className="text-sm font-bold text-gray-900 mb-3">30-Day Cost Breakdown</p>
          <div className="space-y-2">
            {(() => {
              const total = kpis.cost_breakdown_30d.reduce((s, i) => s + i.total_cost, 0);
              return kpis.cost_breakdown_30d.map(item => {
                const pct = total > 0 ? Math.round((item.total_cost / total) * 100) : 0;
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
              });
            })()}
          </div>
        </Card>
      )}

      {overTarget && (
        <Card padding="md" className="bg-blue-50 border border-blue-200">
          <p className="text-sm font-bold text-blue-900 mb-1">Cost Optimization Tip</p>
          <p className="text-xs text-blue-700">
            Feed cost of KES {kpis.feed_cost_per_litre}/L is above the KES 35 target.
            On-farm dairy meal formulation can save 15–25% vs commercial meal.
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
      <Card className="text-center py-10">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm font-medium text-gray-700">No feed transactions yet</p>
        <p className="text-xs text-gray-400 mt-1">Receive stock or record consumption to see history</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map(txn => {
        const meta = TXN_META[txn.transaction_type] ?? { label: txn.transaction_type, color: 'text-gray-600', sign: '', bg: 'bg-gray-100' };
        return (
          <Card key={txn.id} padding="sm">
            <div className="flex items-center gap-3">
              <div className={clsx('h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', meta.bg, meta.color)}>
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
                {txn.total_cost != null && <p className="text-xs text-gray-400">{formatKES(txn.total_cost)}</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
