import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Truck, TrendingDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import type { PageProps, FeedTransaction } from '@/types';
import { formatDate, formatKES } from '@/utils/format';

interface ShowProps extends PageProps {
  inventory: {
    id: string;
    quantity_kg: number;
    reorder_level_kg: number | null;
    avg_cost_per_kg: number | null;
    last_restocked_on: string | null;
    storage_location: string | null;
    notes: string | null;
    feed_type: {
      id: string;
      name: string;
      category: string;
      crude_protein_percent: number | null;
      metabolizable_energy: number | null;
    };
  };
  history: FeedTransaction[];
}

const TYPE_LABEL: Record<string, string> = {
  purchase:    'Purchase',
  harvest:     'Harvest',
  consumption: 'Consumed',
  adjustment:  'Adjustment',
  wastage:     'Wastage',
};

export default function FeedShow() {
  const { inventory, history } = usePage<ShowProps>().props;
  const { feed_type } = inventory;

  const purchases    = history.filter(t => t.transaction_type === 'purchase' || t.transaction_type === 'harvest');
  const consumptions = history.filter(t => t.transaction_type === 'consumption');
  const totalIn      = purchases.reduce((s, t) => s + Number(t.quantity_kg), 0);
  const totalOut     = Math.abs(consumptions.reduce((s, t) => s + Number(t.quantity_kg), 0));
  const purchaseCost = purchases.reduce((s, t) => s + Number(t.total_cost ?? 0), 0);

  return (
    <AppLayout title={feed_type.name}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.visit('/feed')}
              className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold">{feed_type.name}</h1>
              <p className="text-primary-300 text-xs capitalize">{feed_type.category}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.visit('/feed/receive')}
              className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 active:opacity-80"
            >
              <Truck className="h-3 w-3" /> Receive
            </button>
            <button
              onClick={() => router.visit('/feed/consume')}
              className="bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 active:opacity-80"
            >
              <TrendingDown className="h-3 w-3" /> Consume
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Stock summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card padding="md" className="text-center">
            <p className="text-xs text-gray-500">In Stock</p>
            <p className={clsx(
              'text-xl font-bold',
              Number(inventory.quantity_kg) <= (inventory.reorder_level_kg ?? Infinity) ? 'text-amber-700' : 'text-gray-900',
            )}>
              {Number(inventory.quantity_kg).toFixed(0)}
            </p>
            <p className="text-xs text-gray-400">kg</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-xs text-gray-500">Avg Cost</p>
            <p className="text-xl font-bold text-gray-900">
              {inventory.avg_cost_per_kg != null ? inventory.avg_cost_per_kg : '—'}
            </p>
            <p className="text-xs text-gray-400">KES/kg</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-xs text-gray-500">Reorder At</p>
            <p className="text-xl font-bold text-gray-900">
              {inventory.reorder_level_kg ?? '—'}
            </p>
            <p className="text-xs text-gray-400">kg</p>
          </Card>
        </div>

        {/* Nutritional info */}
        {(feed_type.crude_protein_percent != null || feed_type.metabolizable_energy != null) && (
          <Card padding="md" className="bg-blue-50 border border-blue-200">
            <p className="text-sm font-bold text-blue-900 mb-2">Nutritional Profile</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              {feed_type.crude_protein_percent != null && (
                <span>CP: {feed_type.crude_protein_percent}% DM</span>
              )}
              {feed_type.metabolizable_energy != null && (
                <span>ME: {feed_type.metabolizable_energy} MJ/kg DM</span>
              )}
            </div>
          </Card>
        )}

        {/* Movement summary */}
        {history.length > 0 && (
          <Card padding="md">
            <p className="text-sm font-bold text-gray-900 mb-3">Movement Summary (Last 50)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Total Received</p>
                <p className="text-sm font-bold text-green-700">+{totalIn.toFixed(0)} kg</p>
                <p className="text-xs text-gray-400">{formatKES(purchaseCost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Consumed</p>
                <p className="text-sm font-bold text-amber-700">{totalOut.toFixed(0)} kg</p>
              </div>
            </div>
          </Card>
        )}

        {/* Transaction history */}
        <div>
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Transaction History</p>
          {history.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-sm text-gray-500">No transactions yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map(txn => {
                const isIn = Number(txn.quantity_kg) > 0;
                return (
                  <Card key={txn.id} padding="sm">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        isIn ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                      )}>
                        {isIn ? '+' : '-'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {TYPE_LABEL[txn.transaction_type] ?? txn.transaction_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(txn.transaction_date)}
                          {txn.supplier ? ` · ${txn.supplier}` : ''}
                          {txn.animal_group ? ` · ${txn.animal_group}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={clsx('text-sm font-bold', isIn ? 'text-green-700' : 'text-amber-700')}>
                          {isIn ? '+' : '-'}{Math.abs(Number(txn.quantity_kg)).toFixed(0)} kg
                        </p>
                        {txn.total_cost != null && (
                          <p className="text-xs text-gray-400">{formatKES(txn.total_cost)}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
