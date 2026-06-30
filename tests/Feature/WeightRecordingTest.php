<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\AnimalWeightRecord;
use App\Models\CalfRecord;
use App\Models\CalfWeightLog;
use App\Models\Farm;
use App\Models\FarmUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class WeightRecordingTest extends TestCase
{
    use RefreshDatabase;

    public function test_farm_user_can_record_animal_weight(): void
    {
        [$user, $animal] = $this->createFarmContext();

        $this->actingAs($user)
            ->post('/weight', [
                'entries' => [[
                    'animal_id' => $animal->id,
                    'measured_on' => now()->toDateString(),
                    'weight_kg' => 255,
                    'body_condition_score' => '',
                    'method' => 'scale',
                    'notes' => 'Monthly check',
                ]],
            ])
            ->assertRedirect('/calves');

        $this->assertSame(255.0, (float) $animal->fresh()->weight_kg);
        $this->assertSame(1, AnimalWeightRecord::withoutGlobalScopes()->where('animal_id', $animal->id)->count());
    }

    public function test_farm_user_can_add_calf_management_weight_log(): void
    {
        [$user, $animal, $farm] = $this->createFarmContext();
        $calf = CalfRecord::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'animal_id' => $animal->id,
            'dob' => now()->subMonths(10)->toDateString(),
            'birth_weight_kg' => 35,
            'sex' => 'Female',
        ]);

        $this->actingAs($user)
            ->post("/calf-management/{$calf->id}/weight-logs", [
                'weighed_date' => now()->toDateString(),
                'weight_kg' => 260,
                'notes' => 'Growth tab check',
            ])
            ->assertRedirect();

        $this->assertSame(260.0, (float) $animal->fresh()->weight_kg);
        $this->assertSame(1, CalfWeightLog::where('calf_record_id', $calf->id)->count());
    }

    private function createFarmContext(): array
    {
        $farm = Farm::forceCreate([
            'id' => (string) Str::uuid(),
            'name' => 'Test Dairy Farm',
            'owner_name' => 'Test Owner',
            'county' => 'Nakuru',
            'subscription_plan' => 'pro',
            'is_active' => true,
            'settings' => [],
        ]);

        $user = User::forceCreate([
            'id' => (string) Str::uuid(),
            'name' => 'Farm Manager',
            'email' => 'weight-manager@example.com',
            'phone' => '+254700000000',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        FarmUser::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'user_id' => $user->id,
            'role' => 'farm_manager',
            'is_active' => true,
        ]);

        $animal = Animal::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'tag_number' => 'WGT-001',
            'name' => 'Willow',
            'sex' => 'female',
            'status' => 'heifer',
            'breed' => 'Friesian',
            'birth_date' => now()->subMonths(10)->toDateString(),
            'weight_kg' => 240,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return [$user, $animal, $farm];
    }
}
