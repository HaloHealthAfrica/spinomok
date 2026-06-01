<?php

namespace App\Services;

use App\Models\AIService;
use App\Models\Animal;
use App\Models\CalvingRecord;
use App\Models\HeatEvent;
use App\Models\PregnancyCheck;
use App\Models\SyncProgram;
use App\Models\SyncProgramEvent;
use Carbon\Carbon;
use Illuminate\Support\Str;

class BreedingService
{
    /**
     * Gestation lengths by breed (days).
     */
    private const GESTATION = [
        'Friesian'   => 280,
        'Ayrshire'   => 280,
        'Jersey'     => 276,
        'Guernsey'   => 283,
        'Brown Swiss'=> 290,
        'Sahiwal'    => 283,
        'Crossbreed' => 281,
        'Other'      => 280,
    ];

    /**
     * Calculate expected calving date based on AI date and breed.
     */
    public function calculateExpectedCalvingDate(Carbon $serviceDate, string $breed): Carbon
    {
        $days = self::GESTATION[$breed] ?? 280;
        return $serviceDate->copy()->addDays($days);
    }

    /**
     * Calculate dry-off date — 60 days before expected calving.
     */
    public function calculateDryOffDate(Carbon $expectedCalvingDate): Carbon
    {
        return $expectedCalvingDate->copy()->subDays(60);
    }

    /**
     * Calculate optimal AI window (12–18 hours after standing heat).
     */
    public function calculateAIWindow(Carbon $heatDetectionTime): array
    {
        return [
            'start' => $heatDetectionTime->copy()->addHours(12),
            'end'   => $heatDetectionTime->copy()->addHours(18),
        ];
    }

    /**
     * Calculate expected return heat date (21 days after last heat, if no conception).
     */
    public function calculateReturnHeatDate(Carbon $lastHeatDate): Carbon
    {
        return $lastHeatDate->copy()->addDays(21);
    }

    /**
     * Record a heat event and generate AI window alerts.
     */
    public function recordHeat(array $data, string $userId): HeatEvent
    {
        $observedOn = Carbon::parse($data['observed_on']);
        $observedAt = isset($data['observed_at'])
            ? Carbon::parse($data['observed_on'] . ' ' . $data['observed_at'])
            : $observedOn->copy()->setHour(7)->setMinute(0);

        $window = $this->calculateAIWindow($observedAt);

        $heat = HeatEvent::create([
            'id'               => Str::uuid(),
            'farm_id'          => $data['farm_id'],
            'animal_id'        => $data['animal_id'],
            'observed_on'      => $data['observed_on'],
            'observed_at'      => $data['observed_at'] ?? null,
            'detection_method' => $data['detection_method'] ?? 'visual',
            'confidence'       => $data['confidence'] ?? 'certain',
            'signs_observed'   => $data['signs_observed'] ?? [],
            'ai_window_start'  => $window['start'],
            'ai_window_end'    => $window['end'],
            'acted_on'         => false,
            'observed_by'      => $userId,
            'notes'            => $data['notes'] ?? null,
            'created_by'       => $userId,
        ]);

        // Create a MEDIUM alert for the farm
        \App\Models\Alert::create([
            'id'         => Str::uuid(),
            'farm_id'    => $data['farm_id'],
            'alert_type' => 'heat_expected',
            'severity'   => 'warning',
            'status'     => 'pending',
            'title'      => "Heat Detected — {$heat->animal->display_name}",
            'message'    => "Optimal AI window: {$window['start']->format('H:i')}–{$window['end']->format('H:i')} today.",
            'animal_id'  => $data['animal_id'],
            'due_on'     => $window['end']->toDateString(),
            'reference_table' => 'heat_events',
            'reference_id'    => $heat->id,
        ]);

        return $heat;
    }

