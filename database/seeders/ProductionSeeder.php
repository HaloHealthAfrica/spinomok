<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Production seeder: reference data only, plus per-farm defaults required for
 * day-1 workflows. Safe to run repeatedly because child seeders use firstOrCreate.
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(FeedReferenceSeeder::class);
        $this->call(HealthReferenceSeeder::class);
        $this->call(FormulationSeeder::class);
        $this->call(MilkBuyerSeeder::class);

        $this->command->info('Production reference data seeded.');
    }
}
