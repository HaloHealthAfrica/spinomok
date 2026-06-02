<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\Farm;
use App\Models\FarmUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class DashboardCardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_card_destinations_resolve_for_a_farm_user(): void
    {
        [$user, $animal] = $this->createFarmContext();

        $this->actingAs($user);

        $this->get('/dashboard')
            ->assertOk();

        foreach ([
            '/milk-records',
            '/finance',
            '/alerts',
            '/reports/daily/new',
            '/milk-records/create',
            '/health/create',
            '/breeding',
            '/feed',
            '/animals',
            "/animals/{$animal->id}",
            '/profile',
            '/settings/farm',
        ] as $path) {
            $this->get($path)->assertOk();
        }
    }

    public function test_static_click_through_destinations_resolve_for_a_farm_user(): void
    {
        [$user] = $this->createFarmContext();

        $this->actingAs($user);

        foreach ([
            '/',
            '/dashboard',
            '/animals',
            '/animals/create',
            '/milk-records',
            '/milk-records/create',
            '/milk-sales',
            '/reports',
            '/reports/daily/new',
            '/breeding',
            '/breeding/new',
            '/breeding/heat/new',
            '/breeding/ai/new',
            '/breeding/pd/new',
            '/breeding/calving/new',
            '/breeding/sync/new',
            '/health',
            '/health/create',
            '/health/vaccinations/new',
            '/health/vaccinations/schedule',
            '/health/deworming/new',
            '/calves',
            '/weight/record',
            '/weight/batch',
            '/calf-feeding/new',
            '/feed',
            '/feed/receive',
            '/feed/consume',
            '/formulation',
            '/formulation/formula/new',
            '/formulation/ration/new',
            '/finance',
            '/finance/expense/new',
            '/finance/revenue/new',
            '/analytics',
            '/analytics/whatsapp/daily',
            '/analytics/whatsapp/weekly',
            '/more',
            '/alerts',
            '/settings/sync',
            '/settings/farm',
            '/profile',
        ] as $path) {
            $response = $this->get($path);

            $this->assertTrue(
                $response->isOk() || $response->isRedirect(),
                "{$path} returned HTTP {$response->getStatusCode()}",
            );
        }
    }

    public function test_settings_forms_update_profile_and_farm(): void
    {
        [$user, , $farm] = $this->createFarmContext();

        $this->actingAs($user)
            ->patch('/profile', [
                'name' => 'Updated Manager',
                'email' => 'updated@example.com',
                'phone' => '+254711111111',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Manager',
            'email' => 'updated@example.com',
        ]);

        $this->actingAs($user)
            ->patch('/settings/farm', [
                'name' => 'Updated Dairy',
                'owner_name' => 'Updated Owner',
                'county' => 'Kiambu',
                'sub_county' => 'Limuru',
                'phone' => '+254722222222',
                'email' => 'farm@example.com',
                'default_milk_price' => 48,
                'whatsapp_number' => '+254733333333',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('farms', [
            'id' => $farm->id,
            'name' => 'Updated Dairy',
            'county' => 'Kiambu',
        ]);

        $this->assertSame(48, (int) $farm->fresh()->settings['default_milk_price']);
    }

    public function test_farm_settings_form_receives_all_editable_fields(): void
    {
        [$user] = $this->createFarmContext(role: 'farm_owner', farmAttributes: [
            'sub_county' => 'Nakuru East',
            'phone' => '+254700111222',
            'email' => 'farm-settings@example.com',
        ]);

        $this->actingAs($user)
            ->get('/settings/farm')
            ->assertOk()
            ->assertSee('Nakuru East')
            ->assertSee('farm-settings@example.com');
    }

    public function test_farm_workers_cannot_update_farm_settings(): void
    {
        [$user, , $farm] = $this->createFarmContext(role: 'farm_worker', farmAttributes: [
            'name' => 'Original Dairy',
        ]);

        $this->actingAs($user)
            ->patch('/settings/farm', [
                'name' => 'Worker Rename',
                'owner_name' => 'Updated Owner',
                'county' => 'Kiambu',
                'sub_county' => 'Limuru',
                'phone' => '+254722222222',
                'email' => 'farm@example.com',
            ])
            ->assertForbidden();

        $this->assertSame('Original Dairy', $farm->fresh()->name);
    }

    public function test_alerts_card_destination_shows_active_alerts(): void
    {
        [$user, $animal, $farm] = $this->createFarmContext();

        Alert::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'animal_id' => $animal->id,
            'alert_type' => 'calving_due',
            'severity' => 'critical',
            'status' => 'pending',
            'title' => 'Calving Due Soon',
            'message' => 'Prepare the calving pen.',
            'due_on' => now()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($user)
            ->get('/alerts')
            ->assertOk()
            ->assertSee('Calving Due Soon')
            ->assertSee('critical');
    }

    public function test_uuid_models_receive_ids_on_normal_create(): void
    {
        $farm = Farm::create([
            'name' => 'Created Farm',
            'owner_name' => 'Owner',
            'county' => 'Nakuru',
            'subscription_plan' => 'pro',
            'is_active' => true,
            'settings' => [],
        ]);

        $user = User::create([
            'name' => 'Created User',
            'email' => 'created@example.com',
            'phone' => '+254744444444',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $farmUser = FarmUser::create([
            'farm_id' => $farm->id,
            'user_id' => $user->id,
            'role' => 'farm_manager',
            'is_active' => true,
        ]);

        $this->assertNotEmpty($farm->id);
        $this->assertNotEmpty($user->id);
        $this->assertNotEmpty($farmUser->id);
    }

    public function test_add_animal_post_creates_uuid_backed_animal(): void
    {
        [$user] = $this->createFarmContext();

        $this->actingAs($user)
            ->post('/animals', [
                'tag_number' => 'TEST-002',
                'name' => 'Poppy',
                'sex' => 'female',
                'status' => 'heifer',
                'breed' => 'Ayrshire',
                'birth_date' => now()->subYear()->toDateString(),
                'weight_kg' => 250,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('animals', [
            'tag_number' => 'TEST-002',
            'name' => 'Poppy',
            'status' => 'heifer',
        ]);

        $this->assertNotEmpty(Animal::where('tag_number', 'TEST-002')->value('id'));
    }

    private function createFarmContext(string $role = 'farm_manager', array $farmAttributes = []): array
    {
        $farm = Farm::forceCreate([
            'id' => (string) Str::uuid(),
            'name' => 'Test Dairy Farm',
            'owner_name' => 'Test Owner',
            'county' => 'Nakuru',
            'subscription_plan' => 'pro',
            'is_active' => true,
            'settings' => [],
            ...$farmAttributes,
        ]);

        $user = User::forceCreate([
            'id' => (string) Str::uuid(),
            'name' => 'Farm Manager',
            'email' => 'manager@example.com',
            'phone' => '+254700000000',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        FarmUser::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'user_id' => $user->id,
            'role' => $role,
            'is_active' => true,
        ]);

        $animal = Animal::forceCreate([
            'id' => (string) Str::uuid(),
            'farm_id' => $farm->id,
            'tag_number' => 'TEST-001',
            'name' => 'Daisy',
            'sex' => 'female',
            'status' => 'lactating',
            'breed' => 'Friesian',
            'birth_date' => now()->subYears(4)->toDateString(),
            'is_pregnant' => false,
            'parity' => 2,
            'weight_kg' => 450,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return [$user, $animal, $farm];
    }
}
