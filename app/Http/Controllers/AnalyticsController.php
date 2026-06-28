<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $service) {}

    // ─── Analytics Dashboard ──────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $period = $request->input('period', '30'); // days

        $milkTrend    = $this->service->getMilkTrend($farmId, (int) $period);
        $herd         = $this->service->getHerdSummary($farmId);
        $breeding     = $this->service->getBreedingAnalytics($farmId);
        $health       = $this->service->getHealthAnalytics($farmId);
        $milkIntelligence = $this->service->getAdvancedMilkAnalytics($farmId);
        $mastitis     = $this->service->getMastitisAnalytics($farmId);
        $bcs          = $this->service->getBcsAnalytics($farmId);
        $combinedRisk = $this->service->getCombinedHealthRisk($farmId);
        $feed         = $this->service->getFeedAnalytics($farmId);
        $financial    = $this->service->getFinancialAnalytics($farmId);

        $from = now()->subDays((int) $period - 1)->toDateString();
        $to   = now()->toDateString();
        $perCow = $this->service->getPerCowProduction($farmId, $from, $to);

        return Inertia::render('analytics/Index', compact(
            'milkTrend', 'herd', 'breeding', 'health', 'milkIntelligence', 'mastitis', 'bcs', 'combinedRisk',
            'feed', 'financial', 'perCow', 'period',
        ));
    }

    // ─── API endpoints for live chart data ───────────────────────────────────

    public function milkTrend(Request $request): JsonResponse
    {
        $farmId = app('current.farm.id');
        $days   = (int) $request->input('days', 30);
        return response()->json($this->service->getMilkTrend($farmId, $days));
    }

    public function perCow(Request $request): JsonResponse
    {
        $farmId = app('current.farm.id');
        $from   = $request->input('from', now()->subDays(29)->toDateString());
        $to     = $request->input('to', now()->toDateString());
        return response()->json($this->service->getPerCowProduction($farmId, $from, $to));
    }

    public function breeding(): JsonResponse
    {
        return response()->json($this->service->getBreedingAnalytics(app('current.farm.id')));
    }

    public function health(): JsonResponse
    {
        return response()->json($this->service->getHealthAnalytics(app('current.farm.id')));
    }

    // ─── WhatsApp Reports ─────────────────────────────────────────────────────

    public function whatsappDaily(Request $request): Response
    {
        $farmId = app('current.farm.id');
        $date   = $request->input('date', now()->toDateString());

        $data    = $this->service->getDailyReportData($farmId, $date);
        $message = $this->service->buildWhatsAppDailyMessage($data);
        $waLink  = 'https://wa.me/?text=' . rawurlencode($message);

        return Inertia::render('analytics/WhatsappPreview', [
            'message'    => $message,
            'wa_link'    => $waLink,
            'report_data'=> $data,
            'date'       => $date,
            'type'       => 'daily',
        ]);
    }

    public function whatsappWeekly(): Response
    {
        $farmId  = app('current.farm.id');
        $message = $this->service->buildWhatsAppWeeklySummary($farmId);
        $waLink  = 'https://wa.me/?text=' . rawurlencode($message);

        return Inertia::render('analytics/WhatsappPreview', [
            'message' => $message,
            'wa_link' => $waLink,
            'type'    => 'weekly',
            'date'    => now()->toDateString(),
        ]);
    }
}
