<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\MilkBuyer;
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

        return Inertia::render('reports/daily/Create', [
            'report'        => $report,
            'date'          => $date,
            'animal_records'=> $animalRecords,
            'milk_summary'  => $milkSummary,
            'buyers'        => $buyers,
            'current_step'  => $report->draft_step ?? 1,
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

        return Inertia::render('reports/daily/Show', [
            'report'        => $report->load('submittedBy:id,name'),
            'milk_records'  => $milkRecords,
            'milk_summary'  => $milkSummary,
            'sales'         => $sales,
        ]);
    }

    private function authorizeFarmReport(DailyReport $report): void
    {
        abort_unless($report->farm_id === app('current.farm.id'), 403);
    }
}
