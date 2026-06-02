<?php

namespace App\Http\Controllers;

use App\Models\MilkProduction;
use App\Services\MilkProductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        [$farmId, $date] = $this->storeValidatedEntries($request, $request->all());

        if ($request->wantsJson()) {
            $summary = $this->service->getDailySummary($farmId, $date);
            return response()->json(['message' => 'Milk records saved.', 'summary' => $summary]);
        }

        return redirect()
            ->route('milk.index', ['date' => $date])
            ->with('success', 'Milk records saved successfully.');
    }

    /**
     * Same-origin JSON endpoint used by the offline sync queue.
     */
    public function syncStore(Request $request): JsonResponse
    {
        $payload = $request->has('entries')
            ? $request->all()
            : [
                'date' => $request->input('date'),
                'entries' => [[
                    'animal_id' => $request->input('animal_id'),
                    'session' => $request->input('session'),
                    'litres' => $request->input('litres'),
                ]],
            ];

        [$farmId, $date] = $this->storeValidatedEntries($request, $payload);

        return response()->json([
            'message' => 'Milk records synced.',
            'summary' => $this->service->getDailySummary($farmId, $date),
        ], 201);
    }

    /**
     * Delta feed used by the offline client when reconnecting.
     */
    public function syncIndex(Request $request): JsonResponse
    {
        $request->validate([
            'since' => ['nullable', 'date'],
        ]);

        $farmId = app('current.farm.id');
        $since = $request->input('since', '2020-01-01T00:00:00Z');

        $records = MilkProduction::where('farm_id', $farmId)
            ->where('updated_at', '>', $since)
            ->orderBy('updated_at')
            ->get()
            ->map(fn (MilkProduction $record) => [
                'id' => $record->id,
                'farm_id' => $record->farm_id,
                'animal_id' => $record->animal_id,
                'milked_on' => $record->milked_on?->toDateString(),
                'session' => $record->session,
                'quantity_litres' => (float) $record->quantity_litres,
                'fat_percentage' => $record->fat_percentage !== null ? (float) $record->fat_percentage : null,
                'somatic_cell_count' => $record->somatic_cell_count,
                'milked_by' => $record->milked_by,
                'notes' => $record->notes,
                'created_at' => $record->created_at?->toISOString(),
                'updated_at' => $record->updated_at?->toISOString(),
            ])
            ->values();

        return response()->json(['data' => $records]);
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

    private function storeValidatedEntries(Request $request, array $payload): array
    {
        validator($payload, [
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.animal_id' => ['required', 'uuid'],
            'entries.*.session' => ['required', 'in:morning,midday,evening'],
            'entries.*.litres' => ['required', 'numeric', 'min:0', 'max:60'],
        ])->validate();

        $farmId = app('current.farm.id');
        $userId = $request->user()->id;
        $date = $payload['date'];

        foreach ($payload['entries'] as $entry) {
            $belongs = \App\Models\Animal::withoutGlobalScopes()
                ->where('id', $entry['animal_id'])
                ->where('farm_id', $farmId)
                ->exists();

            if (! $belongs) {
                continue;
            }

            $this->service->upsertSession(
                $farmId,
                $entry['animal_id'],
                $date,
                $entry['session'],
                (float) $entry['litres'],
                $userId,
            );
        }

        return [$farmId, $date];
    }
}
