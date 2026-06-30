<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\FeedInventoryTransaction;
use App\Models\MilkProduction;
use App\Models\MilkSale;
use App\Models\ProfitabilitySnapshot;
use App\Models\Revenue;
use App\Models\Treatment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinanceService
{
    /**
     * Compute and store a monthly P&L snapshot for a farm.
     * Called nightly by the scheduler and on-demand when the user views the P&L page.
     */
    public function computeMonthlySnapshot(string $farmId, int $year, int $month): ProfitabilitySnapshot
    {
        // ─── Revenue ────────────────────────────────────────────────────────

        // Milk revenue from milk_sales
        $milkRevenue = (float) MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('sale_date', $year)
            ->whereMonth('sale_date', $month)
            ->sum('total_amount');

        // Other revenues from revenues table
        $otherRevenue = (float) Revenue::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('revenue_date', $year)
            ->whereMonth('revenue_date', $month)
            ->sum('amount');

        $totalRevenue = $milkRevenue + $otherRevenue;

        // ─── Milk Production ─────────────────────────────────────────────────

        $totalMilkLitres = (float) MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('milked_on', $year)
            ->whereMonth('milked_on', $month)
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        // ─── Expenses ─────────────────────────────────────────────────────────

        $expensesByCategory = Expense::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        // Feed cost also from feed_inventory_transactions (purchases)
        $feedPurchaseCost = (float) FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'purchase')
            ->whereYear('transaction_date', $year)
            ->whereMonth('transaction_date', $month)
            ->sum('total_cost');

        $feedFromExpenses = (float) ($expensesByCategory['feed'] ?? 0);
        $totalFeedCost    = max($feedPurchaseCost, $feedFromExpenses); // use whichever is recorded

        // Vet cost also from treatments
        $vetFromTreatments = (float) Treatment::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('treated_on', $year)
            ->whereMonth('treated_on', $month)
            ->sum('cost');

        $vetFromExpenses  = (float) ($expensesByCategory['vet'] ?? 0) + (float) ($expensesByCategory['veterinary'] ?? 0);
        $totalVetCost     = max($vetFromTreatments, $vetFromExpenses);

        $totalLabourCost  = (float) ($expensesByCategory['labour'] ?? 0);

        $otherExpenseCats = ['equipment', 'utilities', 'land', 'transport', 'breeding', 'other'];
        $totalOtherExp    = array_sum(array_map(
            fn ($cat) => (float) ($expensesByCategory[$cat] ?? 0),
            $otherExpenseCats
        ));

        $totalExpenses = $totalFeedCost + $totalVetCost + $totalLabourCost + $totalOtherExp;

        // ─── Derived Metrics ──────────────────────────────────────────────────

        $grossMargin      = $totalRevenue - $totalFeedCost - $totalVetCost;
        $netProfit        = $totalRevenue - $totalExpenses;
        $costPerLitre     = $totalMilkLitres > 0 ? round($totalExpenses / $totalMilkLitres, 4) : null;
        $revenuePerLitre  = $totalMilkLitres > 0 ? round($milkRevenue / $totalMilkLitres, 4) : null;

        // Upsert snapshot
        $snapshot = ProfitabilitySnapshot::withoutGlobalScopes()->updateOrCreate(
            ['farm_id' => $farmId, 'period_year' => $year, 'period_month' => $month],
            [
                'id'                   => \Illuminate\Support\Str::uuid(),
                'total_milk_litres'    => $totalMilkLitres,
                'total_milk_revenue'   => $milkRevenue,
                'total_other_revenue'  => $otherRevenue,
                'total_revenue'        => $totalRevenue,
                'total_feed_cost'      => $totalFeedCost,
                'total_vet_cost'       => $totalVetCost,
                'total_labour_cost'    => $totalLabourCost,
                'total_other_expenses' => $totalOtherExp,
                'total_expenses'       => $totalExpenses,
                'gross_margin'         => $grossMargin,
                'net_profit'           => $netProfit,
                'cost_per_litre'       => $costPerLitre,
                'revenue_per_litre'    => $revenuePerLitre,
                'computed_at'          => now(),
            ]
        );

        return $snapshot;
    }

    /**
     * Full P&L detail for the finance dashboard — live data, not snapshot.
     */
    public function getMonthlyPL(string $farmId, string $month): array
    {
        [$year, $mon] = array_map('intval', explode('-', $month));

        $snapshot = $this->computeMonthlySnapshot($farmId, $year, $mon);

        // Expense breakdown by category with all records
        $expenses = Expense::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->orderByDesc('expense_date')
            ->get();

        // Milk sales breakdown by buyer
        $milkSalesByBuyer = MilkSale::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('sale_date', $year)
            ->whereMonth('sale_date', $mon)
            ->select('milk_buyer_id', DB::raw('SUM(quantity_litres) as quantity_litres'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('milk_buyer_id')
            ->with('buyer:id,name,buyer_type')
            ->get();

        // Other revenues
        $revenues = Revenue::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('revenue_date', $year)
            ->whereMonth('revenue_date', $mon)
            ->orderByDesc('revenue_date')
            ->get();

        // 6-month trend
        $trend = $this->getSixMonthTrend($farmId);

        // Break-even
        $breakEven = $this->calculateBreakEven($snapshot);

        return [
            'snapshot'         => $snapshot,
            'expenses'         => $expenses,
            'milk_sales_breakdown' => $milkSalesByBuyer,
            'revenues'         => $revenues,
            'trend'            => $trend,
            'break_even'       => $breakEven,
            'month'            => $month,
        ];
    }

    /**
     * 6-month P&L trend (for charts).
     */
    public function getSixMonthTrend(string $farmId): array
    {
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $d   = now()->subMonths($i);
            $snap = $this->computeMonthlySnapshot($farmId, $d->year, $d->month);
            $trend[] = [
                'month'          => $d->format('M Y'),
                'revenue'        => (float) ($snap->total_revenue ?? 0),
                'expenses'       => (float) ($snap->total_expenses ?? 0),
                'net_profit'     => (float) ($snap->net_profit ?? 0),
                'cost_per_litre' => $snap->cost_per_litre ? (float) $snap->cost_per_litre : null,
            ];
        }
        return $trend;
    }

    /**
     * Break-even analysis.
     */
    public function calculateBreakEven(ProfitabilitySnapshot $snapshot): array
    {
        $fixedCosts    = (float) ($snapshot->total_labour_cost ?? 0) + (float) ($snapshot->total_other_expenses ?? 0);
        $variableCosts = (float) ($snapshot->total_feed_cost ?? 0) + (float) ($snapshot->total_vet_cost ?? 0);
        $revenue       = (float) ($snapshot->total_revenue ?? 0);
        $litres        = (float) ($snapshot->total_milk_litres ?? 0);

        $pricePerLitre   = $litres > 0 && $revenue > 0 ? $revenue / $litres : 42.0; // default KES 42
        $varCostPerLitre = $litres > 0 && $variableCosts > 0 ? $variableCosts / $litres : 0;
        $contribution    = $pricePerLitre - $varCostPerLitre;

        $breakEvenLitres = $contribution > 0 ? round($fixedCosts / $contribution) : null;
        $breakEvenDay    = $breakEvenLitres ? round($breakEvenLitres / 30) : null;
        $currentDay      = $litres > 0 ? round($litres / 30, 1) : null;
        $margin          = $breakEvenDay && $currentDay ? round($currentDay - $breakEvenDay, 1) : null;

        return [
            'fixed_costs'         => round($fixedCosts, 2),
            'variable_costs'      => round($variableCosts, 2),
            'price_per_litre'     => round($pricePerLitre, 2),
            'var_cost_per_litre'  => round($varCostPerLitre, 2),
            'contribution_margin' => round($contribution, 2),
            'break_even_litres'   => $breakEvenLitres,
            'break_even_per_day'  => $breakEvenDay,
            'current_per_day'     => $currentDay,
            'margin_above_be'     => $margin,
            'is_profitable'       => $margin !== null && $margin >= 0,
        ];
    }

    /**
     * Expense category breakdown with totals and percentages.
     */
    public function getExpenseBreakdown(string $farmId, int $year, int $month): array
    {
        $byCategory = Expense::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->select('category', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        $total = $byCategory->sum('total');

        return $byCategory->map(fn ($row) => [
            'category' => $row->category ?? 'other',
            'total'    => round((float) $row->total, 2),
            'count'    => (int) $row->count,
            'percent'  => $total > 0 ? round(($row->total / $total) * 100, 1) : 0,
        ])->all();
    }

    /**
     * Quick financial KPIs for the finance module header.
     */
    public function getFinanceKPIs(string $farmId, string $month): array
    {
        [$year, $mon] = array_map('intval', explode('-', $month));
        $snapshot = ProfitabilitySnapshot::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('period_year', $year)
            ->where('period_month', $mon)
            ->first();

        if (!$snapshot) {
            $snapshot = $this->computeMonthlySnapshot($farmId, $year, $mon);
        }

        $prevMonth  = Carbon::createFromDate($year, $mon, 1)->subMonth();
        $prevSnap   = ProfitabilitySnapshot::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('period_year', $prevMonth->year)
            ->where('period_month', $prevMonth->month)
            ->first();

        $revenueDelta = $prevSnap?->total_revenue
            ? round((((float) $snapshot->total_revenue - (float) $prevSnap->total_revenue) / max(1, (float) $prevSnap->total_revenue)) * 100, 1)
            : null;

        $totalRevenue = (float) ($snapshot->total_revenue ?? 0);
        $netProfit = (float) ($snapshot->net_profit ?? 0);

        return [
            'total_revenue'     => (float) ($snapshot->total_revenue ?? 0),
            'total_expenses'    => (float) ($snapshot->total_expenses ?? 0),
            'net_profit'        => $netProfit,
            'cost_per_litre'    => $snapshot->cost_per_litre !== null ? (float) $snapshot->cost_per_litre : null,
            'revenue_per_litre' => $snapshot->revenue_per_litre ? (float) $snapshot->revenue_per_litre : null,
            'margin_percent'    => $totalRevenue > 0
                ? round(($netProfit / $totalRevenue) * 100, 1)
                : null,
            'revenue_delta_pct' => $revenueDelta,
            'month_label'       => Carbon::createFromDate($year, $mon, 1)->format('F Y'),
        ];
    }
}
