<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\Farm;
use App\Models\FarmUser;
use App\Models\MilkProduction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create demo farm
        $farm = Farm::create([
            'id'                => Str::uuid(),
            'name'              => 'SpinoMok Dairy Farm',
            'owner_name'        => 'John Kamau',
            'county'            => 'Nakuru',
            'sub_county'        => 'Nakuru East',
            'phone'             => '+254700123456',
            'email'             => 'admin@spinomok.com',
            'subscription_plan' => 'pro',
            'is_active'         => true,
            'settings'          => [
                'currency'           => 'KES',
                'timezone'           => 'Africa/Nairobi',
                'milk_price_default' => 42,
            ],
        ]);

        // Users
        $users = [
            ['name' => 'John Kamau',   'email' => 'admin@spinomok.com',   'phone' => '+254700123456', 'role' => 'farm_owner'],
            ['name' => 'Mary Wanjiku', 'email' => 'manager@spinomok.com', 'phone' => '+254711234567', 'role' => 'farm_manager'],
            ['name' => 'Peter Otieno', 'email' => 'worker@spinomok.com',  'phone' => '+254722345678', 'role' => 'farm_worker'],
        ];

        $createdUsers = [];
        foreach ($users as $userData) {
            $user = User::create([
                'id'        => Str::uuid(),
                'name'      => $userData['name'],
                'email'     => $userData['email'],
                'phone'     => $userData['phone'],
                'password'  => Hash::make('password'),
                'is_active' => true,
            ]);
            FarmUser::create([
                'id'        => Str::uuid(),
                'farm_id'   => $farm->id,
                'user_id'   => $user->id,
                'role'      => $userData['role'],
                'is_active' => true,
            ]);
            $createdUsers[$userData['role']] = $user;
        }

        $ownerId   = $createdUsers['farm_owner']->id;
        $workerId  = $createdUsers['farm_worker']->id;

        // Demo animals
        $animals = [
            ['name' => 'Daisy', 'tag' => 'SPM-2023-001', 'status' => 'lactating', 'breed' => 'Friesian',   'sex' => 'female', 'parity' => 2, 'pregnant' => false],
            ['name' => 'Bella', 'tag' => 'SPM-2022-002', 'status' => 'lactating', 'breed' => 'Ayrshire',   'sex' => 'female', 'parity' => 3, 'pregnant' => true],
            ['name' => 'Rose',  'tag' => 'SPM-2023-003', 'status' => 'lactating', 'breed' => 'Friesian',   'sex' => 'female', 'parity' => 1, 'pregnant' => false],
            ['name' => 'Tina',  'tag' => 'SPM-2024-004', 'status' => 'heifer',    'breed' => 'Crossbreed', 'sex' => 'female', 'parity' => 0, 'pregnant' => false],
            ['name' => 'Clara', 'tag' => 'SPM-2024-005', 'status' => 'dry',       'breed' => 'Friesian',   'sex' => 'female', 'parity' => 2, 'pregnant' => true],
            ['name' => 'Rex',   'tag' => 'SPM-2021-006', 'status' => 'bull',      'breed' => 'Friesian',   'sex' => 'male',   'parity' => 0, 'pregnant' => false],
            ['name' => null,    'tag' => 'SPM-2026-007', 'status' => 'calf',      'breed' => 'Friesian',   'sex' => 'female', 'parity' => 0, 'pregnant' => false],
            ['name' => null,    'tag' => 'SPM-2026-008', 'status' => 'calf',      'breed' => 'Crossbreed', 'sex' => 'male',   'parity' => 0, 'pregnant' => false],
        ];

        $lactatingIds = [];
        foreach ($animals as $data) {
            $animal = Animal::create([
                'id'                    => Str::uuid(),
                'farm_id'               => $farm->id,
                'tag_number'            => $data['tag'],
                'name'                  => $data['name'],
                'sex'                   => $data['sex'],
                'status'                => $data['status'],
                'breed'                 => $data['breed'],
                'birth_date'            => now()->subMonths(rand(6, 48))->toDateString(),
                'parity'                => $data['parity'],
                'is_pregnant'           => $data['pregnant'],
                'expected_calving_date' => $data['pregnant'] ? now()->addDays(rand(30, 120))->toDateString() : null,
                'last_calving_date'     => $data['parity'] > 0 ? now()->subDays(rand(30, 200))->toDateString() : null,
                'weight_kg'             => $data['status'] === 'calf' ? rand(40, 80) : rand(380, 600),
                'created_by'            => $ownerId,
                'updated_by'            => $ownerId,
            ]);

            if ($data['status'] === 'lactating') {
                $lactatingIds[] = $animal->id;
            }
        }

        // Milk records for today (lactating cows)
        $sessions = [
            'morning' => [8.0, 14.0],
            'midday'  => [3.0, 6.0],
            'evening' => [6.0, 11.0],
        ];

        foreach ($lactatingIds as $animalId) {
            foreach ($sessions as $session => $range) {
                MilkProduction::create([
                    'id'              => Str::uuid(),
                    'farm_id'         => $farm->id,
                    'animal_id'       => $animalId,
                    'milked_on'       => now()->toDateString(),
                    'session'         => $session,
                    'quantity_litres' => round(rand((int)($range[0]*10), (int)($range[1]*10)) / 10, 1),
                    'milked_by'       => $workerId,
                    'created_by'      => $workerId,
                    'updated_by'      => $workerId,
                ]);
            }
        }

        // Demo alert
        Alert::create([
            'id'         => Str::uuid(),
            'farm_id'    => $farm->id,
            'alert_type' => 'calving_due',
            'severity'   => 'warning',
            'status'     => 'pending',
            'title'      => 'Calving Due Soon — Bella',
            'message'    => 'Bella (SPM-2022-002) is due to calve within the next 14 days. Prepare the calving pen and supplies.',
            'due_on'     => now()->addDays(8)->toDateString(),
        ]);

        $this->command->info('');
        $this->command->info('✓ Demo farm seeded: SpinoMok Dairy Farm');
        $this->command->info('✓ Login: admin@spinomok.com / password');
        $this->command->info('✓ ' . count($animals) . ' demo animals created');
        $this->command->info('✓ Today\'s milk records seeded for ' . count($lactatingIds) . ' cows');
    }
}
