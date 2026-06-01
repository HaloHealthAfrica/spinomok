<?php

namespace Database\Seeders;

use App\Models\Farm;
use App\Models\MilkBuyer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MilkBuyerSeeder extends Seeder
{
    public function run(): void
    {
        $farm = Farm::first();
        if (!$farm) return;

        $buyers = [
            ['name' => 'Brookside Dairy',     'buyer_type' => 'processor',   'default_price_per_litre' => 42.00, 'payment_terms_days' => 30],
            ['name' => 'New KCC',             'buyer_type' => 'processor',   'default_price_per_litre' => 40.00, 'payment_terms_days' => 30],
            ['name' => 'Githunguri Sacco',    'buyer_type' => 'cooperative', 'default_price_per_litre' => 43.00, 'payment_terms_days' => 14],
            ['name' => 'Farm Gate (Cash)',    'buyer_type' => 'direct',      'default_price_per_litre' => 65.00, 'payment_terms_days' => 0],
            ['name' => 'Home Use',            'buyer_type' => 'home_use',    'default_price_per_litre' => 0,     'payment_terms_days' => 0],
            ['name' => 'Calf Feeding',        'buyer_type' => 'calf_feeding','default_price_per_litre' => 0,     'payment_terms_days' => 0],
        ];

        foreach ($buyers as $buyer) {
            MilkBuyer::firstOrCreate(
                ['farm_id' => $farm->id, 'name' => $buyer['name']],
                array_merge($buyer, ['id' => Str::uuid(), 'farm_id' => $farm->id]),
            );
        }

        $this->command->info('✓ Default milk buyers seeded');
    }
}
