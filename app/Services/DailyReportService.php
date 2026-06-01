<?php

namespace App\Services;

use App\Models\DailyReport;
use App\Models\MilkProduction;
use App\Models\MilkSale;
use Illuminate\Support\Str;

class DailyReportService
{
    public function __construct(
        private readonly MilkProductionService $milkService,
    ) {}

    /**
     * Get or create today's daily report draft.
     */
    public function getOrCreateDraft(string $farmId, string $date, string $userId): DailyReport
    {
        return DailyReport::firstOrCreate(
            ['farm_id' => $farmId, 'report_date' => $date],
            [
                'id'         => Str::uuid(),
                'status'     => 'draft',
                'draft_step' => 1,
                'draft_data' => [],
                'created_by' => $userId,
                'updated_by' => $userId,
            ],
        );
    }

    /**
     * Save draft progress for a specific step.
     */
    public function saveDraftStep(DailyReport $report, int $step, array $data, string $userId): DailyReport
    {
        $draftData = $report->draft_data ?? [];
        $draftData["step_{$step}"] = $data;

        $report->update([
            'draft_data' => $draftData,
            'draft_step' => max($report->draft_step ?? 1, $step),
            'updated_by' => $userId,
        ]);

        return $report->fresh();
    }

    /**
     * Submit the daily report — computes all aggregates and locks the record.
     */
    public function submit(DailyReport $report, array $step5Data, string $userId): DailyReport
    {
        $farmId = $report->farm_id;
        $date   = $report->report_date->toDateString();

        // Compute milk summary
        $milkSummary = $this->milkService->getDailySummary($farmId, $date);

        // Compute sales summary
        $salesTotal = MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->selectRaw('SUM(quantity_litres) as litres, SUM(total_amount) as revenue')
            ->first();

        $report->update([
            'status'                => 'submitted',
            'total_milk_litres'     => $milkSummary['total_litres'],
            'morning_litres'        => $milkSummary['morning_litres'],
            'midday_litres'         => $milkSummary['midday_litres'],
            'evening_litres'        => $milkSummary['evening_litres'],
            'cows_milked'           => $milkSummary['cows_milked'],
            'milk_sold_litres'      => $salesTotal->litres ?? 0,
            'milk_revenue'          => $salesTotal->revenue ?? 0,
            'weather'               => $step5Data['weather'] ?? null,
            'manager_notes'         => $step5Data['manager_notes'] ?? null,
            'general_notes'         => $step5Data['general_notes'] ?? null,
            'submitted_by'          => $userId,
            'submitted_at'          => now(),
            'updated_by'            => $userId,
        ]);

        return $report->fresh();
    }

    /**
     * List reports for a farm, most recent first.
     */
    public function listReports(string $farmId, int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return DailyReport::where('farm_id', $farmId)
            ->orderByDesc('report_date')
            ->paginate($perPage);
    }
}
