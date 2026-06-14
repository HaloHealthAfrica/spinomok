<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\CalfRecord;
use App\Models\Farm;
use Illuminate\Console\Command;

class CheckCalfAlerts extends Command
{
    protected $signature   = 'calf:check-alerts';
    protected $description = 'Check all active calves for overdue vaccinations, low ADG, overdue practices, and supplement transitions';

    public function handle(): int
    {
        $farms = Farm::all();

        foreach ($farms as $farm) {
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
        $name = $calf->animal->name ?? $calf->animal->tag_number;

        foreach ($calf->vaccinations as $vax) {
            if ($vax->completed_date) continue;

            if ($vax->is_overdue) {
                $vaccine  = $vax->vaccine_name;
                $dueDate  = $vax->due_date->format('d M Y');
                $this->upsertAlert($farmId, $calf, "calf_vax_overdue_{$vax->id}", 'critical',
                    "Vaccination overdue: {$vaccine}",
                    "Calf {$name} — {$vaccine} was due {$dueDate}",
                    $vax->due_date->toDateString()
                );
            } elseif ($vax->is_due_soon) {
                $vaccine = $vax->vaccine_name;
                $dueDate = $vax->due_date->format('d M Y');
                $this->upsertAlert($farmId, $calf, "calf_vax_soon_{$vax->id}", 'warning',
                    "Vaccination due soon: {$vaccine}",
                    "Calf {$name} — {$vaccine} due {$dueDate}",
                    $vax->due_date->toDateString()
                );
            }
        }
    }

    private function checkAdg(CalfRecord $calf, string $farmId): void
    {
        $adg = $calf->average_daily_gain;
        if ($adg !== null && $adg < 500) {
            $name = $calf->animal->name ?? $calf->animal->tag_number;
            $this->upsertAlert($farmId, $calf, "calf_low_adg_{$calf->id}", 'warning',
                'Low daily weight gain',
                "Calf {$name} — ADG is {$adg}g/day (target >= 500g)",
                now()->toDateString()
            );
        }
    }

    private function checkPractices(CalfRecord $calf, string $farmId): void
    {
        $name = $calf->animal->name ?? $calf->animal->tag_number;

        foreach ($calf->practices as $practice) {
            if ($practice->completed_date) continue;

            if (str_contains(strtolower($practice->due_age_label), 'birth') && $calf->age_in_days > 3) {
                $practiceName = $practice->practice_name;
                $ageLabel     = $practice->due_age_label;
                $this->upsertAlert($farmId, $calf, "calf_practice_{$practice->id}", 'warning',
                    "Practice overdue: {$practiceName}",
                    "Calf {$name} — {$practiceName} ({$ageLabel})",
                    now()->toDateString()
                );
            }
        }
    }

    private function checkSupplementTransition(CalfRecord $calf, string $farmId): void
    {
        if ($calf->age_in_months === 6) {
            $name = $calf->animal->name ?? $calf->animal->tag_number;
            $this->upsertAlert($farmId, $calf, "calf_legends_transition_{$calf->id}", 'info',
                'Supplement transition: switch to Maclik Plus',
                "Calf {$name} is 6 months old — discontinue CKL Xtra Legends and start Maclik Plus 100g/day",
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
