<?php

namespace App\Services;

use App\Models\AIService;
use App\Models\Alert;
use App\Models\Animal;
use App\Models\CalvingRecord;
use App\Models\DewormingRecord;
use App\Models\Expense;
use App\Models\FeedInventoryTransaction;
use App\Models\HealthEvent;
use App\Models\MilkProduction;
use App\Models\MilkSale;
use App\Models\ProfitabilitySnapshot;
use App\Models\Revenue;
use App\Models\Treatment;
use App\Models\Vaccination;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    // ─── Milk Analytics ───────────────────────────────────────────────────────

    /**
     * Rolling milk trend — daily totals for the last N days.
     */
    public function getMilkTrend(string $farmId, int $days = 30): array
    {
        return MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('milked_on', '>=', now()->subDays($days - 1)->toDateString())
            ->where('is_withheld', false)
            ->select('milked_on', DB::raw('SUM(quantity_litres) as total'), DB::raw('COUNT(DISTINCT animal_id) as cows'))
            ->groupBy('milked_on')
            ->orderBy('milked_on')
            ->get()
            ->map(fn ($r) => [
                'date'  => $r->milked_on,
                'total' => round((float) $r->total, 2),
                'cows'  => (int) $r->cows,
                'avg'   => $r->cows > 0 ? round($r->total / $r->cows, 2) : 0,
            ])->all();
    }

    /**
     * Per-cow production for a date range — ranked by total.
     */
    public function getPerCowProduction(string $farmId, string $from, string $to): array
    {
        return MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereBetween('milked_on', [$from, $to])
            ->where('is_withheld', false)
            ->select('animal_id', DB::raw('SUM(quantity_litres) as total'), DB::raw('COUNT(DISTINCT milked_on) as days'))
            ->groupBy('animal_id')
            ->orderByDesc('total')
            ->with('animal:id,tag_number,name,breed,status')
            ->get()
            ->map(fn ($r) => [
                'animal_id'  => $r->animal_id,
                'tag_number' => $r->animal?->tag_number,
                'name'       => $r->animal?->name,
                'breed'      => $r->animal?->breed,
                'total_litres' => round((float) $r->total, 2),
                'days_milked'  => (int) $r->days,
                'avg_per_day'  => $r->days > 0 ? round($r->total / $r->days, 2) : 0,
            ])->all();
    }

    /**
     * Herd summary KPIs (current snapshot).
     */
    public function getHerdSummary(string $farmId): array
    {
        $counts = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $pregnant = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('is_pregnant', true)
            ->count();

        $utilisation = ($counts->sum() > 0 && isset($counts['lactating']))
            ? round(($counts['lactating'] / $counts->sum()) * 100, 1)
            : 0;

        return [
            'total'       => $counts->sum(),
            'lactating'   => (int) ($counts['lactating'] ?? 0),
            'dry'         => (int) ($counts['dry'] ?? 0),
            'heifer'      => (int) ($counts['heifer'] ?? 0),
            'calf'        => (int) ($counts['calf'] ?? 0),
            'bull'        => (int) ($counts['bull'] ?? 0),
            'pregnant'    => $pregnant,
            'utilisation_rate' => $utilisation, // % cows in milk
        ];
    }

    // ─── Breeding Analytics ───────────────────────────────────────────────────

    /**
     * Rolling 90-day breeding KPIs.
     */
    public function getBreedingAnalytics(string $farmId): array
    {
        $since    = now()->subDays(90)->toDateString();
        $services = AIService::withoutGlobalScopes()->where('farm_id', $farmId)->where('service_date', '>=', $since);

        $total     = (clone $services)->count();
        $confirmed = (clone $services)->where('result', 'confirmed_pregnant')->count();
        $pending   = (clone $services)->where('result', 'pending')->count();

        $conceptionRate = $total > 0 ? round(($confirmed / $total) * 100, 1) : 0;
        $servicesPerConception = $confirmed > 0 ? round($total / $confirmed, 1) : null;

        // Average days open for cows confirmed pregnant (calving to conception)
        $daysOpenRows = AIService::withoutGlobalScopes()
            ->where('ai_services.farm_id', $farmId)
            ->where('result', 'confirmed_pregnant')
            ->whereNotNull('conception_confirmed_on')
            ->join('animals', 'ai_services.animal_id', '=', 'animals.id')
            ->whereNotNull('animals.last_calving_date')
            ->select('ai_services.conception_confirmed_on', 'animals.last_calving_date')
            ->get();

        $avgDaysOpen = $daysOpenRows->isNotEmpty()
            ? $daysOpenRows
                ->map(fn ($row) => Carbon::parse($row->last_calving_date)
                    ->diffInDays(Carbon::parse($row->conception_confirmed_on), false))
                ->avg()
            : null;

        // Monthly conception rate trend (last 6 months)
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $d   = now()->subMonths($i);
            $tot = AIService::withoutGlobalScopes()->where('farm_id', $farmId)
                ->whereYear('service_date', $d->year)->whereMonth('service_date', $d->month)->count();
            $con = AIService::withoutGlobalScopes()->where('farm_id', $farmId)
                ->whereYear('service_date', $d->year)->whereMonth('service_date', $d->month)
                ->where('result', 'confirmed_pregnant')->count();
            $monthlyTrend[] = [
                'month'             => $d->format('M Y'),
                'total_services'    => $tot,
                'confirmed'         => $con,
                'conception_rate'   => $tot > 0 ? round(($con / $tot) * 100, 1) : 0,
            ];
        }

        return [
            'total_services_90d'    => $total,
            'confirmed_90d'         => $confirmed,
            'pending_pd_check'      => $pending,
            'conception_rate_90d'   => $conceptionRate,
            'services_per_conception' => $servicesPerConception,
            'avg_days_open'         => $avgDaysOpen ? round($avgDaysOpen) : null,
            'pregnant_cows'         => Animal::withoutGlobalScopes()->where('farm_id', $farmId)->where('is_pregnant', true)->count(),
            'upcoming_calvings_30d' => AIService::withoutGlobalScopes()->where('farm_id', $farmId)->dueForCalving(30)->count(),
            'monthly_trend'         => $monthlyTrend,
        ];
    }

    // ─── Health Analytics ─────────────────────────────────────────────────────

    /**
     * Health event analytics for a rolling period.
     */
    public function getHealthAnalytics(string $farmId, int $months = 3): array
    {
        $since = now()->subMonths($months)->toDateString();

        $byDisease = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('observed_on', '>=', $since)
            ->select('disease_type_id', DB::raw('count(*) as count'))
            ->groupBy('disease_type_id')
            ->with('diseaseType:id,name')
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'disease'   => $r->diseaseType?->name ?? 'Unknown',
                'count'     => (int) $r->count,
            ])->all();

        $totalEvents = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)->where('observed_on', '>=', $since)->count();

        $totalTreatmentCost = (float) Treatment::withoutGlobalScopes()
            ->where('farm_id', $farmId)->where('treated_on', '>=', $since)->sum('cost');

        $vaccinationsDue = Vaccination::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(30)->toDateString())
            ->count();

        $dewormingDue = DewormingRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('next_due_date', '<=', now()->addDays(30)->toDateString())
            ->count();

        // Monthly health event trend
        $monthlyTrend = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $cnt = HealthEvent::withoutGlobalScopes()->where('farm_id', $farmId)
                ->whereYear('observed_on', $d->year)->whereMonth('observed_on', $d->month)->count();
            $cost = (float) Treatment::withoutGlobalScopes()->where('farm_id', $farmId)
                ->whereYear('treated_on', $d->year)->whereMonth('treated_on', $d->month)->sum('cost');
            $monthlyTrend[] = ['month' => $d->format('M Y'), 'events' => $cnt, 'cost' => $cost];
        }

        return [
            'total_events'          => $totalEvents,
            'by_disease'            => $byDisease,
            'total_treatment_cost'  => $totalTreatmentCost,
            'vaccinations_due_30d'  => $vaccinationsDue,
            'deworming_due_30d'     => $dewormingDue,
            'monthly_trend'         => $monthlyTrend,
        ];
    }

    // ─── Feed Analytics ───────────────────────────────────────────────────────

    public function getFeedAnalytics(string $farmId, int $months = 3): array
    {
        $monthlyFeed = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $purchased = (float) FeedInventoryTransaction::withoutGlobalScopes()
                ->where('farm_id', $farmId)
                ->where('transaction_type', 'purchase')
                ->whereYear('transaction_date', $d->year)
                ->whereMonth('transaction_date', $d->month)
                ->sum('total_cost');

            $milkLitres = (float) MilkProduction::withoutGlobalScopes()
                ->where('farm_id', $farmId)
                ->whereYear('milked_on', $d->year)->whereMonth('milked_on', $d->month)
                ->sum('quantity_litres');

            $monthlyFeed[] = [
                'month'           => $d->format('M Y'),
                'feed_cost'       => round($purchased, 2),
                'milk_litres'     => round($milkLitres, 1),
                'cost_per_litre'  => $milkLitres > 0 ? round($purchased / $milkLitres, 2) : null,
            ];
        }

        // Top feed types by cost (last 30 days)
        $topFeeds = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'purchase')
            ->where('transaction_date', '>=', now()->subDays(30)->toDateString())
            ->select('feed_type_id', DB::raw('SUM(total_cost) as cost'), DB::raw('SUM(ABS(quantity_kg)) as qty'))
            ->groupBy('feed_type_id')
            ->with('feedType:id,name')
            ->orderByDesc('cost')
            ->limit(6)
            ->get()
            ->map(fn ($r) => [
                'feed'  => $r->feedType?->name ?? 'Unknown',
                'cost'  => round((float) $r->cost, 2),
                'qty'   => round((float) $r->qty, 1),
            ])->all();

        return [
            'monthly_trend' => $monthlyFeed,
            'top_feeds_30d' => $topFeeds,
        ];
    }

    // ─── Financial Analytics ──────────────────────────────────────────────────

    public function getFinancialAnalytics(string $farmId, int $months = 6): array
    {
        $snapshots = ProfitabilitySnapshot::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->orderBy('period_year')->orderBy('period_month')
            ->take($months)
            ->get();

        $trend = $snapshots->map(fn ($s) => [
            'month'           => Carbon::createFromDate($s->period_year, $s->period_month, 1)->format('M Y'),
            'revenue'         => (float) ($s->total_revenue ?? 0),
            'expenses'        => (float) ($s->total_expenses ?? 0),
            'net_profit'      => (float) ($s->net_profit ?? 0),
            'cost_per_litre'  => $s->cost_per_litre ? (float) $s->cost_per_litre : null,
            'milk_litres'     => (float) ($s->total_milk_litres ?? 0),
        ])->all();

        // Revenue by channel (last 30 days)
        $channelBreakdown = MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('sale_date', '>=', now()->subDays(30)->toDateString())
            ->select('milk_buyer_id', DB::raw('SUM(total_amount) as revenue'), DB::raw('SUM(quantity_litres) as litres'))
            ->groupBy('milk_buyer_id')
            ->with('buyer:id,name,buyer_type')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                'channel' => $r->buyer?->name ?? 'Unknown',
                'revenue' => round((float) $r->revenue, 2),
                'litres'  => round((float) $r->litres, 1),
                'price'   => $r->litres > 0 ? round($r->revenue / $r->litres, 2) : 0,
            ])->all();

        return [
            'trend'             => $trend,
            'channel_breakdown' => $channelBreakdown,
        ];
    }

    // ─── Dashboard Overview (all in one) ─────────────────────────────────────

    public function getDashboardAnalytics(string $farmId): array
    {
        return [
            'herd'        => $this->getHerdSummary($farmId),
            'milk_trend'  => $this->getMilkTrend($farmId, 14),
            'breeding'    => [
                'conception_rate' => $this->getBreedingConceptionRate($farmId),
                'pregnant'        => Animal::withoutGlobalScopes()->where('farm_id', $farmId)->where('is_pregnant', true)->count(),
            ],
            'health_open' => HealthEvent::withoutGlobalScopes()
                ->where('farm_id', $farmId)->where('is_recovered', false)->count(),
            'alerts_pending' => Alert::withoutGlobalScopes()
                ->where('farm_id', $farmId)->where('status', 'pending')->count(),
        ];
    }

    private function getBreedingConceptionRate(string $farmId): float
    {
        $total     = AIService::withoutGlobalScopes()->where('farm_id', $farmId)->where('service_date', '>=', now()->subDays(90))->count();
        $confirmed = AIService::withoutGlobalScopes()->where('farm_id', $farmId)->where('service_date', '>=', now()->subDays(90))->where('result', 'confirmed_pregnant')->count();
        return $total > 0 ? round(($confirmed / $total) * 100, 1) : 0;
    }

    // ─── WhatsApp Report Data ─────────────────────────────────────────────────

    /**
     * Prepare all data needed for the WhatsApp daily summary message.
     */
    public function getDailyReportData(string $farmId, string $date): array
    {
        $milkTotal = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereDate('milked_on', $date)->where('is_withheld', false)
            ->sum('quantity_litres');

        $milkYesterday = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('milked_on', Carbon::parse($date)->subDay()->toDateString())
            ->where('is_withheld', false)->sum('quantity_litres');

        $milkRevenue = (float) MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereDate('sale_date', $date)->sum('total_amount');

        $healthEvents = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereDate('observed_on', $date)->count();

        $openCases = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)->where('is_recovered', false)->count();

        $activeAlerts = Alert::withoutGlobalScopes()
            ->where('farm_id', $farmId)->where('status', 'pending')
            ->where('severity', 'critical')->limit(3)->pluck('title');

        $cowsMilked = MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereDate('milked_on', $date)->distinct('animal_id')->count('animal_id');

        $deltaL   = $milkTotal - $milkYesterday;
        $deltaPct = $milkYesterday > 0 ? round(($deltaL / $milkYesterday) * 100, 1) : 0;

        $farm = \App\Models\Farm::withoutGlobalScopes()->find($farmId);

        return [
            'farm_name'      => $farm?->name ?? 'Farm',
            'date'           => Carbon::parse($date)->format('d M Y'),
            'milk_today'     => round($milkTotal, 1),
            'milk_yesterday' => round($milkYesterday, 1),
            'delta_litres'   => round($deltaL, 1),
            'delta_percent'  => $deltaPct,
            'cows_milked'    => $cowsMilked,
            'milk_revenue'   => round($milkRevenue, 2),
            'health_events'  => $healthEvents,
            'open_cases'     => $openCases,
            'critical_alerts'=> $activeAlerts->all(),
        ];
    }

    /**
     * Build the WhatsApp daily message text.
     */
    public function buildWhatsAppDailyMessage(array $data): string
    {
        $delta = $data['delta_litres'] >= 0
            ? "+{$data['delta_litres']}L"
            : "{$data['delta_litres']}L";

        $lines = [
            "🐄 *DAILY FARM REPORT*",
            "📅 {$data['date']} | {$data['farm_name']}",
            "",
            "🥛 *MILK PRODUCTION*",
            "Total: {$data['milk_today']} L | Cows: {$data['cows_milked']}",
            "vs Yesterday: {$delta} ({$data['delta_percent']}%)",
        ];

        if ($data['milk_revenue'] > 0) {
            $lines[] = "";
            $lines[] = "💰 *REVENUE*";
            $lines[] = "Milk Sales: KES " . number_format($data['milk_revenue'], 0);
        }

        if ($data['health_events'] > 0 || $data['open_cases'] > 0) {
            $lines[] = "";
            $lines[] = "🏥 *HEALTH*";
            if ($data['health_events'] > 0) $lines[] = "New events today: {$data['health_events']}";
            if ($data['open_cases'] > 0) $lines[] = "Open cases: {$data['open_cases']}";
        }

        if (!empty($data['critical_alerts'])) {
            $lines[] = "";
            $lines[] = "⚠️ *ALERTS*";
            foreach (array_slice($data['critical_alerts'], 0, 3) as $alert) {
                $lines[] = "• {$alert}";
            }
        }

        $lines[] = "";
        $lines[] = "_SpinoMok FarmOps_";

        return implode("\n", $lines);
    }

    /**
     * Build weekly WhatsApp summary.
     */
    public function buildWhatsAppWeeklySummary(string $farmId): string
    {
        $weekStart = now()->startOfWeek()->toDateString();
        $weekEnd   = now()->endOfWeek()->toDateString();

        $weekMilk = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereBetween('milked_on', [$weekStart, $weekEnd])
            ->where('is_withheld', false)->sum('quantity_litres');

        $prevWeekMilk = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereBetween('milked_on', [now()->subWeek()->startOfWeek()->toDateString(), now()->subWeek()->endOfWeek()->toDateString()])
            ->where('is_withheld', false)->sum('quantity_litres');

        $weekRevenue = (float) MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)->whereBetween('sale_date', [$weekStart, $weekEnd])->sum('total_amount');

        $farm = \App\Models\Farm::withoutGlobalScopes()->find($farmId);
        $delta = $weekMilk - $prevWeekMilk;
        $deltaPct = $prevWeekMilk > 0 ? round(($delta / $prevWeekMilk) * 100, 1) : 0;

        $lines = [
            "📊 *WEEKLY FARM SUMMARY*",
            "📅 Week: " . Carbon::parse($weekStart)->format('d M') . " – " . Carbon::parse($weekEnd)->format('d M Y'),
            "🏡 {$farm->name}",
            "",
            "🥛 *PRODUCTION*",
            "Total: " . round($weekMilk, 1) . " L",
            "vs Last Week: " . ($delta >= 0 ? '+' : '') . round($delta, 1) . " L ({$deltaPct}%)",
            "Daily Average: " . round($weekMilk / 7, 1) . " L",
            "",
            "💰 *REVENUE*",
            "Milk Sales: KES " . number_format($weekRevenue, 0),
            "",
            "_SpinoMok FarmOps_",
        ];

        return implode("\n", $lines);
    }
}
