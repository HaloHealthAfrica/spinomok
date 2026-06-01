<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\Expense;
use App\Models\Revenue;
use App\Services\FinanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __construct(private readonly FinanceService $service) {}

    // ─── Finance Dashboard (P&L) ──────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $month  = $request->input('month', now()->format('Y-m'));

        $pl   = $this->service->getMonthlyPL($farmId, $month);
        $kpis = $this->service->getFinanceKPIs($farmId, $month);

        return Inertia::render('finance/Index', array_merge($pl, ['kpis' => $kpis, 'month' => $month]));
    }

    // ─── Expenses ─────────────────────────────────────────────────────────────

    public function expenseCreate(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $animals = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->whereNotIn('status', ['sold', 'dead', 'culled'])
            ->orderBy('name')
            ->get(['id', 'tag_number', 'name', 'status']);

        return Inertia::render('finance/ExpenseForm', [
            'animals'     => $animals,
            'preCategory' => $request->input('category'),
        ]);
    }

    public function expenseStore(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'category'            => ['required', 'in:feed,vet,veterinary,labour,equipment,utilities,land,transport,breeding,other'],
            'expense_date'        => ['required', 'date', 'before_or_equal:today'],
            'description'         => ['required', 'string', 'max:255'],
            'amount'              => ['required', 'numeric', 'min:0.01'],
            'supplier'            => ['nullable', 'string', 'max:120'],
            'receipt_number'      => ['nullable', 'string', 'max:80'],
            'payment_method'      => ['nullable', 'in:cash,mpesa,bank,credit'],
            'reference_animal_id' => ['nullable', 'uuid'],
            'notes'               => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        $expense = Expense::create([
            'id'                  => Str::uuid(),
            'farm_id'             => $farmId,
            ...$request->only(['category', 'expense_date', 'description', 'amount', 'supplier', 'receipt_number', 'payment_method', 'reference_animal_id', 'notes']),
            'is_paid'             => in_array($request->payment_method, ['cash', 'mpesa']) || !$request->payment_method,
            'currency'            => 'KES',
            'created_by'          => $request->user()->id,
            'updated_by'          => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['expense' => $expense, 'message' => 'Expense recorded.'], 201);
        }

        return redirect()->route('finance.index')
            ->with('success', "Expense recorded: KES {$expense->amount} — {$expense->description}.");
    }

    public function expenseUpdate(Request $request, Expense $expense): RedirectResponse
    {
        abort_unless($expense->farm_id === app('current.farm.id'), 403);
        $request->validate([
            'category'    => ['required', 'in:feed,vet,veterinary,labour,equipment,utilities,land,transport,breeding,other'],
            'expense_date'=> ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount'      => ['required', 'numeric', 'min:0.01'],
        ]);

        $expense->update([...$request->only(['category', 'expense_date', 'description', 'amount', 'supplier', 'notes']), 'updated_by' => $request->user()->id]);

        return redirect()->back()->with('success', 'Expense updated.');
    }

    public function expenseDestroy(Expense $expense): RedirectResponse
    {
        abort_unless($expense->farm_id === app('current.farm.id'), 403);
        $expense->delete();
        return redirect()->back()->with('success', 'Expense deleted.');
    }

    // ─── Revenue ──────────────────────────────────────────────────────────────

    public function revenueCreate(Request $request): Response
    {
        $farmId  = app('current.farm.id');
        $animals = Animal::withoutGlobalScopes()
            ->where('farm_id', $farmId)
            ->orderBy('name')
            ->get(['id', 'tag_number', 'name']);

        return Inertia::render('finance/RevenueForm', ['animals' => $animals]);
    }

    public function revenueStore(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'category'            => ['required', 'in:milk_sales,animal_sales,manure_sales,crop_sales,subsidy,other'],
            'revenue_date'        => ['required', 'date', 'before_or_equal:today'],
            'description'         => ['required', 'string', 'max:255'],
            'amount'              => ['required', 'numeric', 'min:0.01'],
            'buyer_name'          => ['nullable', 'string', 'max:120'],
            'receipt_number'      => ['nullable', 'string', 'max:80'],
            'payment_method'      => ['nullable', 'in:cash,mpesa,bank,credit'],
            'reference_animal_id' => ['nullable', 'uuid'],
            'notes'               => ['nullable', 'string', 'max:500'],
        ]);

        $farmId = app('current.farm.id');

        $revenue = Revenue::create([
            'id'       => Str::uuid(),
            'farm_id'  => $farmId,
            ...$request->only(['category', 'revenue_date', 'description', 'amount', 'buyer_name', 'receipt_number', 'payment_method', 'reference_animal_id', 'notes']),
            'is_received' => in_array($request->payment_method, ['cash', 'mpesa']) || !$request->payment_method,
            'currency'    => 'KES',
            'created_by'  => $request->user()->id,
            'updated_by'  => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['revenue' => $revenue, 'message' => 'Revenue recorded.'], 201);
        }

        return redirect()->route('finance.index')
            ->with('success', "Revenue recorded: KES {$revenue->amount} — {$revenue->description}.");
    }

    public function revenueDestroy(Revenue $revenue): RedirectResponse
    {
        abort_unless($revenue->farm_id === app('current.farm.id'), 403);
        $revenue->delete();
        return redirect()->back()->with('success', 'Revenue entry deleted.');
    }

    // ─── Recompute snapshot on-demand ─────────────────────────────────────────

    public function recompute(Request $request): JsonResponse
    {
        $farmId = app('current.farm.id');
        $month  = $request->input('month', now()->format('Y-m'));
        [$year, $mon] = array_map('intval', explode('-', $month));

        $snapshot = $this->service->computeMonthlySnapshot($farmId, $year, $mon);

        return response()->json(['snapshot' => $snapshot, 'message' => 'P&L recomputed.']);
    }
}
