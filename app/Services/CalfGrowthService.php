<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\AnimalWeightRecord;
use App\Models\CalfFeedingRecord;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CalfGrowthService
{
    /**
     * Target weights by age (weeks) for Holstein-Friesian.
     * Used to plot the standard growth curve.
     */
    private const HF_TARGETS = [
        0  => 38,   // Birth
        2  => 46,
        4  => 54,
        8  => 70,   // Weaning target (~2 months)
        12 => 95,
        16 => 120,
        20 => 145,
        24 => 170,  // 6 months
        32 => 220,
        40 => 270,
        48 => 310,
        52 => 340,  // 12 months
        64 => 390,
        78 => 450,  // 18 months — target breeding weight
    ];

    /** Target ADG by stage */
    private const TARGET_ADG = [
        'pre_weaning'  => 0.5,  // 0–60 days: minimum 0.5 kg/day
        'post_weaning' => 0.6,  // 61+ days: minimum 0.6 kg/day
    ];

    /**
     * Record a weight measurement, compute ADG since last record,
     * update the animal's weight, and fire alerts if needed.
     */
    public function recordWeight(array $data, string $userId): AnimalWeightRecord
    {
        $animal  = Animal::withoutGlobalScopes()->findOrFail($data['animal_id']);
        $measuredOn = Carbon::parse($data['measured_on']);

        // Compute age in days at measurement
        $ageDays = $animal->birth_date
            ? (int) $animal->birth_date->diffInDays($measuredOn)
            : null;

        // Get last weight record for ADG computation
        $lastRecord = AnimalWeightRecord::withoutGlobalScopes()
            ->where('animal_id', $data['animal_id'])
            ->where('measured_on', '<', $data['measured_on'])
            ->orderByDesc('measured_on')
            ->first();

        $adg = null;
        if ($lastRecord) {
            $daysBetween = (int) $lastRecord->measured_on->diffInDays($measuredOn);
            if ($daysBetween > 0) {
                $adg = round(($data['weight_kg'] - $lastRecord->weight_kg) / $daysBetween, 3);
            }
        } elseif ($animal->birth_date && $ageDays > 0) {
            // ADG from birth using birth weight from calving record
            $calvingRecord = \App\Models\CalvingRecord::withoutGlobalScopes()
                ->where('dam_id', $animal->dam_id ?? '')
                ->orWhere('calf_id', $animal->id)
                ->first();
            if ($calvingRecord?->calf_birth_weight_kg) {
                $adg = round(($data['weight_kg'] - $calvingRecord->calf_birth_weight_kg) / $ageDays, 3);
            }
        }

        $record = AnimalWeightRecord::create([
            'id'                  => Str::uuid(),
            'farm_id'             => $data['farm_id'],
            'animal_id'           => $data['animal_id'],
            'measured_on'         => $data['measured_on'],
            'weight_kg'           => $data['weight_kg'],
            'body_condition_score'=> $data['body_condition_score'] ?? null,
            'method'              => $data['method'] ?? 'scale',
            'age_days'            => $ageDays,
            'adg_kg_day'          => $adg,
            'recorded_by'         => $userId,
            'notes'               => $data['notes'] ?? null,
            'created_by'          => $userId,
        ]);

        // Update the animal's current weight
        $animal->update(['weight_kg' => $data['weight_kg'], 'updated_by' => $userId]);

        // Alert if ADG is below target
        if ($adg !== null && $ageDays !== null) {
            $target = $ageDays <= 60
                ? self::TARGET_ADG['pre_weaning']
                : self::TARGET_ADG['post_weaning'];

            if ($adg < 0.4 && $adg >= 0) {
                // Check if the previous record also had low ADG
                $prevLowAdg = $lastRecord && $lastRecord->adg_kg_day !== null && $lastRecord->adg_kg_day < 0.4;

                Alert::create([
                    'id'         => Str::uuid(),
                    'farm_id'    => $data['farm_id'],
                    'alert_type' => 'low_adg',
                    'severity'   => $prevLowAdg ? 'critical' : 'warning',
                    'status'     => 'pending',
                    'title'      => "Low Growth Rate — {$animal->display_name}",
                    'message'    => sprintf(
                        "ADG: %.2f kg/day (target: %.1f kg/day). Weight: %.1f kg at %d days.%s",
                        $adg, $target, $data['weight_kg'], $ageDays,
                        $prevLowAdg ? ' Second consecutive low reading — veterinary review recommended.' : ''
                    ),
                    'animal_id'  => $data['animal_id'],
                    'due_on'     => now()->toDateString(),
                ]);
            }
        }

        // BCS alerts
        if (($data['body_condition_score'] ?? null) !== null) {
            $bcs = (float) $data['body_condition_score'];
            if ($bcs < 2.0) {
                Alert::create([
                    'id'        => Str::uuid(),
                    'farm_id'   => $data['farm_id'],
                    'alert_type'=> 'low_bcs',
                    'severity'  => 'critical',
                    'status'    => 'pending',
                    'title'     => "Low BCS — {$animal->display_name}",
                    'message'   => "Body Condition Score: {$bcs} (Critical: < 2.0). Nutritional intervention required.",
                    'animal_id' => $data['animal_id'],
                    'due_on'    => now()->toDateString(),
                ]);
            } elseif ($bcs < 2.5 && in_array($animal->status, ['lactating'])) {
                Alert::create([
                    'id'        => Str::uuid(),
                    'farm_id'   => $data['farm_id'],
                    'alert_type'=> 'low_bcs',
                    'severity'  => 'warning',
                    'status'    => 'pending',
                    'title'     => "Low BCS — {$animal->display_name}",
                    'message'   => "Body Condition Score: {$bcs} (Below target 2.5 for lactating cows). Review nutrition.",
                    'animal_id' => $data['animal_id'],
                    'due_on'    => now()->toDateString(),
                ]);
            }
        }

        return $record;
    }

    /**
     * Get growth history for a calf with targets overlaid.
     */
    public function getGrowthData(string $animalId): array
    {
        $animal  = Animal::withoutGlobalScopes()->findOrFail($animalId);
        $records = AnimalWeightRecord::withoutGlobalScopes()
            ->where('animal_id', $animalId)
            ->orderBy('measured_on')
            ->get();

        $actual = $records->map(fn ($r) => [
            'date'       => $r->measured_on->toDateString(),
            'age_days'   => $r->age_days,
            'weight_kg'  => (float) $r->weight_kg,
            'bcs'        => $r->body_condition_score ? (float) $r->body_condition_score : null,
            'adg'        => $r->adg_kg_day ? (float) $r->adg_kg_day : null,
            'method'     => $r->method,
        ])->values()->all();

        // Generate breed-specific target curve
        $targets = $this->buildTargetCurve($animal->breed);

        // Current ADG over last measurement period
        $currentAdg = $records->count() >= 2
            ? (float) $records->last()->adg_kg_day
            : null;

        // Latest weight
        $latestWeight = $records->isEmpty() ? null : (float) $records->last()->weight_kg;
        $latestAge    = $records->isEmpty() ? null : $records->last()->age_days;

        // Projected first calving age (heifers only, target 340 kg)
        $projectedCalving = null;
        if ($animal->status === 'heifer' && $currentAdg !== null && $currentAdg > 0 && $latestWeight !== null) {
            $targetWeight    = 340; // kg at first service
            $kgNeeded        = max(0, $targetWeight - $latestWeight);
            $daysToTarget    = round($kgNeeded / $currentAdg);
            $projectedCalving = now()->addDays($daysToTarget + 280)->format('M Y'); // +gestation
        }

        return [
            'animal'            => $animal->only(['id', 'tag_number', 'name', 'breed', 'status', 'birth_date']),
            'actual'            => $actual,
            'targets'           => $targets,
            'current_adg'       => $currentAdg,
            'latest_weight'     => $latestWeight,
            'latest_age_days'   => $latestAge,
            'target_adg'        => $latestAge !== null && $latestAge <= 60
                ? self::TARGET_ADG['pre_weaning']
                : self::TARGET_ADG['post_weaning'],
            'projected_calving' => $projectedCalving,
            'record_count'      => $records->count(),
        ];
    }

    /**
     * Build target weight curve for a breed.
     */
    private function buildTargetCurve(string $breed): array
    {
        $targets = self::HF_TARGETS; // default HF targets

        // Ayrshire and crossbreeds are 85% of HF targets
        if (in_array($breed, ['Ayrshire', 'Crossbreed', 'Other'])) {
            $targets = array_map(fn ($w) => round($w * 0.85), $targets);
        }
        // Jersey and Sahiwal are 70% of HF targets
        if (in_array($breed, ['Jersey', 'Sahiwal'])) {
            $targets = array_map(fn ($w) => round($w * 0.70), $targets);
        }

        return array_map(fn ($weeks, $kg) => [
            'age_days'  => $weeks * 7,
            'weight_kg' => $kg,
        ], array_keys($targets), array_values($targets));
    }

    /**
     * Get all calves for a farm with growth summary.
     */
    public function getCalfList(string $farmId): array
    {
        $calves = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['calf', 'heifer'])
            ->where('sex', 'female') // focus on replacement heifers
            ->orderBy('birth_date', 'desc')
            ->get(['id', 'tag_number', 'name', 'breed', 'status', 'birth_date', 'weight_kg', 'dam_id']);

        // For each calf, get latest weight record + ADG
        $weightRecords = AnimalWeightRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('animal_id', $calves->pluck('id'))
            ->select('animal_id', 'measured_on', 'weight_kg', 'adg_kg_day', 'age_days', 'body_condition_score')
            ->orderBy('measured_on')
            ->get()
            ->groupBy('animal_id');

        return $calves->map(function ($calf) use ($weightRecords) {
            $records    = $weightRecords->get($calf->id, collect());
            $latest     = $records->last();
            $ageDays    = $calf->birth_date
                ? (int) $calf->birth_date->diffInDays(now())
                : null;

            $adg  = $latest?->adg_kg_day ? (float) $latest->adg_kg_day : null;
            $targetAdg = $ageDays !== null && $ageDays <= 60
                ? self::TARGET_ADG['pre_weaning']
                : self::TARGET_ADG['post_weaning'];

            return [
                'id'          => $calf->id,
                'tag_number'  => $calf->tag_number,
                'name'        => $calf->name,
                'breed'       => $calf->breed,
                'status'      => $calf->status,
                'birth_date'  => $calf->birth_date?->toDateString(),
                'age_days'    => $ageDays,
                'age_weeks'   => $ageDays !== null ? round($ageDays / 7, 1) : null,
                'current_weight'   => $latest ? (float) $latest->weight_kg : (float) ($calf->weight_kg ?? 0),
                'adg'              => $adg,
                'adg_rating'       => $this->rateAdg($adg, $targetAdg),
                'last_weighed'     => $latest?->measured_on?->toDateString(),
                'target_weight'    => $this->getTargetWeight($ageDays, $calf->breed),
                'record_count'     => $records->count(),
                'needs_weighing'   => !$latest || $latest->measured_on->diffInDays(now()) > 30,
            ];
        })->sortBy('age_days')->values()->all();
    }

    /**
     * Get growth ranking for all calves on a farm.
     */
    public function getGrowthRanking(string $farmId): array
    {
        $calfList = $this->getCalfList($farmId);

        // Sort by ADG descending, nulls last
        usort($calfList, function ($a, $b) {
            if ($a['adg'] === null && $b['adg'] === null) return 0;
            if ($a['adg'] === null) return 1;
            if ($b['adg'] === null) return -1;
            return $b['adg'] <=> $a['adg'];
        });

        return array_map(fn ($calf, $rank) => array_merge($calf, ['rank' => $rank + 1]), $calfList, array_keys($calfList));
    }

    /**
     * Get target weight for a calf of a given age.
     */
    private function getTargetWeight(?int $ageDays, string $breed): ?float
    {
        if ($ageDays === null) return null;

        $targets = self::HF_TARGETS;
        $multiplier = match ($breed) {
            'Ayrshire', 'Crossbreed', 'Other' => 0.85,
            'Jersey', 'Sahiwal'               => 0.70,
            default                           => 1.0,
        };

        $ageWeeks = $ageDays / 7;

        // Find the two surrounding target points and interpolate
        $keys   = array_keys($targets);
        $prevWk = 0;
        $prevKg = reset($targets);

        foreach ($keys as $wk) {
            if ($ageWeeks <= $wk) {
                $fraction  = ($ageWeeks - $prevWk) / max(1, $wk - $prevWk);
                $targetKg  = $prevKg + ($targets[$wk] - $prevKg) * $fraction;
                return round($targetKg * $multiplier, 1);
            }
            $prevWk = $wk;
            $prevKg = $targets[$wk];
        }

        return round(end($targets) * $multiplier, 1);
    }

    /**
     * Rate ADG as good/acceptable/poor/unknown.
     */
    private function rateAdg(?float $adg, float $target): string
    {
        if ($adg === null) return 'unknown';
        if ($adg >= $target) return 'good';
        if ($adg >= $target * 0.8) return 'acceptable';
        return 'poor';
    }

    /**
     * Farm-level calf KPIs.
     */
    public function getCalfKPIs(string $farmId): array
    {
        $calves = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['calf', 'heifer'])
            ->count();

        $needWeighing = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereIn('status', ['calf', 'heifer'])
            ->whereDoesntHave('weightRecords', fn ($q) => $q->where('measured_on', '>=', now()->subDays(30)->toDateString()))
            ->count();

        $lowAdg = Alert::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('alert_type', 'low_adg')
            ->where('status', 'pending')
            ->count();

        return [
            'total_calves_heifers' => $calves,
            'need_weighing'        => $needWeighing,
            'low_adg_alerts'       => $lowAdg,
            'target_adg_preweaning'=> self::TARGET_ADG['pre_weaning'],
        ];
    }
}