    /**
     * Record an AI service, update animal pregnancy status, decrement semen straw.
     */
    public function recordAIService(array $data, string $userId): AIService
    {
        $animal      = Animal::withoutGlobalScopes()->findOrFail($data['animal_id']);
        $serviceDate = Carbon::parse($data['service_date']);
        $expectedCalving = $this->calculateExpectedCalvingDate($serviceDate, $animal->breed);
        $dryOff          = $this->calculateDryOffDate($expectedCalving);

        // Determine service number (count prior services for this animal this cycle)
        $priorServices = AIService::withoutGlobalScopes()
            ->where('animal_id', $data['animal_id'])
            ->where('result', 'pending')
            ->count();

        $service = AIService::create([
            'id'                   => Str::uuid(),
            'farm_id'              => $data['farm_id'],
            'animal_id'            => $data['animal_id'],
            'heat_event_id'        => $data['heat_event_id'] ?? null,
            'semen_inventory_id'   => $data['semen_inventory_id'] ?? null,
            'service_date'         => $data['service_date'],
            'service_time'         => $data['service_time'] ?? null,
            'technician_name'      => $data['technician_name'] ?? null,
            'technician_phone'     => $data['technician_phone'] ?? null,
            'service_cost'         => $data['service_cost'] ?? null,
            'result'               => 'pending',
            'expected_calving_date'=> $expectedCalving,
            'expected_dry_off_date'=> $dryOff,
            'service_number'       => $priorServices + 1,
            'notes'                => $data['notes'] ?? null,
            'created_by'           => $userId,
            'updated_by'           => $userId,
        ]);

        // Decrement semen straw if linked
        if ($data['semen_inventory_id'] ?? null) {
            $semen = \App\Models\SemenInventory::withoutGlobalScopes()->find($data['semen_inventory_id']);
            $semen?->decrementStraw();
        }

        // Mark heat event as acted on
        if ($data['heat_event_id'] ?? null) {
            HeatEvent::withoutGlobalScopes()->where('id', $data['heat_event_id'])->update(['acted_on' => true]);
        }

        // Schedule pregnancy check alert (30 days post service)
        $pdDue = $serviceDate->copy()->addDays(30);
        \App\Models\Alert::create([
            'id'              => Str::uuid(),
            'farm_id'         => $data['farm_id'],
            'alert_type'      => 'pregnancy_check_due',
            'severity'        => 'warning',
            'status'          => 'pending',
            'title'           => "Pregnancy Check Due — {$animal->display_name}",
            'message'         => "PD check due 30–60 days post-AI ({$pdDue->format('d M Y')}). Expected calving: {$expectedCalving->format('d M Y')}.",
            'animal_id'       => $data['animal_id'],
            'due_on'          => $pdDue->toDateString(),
            'reference_table' => 'ai_services',
            'reference_id'    => $service->id,
        ]);

        return $service;
    }

    /**
     * Record pregnancy check result. Updates animal pregnancy status.
     */
    public function recordPregnancyCheck(array $data, string $userId): PregnancyCheck
    {
        $animal     = Animal::withoutGlobalScopes()->findOrFail($data['animal_id']);
        $aiService  = $data['ai_service_id']
            ? AIService::withoutGlobalScopes()->find($data['ai_service_id'])
            : null;

        $checkedOn  = Carbon::parse($data['checked_on']);
        $daysPost   = $aiService
            ? $checkedOn->diffInDays(Carbon::parse($aiService->service_date))
            : null;

        // Calculate expected calving from PD date if pregnant
        $expectedCalving = null;
        if ($data['result'] === 'pregnant' && $aiService) {
            $expectedCalving = $aiService->expected_calving_date;
        }

        $check = PregnancyCheck::create([
            'id'                    => Str::uuid(),
            'farm_id'               => $data['farm_id'],
            'animal_id'             => $data['animal_id'],
            'ai_service_id'         => $data['ai_service_id'] ?? null,
            'checked_on'            => $data['checked_on'],
            'days_post_service'     => $daysPost,
            'method'                => $data['method'] ?? 'rectal_palpation',
            'result'                => $data['result'],
            'foetus_age_days'       => $data['foetus_age_days'] ?? null,
            'expected_calving_date' => $expectedCalving,
            'checked_by'            => $data['checked_by'] ?? null,
            'cost'                  => $data['cost'] ?? null,
            'notes'                 => $data['notes'] ?? null,
            'created_by'            => $userId,
        ]);

        // Update animal and AI service based on result
        if ($data['result'] === 'pregnant') {
            $animal->update([
                'is_pregnant'           => true,
                'expected_calving_date' => $expectedCalving?->toDateString(),
            ]);
            $aiService?->update([
                'result'                    => 'confirmed_pregnant',
                'conception_confirmed_on'   => $data['checked_on'],
            ]);

            // Resolve the PD-due alert
            \App\Models\Alert::withoutGlobalScopes()
                ->where('farm_id', $data['farm_id'])
                ->where('animal_id', $data['animal_id'])
                ->where('alert_type', 'pregnancy_check_due')
                ->where('status', 'pending')
                ->update(['status' => 'resolved', 'auto_resolved' => true, 'resolved_at' => now()]);

            // Create calving-due alert (7 days before expected calving)
            if ($expectedCalving) {
                $calvingAlert = $expectedCalving->copy()->subDays(7);
                \App\Models\Alert::create([
                    'id'              => Str::uuid(),
                    'farm_id'         => $data['farm_id'],
                    'alert_type'      => 'calving_due',
                    'severity'        => 'warning',
                    'status'          => 'pending',
                    'title'           => "Calving Due — {$animal->display_name}",
                    'message'         => "Expected calving: {$expectedCalving->format('d M Y')}. Prepare calving pen.",
                    'animal_id'       => $data['animal_id'],
                    'due_on'          => $calvingAlert->toDateString(),
                    'reference_table' => 'pregnancy_checks',
                    'reference_id'    => $check->id,
                ]);
            }

        } elseif ($data['result'] === 'not_pregnant') {
            $animal->update(['is_pregnant' => false, 'expected_calving_date' => null]);
            $aiService?->update(['result' => 'not_pregnant']);

        } elseif ($data['result'] === 'inconclusive') {
            // Schedule a follow-up check in 14 days
            $followUp = $checkedOn->copy()->addDays(14);
            \App\Models\Alert::create([
                'id'         => Str::uuid(),
                'farm_id'    => $data['farm_id'],
                'alert_type' => 'pregnancy_check_due',
                'severity'   => 'warning',
                'status'     => 'pending',
                'title'      => "Follow-up PD Check Due — {$animal->display_name}",
                'message'    => "Inconclusive result. Follow-up check due on {$followUp->format('d M Y')}.",
                'animal_id'  => $data['animal_id'],
                'due_on'     => $followUp->toDateString(),
            ]);
        }

        return $check;
    }

