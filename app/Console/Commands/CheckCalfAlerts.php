<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\CalfRecord;
use App\Models\Farm;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckCalfAlerts extends Command
{
    protected $signature   = 'calf:check-alerts';
    protected $description = 'Check all active calves for overdue vaccinations, low ADG, overdue practices, and supplement transitions';

    public function handle(): int
    {
        $farms = Farm::all();

        foreach ($farms as $farm) {
            // Bind farm context for FarmScope
            app()->instance('current.farm.id', $farm->id);

            $calves = CalfRecord::with(['vaccinations', 'practices', 'weightLogs', 'animal'])
                ->get()
                ->filter(fn ($c) => $c->is_active_calf);

            foreach ($calves as $calf) {
                $this->checkVaccinations($calf, $farm->id);
                $this->checkAdg($calf, $farm->id);
                $this->checkPractices($calf, $farm->id);
                $this->checkSupplementTransition($calf, $farm->id);
            }
        }

        $this->info('Calf alert check complete.');
        return self::SUCCESS;
    }

    private function checkVaccinations(CalfRecord $calf, string $farmId): void
    {
        foreach ($calf->vaccinations as $vax) {
            if ($vax->completed_date) continue;

            if ($vax->is_overdue) {
                $this->upsertAlert($farmId, $calf, "calf_vax_overdue_{$vax->id}", 'critical',
                    "Vaccination overdue: {$vax->vaccine_name}",
                    "Calf {$calf->animal->name ?? $calf->animal->tag_number} — {$vax->vaccine_name} was due " . $vax->due_date->format('d M Y'),
                    $vax->due_date->toDateString()
                );
            } elseif ($vax->is_due_soon) {
                $this->upsertAlert($farmId, $calf, "calf_vax_soon_{$vax->id}", 'warning',
                    "Vaccination due soon: {$vax->vaccine_name}",
                    "Calf {$calf->animal->name ?? $calf->animal->tag_number} — {$vax->vaccine_name} due " . $vax->due_date->format('d M Y'),
                    $vax->due_date->toDateString()
                );
            }
        }
    }

    private function checkAdg(CalfRecord $calf, string $farmId): void
    {
        $adg = $calf->average_daily_gain;
        if ($adg !== null && $adg < 500) {
            $this->upsertAlert($farmId, $calf, "calf_low_adg_{$calf->id}", 'warning',
                'Low daily weight gain',
                "Calf {$calf->animal->name ?? $calf->animal->tag_number} — ADG is {$adg}g/day (target ≥ 500g)",
                now()->toDateString()
            );
        }
    }

    private function checkPractices(CalfRecord $calf, string $farmId): void
    {
        foreach ($calf->practices as $practice) {
            if ($practice->completed_date) continue;

            // Flag practices that mention "birth" or "Day 1" if calf is older than 3 days
            if (str_contains(strtolower($practice->due_age_label), 'birth') && $calf->age_in_days > 3) {
                $this->upsertAlert($farmId, $calf, "calf_practice_{$practice->id}", 'warning',
                    "Practice overdue: {$practice->practice_name}",
                    "Calf {$calf->animal->name ?? $calf->animal->tag_number} — {$practice->practice_name} ({$practice->due_age_label})",
                    now()->toDateString()
                );
            }
        }
    }

    private function checkSupplementTransition(CalfRecord $calf, string $farmId): void
    {
        // Alert when calf hits 6 months — transition from CKL Legends to Maclik Plus
        if ($calf->age_in_months === 6) {
            $this->upsertAlert($farmId, $calf, "calf_legends_transition_{$calf->id}", 'info',
                'Supplement transition: switch to Maclik Plus',
                "Calf {$calf->animal->name ?? $calf->animal->tag_number} is 6 months old — discontinue CKL Xtra Legends and start Maclik Plus 100g/day",
                now()->toDateString()
            );
        }
    }

    private function upsertAlert(
        string $farmId,
        CalfRecord $calf,
        string $refId,
        string $severity,
        string $title,
        string $message,
        string $dueOn
    ): void {
        Alert::withoutGlobalScopes()->updateOrCreate(
            [
                'farm_id'         => $farmId,
                'reference_table' => 'calf_records',
                'reference_id'    => $refId,
                'status'          => 'pending',
            ],
            [
                'alert_type' => 'calf_management',
                'severity'   => $severity,
                'title'      => $title,
                'message'    => $message,
                'animal_id'  => $calf->animal_id,
                'due_on'     => $dueOn,
            ]
        );
    }
}
