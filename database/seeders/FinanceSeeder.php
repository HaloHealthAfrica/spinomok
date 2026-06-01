<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\Farm;
use App\Models\Revenue;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $farm = Farm::first();
        $user = User::first();
        if (!$farm || !$user) return;

        $month = now()->format('Y-m');
        [$year, $mon] = array_map('intval', explode('-', $month));

        // Demo expenses this month
        $expenses = [
            ['category' => 'feed',      'desc' => 'Dairy Meal Purchase (500 kg)',   'amount' => 26000, 'supplier' => 'Nakuru Feeds Ltd',      'days_ago' => 5],
            ['category' => 'feed',      'desc' => 'Rhodes Grass Hay (10 bales)',    'amount' => 1800,  'supplier' => 'Local Farmer',          'days_ago' => 10],
            ['category' => 'labour',    'desc' => 'Farm Worker Salary — Peter',     'amount' => 12000, 'supplier' => null,                     'days_ago' => 1],
            ['category' => 'vet',       'desc' => 'Vet Visit — Vaccination + ECF check', 'amount' => 2500, 'supplier' => 'Dr. Otieno',       'days_ago' => 8],
            ['category' => 'utilities', 'desc' => 'Borehole Electricity Bill',      'amount' => 1800,  'supplier' => 'KPLC',                  'days_ago' => 3],
            ['category' => 'equipment', 'desc' => 'Milking Equipment Repairs',      'amount' => 950,   'supplier' => 'Nakuru Agri Supplies',  'days_ago' => 12],
            ['category' => 'transport', 'desc' => 'Milk Delivery Transport',        'amount' => 600,   'supplier' => null,                     'days_ago' => 7],
        ];

        foreach ($expenses as $e) {
            Expense::create([
                'id'           => Str::uuid(),
                'farm_id'      => $farm->id,
                'category'     => $e['category'],
                'expense_date' => now()->subDays($e['days_ago'])->toDateString(),
                'description'  => $e['desc'],
                'amount'       => $e['amount'],
                'currency'     => 'KES',
                'supplier'     => $e['supplier'],
                'payment_method' => 'mpesa',
                'is_paid'      => true,
                'created_by'   => $user->id,
                'updated_by'   => $user->id,
            ]);
        }

        // Demo revenue this month (non-milk — milk sales seeded separately)
        $revenues = [
            ['category' => 'manure_sales', 'desc' => 'Manure sold to neighbouring farm', 'amount' => 3500, 'buyer' => 'John Njoroge', 'days_ago' => 6],
            ['category' => 'animal_sales', 'desc' => 'Bull calf sold (SPM-2026-008)',     'amount' => 22000, 'buyer' => 'Githunguri Market', 'days_ago' => 4],
        ];

        foreach ($revenues as $r) {
            Revenue::create([
                'id'           => Str::uuid(),
                'farm_id'      => $farm->id,
                'category'     => $r['category'],
                'revenue_date' => now()->subDays($r['days_ago'])->toDateString(),
                'description'  => $r['desc'],
                'amount'       => $r['amount'],
                'currency'     => 'KES',
                'buyer_name'   => $r['buyer'],
                'payment_method' => 'cash',
                'is_received'  => true,
                'created_by'   => $user->id,
                'updated_by'   => $user->id,
            ]);
        }

        // Also seed a demo milk sale using seeded buyer
        $buyer = \App\Models\MilkBuyer::where('farm_id', $farm->id)->first();
        if ($buyer) {
            \App\Models\MilkSale::firstOrCreate(
                ['farm_id' => $farm->id, 'sale_date' => now()->toDateString(), 'milk_buyer_id' => $buyer->id],
                [
                    'id'              => Str::uuid(),
                    'farm_id'         => $farm->id,
                    'milk_buyer_id'   => $buyer->id,
                    'sale_date'       => now()->toDateString(),
                    'quantity_litres' => 60,
                    'price_per_litre' => $buyer->default_price_per_litre ?? 42,
                    'total_amount'    => 60 * ($buyer->default_price_per_litre ?? 42),
                    'is_paid'         => true,
                    'payment_method'  => 'mpesa',
                    'created_by'      => $user->id,
                    'updated_by'      => $user->id,
                ]
            );
        }

        $this->command->info('✓ Demo expenses seeded: ' . count($expenses));
        $this->command->info('✓ Demo revenues seeded: ' . count($revenues));
    }
}
