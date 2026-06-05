<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\DailyReport;
use App\Models\MilkProduction;
use App\Models\MilkSale;
use App\Services\MilkProductionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly MilkProductionService $milkService) {}

    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $today  = now()->toDateString();

        // Today's milk total
        $milkToday = MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', $today)
            ->sum('quantity_litres');

        // Yesterday's milk
        $milkYesterday = MilkProduction::where('farm_id', $farmId)
            ->whereDate('milked_on', now()->subDay()->toDateString())
            ->sum('quantity_litres');

        $milkDeltaPercent = $milkYesterday > 0
            ? round((($milkToday - $milkYesterday) / $milkYesterday) * 100, 1)
            : 0;

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

        // Revenue today from milk_sales
        $revenueToday = (float) MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $today)
            ->sum('total_amount');

        // Revenue MTD from milk_sales table
        $revenueMtd = (float) MilkSale::where('farm_id', $farmId)
            ->whereYear('sale_date', now()->year)
            ->whereMonth('sale_date', now()->month)
            ->sum('total_amount');

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
                'milk_yesterday_litres'=> (float) $milkYesterday,
                'milk_delta_percent'   => $milkDeltaPercent,
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
        ]);
    }
}
