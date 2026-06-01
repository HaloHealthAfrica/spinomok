<?php

namespace App\Http\Controllers;

use App\Models\MilkBuyer;
use App\Models\MilkSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MilkSaleController extends Controller
{
    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');

        $date  = $request->input('date', now()->toDateString());
        $month = $request->input('month', now()->format('Y-m'));

        [$year, $mon] = array_map('intval', explode('-', $month));

        // Daily sales
        $dailySales = MilkSale::where('farm_id', $farmId)
            ->whereDate('sale_date', $date)
            ->with('buyer:id,name,buyer_type')
            ->get();

        // Monthly summary by buyer
        $monthlySummary = MilkSale::where('farm_id', $farmId)
            ->whereYear('sale_date', $year)
            ->whereMonth('sale_date', $mon)
            ->selectRaw('milk_buyer_id, SUM(quantity_litres) as litres, SUM(total_amount) as revenue')
            ->groupBy('milk_buyer_id')
            ->with('buyer:id,name,buyer_type')
            ->get();

        $buyers = MilkBuyer::where('farm_id', $farmId)->active()->get();

        return Inertia::render('milk/Sales', [
            'date'            => $date,
            'month'           => $month,
            'daily_sales'     => $dailySales,
            'monthly_summary' => $monthlySummary,
            'monthly_total'   => $monthlySummary->sum('revenue'),
            'buyers'          => $buyers,
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'milk_buyer_id'   => ['required', 'uuid'],
            'sale_date'       => ['required', 'date'],
            'quantity_litres' => ['required', 'numeric', 'min:0.1'],
            'price_per_litre' => ['required', 'numeric', 'min:0.01'],
            'payment_method'  => ['nullable', 'in:cash,mpesa,bank,credit'],
            'receipt_number'  => ['nullable', 'string', 'max:80'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        // Verify buyer belongs to farm
        $buyer = MilkBuyer::where('farm_id', $farmId)->findOrFail($request->milk_buyer_id);

        $sale = MilkSale::create([
            'id'              => Str::uuid(),
            'farm_id'         => $farmId,
            'milk_buyer_id'   => $buyer->id,
            'sale_date'       => $request->sale_date,
            'quantity_litres' => $request->quantity_litres,
            'price_per_litre' => $request->price_per_litre,
            'total_amount'    => $request->quantity_litres * $request->price_per_litre,
            'payment_method'  => $request->payment_method ?? 'cash',
            'is_paid'         => in_array($request->payment_method, ['cash', 'mpesa']),
            'receipt_number'  => $request->receipt_number,
            'notes'           => $request->notes,
            'created_by'      => $request->user()->id,
            'updated_by'      => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Sale recorded.', 'sale' => $sale->load('buyer')], 201);
        }

        return redirect()->back()->with('success', 'Milk sale recorded.');
    }

    public function destroy(MilkSale $milkSale): RedirectResponse
    {
        abort_unless($milkSale->farm_id === app('current.farm.id'), 403);
        $milkSale->delete();
        return redirect()->back()->with('success', 'Sale record deleted.');
    }
}
