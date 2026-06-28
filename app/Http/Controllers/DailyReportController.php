<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\DailyReport;
use App\Models\MilkBuyer;
use App\Models\MilkSale;
use App\Services\DailyReportService;
use App\Services\MilkProductionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyReportController extends Controller
{
    public function __construct(
        private readonly DailyReportService    $reportService,
        private readonly MilkProductionService $milkService,
    ) {}

    /**
     * Reports list — Daily / Weekly / Monthly tabs.
     */
    public function index(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $reports = $this->reportService->listReports($farmId);

        // Check for today's report status
        $today       = now()->toDateString();
        $todayReport = DailyReport::where('farm_id', $farmId)
            ->where('report_date', $today)
            ->first(['id', 'status', 'draft_step', 'total_milk_litres', 'milk_revenue']);

        return Inertia::render('reports/Index', [
            'reports'      => $reports,
            'today_report' => $todayReport,
        ]);
    }

    /**
     * Start / continue daily report wizard.
     */
    public function create(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $date   = $request->input('date', now()->toDateString());
        $userId = $request->user()->id;

        $report        = $this->reportService->getOrCreateDraft($farmId, $date, $userId);
        $animalRecords = $this->milkService->getDailyAnimalRecords($farmId, $date);
        $buyers        = MilkBuyer::where('farm_id', $farmId)->active()->get([
            'id', 'name', 'buyer_type', 'default_price_per_litre',
        ]);

        $milkSummary   = $this->milkService->getDailySummary($farmId, $date);
        $herdCounts    = Animal::where('farm_id', $farmId)
            ->whereNotIn('status', ['culled', 'sold', 'dead'])
            ->selectRaw("
                SUM(CASE WHEN status = 'calf' THEN 1 ELSE 0 END) as calves,
                SUM(CASE WHEN status = 'heifer' THEN 1 ELSE 0 END) as heifers,
                SUM(CASE WHEN status = 'lactating' THEN 1 ELSE 0 END) as lactating,
                SUM(CASE WHEN status = 'dry' THEN 1 ELSE 0 END) as dry,
                SUM(CASE WHEN status = 'bull' THEN 1 ELSE 0 END) as bulls
            ")
            ->first();

        $animals = Animal::where('farm_id', $farmId)
            ->whereNotIn('status', ['culled', 'sold', 'dead'])
            ->orderBy('tag_number')
            ->get(['id', 'tag_number', 'name', 'status']);

        $milkSalesToday = MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->with('buyer:id,name,buyer_type')
            ->orderBy('created_at')
            ->get(['id', 'milk_buyer_id', 'quantity_litres', 'price_per_litre', 'total_amount', 'payment_method']);

        return Inertia::render('reports/daily/Create', [
            'report'          => $report,
            'date'            => $date,
            'animal_records'  => $animalRecords,
            'milk_summary'    => $milkSummary,
            'buyers'          => $buyers,
            'milk_sales_today'=> $milkSalesToday,
            'herd_counts'     => [
                'calves'     => (int) ($herdCounts->calves ?? 0),
                'heifers'    => (int) ($herdCounts->heifers ?? 0),
                'lactating'  => (int) ($herdCounts->lactating ?? 0),
                'dry'        => (int) ($herdCounts->dry ?? 0),
                'bulls'      => (int) ($herdCounts->bulls ?? 0),
            ],
            'animals'         => $animals,
            'current_step'    => $report->draft_step ?? 1,
        ]);
    }

    /**
     * Save a wizard step's data.
     */
    public function saveStep(Request $request, DailyReport $report): \Illuminate\Http\JsonResponse
    {
        $this->authorizeFarmReport($report);

        $step = (int) $request->input('step');
        $data = $request->input('data', []);

        $report = $this->reportService->saveDraftStep($report, $step, $data, $request->user()->id);

        return response()->json([
            'report'       => $report->only(['id', 'status', 'draft_step', 'draft_data']),
            'next_step'    => min($step + 1, 5),
        ]);
    }

    /**
     * Submit the completed daily report.
     */
    public function submit(Request $request, DailyReport $report): RedirectResponse
    {
        $this->authorizeFarmReport($report);

        if ($report->status === 'submitted') {
            return redirect()->route('reports.daily.show', $report)
                ->with('warning', 'This report has already been submitted.');
        }

        if ($request->has('draft_data') && is_array($request->input('draft_data'))) {
            $report->update([
                'draft_data' => $request->input('draft_data'),
                'updated_by' => $request->user()->id,
            ]);
        }

        $step5Data = $request->only(['weather', 'manager_notes', 'general_notes']);

        $report = $this->reportService->submit($report, $step5Data, $request->user()->id);

        return redirect()
            ->route('reports.daily.show', $report)
            ->with('success', 'Daily report submitted successfully.');
    }

    /**
     * Show a submitted report.
     */
    public function show(DailyReport $report): Response
    {
        $this->authorizeFarmReport($report);

        $farmId = app('current.farm.id');
        $date   = $report->report_date->toDateString();

        // Milk records for display
        $milkRecords   = $this->milkService->getDailyAnimalRecords($farmId, $date);
        $milkSummary   = $this->milkService->getDailySummary($farmId, $date);

        // Sales for this date
        $sales = \App\Models\MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->with('buyer:id,name,buyer_type')
            ->get();

        $healthEvents = \App\Models\HealthEvent::where('farm_id', $farmId)
            ->whereDate('observed_on', $date)
            ->with(['animal:id,tag_number,name', 'diseaseType:id,name'])
            ->orderBy('created_at')
            ->get();

        $feedTransactions = \App\Models\FeedInventoryTransaction::where('farm_id', $farmId)
            ->whereDate('transaction_date', $date)
            ->with('feedType:id,name')
            ->orderBy('created_at')
            ->get();

        $expenses = \App\Models\Expense::where('farm_id', $farmId)
            ->whereDate('expense_date', $date)
            ->orderBy('created_at')
            ->get();

        return Inertia::render('reports/daily/Show', [
            'report'        => $report->load('submittedBy:id,name'),
            'milk_records'  => $milkRecords,
            'milk_summary'  => $milkSummary,
            'sales'         => $sales,
            'health_events' => $healthEvents,
            'feed_transactions' => $feedTransactions,
            'expenses'      => $expenses,
        ]);
    }

    private function authorizeFarmReport(DailyReport $report): void
    {
        abort_unless($report->farm_id === app('current.farm.id'), 403);
    }
}
