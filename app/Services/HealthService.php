<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\DewormingRecord;
use App\Models\HealthEvent;
use App\Models\MilkProduction;
use App\Models\Treatment;
use App\Models\Vaccination;
use App\Models\VaccineType;
use Carbon\Carbon;
use Illuminate\Support\Str;

class HealthService
{
    /**
     * Record a health event and flag milk for withdrawal if treatment given.
     */
    public function recordHealthEvent(array $data, string $userId): HealthEvent
    {
        $animal = Animal::withoutGlobalScopes()->findOrFail($data['animal_id']);

        $event = HealthEvent::create([
            'id'                => Str::uuid(),
            'farm_id'           => $data['farm_id'],
            'animal_id'         => $data['animal_id'],
            'disease_type_id'   => $data['disease_type_id'] ?? null,
            'observed_on'       => $data['observed_on'],
            'reported_by'       => $userId,
            'symptoms'          => $data['symptoms'] ?? null,
            'severity'          => $data['severity'] ?? 'moderate',
            'vet_consulted'     => $data['vet_consulted'] ?? false,
            'vet_name'          => $data['vet_name'] ?? null,
            'consultation_cost' => $data['consultation_cost'] ?? null,
            'notes'             => $data['notes'] ?? null,
            'created_by'        => $userId,
            'updated_by'        => $userId,
        ]);

        // Create a health alert
        Alert::create([
            'id'              => Str::uuid(),
            'farm_id'         => $data['farm_id'],
            'alert_type'      => 'sick_animal',
            'severity'        => $this->mapSeverityToAlertLevel($data['severity'] ?? 'moderate'),
            'status'          => 'pending',
            'title'           => "Health Event — {$animal->display_name}",
            'message'         => ($data['symptoms'] ?? 'Health observation recorded') . ". Severity: " . ($data['severity'] ?? 'moderate') . ".",
            'animal_id'       => $data['animal_id'],
            'due_on'          => now()->toDateString(),
            'reference_table' => 'health_events',
            'reference_id'    => $event->id,
        ]);

        // Record treatments if included
        if (!empty($data['treatments'])) {
            foreach ($data['treatments'] as $t) {
                $this->recordTreatment(array_merge($t, [
                    'farm_id'         => $data['farm_id'],
                    'health_event_id' => $event->id,
                    'animal_id'       => $data['animal_id'],
                ]), $userId);
            }
        }

        return $event->load('treatments', 'diseaseType');
    }

    /**
     * Add a treatment to an existing health event.
     * Auto-flags milk for withdrawal.
     */
    public function recordTreatment(array $data, string $userId): Treatment
    {
        $treatment = Treatment::create([
            'id'                => Str::uuid(),
            'farm_id'           => $data['farm_id'],
            'health_event_id'   => $data['health_event_id'],
            'animal_id'         => $data['animal_id'],
            'medication_type_id'=> $data['medication_type_id'] ?? null,
            'treated_on'        => $data['treated_on'],
            'dose_amount'       => $data['dose_amount'],
            'dose_unit'         => $data['dose_unit'] ?? 'ml',
            'route'             => $data['route'] ?? 'IM',
            'frequency'         => $data['frequency'] ?? null,
            'duration_days'     => $data['duration_days'] ?? null,
            'cost'              => $data['cost'] ?? null,
            'administered_by'   => $data['administered_by'] ?? $userId,
            'notes'             => $data['notes'] ?? null,
            'created_by'        => $userId,
        ]);

        // Flag milk as withheld during withdrawal period
        if ($treatment->withdrawal_end_date) {
            $this->flagMilkForWithdrawal(
                $data['farm_id'],
                $data['animal_id'],
                $data['treated_on'],
                $treatment->withdrawal_end_date->toDateString()
            );

            // Create withdrawal alert
            Alert::create([
                'id'         => Str::uuid(),
                'farm_id'    => $data['farm_id'],
                'alert_type' => 'withdrawal_period_active',
                'severity'   => 'critical',
                'status'     => 'pending',
                'title'      => "Milk Withdrawal — " . (Animal::withoutGlobalScopes()->find($data['animal_id'])?->display_name ?? ''),
                'message'    => "Milk withheld until {$treatment->withdrawal_end_date->format('d M Y')}. Do not sell.",
                'animal_id'  => $data['animal_id'],
                'due_on'     => $treatment->withdrawal_end_date->toDateString(),
                'reference_table' => 'treatments',
                'reference_id'    => $treatment->id,
            ]);
        }

        return $treatment;
    }

