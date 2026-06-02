<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function alerts(Request $request): JsonResponse
    {
        $request->validate([
            'since' => ['nullable', 'date'],
        ]);

        $farmId = app('current.farm.id');
        $since = $request->input('since', '2020-01-01T00:00:00Z');

        $alerts = Alert::where('farm_id', $farmId)
            ->where('updated_at', '>', $since)
            ->orderBy('updated_at')
            ->get()
            ->map(fn (Alert $alert) => [
                'id' => $alert->id,
                'farm_id' => $alert->farm_id,
                'alert_type' => $alert->alert_type,
                'severity' => $alert->severity,
                'status' => $alert->status,
                'title' => $alert->title,
                'message' => $alert->message,
                'reference_table' => $alert->reference_table,
                'reference_id' => $alert->reference_id,
                'animal_id' => $alert->animal_id,
                'due_on' => $alert->due_on?->toDateString(),
                'acknowledged_at' => $alert->acknowledged_at?->toISOString(),
                'resolved_at' => $alert->resolved_at?->toISOString(),
                'auto_resolved' => (bool) $alert->auto_resolved,
                'created_at' => $alert->created_at?->toISOString(),
                'updated_at' => $alert->updated_at?->toISOString(),
            ])
            ->values();

        return response()->json(['data' => $alerts]);
    }
}
