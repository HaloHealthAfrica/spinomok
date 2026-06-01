<?php

namespace App\Http\Controllers;

use App\Models\FeedInventory;
use App\Models\FeedInventoryTransaction;
use App\Models\FeedType;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeedController extends Controller
{
    public function __construct(private readonly FeedService $service) {}

    // ─── Feed Inventory Dashboard ─────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $month  = $request->input('month', now()->format('Y-m'));

        $inventory  = $this->service->getInventorySummary($farmId);
        $kpis       = $this->service->getFeedKPIs($farmId, $month);
        $trend      = $this->service->getMonthlyCostTrend($farmId);
        $feedTypes  = FeedType::where('is_active', true)->orderBy('category')->orderBy('name')
                              ->get(['id', 'name', 'category', 'crude_protein_percent', 'metabolizable_energy', 'default_unit']);

        // Recent transactions (last 10)
        $recentTransactions = FeedInventoryTransaction::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->with('feedType:id,name')
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('feed/Index', compact(
            'inventory', 'kpis', 'trend', 'feedTypes', 'recentTransactions', 'month',
        ));
    }

    // ─── Receive Stock (Purchase / Harvest) ───────────────────────────────────

    public function receiveCreate(): Response
    {
        $feedTypes = FeedType::where('is_active', true)->orderBy('category')->orderBy('name')
                             ->get(['id', 'name', 'category', 'default_unit']);

        $farmId = app('current.farm.id');
        $existing = FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->with('feedType:id,name')
            ->get(['id', 'feed_type_id', 'avg_cost_per_kg'])
            ->keyBy('feed_type_id');

        return Inertia::render('feed/ReceiveForm', compact('feedTypes', 'existing'));
    }

    public function receiveStore(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'feed_type_id'    => ['required', 'uuid', 'exists:feed_types,id'],
            'quantity_kg'     => ['required', 'numeric', 'min:0.001'],
            'unit_cost'       => ['nullable', 'numeric', 'min:0'],
            'transaction_date'=> ['required', 'date', 'before_or_equal:today'],
            'transaction_type'=> ['required', 'in:purchase,harvest'],
            'supplier'        => ['nullable', 'string', 'max:120'],
            'reference_number'=> ['nullable', 'string', 'max:80'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        $txn = $this->service->receiveStock([
            ...$request->only(['feed_type_id', 'quantity_kg', 'unit_cost', 'transaction_date', 'transaction_type', 'supplier', 'reference_number', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        if ($request->wantsJson()) {
            return response()->json(['transaction' => $txn, 'message' => 'Stock received.'], 201);
        }

        $feedType = FeedType::find($request->feed_type_id);
        return redirect()->route('feed.index')
            ->with('success', "Stock received: {$request->quantity_kg} kg of {$feedType?->name}.");
    }

    // ─── Record Consumption ───────────────────────────────────────────────────

    public function consumeCreate(): Response
    {
        $farmId   = app('current.farm.id');
        $feedTypes = FeedType::where('is_active', true)->orderBy('category')->orderBy('name')
                             ->get(['id', 'name', 'category', 'default_unit']);

        $inventory = FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->with('feedType:id,name,default_unit')
            ->where('quantity_kg', '>', 0)
            ->get();

        return Inertia::render('feed/ConsumeForm', compact('feedTypes', 'inventory'));
    }

    public function consumeStore(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'entries'                      => ['required', 'array', 'min:1'],
            'entries.*.feed_type_id'       => ['required', 'uuid', 'exists:feed_types,id'],
            'entries.*.quantity_kg'        => ['required', 'numeric', 'min:0.001'],
            'entries.*.animal_group'       => ['nullable', 'string'],
            'entries.*.transaction_date'   => ['required', 'date', 'before_or_equal:today'],
            'entries.*.notes'              => ['nullable', 'string'],
        ]);

        $farmId  = app('current.farm.id');
        $userId  = $request->user()->id;
        $saved   = 0;

        foreach ($request->input('entries') as $entry) {
            $this->service->recordConsumption([
                ...$entry,
                'farm_id' => $farmId,
            ], $userId);
            $saved++;
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => "{$saved} consumption record(s) saved.", 'count' => $saved], 201);
        }

        return redirect()->route('feed.index')
            ->with('success', "Feed consumption recorded for {$saved} item(s).");
    }

    // ─── Manual Adjustment ────────────────────────────────────────────────────

    public function adjustStore(Request $request): RedirectResponse
    {
        $request->validate([
            'feed_type_id'    => ['required', 'uuid', 'exists:feed_types,id'],
            'quantity_kg'     => ['required', 'numeric'],
            'transaction_type'=> ['required', 'in:adjustment,wastage'],
            'transaction_date'=> ['required', 'date'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        $this->service->adjustStock([
            ...$request->only(['feed_type_id', 'quantity_kg', 'transaction_type', 'transaction_date', 'notes']),
            'farm_id' => $farmId,
        ], $request->user()->id);

        return redirect()->route('feed.index')->with('success', 'Stock adjusted.');
    }

    // ─── Inventory item detail + history ──────────────────────────────────────

    public function show(string $inventoryId): Response
    {
        $farmId    = app('current.farm.id');
        $inventory = FeedInventory::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->with('feedType')
            ->findOrFail($inventoryId);

        $history = $this->service->getTransactionHistory($inventoryId, $farmId);

        return Inertia::render('feed/Show', compact('inventory', 'history'));
    }

    // ─── Update reorder threshold ─────────────────────────────────────────────

    public function updateThreshold(Request $request, string $inventoryId): RedirectResponse
    {
        $request->validate(['reorder_level_kg' => ['nullable', 'numeric', 'min:0']]);

        FeedInventory::withoutGlobalScopes()
            ->where('farm_id', app('current.farm.id'))
            ->where('id', $inventoryId)
            ->update(['reorder_level_kg' => $request->reorder_level_kg]);

        return redirect()->back()->with('success', 'Reorder threshold updated.');
    }
}
