import React from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { PageProps } from '@/types';
import { formatDate } from '@/utils/format';

interface SemenBatch {
  id: string;
  bull_name: string;
  batch_number: string | null;
  semen_type: 'conventional' | 'sexed';
  cost_per_straw: string | null;
  inseminator: string | null;
  straws_received: number;
  straws_remaining: number;
  received_on: string;
  notes: string | null;
}

interface SemenIndexProps extends PageProps {
  batches: SemenBatch[];
  totalStraws: number;
  lowStockCount: number;
  depletedCount: number;
}

export default function SemenIndex() {
  const { batches, totalStraws, lowStockCount, depletedCount, auth } =
    usePage<SemenIndexProps>().props;

  const isVetOrAbove = ['farm_owner', 'farm_manager', 'vet_officer'].includes(auth.role);

  const stockVariant = (remaining: number): 'success' | 'warning' | 'error' | 'neutral' => {
    if (remaining === 0) return 'error';
    if (remaining <= 5) return 'warning';
    return 'success';
  };

  const confirmDelete = (id: string, bullName: string) => {
    if (!confirm(`Remove semen batch for ${bullName}? This cannot be undone.`)) return;
    router.delete(`/semen/${id}`);
  };

  return (
    <AppLayout title="Semen Inventory">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Semen Inventory</h1>
          {isVetOrAbove && (
            <button
              onClick={() => router.visit('/semen/new')}
              className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-full text-sm font-semibold active:opacity-80"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add Batch
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white text-lg font-bold">{totalStraws}</p>
            <p className="text-primary-200 text-xs mt-0.5">Total Straws</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white text-lg font-bold">{lowStockCount}</p>
            <p className="text-primary-200 text-xs mt-0.5">Low Stock</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white text-lg font-bold">{depletedCount}</p>
            <p className="text-primary-200 text-xs mt-0.5">Depleted</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-32">
        {lowStockCount > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              {lowStockCount} batch{lowStockCount > 1 ? 'es' : ''} running low (≤5 straws). Reorder soon.
            </p>
          </div>
        )}

        {batches.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-3xl mb-2">🧪</p>
            <p className="text-sm font-semibold text-gray-800">No semen batches yet</p>
            {isVetOrAbove && (
              <button
                onClick={() => router.visit('/semen/new')}
                className="mt-3 text-primary-900 text-sm font-medium underline"
              >
                Add first batch
              </button>
            )}
          </Card>
        ) : (
          batches.map(b => (
            <Card key={b.id} padding="md">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">{b.bull_name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      b.semen_type === 'sexed'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {b.semen_type === 'sexed' ? 'Sexed' : 'Conventional'}
                    </span>
                    <Badge variant={stockVariant(b.straws_remaining)} size="sm">
                      {b.straws_remaining === 0 ? 'Depleted' : `${b.straws_remaining} straws`}
                    </Badge>
                  </div>

                  <div className="space-y-0.5">
                    {b.batch_number && (
                      <p className="text-xs text-gray-500">Straw #: {b.batch_number}</p>
                    )}
                    {b.inseminator && (
                      <p className="text-xs text-gray-500">Inseminator: {b.inseminator}</p>
                    )}
                    {b.cost_per_straw && (
                      <p className="text-xs text-gray-500">
                        KES {Number(b.cost_per_straw).toLocaleString()} / straw
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Added {formatDate(b.received_on)} · {b.straws_received} total
                    </p>
                  </div>

                  {/* Usage bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.straws_remaining === 0
                            ? 'bg-red-400'
                            : b.straws_remaining <= 5
                            ? 'bg-amber-400'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.max(2, (b.straws_remaining / b.straws_received) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {b.straws_received - b.straws_remaining} used of {b.straws_received}
                    </p>
                  </div>
                </div>

                {isVetOrAbove && b.straws_remaining === 0 && (
                  <button
                    onClick={() => confirmDelete(b.id, b.bull_name)}
                    className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 active:opacity-70 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
