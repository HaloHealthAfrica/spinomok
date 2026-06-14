<?php

namespace App\Observers;

use App\Models\CalfRecord;
use Carbon\Carbon;

class CalfRecordObserver
{
    public function created(CalfRecord $calf): void
    {
        $dob = Carbon::parse($calf->dob);

        // ── Default practices ──────────────────────────────────────────────────
        $practices = [
            ['practice_name' => 'Navel iodine dip',        'due_age_label' => 'At birth'],
            ['practice_name' => 'Colostrum within 6 hours', 'due_age_label' => 'Day 1'],
            ['practice_name' => 'Ear tagging',              'due_age_label' => 'At birth'],
            ['practice_name' => 'Extra teat removal',       'due_age_label' => '2–3 weeks'],
            ['practice_name' => 'Disbudding',               'due_age_label' => '2–3 months'],
            ['practice_name' => 'First deworming',          'due_age_label' => 'When grazing starts'],
            ['practice_name' => 'First ECF vaccination',    'due_age_label' => '1 month'],
        ];

        foreach ($practices as $practice) {
            $calf->practices()->create($practice);
        }

        // ── Default vaccinations (due dates from DOB) ──────────────────────────
        $vaccinations = [
            ['vaccine_name' => 'ECF (Theileriosis)',   'due_date' => $dob->copy()->addMonths(1)],
            ['vaccine_name' => 'Lumpy Skin Disease',   'due_date' => $dob->copy()->addMonths(3)],
            ['vaccine_name' => 'FMD First Dose',       'due_date' => $dob->copy()->addMonths(4)],
            ['vaccine_name' => 'FMD Booster',          'due_date' => $dob->copy()->addMonths(5)],
            ['vaccine_name' => 'Blanthax (BQ & Anthrax)', 'due_date' => $dob->copy()->addMonths(6)],
            ['vaccine_name' => 'Rabies',               'due_date' => $dob->copy()->addMonths(3)],
        ];

        // Brucellosis S19 — females only
        if (strtolower($calf->sex) === 'female') {
            $vaccinations[] = ['vaccine_name' => 'Brucellosis S19', 'due_date' => $dob->copy()->addMonths(4)];
        }

        foreach ($vaccinations as $vax) {
            $calf->vaccinations()->create($vax);
        }
    }
}
