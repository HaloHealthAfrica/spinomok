<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LivestockHealthController extends Controller
{
    public function getRecommendations(Request $request)
    {
        $request->validate([
            'condition'            => 'required|string',
            'selected_signs'       => 'required|array',
            'severity'             => 'required|in:Mild,Moderate,Severe',
            'additional_symptoms'  => 'nullable|string',
            'available_medicines'  => 'nullable|array',
            'available_medicines.*.name'                    => 'required|string',
            'available_medicines.*.category'                => 'nullable|string',
            'available_medicines.*.withdrawal_period_days'  => 'nullable|integer',
        ]);

        $userMessage = $this->buildUserMessage($request);

        try {
        $response = Http::timeout(30)->withHeaders([
            'x-api-key'         => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-sonnet-4-6',
            'max_tokens' => 2048,
            'system'     => $this->getSystemPrompt(),
            'messages'   => [
                ['role' => 'user', 'content' => $userMessage],
            ],
        ]);

        if ($response->failed()) {
            Log::error('Anthropic API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
                'key_set' => !empty(config('services.anthropic.key')),
            ]);
            $apiError = $response->json('error.message') ?? 'Could not get recommendations. Please try again.';
            return response()->json(['error' => $apiError], 502);
        }

        $content = $response->json('content.0.text');

        // Strip markdown code fences if the model wraps its JSON response
        $content = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $content = preg_replace('/\s*```$/', '', $content);

        $recommendation = json_decode(trim($content), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Anthropic JSON parse error', ['raw' => $content]);
            return response()->json(['error' => 'Invalid response from AI. Please try again.'], 500);
        }

        return response()->json($recommendation);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Anthropic connection error', ['message' => $e->getMessage()]);
            return response()->json(['error' => 'Connection to AI service failed. Please try again.'], 502);
        }
    }

    private function buildUserMessage(Request $request): string
    {
        $signs = implode(', ', $request->selected_signs);

        $message = "Condition: {$request->condition}\n";
        $message .= "Selected signs: {$signs}\n";
        $message .= "Severity: {$request->severity}\n";

        if ($request->filled('additional_symptoms')) {
            $message .= "Additional symptoms observed: {$request->additional_symptoms}\n";
        }

        // Inject the farm's actual medicine catalog so AI only recommends from it
        $meds = $request->input('available_medicines', []);
        if (!empty($meds)) {
            $message .= "\nAvailable medicines in this farm's system (ONLY recommend from this list):\n";
            foreach ($meds as $med) {
                $wd = isset($med['withdrawal_period_days']) && $med['withdrawal_period_days'] > 0
                    ? " [Withdrawal: {$med['withdrawal_period_days']} days]"
                    : ' [No withdrawal]';
                $cat = isset($med['category']) ? " ({$med['category']})" : '';
                $message .= "- {$med['name']}{$cat}{$wd}\n";
            }
        }

        $message .= "\nPlease provide treatment recommendations in the required JSON format.";

        return $message;
    }

    private function getSystemPrompt(): string
    {
        return file_get_contents(resource_path('prompts/livestock_health.txt'));
    }
}