    /**
     * Mark milk production records as withheld during withdrawal period.
     */
    private function flagMilkForWithdrawal(string $farmId, string $animalId, string $startDate, string $endDate): void
    {
        MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('animal_id', $animalId)
            ->whereBetween('milked_on', [$startDate, $endDate])
            ->update(['is_withheld' => true]);
    }

    /**
     * Record vaccination and schedule next alert.
     */
    public function recordVaccination(array $data, string $userId): Vaccination
    {
        $vacc = Vaccination::create([
            'id'              => Str::uuid(),
            'farm_id'         => $data['farm_id'],
            'animal_id'       => $data['animal_id'],
            'vaccine_type_id' => $data['vaccine_type_id'] ?? null,
            'vaccinated_on'   => $data['vaccinated_on'],
            'batch_number'    => $data['batch_number'] ?? null,
            'dose_ml'         => $data['dose_ml'] ?? null,
            'route'           => $data['route'] ?? 'SC',
            'site'            => $data['site'] ?? null,
            'next_due_date'   => $data['next_due_date'] ?? null,
            'cost'            => $data['cost'] ?? null,
            'adverse_reaction'=> $data['adverse_reaction'] ?? false,
            'reaction_notes'  => $data['reaction_notes'] ?? null,
            'notes'           => $data['notes'] ?? null,
            'created_by'      => $userId,
        ]);

        return $vacc->load('vaccineType', 'animal');
    }

    /**
     * Record deworming and schedule next due alert.
     */
    public function recordDeworming(array $data, string $userId): DewormingRecord
    {
        $record = DewormingRecord::create([
            'id'                 => Str::uuid(),
            'farm_id'            => $data['farm_id'],
            'animal_id'          => $data['animal_id'],
            'drug_name'          => $data['drug_name'],
            'active_ingredient'  => $data['active_ingredient'] ?? null,
            'dose_amount'        => $data['dose_amount'],
            'dose_unit'          => $data['dose_unit'] ?? 'ml',
            'route'              => $data['route'] ?? 'oral',
            'dewormed_on'        => $data['dewormed_on'],
            'next_due_date'      => $data['next_due_date'] ?? null,
            'withdrawal_end_date'=> $data['withdrawal_end_date'] ?? null,
            'cost'               => $data['cost'] ?? null,
            'notes'              => $data['notes'] ?? null,
            'created_by'         => $userId,
        ]);

        return $record->load('animal');
    }

    /**
     * Close a health event as recovered.
     */
    public function closeHealthEvent(HealthEvent $event, string $outcome, ?string $recoveryDate, string $userId): HealthEvent
    {
        $event->update([
            'is_recovered'  => true,
            'outcome'       => $outcome,
            'recovery_date' => $recoveryDate ?? now()->toDateString(),
            'updated_by'    => $userId,
        ]);

        // Resolve the alert
        Alert::withoutGlobalScopes()
            ->where('farm_id', $event->farm_id)
            ->where('reference_table', 'health_events')
            ->where('reference_id', $event->id)
            ->where('status', 'pending')
            ->update(['status' => 'resolved', 'auto_resolved' => true, 'resolved_at' => now()]);

        return $event;
    }

    /**
     * Health KPIs for the dashboard and health module header.
     */
    public function getHealthKPIs(string $farmId): array
    {
        $openCases   = HealthEvent::withoutGlobalScopes()->where('farm_id', $farmId)->where('is_recovered', false)->count();
        $withdrawal  = Treatment::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('withdrawal_end_date', '>=', now()->toDateString())
            ->distinct('animal_id')
            ->count('animal_id');

        $vacsDue     = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(14)->toDateString())
            ->count();

        $dewormDue   = DewormingRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(14)->toDateString())
            ->count();

        $mtdVetCost  = (float) Treatment::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('treated_on', now()->year)
            ->whereMonth('treated_on', now()->month)
            ->sum('cost');

        $mtdVetCost += (float) HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('observed_on', now()->year)
            ->whereMonth('observed_on', now()->month)
            ->sum('consultation_cost');

        return [
            'open_cases'          => $openCases,
            'on_withdrawal'       => $withdrawal,
            'vaccinations_due_14d'=> $vacsDue,
            'deworming_due_14d'   => $dewormDue,
            'mtd_vet_cost'        => $mtdVetCost,
        ];
    }

    private function mapSeverityToAlertLevel(string $severity): string
    {
        return match ($severity) {
            'severe'   => 'critical',
            'moderate' => 'warning',
            default    => 'info',
        };
    }
}
