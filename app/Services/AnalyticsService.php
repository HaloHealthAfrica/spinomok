<?php

namespace App\Services;

use App\Models\AIService;
use App\Models\Alert;
use App\Models\Animal;
use App\Models\AnimalWeightRecord;
use App\Models\CalvingRecord;
use App\Models\DewormingRecord;
use App\Models\Expense;
use App\Models\FeedInventoryTransaction;
use App\Models\HealthEvent;
use App\Models\MilkProduction;
use App\Models\MilkBuyer;
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
     * Per-cow rolling milk intelligence for early production warnings.
     */
    public function getAdvancedMilkAnalytics(string $farmId): array
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        $from = now()->subDays(29)->toDateString();

        $rows = MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('milked_on', '>=', $from)
            ->where('is_withheld', false)
            ->select('animal_id', 'milked_on', DB::raw('SUM(quantity_litres) as total'))
            ->groupBy('animal_id', 'milked_on')
            ->with('animal:id,tag_number,name,status')
            ->orderBy('milked_on')
            ->get()
            ->groupBy('animal_id');

        $cows = $rows->map(function ($records) use ($today, $yesterday) {
            $animal = $records->first()->animal;
            $daily = $records->mapWithKeys(fn ($r) => [$r->milked_on => (float) $r->total]);
            $last7 = $daily->filter(fn ($value, $date) => $date >= now()->subDays(6)->toDateString());
            $last3 = $daily->filter(fn ($value, $date) => $date >= now()->subDays(2)->toDateString());
            $todayTotal = round((float) ($daily[$today] ?? 0), 1);
            $avg7 = $last7->isNotEmpty() ? round($last7->avg(), 1) : 0.0;
            $avg3 = $last3->isNotEmpty() ? round($last3->avg(), 1) : 0.0;
            $pctChange = $avg7 > 0 ? round((($todayTotal - $avg7) / $avg7) * 100, 1) : 0.0;
            $status = $pctChange <= -20 ? 'critical' : ($pctChange <= -10 ? 'warning' : ($pctChange >= 10 ? 'improving' : 'steady'));

            return [
                'animal_id' => $records->first()->animal_id,
                'tag_number' => $animal?->tag_number,
                'name' => $animal?->name,
                'today_litres' => $todayTotal,
                'yesterday_litres' => round((float) ($daily[$yesterday] ?? 0), 1),
                'avg_3_day' => $avg3,
                'avg_7_day' => $avg7,
                'weekly_avg' => $avg7,
                'peak_litres' => round((float) $daily->max(), 1),
                'lifetime_avg' => round((float) $daily->avg(), 1),
                'percent_change_vs_7_day' => $pctChange,
                'status' => $status,
            ];
        })->values();

        $todayMilked = $cows->filter(fn ($cow) => $cow['today_litres'] > 0);
        $highest = $todayMilked->sortByDesc('today_litres')->first();
        $lowest = $todayMilked->sortBy('today_litres')->first();

        return [
            'date' => $today,
            'total_milk' => round((float) $todayMilked->sum('today_litres'), 1),
            'avg_per_cow' => $todayMilked->count() > 0 ? round($todayMilked->avg('today_litres'), 1) : 0,
            'highest_producer' => $highest,
            'lowest_producer' => $lowest,
            'declining_count' => $cows->whereIn('status', ['warning', 'critical'])->count(),
            'improving_count' => $cows->where('status', 'improving')->count(),
            'warning_count' => $cows->where('status', 'warning')->count(),
            'critical_count' => $cows->where('status', 'critical')->count(),
            'cow_trends' => $cows->sortBy('percent_change_vs_7_day')->values()->all(),
        ];
    }

    /**
     * Mastitis events saved through health records, including score metadata in notes.
     */
    public function getMastitisAnalytics(string $farmId): array
    {
        $events = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('observed_on', '>=', now()->subDays(30)->toDateString())
            ->where(function ($query) {
                $query->where('symptoms', 'like', '%Mastitis%')
                    ->orWhere('notes', 'like', '%Mastitis%')
                    ->orWhereHas('diseaseType', fn ($q) => $q->where('name', 'like', '%Mastitis%'));
            })
            ->with(['animal:id,tag_number,name', 'diseaseType:id,name'])
            ->orderByDesc('observed_on')
            ->get();

        $cases = $events->map(function (HealthEvent $event) {
            preg_match('/Mastitis score:\s*([0-4])/', (string) $event->notes, $scoreMatch);
            preg_match('/Quarter:\s*(LF|RF|LR|RR)/', (string) $event->notes, $quarterMatch);

            return [
                'event_id' => $event->id,
                'animal_id' => $event->animal_id,
                'animal' => $event->animal?->name ?? $event->animal?->tag_number ?? 'Cow',
                'observed_on' => $event->observed_on?->toDateString(),
                'score' => isset($scoreMatch[1]) ? (int) $scoreMatch[1] : null,
                'quarter' => $quarterMatch[1] ?? null,
                'severity' => $event->severity,
                'is_recovered' => (bool) $event->is_recovered,
            ];
        })->values();

        return [
            'cases_30d' => $cases->count(),
            'active_cases' => $cases->where('is_recovered', false)->count(),
            'severe_cases' => $cases->filter(fn ($case) => $case['severity'] === 'severe' || ($case['score'] ?? 0) >= 3)->count(),
            'recent_cases' => $cases->take(6)->all(),
        ];
    }

    /**
     * Herd body condition score analytics using existing weight records.
     */
    public function getBcsAnalytics(string $farmId): array
    {
        $records = AnimalWeightRecord::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereNotNull('body_condition_score')
            ->where('measured_on', '>=', now()->subDays(90)->toDateString())
            ->with('animal:id,tag_number,name,status')
            ->orderBy('measured_on')
            ->get()
            ->groupBy('animal_id');

        $cows = $records->map(function ($animalRecords) {
            $latest = $animalRecords->last();
            $previous30 = $animalRecords
                ->filter(fn ($r) => $r->measured_on < $latest->measured_on && $r->measured_on >= $latest->measured_on->copy()->subDays(30))
                ->last();
            $current = (float) $latest->body_condition_score;
            $delta30 = $previous30 ? round($current - (float) $previous30->body_condition_score, 1) : null;
            $status = $current < 2.5 || ($delta30 !== null && $delta30 <= -0.5)
                ? 'low'
                : ($current > 4.0 ? 'high' : ($delta30 !== null && $delta30 >= 0.5 ? 'improving' : 'target'));

            return [
                'animal_id' => $latest->animal_id,
                'animal' => $latest->animal?->name ?? $latest->animal?->tag_number ?? 'Cow',
                'tag_number' => $latest->animal?->tag_number,
                'measured_on' => $latest->measured_on?->toDateString(),
                'current_bcs' => round($current, 1),
                'delta_30d' => $delta30,
                'status' => $status,
            ];
        })->values();

        return [
            'herd_avg' => $cows->count() > 0 ? round($cows->avg('current_bcs'), 1) : null,
            'lowest' => $cows->sortBy('current_bcs')->first(),
            'highest' => $cows->sortByDesc('current_bcs')->first(),
            'low_count' => $cows->where('status', 'low')->count(),
            'high_count' => $cows->where('status', 'high')->count(),
            'losing_count' => $cows->filter(fn ($cow) => ($cow['delta_30d'] ?? 0) <= -0.5)->count(),
            'improving_count' => $cows->filter(fn ($cow) => ($cow['delta_30d'] ?? 0) >= 0.5)->count(),
            'cow_scores' => $cows->sortBy('current_bcs')->values()->all(),
        ];
    }

    public function getCombinedHealthRisk(string $farmId): array
    {
        $milk = collect($this->getAdvancedMilkAnalytics($farmId)['cow_trends']);
        $bcs = collect($this->getBcsAnalytics($farmId)['cow_scores'])->keyBy('animal_id');
        $mastitis = collect($this->getMastitisAnalytics($farmId)['recent_cases'])->keyBy('animal_id');

        return $milk->map(function ($cow) use ($bcs, $mastitis) {
            $cowBcs = $bcs->get($cow['animal_id']);
            $cowMastitis = $mastitis->get($cow['animal_id']);
            $riskScore = 0;
            $signals = [];

            if (($cow['percent_change_vs_7_day'] ?? 0) <= -20) {
                $riskScore += 2;
                $signals[] = 'milk drop >20%';
            } elseif (($cow['percent_change_vs_7_day'] ?? 0) <= -10) {
                $riskScore += 1;
                $signals[] = 'milk drop >10%';
            }
            if ($cowBcs && (($cowBcs['current_bcs'] ?? 5) < 2.5 || ($cowBcs['delta_30d'] ?? 0) <= -0.5)) {
                $riskScore += 2;
                $signals[] = 'BCS risk';
            }
            if ($cowMastitis) {
                $riskScore += (($cowMastitis['score'] ?? 0) >= 3) ? 2 : 1;
                $signals[] = 'mastitis case';
            }

            return [
                'animal_id' => $cow['animal_id'],
                'animal' => $cow['name'] ?? $cow['tag_number'] ?? 'Cow',
                'milk_change' => $cow['percent_change_vs_7_day'],
                'bcs' => $cowBcs['current_bcs'] ?? null,
                'mastitis_score' => $cowMastitis['score'] ?? null,
                'risk_level' => $riskScore >= 4 ? 'high' : ($riskScore >= 2 ? 'watch' : 'normal'),
                'recommendation' => $riskScore >= 4
                    ? 'HIGH RISK: check udder, temperature, feed intake, and consider vet review.'
                    : ($riskScore >= 2 ? 'Watch closely at next milking and recheck BCS/udder.' : 'No combined risk signal.'),
                'signals' => $signals,
            ];
        })->filter(fn ($row) => $row['risk_level'] !== 'normal')->sortByDesc(fn ($row) => $row['risk_level'] === 'high' ? 2 : 1)->values()->all();
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
            ->where('farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        $milkYesterday = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('milked_on', Carbon::parse($date)->subDay()->toDateString())
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        $milkRevenue = (float) MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->sum('total_amount');

        $milkByCow = MilkProduction::withoutGlobalScopes()
            ->where('milk_production.farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->where('is_withheld', false)
            ->join('animals', 'animals.id', '=', 'milk_production.animal_id')
            ->selectRaw('milk_production.animal_id, animals.tag_number, animals.name, SUM(quantity_litres) as total_litres')
            ->groupBy('milk_production.animal_id', 'animals.tag_number', 'animals.name')
            ->orderByDesc('total_litres')
            ->get()
            ->map(fn ($row) => [
                'animal_id' => $row->animal_id,
                'tag_number' => $row->tag_number,
                'name' => $row->name,
                'total_litres' => round((float) $row->total_litres, 1),
            ])
            ->values()
            ->all();

        $sales = MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->with('buyer:id,name,buyer_type')
            ->orderBy('created_at')
            ->get()
            ->map(fn (MilkSale $sale) => [
                'buyer' => $sale->buyer?->name ?? 'Milk buyer',
                'litres' => round((float) $sale->quantity_litres, 1),
                'price' => round((float) $sale->price_per_litre, 2),
                'amount' => round((float) $sale->total_amount, 2),
                'payment_method' => $sale->payment_method,
            ])
            ->values()
            ->all();

        // All registered milk channels for this farm
        $allChannels = MilkBuyer::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->all();

        $healthDetails = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('observed_on', $date)
            ->with(['animal:id,tag_number,name', 'diseaseType:id,name'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (HealthEvent $event) => [
                'animal' => $event->animal?->name ?? $event->animal?->tag_number ?? 'Animal',
                'severity' => $event->severity,
                'summary' => $event->diseaseType?->name ?? $event->symptoms ?? 'Health event',
                'vet_name' => $event->vet_name,
                'is_recovered' => (bool) $event->is_recovered,
            ])
            ->values()
            ->all();

        $feedTransactions = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('transaction_date', $date)
            ->with('feedType:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (FeedInventoryTransaction $transaction) => [
                'type' => $transaction->transaction_type,
                'feed' => $transaction->feedType?->name ?? 'Feed',
                'quantity_kg' => abs(round((float) $transaction->quantity_kg, 1)),
                'cost' => round((float) ($transaction->total_cost ?? 0), 2),
                'animal_group' => $transaction->animal_group,
                'supplier' => $transaction->supplier,
            ])
            ->values()
            ->all();

        $expenses = Expense::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('expense_date', $date)
            ->orderBy('created_at')
            ->get()
            ->map(fn (Expense $expense) => [
                'category' => $expense->category,
                'description' => $expense->description,
                'amount' => round((float) $expense->amount, 2),
                'supplier' => $expense->supplier,
            ])
            ->values()
            ->all();

        $openCases = HealthEvent::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('is_recovered', false)
            ->count();

        $activeAlerts = Alert::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('status', 'pending')
            ->where('severity', 'critical')
            ->limit(3)
            ->pluck('title');

        $cowsMilked = MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereDate('milked_on', $date)
            ->distinct('animal_id')
            ->count('animal_id');

        $deltaL = $milkTotal - $milkYesterday;
        $deltaPct = $milkYesterday > 0 ? round(($deltaL / $milkYesterday) * 100, 1) : 0;
        $farm = \App\Models\Farm::withoutGlobalScopes()->find($farmId);
        $combinedRisk = array_slice($this->getCombinedHealthRisk($farmId), 0, 3);

        return [
            'farm_name' => $farm?->name ?? 'Farm',
            'date' => Carbon::parse($date)->format('d M Y'),
            'milk_today' => round($milkTotal, 1),
            'milk_yesterday' => round($milkYesterday, 1),
            'delta_litres' => round($deltaL, 1),
            'delta_percent' => $deltaPct,
            'cows_milked' => $cowsMilked,
            'milk_revenue' => round($milkRevenue, 2),
            'milk_by_cow' => $milkByCow,
            'sales' => $sales,
            'all_channels' => $allChannels,
            'health_events' => count($healthDetails),
            'health_details' => $healthDetails,
            'feed_transactions' => $feedTransactions,
            'feed_usage_cost' => round(collect($feedTransactions)->where('type', 'consumption')->sum('cost'), 2),
            'expenses' => $expenses,
            'expense_total' => round(collect($expenses)->sum('amount'), 2),
            'open_cases' => $openCases,
            'critical_alerts' => $activeAlerts->all(),
            'combined_risks' => $combinedRisk,
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
            "*DAILY FARM REPORT* - {$data['date']}",
            $data['farm_name'],
            "",
            "*MILK PRODUCTION*",
            "Total: {$data['milk_today']} L | Cows: {$data['cows_milked']}",
            "vs Yesterday: {$delta} ({$data['delta_percent']}%)",
        ];

        foreach ($data['milk_by_cow'] ?? [] as $row) {
            $name = $row['name'] ?: $row['tag_number'];
            $lines[] = "- {$name}: {$row['total_litres']} L";
        }

        $lines[] = "";
        $lines[] = "*MILK SALES*";
        $lines[] = "Total Revenue: KES ".number_format((float) $data['milk_revenue'], 0);

        // Build a lookup of today's sales keyed by buyer name
        $salesByBuyer = collect($data['sales'] ?? [])->keyBy('buyer');

        // Show all registered channels; mark those without a sale today
        $allChannels = $data['all_channels'] ?? [];
        if (!empty($allChannels)) {
            foreach ($allChannels as $channelName) {
                if (isset($salesByBuyer[$channelName])) {
                    $sale = $salesByBuyer[$channelName];
                    $lines[] = "- {$channelName}: {$sale['litres']} L x KES ".number_format((float) $sale['price'], 0)." = KES ".number_format((float) $sale['amount'], 0);
                } else {
                    $lines[] = "- {$channelName}: no sale today";
                }
            }
            // Include any ad-hoc sales to unknown/unlisted buyers
            foreach ($salesByBuyer as $buyerName => $sale) {
                if (!in_array($buyerName, $allChannels)) {
                    $lines[] = "- {$buyerName}: {$sale['litres']} L x KES ".number_format((float) $sale['price'], 0)." = KES ".number_format((float) $sale['amount'], 0);
                }
            }
        } elseif (!empty($data['sales'])) {
            foreach ($data['sales'] as $sale) {
                $lines[] = "- {$sale['buyer']}: {$sale['litres']} L x KES ".number_format((float) $sale['price'], 0)." = KES ".number_format((float) $sale['amount'], 0);
            }
        } else {
            $lines[] = "- None recorded";
        }

        $lines[] = "";
        $lines[] = "*HEALTH*";
        if (!empty($data['health_details'])) {
            foreach ($data['health_details'] as $event) {
                $status = $event['is_recovered'] ? 'recovered' : 'open';
                $lines[] = "- {$event['animal']}: {$event['severity']} - {$event['summary']} ({$status})";
            }
        } else {
            $lines[] = "- No health events recorded";
        }
        if ($data['open_cases'] > 0) {
            $lines[] = "Open cases: {$data['open_cases']}";
        }

        $lines[] = "";
        $lines[] = "*FEED*";
        $lines[] = "Usage Cost: KES ".number_format((float) ($data['feed_usage_cost'] ?? 0), 0);
        if (!empty($data['feed_transactions'])) {
            foreach ($data['feed_transactions'] as $transaction) {
                $label = $transaction['type'] === 'consumption' ? 'Used' : 'Received';
                $suffix = $transaction['animal_group'] ? " ({$transaction['animal_group']})" : '';
                $lines[] = "- {$label} {$transaction['feed']}: {$transaction['quantity_kg']} kg{$suffix}";
            }
        } else {
            $lines[] = "- No feed movements recorded";
        }

        $lines[] = "";
        $lines[] = "*EXPENSES*";
        $lines[] = "Total: KES ".number_format((float) ($data['expense_total'] ?? 0), 0);
        if (!empty($data['expenses'])) {
            foreach ($data['expenses'] as $expense) {
                $lines[] = "- {$expense['description']}: KES ".number_format((float) $expense['amount'], 0);
            }
        } else {
            $lines[] = "- None recorded";
        }

        if (!empty($data['critical_alerts'])) {
            $lines[] = "";
            $lines[] = "*ALERTS*";
            foreach (array_slice($data['critical_alerts'], 0, 3) as $alert) {
                $lines[] = "- {$alert}";
            }
        }

        if (!empty($data['combined_risks'])) {
            $lines[] = "";
            $lines[] = "*COW RISK WATCH*";
            foreach ($data['combined_risks'] as $risk) {
                $lines[] = "- {$risk['animal']}: {$risk['recommendation']}";
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