    /**
     * Record calving event — creates calf animal record, starts new lactation tracking.
     */
    public function recordCalving(array $data, string $userId): CalvingRecord
    {
        $dam = Animal::withoutGlobalScopes()->findOrFail($data['dam_id']);

        // Create calf animal record if alive
        $calfId = null;
        if ($data['calf_outcome'] !== 'stillborn' && ($data['calf_tag'] ?? null)) {
            $calf = Animal::create([
                'id'          => Str::uuid(),
                'farm_id'     => $data['farm_id'],
                'tag_number'  => $data['calf_tag'],
                'sex'         => $data['calf_sex'],
                'status'      => 'calf',
                'breed'       => $dam->breed,
                'birth_date'  => $data['calved_on'],
                'dam_id'      => $dam->id,
                'weight_kg'   => $data['calf_birth_weight_kg'] ?? null,
                'parity'      => 0,
                'created_by'  => $userId,
                'updated_by'  => $userId,
            ]);
            $calfId = $calf->id;
        }

        $calving = CalvingRecord::create([
            'id'                   => Str::uuid(),
            'farm_id'              => $data['farm_id'],
            'dam_id'               => $data['dam_id'],
            'calf_id'              => $calfId,
            'breeding_record_id'   => $data['breeding_record_id'] ?? null,
            'calved_on'            => $data['calved_on'],
            'calved_at'            => $data['calved_at'] ?? null,
            'ease'                 => $data['ease'] ?? 'easy',
            'calf_outcome'         => $data['calf_outcome'] ?? 'alive',
            'calf_sex'             => $data['calf_sex'],
            'calf_tag'             => $data['calf_tag'] ?? null,
            'calf_birth_weight_kg' => $data['calf_birth_weight_kg'] ?? null,
            'is_twin'              => $data['is_twin'] ?? false,
            'colostrum_given'      => false,
            'complications'        => $data['complications'] ?? null,
            'notes'                => $data['notes'] ?? null,
            'created_by'           => $userId,
        ]);

        // Update dam: increment parity, set last calving date, clear pregnancy
        $dam->update([
            'parity'                => $dam->parity + 1,
            'last_calving_date'     => $data['calved_on'],
            'is_pregnant'           => false,
            'expected_calving_date' => null,
            'status'                => 'lactating',
            'updated_by'            => $userId,
        ]);

        // Resolve calving-due alert
        \App\Models\Alert::withoutGlobalScopes()
            ->where('farm_id', $data['farm_id'])
            ->where('animal_id', $data['dam_id'])
            ->where('alert_type', 'calving_due')
            ->where('status', 'pending')
            ->update(['status' => 'resolved', 'auto_resolved' => true, 'resolved_at' => now()]);

        // Create HIGH colostrum alert
        \App\Models\Alert::create([
            'id'         => Str::uuid(),
            'farm_id'    => $data['farm_id'],
            'alert_type' => 'calving_due',
            'severity'   => 'critical',
            'status'     => 'pending',
            'title'      => "Colostrum Required — Calf from {$dam->display_name}",
            'message'    => 'Feed colostrum to new calf within 1 hour of birth. 3–4 litres in first 6 hours.',
            'animal_id'  => $calfId ?? $data['dam_id'],
            'due_on'     => now()->toDateString(),
        ]);

        return $calving;
    }

