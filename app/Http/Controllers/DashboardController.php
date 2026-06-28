<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\DailyReport;
use App\Models\MilkProduction;
use App\Models\MilkSale;
use App\Models\Revenue;
use App\Services\AnalyticsService;
use App\Services\MilkProductionService;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly MilkProductionService $milkService,
        private readonly AnalyticsService $analyticsService,
    ) {}

    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $today  = now()->toDateString();

        $todaySummary = $this->milkService->getDailySummary($farmId, $today);
        $milkToday = (float) $todaySummary['total_litres'];

        $latestMilkDate = MilkProduction::where('farm_id', $farmId)
            ->where('is_withheld', false)
            ->whereDate('milked_on', '<=', $today)
            ->max('milked_on');

        $displayDate = $milkToday > 0 || ! $latestMilkDate ? $today : Carbon::parse($latestMilkDate)->toDateString();
        $displaySummary = $displayDate === $today
            ? $todaySummary
            : $this->milkService->getDailySummary($farmId, $displayDate);

        $comparisonDate = MilkProduction::where('farm_id', $farmId)
            ->where('is_withheld', false)
            ->whereDate('milked_on', '<', $displayDate)
            ->max('milked_on');

        $comparisonLitres = $comparisonDate
            ? (float) $this->milkService->getDailySummary($farmId, Carbon::parse($comparisonDate)->toDateString())['total_litres']
            : 0.0;

        $milkDeltaLitres = (float) $displaySummary['total_litres'] - $comparisonLitres;
        $milkDeltaPercent = $comparisonLitres > 0
            ? round(($milkDeltaLitres / $comparisonLitres) * 100, 1)
            : null;

        $milkMtdLitres = (float) MilkProduction::where('farm_id', $farmId)
            ->whereYear('milked_on', now()->year)
            ->whereMonth('milked_on', now()->month)
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        // Animal summary
        $animalCounts = Animal::where('farm_id', $farmId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $lactating = (int) ($animalCounts['lactating'] ?? 0);
        $dry       = (int) ($animalCounts['dry'] ?? 0);
        $pregnant  = Animal::where('farm_id', $farmId)->where('is_pregnant', true)->count();
        $calves    = (int) ($animalCounts['calf'] ?? 0);
        $heifers   = (int) ($animalCounts['heifer'] ?? 0);

        // Revenue combines milk sales plus manually-entered finance revenue.
        $milkRevenueToday = (float) MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $today)
            ->sum('total_amount');

        $otherRevenueToday = (float) Revenue::where('farm_id', $farmId)
            ->whereDate('revenue_date', $today)
            ->sum('amount');

        $revenueToday = $milkRevenueToday + $otherRevenueToday;

        $milkRevenueMtd = (float) MilkSale::where('farm_id', $farmId)
            ->whereYear('sale_date', now()->year)
            ->whereMonth('sale_date', now()->month)
            ->sum('total_amount');

        $otherRevenueMtd = (float) Revenue::where('farm_id', $farmId)
            ->whereYear('revenue_date', now()->year)
            ->whereMonth('revenue_date', now()->month)
            ->sum('amount');

        $revenueMtd = $milkRevenueMtd + $otherRevenueMtd;

        // Today's report status
        $todayReport = DailyReport::where('farm_id', $farmId)
            ->where('report_date', $today)
            ->first(['id', 'status', 'draft_step']);

        // Alerts
        $activeAlerts = Alert::where('farm_id', $farmId)
            ->where('status', 'pending')
            ->orderBy('severity', 'desc')
            ->orderBy('due_on')
            ->limit(5)
            ->with('animal:id,tag_number,name')
            ->get();

        $criticalCount = Alert::where('farm_id', $farmId)
            ->where('status', 'pending')
            ->where('severity', 'critical')
            ->count();

        // Recent animals
        $recentAnimals = Animal::where('farm_id', $farmId)
            ->whereIn('status', ['lactating', 'heifer', 'calf'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'id', 'tag_number', 'name', 'breed', 'status',
                'is_pregnant', 'expected_calving_date', 'photo_url',
            ]);

        return Inertia::render('dashboard/Index', [
            'kpis' => [
                'milk_today_litres'    => (float) $milkToday,
                'milk_yesterday_litres'=> (float) $comparisonLitres,
                'milk_delta_percent'   => $milkDeltaPercent,
                'milk_delta_litres'    => round($milkDeltaLitres, 1),
                'milk_display_litres'  => (float) $displaySummary['total_litres'],
                'milk_display_date'    => $displayDate,
                'milk_display_label'   => $displayDate === $today ? 'Today' : 'Latest recorded',
                'milk_mtd_litres'      => round($milkMtdLitres, 1),
                'morning_litres'       => (float) $todaySummary['morning_litres'],
                'midday_litres'        => (float) $todaySummary['midday_litres'],
                'evening_litres'       => (float) $todaySummary['evening_litres'],
                'cows_milked'          => (int) $todaySummary['cows_milked'],
                'avg_litres_per_cow'   => (float) $todaySummary['avg_per_cow'],
                'revenue_today_kes'    => $revenueToday,
                'revenue_mtd_kes'      => $revenueMtd,
                'active_animals'       => $animalCounts->sum(),
                'lactating_cows'       => $lactating,
                'dry_cows'             => $dry,
                'pregnant_cows'        => $pregnant,
                'calves'               => $calves,
                'active_alerts_count'  => $activeAlerts->count(),
                'critical_alerts_count'=> $criticalCount,
                'pending_tasks_count'  => 0,
            ],
            'active_alerts'   => $activeAlerts,
            'recent_animals'  => $recentAnimals,
            'today_date'      => now()->format('D, d M Y'),
            'today_report'    => $todayReport,
            'milk_trend'      => $this->milkService->getSevenDayTrend($farmId),
            'risk_summary'    => [
                'milk' => $this->analyticsService->getAdvancedMilkAnalytics($farmId),
                'mastitis' => $this->analyticsService->getMastitisAnalytics($farmId),
                'bcs' => $this->analyticsService->getBcsAnalytics($farmId),
                'combined' => $this->analyticsService->getCombinedHealthRisk($farmId),
            ],
        ]);
    }
}
