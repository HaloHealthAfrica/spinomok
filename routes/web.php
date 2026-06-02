<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\AnimalController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\MilkProductionController;
use App\Http\Controllers\MilkSaleController;
use App\Http\Controllers\BreedingController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\CalfController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\FormulationController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\SettingsController;
use App\Models\Alert;
use Illuminate\Support\Facades\Route;

// ─── Guest routes ────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::get('/', fn () => redirect('/dashboard'));

// ─── Authenticated routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'set.farm'])->group(function () {

    // Auth
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Animals
    Route::resource('animals', AnimalController::class);

    // ─── Milk Production ─────────────────────────────────────────────────────
    Route::get('/milk-records', [MilkProductionController::class, 'index'])->name('milk.index');
    Route::get('/milk-records/create', [MilkProductionController::class, 'create'])->name('milk.create');
    Route::post('/milk-records', [MilkProductionController::class, 'store'])->name('milk.store');
    Route::get('/api/milk/daily-summary', [MilkProductionController::class, 'dailySummary']);
    Route::get('/api/milk/monthly-summary', [MilkProductionController::class, 'monthlySummary']);
    Route::post('/api/v1/milk-records', [MilkProductionController::class, 'syncStore']);
    Route::get('/api/v1/sync/milk-records', [MilkProductionController::class, 'syncIndex']);
    Route::get('/api/v1/sync/animals', [AnimalController::class, 'syncIndex']);
    Route::get('/api/v1/sync/alerts', [SyncController::class, 'alerts']);

    // ─── Milk Sales ───────────────────────────────────────────────────────────
    Route::get('/milk-sales', [MilkSaleController::class, 'index'])->name('milk-sales.index');
    Route::post('/milk-sales', [MilkSaleController::class, 'store'])->name('milk-sales.store');
    Route::delete('/milk-sales/{milkSale}', [MilkSaleController::class, 'destroy'])->name('milk-sales.destroy');

    // ─── Reports ──────────────────────────────────────────────────────────────
    Route::get('/reports', [DailyReportController::class, 'index'])->name('reports.index');

    // Daily report wizard
    Route::get('/reports/daily/new', [DailyReportController::class, 'create'])->name('reports.daily.create');
    Route::patch('/reports/daily/{report}/step', [DailyReportController::class, 'saveStep'])->name('reports.daily.step');
    Route::post('/reports/daily/{report}/submit', [DailyReportController::class, 'submit'])->name('reports.daily.submit');
    Route::get('/reports/daily/{report}', [DailyReportController::class, 'show'])->name('reports.daily.show');

    // ─── Breeding ─────────────────────────────────────────────────────────────
    Route::get('/breeding', [BreedingController::class, 'index'])->name('breeding.index');

    // Heat detection
    Route::get('/breeding/heat/new', [BreedingController::class, 'createHeat'])->name('breeding.heat.create');
    Route::post('/breeding/heat', [BreedingController::class, 'storeHeat'])->name('breeding.heat.store');

    // AI services
    Route::get('/breeding/ai/new', [BreedingController::class, 'createAI'])->name('breeding.ai.create');
    Route::post('/breeding/ai', [BreedingController::class, 'storeAI'])->name('breeding.ai.store');

    // Pregnancy checks
    Route::get('/breeding/pd/new', [BreedingController::class, 'createPD'])->name('breeding.pd.create');
    Route::post('/breeding/pd', [BreedingController::class, 'storePD'])->name('breeding.pd.store');

    // Calving
    Route::get('/breeding/calving/new', [BreedingController::class, 'createCalving'])->name('breeding.calving.create');
    Route::post('/breeding/calving', [BreedingController::class, 'storeCalving'])->name('breeding.calving.store');

    // Sync programs
    Route::get('/breeding/sync/new', [BreedingController::class, 'createSync'])->name('breeding.sync.create');
    Route::post('/breeding/sync', [BreedingController::class, 'storeSync'])->name('breeding.sync.store');
    Route::patch('/breeding/sync-step/{stepId}/complete', [BreedingController::class, 'completeSyncStep'])->name('breeding.sync.step.complete');

    // Legacy /breeding/new redirect (used by QuickAdd)
    Route::get('/breeding/new', fn () => redirect()->route('breeding.ai.create'));

    // ─── Health Management ────────────────────────────────────────────────────
    Route::get('/health', [HealthController::class, 'index'])->name('health.index');
    Route::get('/health/create', [HealthController::class, 'create'])->name('health.create');
    Route::post('/health', [HealthController::class, 'store'])->name('health.store');
    Route::get('/health/{healthEvent}', [HealthController::class, 'show'])->name('health.show');
    Route::patch('/health/{healthEvent}/close', [HealthController::class, 'close'])->name('health.close');

    // Vaccinations
    Route::get('/health/vaccinations/new', [HealthController::class, 'vaccinationCreate'])->name('health.vaccination.create');
    Route::post('/health/vaccinations', [HealthController::class, 'vaccinationStore'])->name('health.vaccination.store');
    Route::get('/health/vaccinations/schedule', [HealthController::class, 'vaccinationSchedule'])->name('health.vaccination.schedule');

    // Deworming
    Route::get('/health/deworming/new', [HealthController::class, 'dewormingCreate'])->name('health.deworming.create');
    Route::post('/health/deworming', [HealthController::class, 'dewormingStore'])->name('health.deworming.store');

    // ─── Calf Growth & Weight Tracking ───────────────────────────────────────
    Route::get('/calves', [CalfController::class, 'index'])->name('calves.index');
    Route::get('/calves/{animalId}', [CalfController::class, 'show'])->name('calves.show');

    // Weight recording
    Route::get('/weight/record', [CalfController::class, 'createWeight'])->name('weight.create');
    Route::post('/weight', [CalfController::class, 'storeWeight'])->name('weight.store');
    Route::get('/weight/batch', [CalfController::class, 'batchWeight'])->name('weight.batch');

    // Calf feeding
    Route::get('/calf-feeding/new', [CalfController::class, 'createFeeding'])->name('calf-feeding.create');
    Route::post('/calf-feeding', [CalfController::class, 'storeFeeding'])->name('calf-feeding.store');

    // Growth data API (for chart)
    Route::get('/api/calves/{animalId}/growth', [CalfController::class, 'growthData']);

    // ─── Feed Inventory & Costing ─────────────────────────────────────────────
    Route::get('/feed', [FeedController::class, 'index'])->name('feed.index');
    Route::get('/feed/receive', [FeedController::class, 'receiveCreate'])->name('feed.receive.create');
    Route::post('/feed/receive', [FeedController::class, 'receiveStore'])->name('feed.receive.store');
    Route::get('/feed/consume', [FeedController::class, 'consumeCreate'])->name('feed.consume.create');
    Route::post('/feed/consume', [FeedController::class, 'consumeStore'])->name('feed.consume.store');
    Route::post('/feed/adjust', [FeedController::class, 'adjustStore'])->name('feed.adjust.store');
    Route::get('/feed/{inventoryId}', [FeedController::class, 'show'])->name('feed.show');
    Route::patch('/feed/{inventoryId}/threshold', [FeedController::class, 'updateThreshold'])->name('feed.threshold');

    // ─── Feed Formulation & Ration Planning ──────────────────────────────────
    Route::get('/formulation', [FormulationController::class, 'index'])->name('formulation.index');

    // Formula builder
    Route::get('/formulation/formula/new', [FormulationController::class, 'createFormula'])->name('formulation.formula.create');
    Route::post('/formulation/formula', [FormulationController::class, 'storeFormula'])->name('formulation.formula.store');
    Route::get('/formulation/formula/{formulaId}/edit', [FormulationController::class, 'editFormula'])->name('formulation.formula.edit');
    Route::put('/formulation/formula/{formulaId}', [FormulationController::class, 'updateFormula'])->name('formulation.formula.update');
    Route::delete('/formulation/formula/{formulaId}', [FormulationController::class, 'destroyFormula'])->name('formulation.formula.destroy');

    // Live calculation API (called by React on ingredient changes)
    Route::post('/api/formulation/calculate', [FormulationController::class, 'calculate']);

    // Ingredient price management
    Route::post('/api/formulation/price', [FormulationController::class, 'updatePrice']);

    // Ration planner
    Route::get('/formulation/ration/new', [FormulationController::class, 'rationCreate'])->name('formulation.ration.create');
    Route::post('/api/formulation/ration/calculate', [FormulationController::class, 'calculateRation']);
    Route::post('/formulation/ration', [FormulationController::class, 'storeRation'])->name('formulation.ration.store');

    // ─── Finance: Expenses, Revenue, Profitability ───────────────────────────
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');

    // Expenses
    Route::get('/finance/expense/new', [FinanceController::class, 'expenseCreate'])->name('finance.expense.create');
    Route::post('/finance/expense', [FinanceController::class, 'expenseStore'])->name('finance.expense.store');
    Route::put('/finance/expense/{expense}', [FinanceController::class, 'expenseUpdate'])->name('finance.expense.update');
    Route::delete('/finance/expense/{expense}', [FinanceController::class, 'expenseDestroy'])->name('finance.expense.destroy');

    // Revenue
    Route::get('/finance/revenue/new', [FinanceController::class, 'revenueCreate'])->name('finance.revenue.create');
    Route::post('/finance/revenue', [FinanceController::class, 'revenueStore'])->name('finance.revenue.store');
    Route::delete('/finance/revenue/{revenue}', [FinanceController::class, 'revenueDestroy'])->name('finance.revenue.destroy');

    // Recompute P&L snapshot
    Route::post('/api/finance/recompute', [FinanceController::class, 'recompute']);

    // ─── Analytics & Reports ──────────────────────────────────────────────────
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics.index');

    // API endpoints for live chart data
    Route::get('/api/analytics/milk-trend', [AnalyticsController::class, 'milkTrend']);
    Route::get('/api/analytics/per-cow', [AnalyticsController::class, 'perCow']);
    Route::get('/api/analytics/breeding', [AnalyticsController::class, 'breeding']);
    Route::get('/api/analytics/health', [AnalyticsController::class, 'health']);

    // WhatsApp report previews
    Route::get('/analytics/whatsapp/daily', [AnalyticsController::class, 'whatsappDaily'])->name('analytics.whatsapp.daily');
    Route::get('/analytics/whatsapp/weekly', [AnalyticsController::class, 'whatsappWeekly'])->name('analytics.whatsapp.weekly');

    // ─── Secondary pages ──────────────────────────────────────────────────────
    Route::get('/more', fn () => inertia('more/Index'))->name('more');
    Route::get('/alerts', function () {
        $farmId = app('current.farm.id');

        return inertia('alerts/Index', [
            'alerts' => Alert::where('farm_id', $farmId)
                ->where('status', 'pending')
                ->with('animal:id,tag_number,name')
                ->orderByRaw("case severity when 'critical' then 0 when 'warning' then 1 else 2 end")
                ->orderBy('due_on')
                ->get(),
        ]);
    })->name('alerts.index');
    Route::get('/settings/sync', fn () => inertia('settings/Sync'))->name('settings.sync');
    Route::get('/settings/farm', fn () => inertia('settings/Farm'))->name('settings.farm');
    Route::patch('/settings/farm', [SettingsController::class, 'updateFarm'])->name('settings.farm.update');
    Route::get('/profile', fn () => inertia('settings/Profile'))->name('profile');
    Route::patch('/profile', [SettingsController::class, 'updateProfile'])->name('profile.update');
});