    /**
     * Build Ovsynch protocol steps from a start date.
     */
    public function buildOvsynchSteps(Carbon $startDate, string $farmId): array
    {
        return [
            ['event_type' => 'GnRH_1',    'label' => 'Day 0 — GnRH Injection',    'day_offset' => 0,  'drug' => 'GnRH (Receptal)'],
            ['event_type' => 'PGF2a',      'label' => 'Day 7 — PGF2α Injection',   'day_offset' => 7,  'drug' => 'PGF2α (Lutalyse)'],
            ['event_type' => 'GnRH_2',    'label' => 'Day 9 — GnRH Injection',    'day_offset' => 9,  'drug' => 'GnRH (Receptal)'],
            ['event_type' => 'TAI',        'label' => 'Day 10 AM — Timed AI',      'day_offset' => 10, 'drug' => null],
        ];
    }

    /**
     * Build CIDR protocol steps from a start date.
     */
    public function buildCIDRSteps(Carbon $startDate): array
    {
        return [
            ['event_type' => 'CIDR_insert','label' => 'Day 0 — CIDR Insert',            'day_offset' => 0,  'drug' => 'CIDR Device'],
            ['event_type' => 'PGF2a',      'label' => 'Day 7 — PGF2α + CIDR Remove',   'day_offset' => 7,  'drug' => 'PGF2α (Lutalyse)'],
            ['event_type' => 'CIDR_remove','label' => 'Day 7 — Remove CIDR Device',     'day_offset' => 7,  'drug' => null],
            ['event_type' => 'GnRH_2',    'label' => 'Day 9 — GnRH Injection',         'day_offset' => 9,  'drug' => 'GnRH (Receptal)'],
            ['event_type' => 'TAI',        'label' => 'Day 10 — Timed AI',              'day_offset' => 10, 'drug' => null],
        ];
    }

    /**
     * Create a sync program with all steps.
     */
    public function createSyncProgram(array $data, string $userId): SyncProgram
    {
        $startDate = Carbon::parse($data['start_date']);

        $program = SyncProgram::create([
            'id'           => Str::uuid(),
            'farm_id'      => $data['farm_id'],
            'animal_id'    => $data['animal_id'],
            'program_type' => $data['program_type'],
            'custom_name'  => $data['custom_name'] ?? null,
            'start_date'   => $data['start_date'],
            'status'       => 'in_progress',
            'notes'        => $data['notes'] ?? null,
            'created_by'   => $userId,
        ]);

        $steps = match ($data['program_type']) {
            'Ovsynch' => $this->buildOvsynchSteps($startDate, $data['farm_id']),
            'CIDR'    => $this->buildCIDRSteps($startDate),
            default   => [],
        };

        foreach ($steps as $step) {
            SyncProgramEvent::create([
                'id'              => Str::uuid(),
                'sync_program_id' => $program->id,
                'farm_id'         => $data['farm_id'],
                'event_type'      => $step['event_type'],
                'custom_label'    => $step['label'],
                'scheduled_on'    => $startDate->copy()->addDays($step['day_offset']),
                'drug_name'       => $step['drug'],
                'is_completed'    => false,
            ]);
        }

        return $program->load('steps');
    }

    /**
     * Breeding summary KPIs for a farm.
     */
    public function getBreedingKPIs(string $farmId): array
    {
        $services    = AIService::withoutGlobalScopes()->where('farm_id', $farmId)->where('service_date', '>=', now()->subDays(90));
        $total       = (clone $services)->count();
        $confirmed   = (clone $services)->where('result', 'confirmed_pregnant')->count();
        $pending     = (clone $services)->where('result', 'pending')->count();

        return [
            'total_services_90d'    => $total,
            'conception_rate_90d'   => $total > 0 ? round(($confirmed / $total) * 100, 1) : 0,
            'confirmed_pregnant'    => Animal::withoutGlobalScopes()->where('farm_id', $farmId)->where('is_pregnant', true)->count(),
            'pending_pd_checks'     => $pending,
            'upcoming_calvings_14d' => AIService::withoutGlobalScopes()->where('farm_id', $farmId)->dueForCalving(14)->count(),
        ];
    }
}
