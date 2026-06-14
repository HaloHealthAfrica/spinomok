import React, { useState } from 'react';
import { router, usePage, useForm } from '@inertiajs/react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { PageProps, MilkBuyer, MilkSale } from '@/types';
import { formatDate, formatKES, today } from '@/utils/format';

interface SalesProps extends PageProps {
  date: string;
  month: string;
  daily_sales: (MilkSale & { buyer: MilkBuyer })[];
  monthly_summary: { milk_buyer_id: string; litres: number; revenue: number; buyer: MilkBuyer }[];
  monthly_total: number;
  buyers: MilkBuyer[];
}

export default function MilkSales() {
  const { date, daily_sales, monthly_summary, monthly_total, buyers } = usePage<SalesProps>().props;
  const [showForm, setShowForm] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    milk_buyer_id: buyers[0]?.id ?? '',
    sale_date: today(),
    quantity_litres: '',
    price_per_litre: buyers[0]?.default_price_per_litre?.toString() ?? '',
    payment_method: 'cash',
    notes: '',
  });

  const handleBuyerChange = (buyerId: string) => {
    const buyer = buyers.find(b => b.id === buyerId);
    setData(d => ({
      ...d,
      milk_buyer_id: buyerId,
      price_per_litre: buyer?.default_price_per_litre?.toString() ?? d.price_per_litre,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/milk-sales', {
      onSuccess: () => { reset(); setShowForm(false); },
    });
  };

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    router.get('/milk-sales', { date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') }, { preserveState: true });
  };

  const totalDailyRevenue = daily_sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <AppLayout title="Milk Sales">
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center justify-between pt-3 mb-4">
          <h1 className="text-white text-xl font-bold">Milk Sales</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent-500 text-white px-3 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Record Sale
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
          <button onClick={() => navigateDate(-1)} className="h-8 w-8 flex items-center justify-center text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-white font-semibold text-sm">{formatDate(date)}</p>
          <button
            onClick={() => navigateDate(1)}
            disabled={date >= today()}
            className="h-8 w-8 flex items-center justify-center text-white/70 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 bg-white/10 rounded-xl px-4 py-3">
          <span className="text-primary-200 text-sm">Daily Revenue</span>
          <span className="text-white text-xl font-bold">{formatKES(totalDailyRevenue)}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* New sale form */}
        {showForm && (
          <Card>
            <p className="text-sm font-bold text-gray-900 mb-3">Record Milk Sale</p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Buyer / Channel</label>
                <select
                  value={data.milk_buyer_id}
                  onChange={e => handleBuyerChange(e.target.value)}
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
                  type="number" min="0.1" step="0.1" inputMode="decimal"
                  placeholder="60" unit="L"
                  value={data.quantity_litres}
                  onChange={e => setData('quantity_litres', e.target.value)}
                  error={errors.quantity_litres}
                  required
                />
                <Input
                  label="Price / Litre"
                  type="number" min="0" step="0.5" inputMode="decimal"
                  placeholder="42" unit="KES"
                  value={data.price_per_litre}
                  onChange={e => setData('price_per_litre', e.target.value)}
                  error={errors.price_per_litre}
                  required
                />
              </div>
              {data.quantity_litres && data.price_per_litre && (
                <p className="text-sm font-bold text-green-700">
                  Total: {formatKES((parseFloat(data.quantity_litres) || 0) * (parseFloat(data.price_per_litre) || 0))}
                </p>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={data.payment_method}
                  onChange={e => setData('payment_method', e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="credit">Credit (Pay Later)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" fullWidth loading={processing}>Save Sale</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Today's sales */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Today's Sales — {formatDate(date)}
          </h2>
          {daily_sales.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-gray-500 text-sm">No sales recorded today.</p>
              <button onClick={() => setShowForm(true)} className="mt-2 text-primary-900 text-sm font-medium underline">
                Record a sale
              </button>
            </Card>
          ) : (
            <div className="space-y-2">
              {daily_sales.map(sale => (
                <Card key={sale.id} padding="sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sale.buyer?.name}</p>
                      <p className="text-xs text-gray-500">
                        {sale.quantity_litres.toFixed(1)} L @ {formatKES(sale.price_per_litre)}/L · {sale.payment_method}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatKES(sale.total_amount)}</p>
                  </div>
                </Card>
              ))}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex justify-between">
                <p className="text-sm font-semibold text-green-800">Total Today</p>
                <p className="text-sm font-bold text-green-800">{formatKES(totalDailyRevenue)}</p>
              </div>
            </div>
          )}
        </section>

        {/* Monthly summary */}
        {monthly_summary.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              This Month by Channel
            </h2>
            <div className="space-y-2">
              {monthly_summary.map((row) => (
                <div key={row.milk_buyer_id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{row.buyer?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{(row.litres ?? 0).toFixed(1)} L</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatKES(row.revenue ?? 0)}</p>
                </div>
              ))}
              <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex justify-between">
                <p className="text-sm font-semibold text-primary-900">Monthly Total</p>
                <p className="text-sm font-bold text-primary-900">{formatKES(monthly_total)}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
