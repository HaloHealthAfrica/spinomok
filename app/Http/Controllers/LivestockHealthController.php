<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class LivestockHealthController extends Controller
{
    public function getRecommendations(Request $request)
    {
        $request->validate([
            'condition'           => 'required|string',
            'selected_signs'      => 'required|array',
            'severity'            => 'required|in:Mild,Moderate,Severe',
            'additional_symptoms' => 'nullable|string',
        ]);

        $userMessage = $this->buildUserMessage($request);

        $response = Http::withHeaders([
            'x-api-key'         => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-sonnet-4-6',
            'max_tokens' => 1024,
            'system'     => $this->getSystemPrompt(),
            'messages'   => [
                ['role' => 'user', 'content' => $userMessage],
            ],
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'Could not get recommendations. Please try again.'], 500);
        }

        $content = $response->json('content.0.text');

        $recommendation = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'Invalid response from AI. Please try again.'], 500);
        }

        return response()->json($recommendation);
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

        $message .= "\nPlease provide treatment recommendations in the required JSON format.";

        return $message;
    }

    private function getSystemPrompt(): string
    {
        return file_get_contents(resource_path('prompts/livestock_health.txt'));
    }
}
