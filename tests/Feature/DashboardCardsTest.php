<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\DailyReport;
use App\Models\Farm;
use App\Models\FarmUser;
use App\Models\FeedInventoryTransaction;
use App\Models\FeedType;
use App\Models\HealthEvent;
use App\Models\MilkBuyer;
use App\Models\User;
use App\Models\Expense;
use Database\Seeders\FeedReferenceSeeder;
use Database\Seeders\HealthReferenceSeeder;
use Database\Seeders\MilkBuyerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
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

    public function test_day_one_seeded_smoke_workflow_records_core_farm_operations(): void
    {
        [$user, $animal, $farm] = $this->createFarmContext(role: 'farm_manager');
        $this->seed([FeedReferenceSeeder::class, HealthReferenceSeeder::class, MilkBuyerSeeder::class]);

        $date = now()->toDateString();
        $this->actingAs($user);

        $this->post('/animals', [
            'tag_number' => 'SMOKE-002',
            'name' => 'Smoke Cow',
            'sex' => 'female',
            'status' => 'heifer',
            'breed' => 'Ayrshire',
            'birth_date' => now()->subYear()->toDateString(),
            'weight_kg' => 240,
        ])->assertRedirect();

        $this->post('/milk-records', [
            'date' => $date,
            'entries' => [[
                'animal_id' => $animal->id,
                'session' => 'morning',
                'litres' => 12.5,
            ]],
        ])->assertRedirect();

        $buyer = MilkBuyer::where('farm_id', $farm->id)->where('buyer_type', 'direct')->firstOrFail();
        $this->post('/milk-sales', [
            'milk_buyer_id' => $buyer->id,
            'sale_date' => $date,
            'quantity_litres' => 10,
            'price_per_litre' => 65,
            'payment_method' => 'cash',
        ])->assertRedirect();

        $feedType = FeedType::where('name', 'Dairy Meal (16% CP)')->firstOrFail();
        $this->post('/feed/receive', [
            'feed_type_id' => $feedType->id,
            'quantity_kg' => 100,
            'unit_cost' => 50,
            'transaction_date' => $date,
            'transaction_type' => 'purchase',
            'supplier' => 'Smoke Supplier',
        ])->assertRedirect();

        $this->post('/feed/consume', [
            'entries' => [[
                'feed_type_id' => $feedType->id,
                'quantity_kg' => 20,
                'animal_group' => 'lactating',
                'transaction_date' => $date,
            ]],
        ])->assertRedirect();

        $this->post('/health', [
            'animal_id' => $animal->id,
            'observed_on' => $date,
            'symptoms' => 'Smoke health check',
            'severity' => 'mild',
            'vet_consulted' => false,
        ])->assertRedirect();

        $this->post('/finance/expense', [
            'category' => 'feed',
            'expense_date' => $date,
            'description' => 'Smoke feed purchase',
            'amount' => 5000,
            'supplier' => 'Smoke Supplier',
            'payment_method' => 'cash',
        ])->assertRedirect();

        $this->get('/reports/daily/new?date='.$date)->assertOk();
        $report = DailyReport::where('farm_id', $farm->id)->whereDate('report_date', $date)->firstOrFail();

        $this->post("/reports/daily/{$report->id}/submit", [
            'weather' => 'Sunny',
            'manager_notes' => 'Smoke report submitted.',
        ])->assertRedirect();

        $report->refresh();

        $this->assertSame('submitted', $report->status);
        $this->assertSame(12.5, (float) $report->total_milk_litres);
        $this->assertSame(10.0, (float) $report->milk_sold_litres);
        $this->assertSame(650.0, (float) $report->milk_revenue);
        $this->assertSame(1000.0, (float) $report->total_feed_cost);
        $this->assertSame(1, (int) $report->health_events_count);

        $this->assertDatabaseHas('animals', ['farm_id' => $farm->id, 'tag_number' => 'SMOKE-002']);
        $this->assertSame(1, HealthEvent::where('farm_id', $farm->id)->count());
        $this->assertSame(2, FeedInventoryTransaction::where('farm_id', $farm->id)->count());
        $this->assertSame(1, Expense::where('farm_id', $farm->id)->where('description', 'Smoke feed purchase')->count());

        $this->get("/reports/daily/{$report->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/daily/Show')
                ->has('milk_records', 1)
                ->has('sales', 1)
                ->has('health_events', 1)
                ->has('feed_transactions', 2)
                ->has('expenses', 1)
            );
    }

    public function test_farm_workers_cannot_adjust_feed_inventory(): void
    {
        [$user] = $this->createFarmContext(role: 'farm_worker');
        $this->seed(FeedReferenceSeeder::class);

        $feedType = FeedType::firstOrFail();

        $this->actingAs($user)
            ->post('/feed/adjust', [
                'feed_type_id' => $feedType->id,
                'quantity_kg' => 10,
                'transaction_type' => 'adjustment',
                'transaction_date' => now()->toDateString(),
            ])
            ->assertForbidden();
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
