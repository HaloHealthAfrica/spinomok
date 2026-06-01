<?php

namespace Database\Seeders;

use App\Models\FeedInventory;
use App\Models\FeedType;
use App\Models\Farm;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FeedReferenceSeeder extends Seeder
{
    public function run(): void
    {
        $feeds = [
            // Roughages
            ['name' => 'Napier Grass (Fresh)',   'category' => 'roughage',    'dm' => 15.0, 'cp' => 9.0,  'me' => 8.5,  'unit' => 'kg',  'desc' => 'Pennisetum purpureum — primary zero-grazing fodder'],
            ['name' => 'Maize Silage',            'category' => 'silage',      'dm' => 30.0, 'cp' => 8.5,  'me' => 10.5, 'unit' => 'kg',  'desc' => 'Whole-plant maize ensiled at dough stage'],
            ['name' => 'Rhodes Grass Hay',        'category' => 'hay',         'dm' => 88.0, 'cp' => 8.0,  'me' => 9.0,  'unit' => 'kg',  'desc' => 'Chloris gayana — common Kenya hay'],
            ['name' => 'Oat Hay',                 'category' => 'hay',         'dm' => 87.0, 'cp' => 10.0, 'me' => 9.5,  'unit' => 'kg',  'desc' => 'High-altitude Kenya hay — Nakuru/Nandi'],
            ['name' => 'Lucerne (Alfalfa)',        'category' => 'roughage',    'dm' => 20.0, 'cp' => 20.0, 'me' => 10.0, 'unit' => 'kg',  'desc' => 'Medicago sativa — high protein legume; risk of bloat if fed fresh'],
            ['name' => 'Maize Stover',            'category' => 'roughage',    'dm' => 85.0, 'cp' => 5.0,  'me' => 7.0,  'unit' => 'kg',  'desc' => 'Dry maize stalks — low quality roughage'],
            ['name' => 'Sugar Cane Tops',         'category' => 'roughage',    'dm' => 25.0, 'cp' => 5.5,  'me' => 9.0,  'unit' => 'kg',  'desc' => 'Seasonal sugar-region farms'],
            // Concentrates
            ['name' => 'Dairy Meal (16% CP)',     'category' => 'concentrate', 'dm' => 88.0, 'cp' => 16.0, 'me' => 12.5, 'unit' => 'kg',  'desc' => 'Standard commercial dairy concentrate — KES 45–60/kg'],
            ['name' => 'Dairy Meal (20% CP)',     'category' => 'concentrate', 'dm' => 88.0, 'cp' => 20.0, 'me' => 13.0, 'unit' => 'kg',  'desc' => 'High-protein dairy concentrate for peak lactation'],
            ['name' => 'Calf Pellets (Starter)',  'category' => 'concentrate', 'dm' => 88.0, 'cp' => 18.0, 'me' => 11.0, 'unit' => 'kg',  'desc' => 'Starter feed for calves from 14 days'],
            ['name' => 'Molasses',                'category' => 'supplement',  'dm' => 75.0, 'cp' => 3.0,  'me' => 11.5, 'unit' => 'kg',  'desc' => 'Energy supplement; improves feed palatability; max 10% of DM'],
            // Minerals
            ['name' => 'Mineral Supplement (Loose)', 'category' => 'mineral', 'dm' => 100.0,'cp' => 0.0,  'me' => 0.0,  'unit' => 'kg',  'desc' => 'Loose mineral salt — calcium, phosphorus, trace elements'],
            ['name' => 'Salt (NaCl)',              'category' => 'mineral',     'dm' => 100.0,'cp' => 0.0,  'me' => 0.0,  'unit' => 'kg',  'desc' => 'Common salt — sodium source and feed palatability'],
            ['name' => 'Salt Lick Block',          'category' => 'mineral',     'dm' => 100.0,'cp' => 0.0,  'me' => 0.0,  'unit' => 'kg',  'desc' => 'Mineral block — free choice for all animals'],
            ['name' => 'Milk Replacer',            'category' => 'supplement',  'dm' => 95.0, 'cp' => 22.0, 'me' => 14.0, 'unit' => 'kg',  'desc' => 'Powder replacer for calves — reconstitute with warm water'],
        ];

        foreach ($feeds as $f) {
            FeedType::firstOrCreate(['name' => $f['name']], [
                'id'                    => Str::uuid(),
                'category'              => $f['category'],
                'dry_matter_percent'    => $f['dm'],
                'crude_protein_percent' => $f['cp'],
                'metabolizable_energy'  => $f['me'],
                'default_unit'          => $f['unit'],
                'description'           => $f['desc'],
            ]);
        }

        // Create demo feed inventory for the demo farm
        $farm = Farm::first();
        if ($farm) {
            $demoStock = [
                ['name' => 'Napier Grass (Fresh)',   'qty' => 2000, 'reorder' => 200, 'cost' => 3.00],
                ['name' => 'Dairy Meal (16% CP)',    'qty' => 400,  'reorder' => 50,  'cost' => 52.00],
                ['name' => 'Rhodes Grass Hay',       'qty' => 500,  'reorder' => 100, 'cost' => 18.00],
                ['name' => 'Maize Silage',           'qty' => 1500, 'reorder' => 200, 'cost' => 8.00],
                ['name' => 'Mineral Supplement (Loose)', 'qty' => 50, 'reorder' => 10, 'cost' => 150.00],
                ['name' => 'Calf Pellets (Starter)', 'qty' => 90,   'reorder' => 20,  'cost' => 45.00],
            ];

            foreach ($demoStock as $stock) {
                $feedType = FeedType::where('name', $stock['name'])->first();
                if (!$feedType) continue;

                FeedInventory::firstOrCreate(
                    ['farm_id' => $farm->id, 'feed_type_id' => $feedType->id],
                    [
                        'id'               => Str::uuid(),
                        'farm_id'          => $farm->id,
                        'feed_type_id'     => $feedType->id,
                        'quantity_kg'      => $stock['qty'],
                        'reorder_level_kg' => $stock['reorder'],
                        'avg_cost_per_kg'  => $stock['cost'],
                        'last_restocked_on'=> now()->subDays(rand(3, 14))->toDateString(),
                    ]
                );
            }
        }

        $this->command->info('✓ Feed types seeded: ' . FeedType::count());
        $this->command->info('✓ Demo inventory items created: ' . ($farm ? FeedInventory::where('farm_id', $farm->id)->count() : 0));
    }
}
