<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

/**
 * Production seeder — only seeds reference data (no demo farm/animals).
 * Safe to run on every deploy (uses firstOrCreate).
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // Feed reference data
        $this->call(FeedReferenceSeeder::class);

        // Health reference data
        $this->call(HealthReferenceSeeder::class);

        // Meal ingredient library
        $this->call(FormulationSeeder::class);

        $this->command->info('✓ Production reference data seeded.');
    }
}
