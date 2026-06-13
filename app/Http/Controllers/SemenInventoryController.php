<?php

namespace App\Http\Controllers;

use App\Models\SemenInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SemenInventoryController extends Controller
{
    public function index(): Response
    {
        $farmId = app('current.farm.id');

        $batches = SemenInventory::where('farm_id', $farmId)
            ->orderByDesc('received_on')
            ->get();

        $totalStraws    = $batches->sum('straws_remaining');
        $lowStockCount  = $batches->where('straws_remaining', '<=', 5)->where('straws_remaining', '>', 0)->count();
        $depletedCount  = $batches->where('straws_remaining', 0)->count();

        return Inertia::render('semen/Index', compact('batches', 'totalStraws', 'lowStockCount', 'depletedCount'));
    }

    public function create(): Response
    {
        return Inertia::render('semen/CreateForm');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'bull_name'       => ['required', 'string', 'max:120'],
            'batch_number'    => ['nullable', 'string', 'max:80'],
            'semen_type'      => ['required', 'in:conventional,sexed'],
            'cost_per_straw'  => ['nullable', 'numeric', 'min:0'],
            'inseminator'     => ['nullable', 'string', 'max:120'],
            'straws_received' => ['required', 'integer', 'min:1', 'max:5000'],
            'received_on'     => ['required', 'date', 'before_or_equal:today'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        SemenInventory::create([
            'id'              => Str::uuid(),
            'farm_id'         => $farmId,
            'bull_name'       => $request->bull_name,
            'batch_number'    => $request->batch_number,
            'semen_type'      => $request->semen_type,
            'cost_per_straw'  => $request->cost_per_straw,
            'inseminator'     => $request->inseminator,
            'straws_received' => $request->straws_received,
            'straws_remaining'=> $request->straws_received,
            'received_on'     => $request->received_on,
            'notes'           => $request->notes,
            'created_by'      => $request->user()->id,
        ]);

        $type = ucfirst($request->semen_type);
        return redirect()->route('semen.index')
            ->with('success', "{$type} semen — {$request->bull_name} added ({$request->straws_received} straws).");
    }

    public function destroy(string $id): RedirectResponse
    {
        $farmId = app('current.farm.id');

        $batch = SemenInventory::where('farm_id', $farmId)->findOrFail($id);

        abort_if(
            $batch->aiServices()->exists(),
            422,
            'Cannot delete a batch that has been used in AI services.'
        );

        $batch->delete();

        return redirect()->route('semen.index')->with('success', 'Semen batch removed.');
    }
}
