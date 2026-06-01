<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Animal;
use App\Models\FeedInventory;
use App\Models\FeedInventoryTransaction;
use App\Models\FeedType;
use App\Models\MilkProduction;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeedService
{
    /**
     * Record incoming stock (purchase or harvest).
     * Updates weighted average cost per kg.
     */
    public function receiveStock(array $data, string $userId): FeedInventoryTransaction
    {
        $inventory = $this->getOrCreateInventory($data['farm_id'], $data['feed_type_id']);

        // Weighted average cost update
        $existingQty  = (float) $inventory->quantity_kg;
        $existingCost = (float) ($inventory->avg_cost_per_kg ?? 0);
        $newQty       = (float) $data['quantity_kg'];
        $newCost      = isset($data['unit_cost']) ? (float) $data['unit_cost'] : $existingCost;

        $newAvgCost = ($existingQty + $newQty) > 0
            ? round(($existingQty * $existingCost + $newQty * $newCost) / ($existingQty + $newQty), 3)
            : $newCost;

        $transaction = FeedInventoryTransaction::create([
            'id'               => Str::uuid(),
            'farm_id'          => $data['farm_id'],
            'feed_inventory_id'=> $inventory->id,
            'feed_type_id'     => $data['feed_type_id'],
            'transaction_type' => $data['transaction_type'] ?? 'purchase',
            'transaction_date' => $data['transaction_date'],
            'quantity_kg'      => abs($data['quantity_kg']), // positive = stock in
            'unit_cost'        => $newCost,
            'supplier'         => $data['supplier'] ?? null,
            'reference_number' => $data['reference_number'] ?? null,
            'notes'            => $data['notes'] ?? null,
            'recorded_by'      => $userId,
            'created_by'       => $userId,
        ]);

        // Update avg cost and last restocked date
        $inventory->update([
            'avg_cost_per_kg'  => $newAvgCost,
            'last_restocked_on'=> $data['transaction_date'],
        ]);

        // Resolve any existing low-stock alerts for this feed
        Alert::withoutGlobalScopes()
            ->where('farm_id', $data['farm_id'])
            ->where('alert_type', 'low_feed_stock')
            ->where('status', 'pending')
            ->where('reference_id', $inventory->id)
            ->update(['status' => 'resolved', 'auto_resolved' => true, 'resolved_at' => now()]);

        return $transaction;
    }

    /**
     * Record daily feed consumption.
     * Checks stock level and fires alerts if below threshold.
     */
    public function recordConsumption(array $data, string $userId): FeedInventoryTransaction
    {
        $inventory = $this->getOrCreateInventory($data['farm_id'], $data['feed_type_id']);

        $qty = abs($data['quantity_kg']); // ensure positive input
        $costPerKg = (float) ($inventory->avg_cost_per_kg ?? 0);

        $transaction = FeedInventoryTransaction::create([
            'id'               => Str::uuid(),
            'farm_id'          => $data['farm_id'],
            'feed_inventory_id'=> $inventory->id,
            'feed_type_id'     => $data['feed_type_id'],
            'transaction_type' => 'consumption',
            'transaction_date' => $data['transaction_date'],
            'quantity_kg'      => -$qty, // negative = stock out
            'unit_cost'        => $costPerKg,
            'animal_group'     => $data['animal_group'] ?? null,
            'notes'            => $data['notes'] ?? null,
            'recorded_by'      => $userId,
            'created_by'       => $userId,
        ]);

        // Refresh inventory to get updated balance
        $inventory->refresh();

        // Check thresholds and fire alerts
        $this->checkAndAlertLowStock($inventory, $data['farm_id']);

        return $transaction;
    }

    /**
     * Record manual stock adjustment (correction, wastage).
     */
    public function adjustStock(array $data, string $userId): FeedInventoryTransaction
    {
        $inventory = $this->getOrCreateInventory($data['farm_id'], $data['feed_type_id']);

        return FeedInventoryTransaction::create([
            'id'               => Str::uuid(),
            'farm_id'          => $data['farm_id'],
            'feed_inventory_id'=> $inventory->id,
            'feed_type_id'     => $data['feed_type_id'],
            'transaction_type' => $data['transaction_type'], // adjustment|wastage
            'transaction_date' => $data['transaction_date'],
            'quantity_kg'      => $data['quantity_kg'], // can be positive or negative
            'notes'            => $data['notes'] ?? null,
            'recorded_by'      => $userId,
            'created_by'       => $userId,
        ]);
    }

    /**
     * Check stock level and create alerts as needed.
     */
    private function checkAndAlertLowStock(FeedInventory $inventory, string $farmId): void
    {
        $qty      = (float) $inventory->quantity_kg;
        $reorder  = $inventory->reorder_level_kg ? (float) $inventory->reorder_level_kg : null;
        $feedName = $inventory->feedType?->name ?? 'Feed item';

        // Days remaining estimate
        $daysRemaining = $inventory->days_remaining;

        if ($daysRemaining !== null && $daysRemaining <= 3) {
            $severity = 'critical';
            $message  = "{$feedName} stock critical — approx. {$daysRemaining} day(s) remaining ({$qty} kg). Order immediately.";
        } elseif ($reorder !== null && $qty <= $reorder) {
            $severity = 'warning';
            $message  = "{$feedName} stock low — {$qty} kg remaining (reorder threshold: {$reorder} kg). Order within 3 days.";
        } else {
            return; // no alert needed
        }

        // Don't create duplicate alerts
        $exists = Alert::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('alert_type', 'low_feed_stock')
            ->where('status', 'pending')
            ->where('reference_id', $inventory->id)
            ->exists();

        if (!$exists) {
            Alert::create([
                'id'              => Str::uuid(),
                'farm_id'         => $farmId,
                'alert_type'      => 'low_feed_stock',
                'severity'        => $severity,
                'status'          => 'pending',
                'title'           => "Low Feed Stock — {$feedName}",
                'message'         => $message,
                'due_on'          => now()->toDateString(),
                'reference_table' => 'feed_inventory',
                'reference_id'    => $inventory->id,
            ]);
        }
    }

    /**
     * Get feed inventory summary for a farm with days-remaining estimates.
     */
    public function getInventorySummary(string $farmId): Collection
    {
        $items = FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->with('feedType')
            ->orderBy('quantity_kg')
            ->get();

        // For each item, compute 7-day avg daily consumption
        $transactionData = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'consumption')
            ->where('transaction_date', '>=', now()->subDays(7)->toDateString())
            ->select('feed_inventory_id', DB::raw('SUM(ABS(quantity_kg)) as consumed'))
            ->groupBy('feed_inventory_id')
            ->pluck('consumed', 'feed_inventory_id');

        return $items->map(function ($item) use ($transactionData) {
            $consumed7d  = (float) ($transactionData[$item->id] ?? 0);
            $dailyAvg    = $consumed7d > 0 ? $consumed7d / 7 : null;
            $qty         = (float) $item->quantity_kg;
            $daysLeft    = $dailyAvg ? round($qty / $dailyAvg, 1) : null;

            return [
                'id'              => $item->id,
                'feed_type_id'    => $item->feed_type_id,
                'name'            => $item->feedType?->name ?? 'Unknown',
                'category'        => $item->feedType?->category ?? 'other',
                'quantity_kg'     => $qty,
                'reorder_level_kg'=> $item->reorder_level_kg ? (float) $item->reorder_level_kg : null,
                'avg_cost_per_kg' => $item->avg_cost_per_kg ? (float) $item->avg_cost_per_kg : null,
                'days_remaining'  => $daysLeft,
                'daily_avg_kg'    => $dailyAvg ? round($dailyAvg, 1) : null,
                'consumed_7d_kg'  => round($consumed7d, 1),
                'is_low'          => $item->reorder_level_kg && $qty <= (float) $item->reorder_level_kg,
                'is_critical'     => $daysLeft !== null && $daysLeft <= 3,
                'last_restocked'  => $item->last_restocked_on?->toDateString(),
                'storage_location'=> $item->storage_location,
            ];
        });
    }

    /**
     * Feed costing KPIs for a farm.
     */
    public function getFeedKPIs(string $farmId, string $month): array
    {
        [$year, $mon] = array_map('intval', explode('-', $month));

        // Total feed cost for the month (purchases)
        $monthCost = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'purchase')
            ->whereYear('transaction_date', $year)
            ->whereMonth('transaction_date', $mon)
            ->sum('total_cost');

        // Estimated consumption cost for the month
        $consumptionCost = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'consumption')
            ->whereYear('transaction_date', $year)
            ->whereMonth('transaction_date', $mon)
            ->sum('total_cost');

        // Total milk produced this month
        $milkLitres = MilkProduction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereYear('milked_on', $year)
            ->whereMonth('milked_on', $mon)
            ->where('is_withheld', false)
            ->sum('quantity_litres');

        $feedCostPerLitre = $milkLitres > 0 && $consumptionCost > 0
            ? round($consumptionCost / $milkLitres, 2)
            : null;

        // Low stock items count
        $lowStockCount = FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereNotNull('reorder_level_kg')
            ->whereRaw('quantity_kg <= reorder_level_kg')
            ->count();

        // Feed cost breakdown by type (last 30 days)
        $breakdown = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->where('transaction_type', 'purchase')
            ->where('transaction_date', '>=', now()->subDays(30)->toDateString())
            ->select('feed_type_id', DB::raw('SUM(total_cost) as total'))
            ->groupBy('feed_type_id')
            ->with('feedType:id,name')
            ->get()
            ->map(fn ($r) => [
                'feed_type'  => $r->feedType?->name ?? 'Unknown',
                'total_cost' => round((float) $r->total, 2),
            ])
            ->sortByDesc('total_cost')
            ->values()
            ->all();

        return [
            'month_purchase_cost'  => round((float) $monthCost, 2),
            'month_consumption_cost' => round((float) $consumptionCost, 2),
            'feed_cost_per_litre'  => $feedCostPerLitre,
            'month_milk_litres'    => round((float) $milkLitres, 1),
            'low_stock_count'      => $lowStockCount,
            'cost_breakdown_30d'   => $breakdown,
        ];
    }

    /**
     * Monthly feed cost trend (last 6 months).
     */
    public function getMonthlyCostTrend(string $farmId, int $months = 6): array
    {
        $trend = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $cost = FeedInventoryTransaction::withoutGlobalScopes()
                ->where('farm_id', $farmId)
                ->where('transaction_type', 'purchase')
                ->whereYear('transaction_date', $d->year)
                ->whereMonth('transaction_date', $d->month)
                ->sum('total_cost');

            $trend[] = [
                'month' => $d->format('M Y'),
                'year'  => $d->year,
                'mon'   => $d->month,
                'cost'  => round((float) $cost, 2),
            ];
        }
        return $trend;
    }

    /**
     * Transaction history for a single feed item.
     */
    public function getTransactionHistory(string $inventoryId, string $farmId): Collection
    {
        return FeedInventoryTransaction::withoutGlobalScopes()
            ->where('feed_inventory_id', $inventoryId)
            ->where('farm_id', $farmId)
            ->orderByDesc('transaction_date')
            ->limit(50)
            ->get();
    }

    /**
     * Get or create an inventory record for farm + feed type.
     */
    public function getOrCreateInventory(string $farmId, string $feedTypeId): FeedInventory
    {
        return FeedInventory::withoutGlobalScopes()->firstOrCreate(
            ['farm_id' => $farmId, 'feed_type_id' => $feedTypeId],
            ['id' => Str::uuid(), 'farm_id' => $farmId, 'feed_type_id' => $feedTypeId, 'quantity_kg' => 0]
        );
    }
}
