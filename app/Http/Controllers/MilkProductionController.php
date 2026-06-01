<?php

namespace App\Http\Controllers;

use App\Models\MilkProduction;
use App\Services\MilkProductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MilkProductionController extends Controller
{
    public function __construct(private readonly MilkProductionService $service) {}

    /**
     * Milk production history / list screen.
     */
    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $date   = $request->input('date', now()->toDateString());

        $summary       = $this->service->getDailySummary($farmId, $date);
        $animalRecords = $this->service->getDailyAnimalRecords($farmId, $date);
        $trend         = $this->service->getSevenDayTrend($farmId);

        return Inertia::render('milk/Index', [
            'date'          => $date,
            'summary'       => $summary,
            'animal_records'=> $animalRecords,
            'trend'         => $trend,
        ]);
    }

    /**
     * Milk entry form (offline-capable quick entry).
     */
    public function create(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $date   = $request->input('date', now()->toDateString());

        $animalRecords = $this->service->getDailyAnimalRecords($farmId, $date);

        return Inertia::render('milk/Create', [
            'date'          => $date,
            'animal_records'=> $animalRecords,
        ]);
    }

    /**
     * Upsert a single milk session. Accepts batch array.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'date'           => ['required', 'date'],
            'entries'        => ['required', 'array', 'min:1'],
            'entries.*.animal_id' => ['required', 'uuid'],
            'entries.*.session'   => ['required', 'in:morning,midday,evening'],
            'entries.*.litres'    => ['required', 'numeric', 'min:0', 'max:60'],
        ]);

        $farmId = app('current.farm.id');
        $userId = $request->user()->id;
        $date   = $request->input('date');

        foreach ($request->input('entries') as $entry) {
            // Verify animal belongs to farm (without relying on scope for this check)
            $belongs = \App\Models\Animal::withoutGlobalScopes()
                ->where('id', $entry['animal_id'])
                ->where('farm_id', $farmId)
                ->exists();

            if (!$belongs) continue;

            $this->service->upsertSession(
                $farmId,
                $entry['animal_id'],
                $date,
                $entry['session'],
                (float) $entry['litres'],
                $userId,
            );
        }

        if ($request->wantsJson()) {
            $summary = $this->service->getDailySummary($farmId, $date);
            return response()->json(['message' => 'Milk records saved.', 'summary' => $summary]);
        }

        return redirect()
            ->route('milk.index', ['date' => $date])
            ->with('success', 'Milk records saved successfully.');
    }

    /**
     * Daily summary as JSON (for dashboard and offline sync).
     */
    public function dailySummary(Request $request): JsonResponse
    {
        $farmId = app('current.farm.id');
        $date   = $request->input('date', now()->toDateString());

        return response()->json(
            $this->service->getDailySummary($farmId, $date)
        );
    }

    /**
     * Monthly summary.
     */
    public function monthlySummary(Request $request): JsonResponse
    {
        $farmId = app('current.farm.id');
        $year   = (int) $request->input('year', now()->year);
        $month  = (int) $request->input('month', now()->month);

        return response()->json(
            $this->service->getMonthlySummary($farmId, $year, $month)
        );
    }
}
