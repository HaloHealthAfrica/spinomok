<?php

namespace App\Services;

use App\Models\MilkProduction;
use App\Models\Treatment;
use Illuminate\Support\Facades\DB;

class MilkProductionService
{
    /**
     * Get daily summary for a farm on a given date.
     * Returns: total litres, session breakdown, cows milked, vs-yesterday delta.
     */
    public function getDailySummary(string $farmId, string $date): array
    {
        $rows = MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->where('is_withheld', false)
            ->select('session', DB::raw('SUM(quantity_litres) as total'), DB::raw('COUNT(DISTINCT animal_id) as cows'))
            ->groupBy('session')
            ->get()
            ->keyBy('session');

        $morning = (float) ($rows['morning']->total ?? 0);
        $midday  = (float) ($rows['midday']->total ?? 0);
        $evening = (float) ($rows['evening']->total ?? 0);
        $total   = $morning + $midday + $evening;

        $cowsMilked = MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->distinct('animal_id')
            ->count('animal_id');

        // Yesterday comparison
        $yesterday = date('Y-m-d', strtotime($date . ' -1 day'));
        $yTotal    = (float) MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', $yesterday)
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        $delta        = $total - $yTotal;
        $deltaPercent = $yTotal > 0 ? round(($delta / $yTotal) * 100, 1) : 0;

        return [
            'date'             => $date,
            'total_litres'     => round($total, 3),
            'morning_litres'   => round($morning, 3),
            'midday_litres'    => round($midday, 3),
            'evening_litres'   => round($evening, 3),
            'cows_milked'      => $cowsMilked,
            'avg_per_cow'      => $cowsMilked > 0 ? round($total / $cowsMilked, 2) : 0,
            'vs_yesterday_delta'  => round($delta, 2),
            'vs_yesterday_percent' => $deltaPercent,
        ];
    }

    /**
     * Get per-animal records for a specific date (for the milk entry form).
     */
    public function getDailyAnimalRecords(string $farmId, string $date): array
    {
        // Get all lactating animals
        $animals = \App\Models\Animal::where('farm_id', $farmId)
            ->where('status', 'lactating')
            ->orderBy('name')
            ->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'breed']);

        // Get existing records for the date
        $existing = MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->get()
            ->groupBy('animal_id');

        return $animals->map(function ($animal) use ($existing, $date) {
            $records = $existing->get($animal->id, collect());

            $morning = $records->firstWhere('session', 'morning');
            $midday  = $records->firstWhere('session', 'midday');
            $evening = $records->firstWhere('session', 'evening');

            return [
                'animal_id'   => $animal->id,
                'tag_number'  => $animal->tag_number,
                'name'        => $animal->name,
                'breed'       => $animal->breed,
                'morning'     => $morning ? ['id' => $morning->id, 'litres' => (float) $morning->quantity_litres, 'withheld' => $morning->is_withheld] : null,
                'midday'      => $midday  ? ['id' => $midday->id,  'litres' => (float) $midday->quantity_litres,  'withheld' => $midday->is_withheld]  : null,
                'evening'     => $evening ? ['id' => $evening->id, 'litres' => (float) $evening->quantity_litres, 'withheld' => $evening->is_withheld] : null,
                'daily_total' => (float) $records->sum('quantity_litres'),
            ];
        })->values()->all();
    }

    /**
     * Upsert a single milk session record.
     */
    public function upsertSession(
        string $farmId,
        string $animalId,
        string $date,
        string $session,
        float $litres,
        string $recordedBy,
        bool $isWithheld = false,
    ): MilkProduction {
        $isWithheld = $isWithheld || $this->isAnimalUnderMilkWithdrawal($farmId, $animalId, $date);

        $record = MilkProduction::where('farm_id', $farmId)
            ->where('animal_id', $animalId)
            ->whereDate('milked_on', $date)
            ->where('session', $session)
            ->first();

        if ($record) {
            $record->update([
                'quantity_litres' => $litres,
                'is_withheld'     => $isWithheld,
                'updated_by'      => $recordedBy,
            ]);
        } else {
            $record = MilkProduction::create([
                'id'              => \Illuminate\Support\Str::uuid(),
                'farm_id'         => $farmId,
                'animal_id'       => $animalId,
                'milked_on'       => $date,
                'session'         => $session,
                'quantity_litres' => $litres,
                'is_withheld'     => $isWithheld,
                'milked_by'       => $recordedBy,
                'created_by'      => $recordedBy,
                'updated_by'      => $recordedBy,
            ]);
        }

        return $record;
    }

    private function isAnimalUnderMilkWithdrawal(string $farmId, string $animalId, string $date): bool
    {
        return Treatment::where('farm_id', $farmId)
            ->where('animal_id', $animalId)
            ->whereDate('treated_on', '<=', $date)
            ->whereDate('withdrawal_end_date', '>=', $date)
            ->exists();
    }

    /**
     * Get 7-day rolling production for dashboard chart.
     */
    public function getSevenDayTrend(string $farmId): array
    {
        return MilkProduction::where('farm_id', $farmId)
            ->where('milked_on', '>=', now()->subDays(6)->toDateString())
            ->where('is_withheld', false)
            ->select('milked_on', DB::raw('SUM(quantity_litres) as total'))
            ->groupBy('milked_on')
            ->orderBy('milked_on')
            ->get()
            ->map(fn ($r) => [
                'date'  => $r->milked_on,
                'total' => round((float) $r->total, 2),
            ])
            ->all();
    }

    /**
     * Monthly production totals for a farm.
     */
    public function getMonthlySummary(string $farmId, int $year, int $month): array
    {
        $perAnimal = MilkProduction::where('farm_id', $farmId)
            ->whereYear('milked_on', $year)
            ->whereMonth('milked_on', $month)
            ->where('is_withheld', false)
            ->select('animal_id', DB::raw('SUM(quantity_litres) as total'))
            ->groupBy('animal_id')
            ->with('animal:id,tag_number,name,breed')
            ->get();

        $total = $perAnimal->sum('total');

        return [
            'year'       => $year,
            'month'      => $month,
            'total'      => round((float) $total, 2),
            'per_animal' => $perAnimal->map(fn ($r) => [
                'animal_id'  => $r->animal_id,
                'tag_number' => $r->animal->tag_number ?? '?',
                'name'       => $r->animal->name,
                'total'      => round((float) $r->total, 2),
            ])->sortByDesc('total')->values()->all(),
        ];
    }
}
