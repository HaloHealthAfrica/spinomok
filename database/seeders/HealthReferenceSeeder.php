<?php

namespace Database\Seeders;

use App\Models\DiseaseType;
use App\Models\MedicationType;
use App\Models\VaccineType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class HealthReferenceSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Disease Types ────────────────────────────────────────────────────
        $diseases = [
            ['name' => 'East Coast Fever (ECF)', 'category' => 'Infectious', 'common_signs' => 'Swollen lymph nodes, high fever (40–42°C), nasal discharge, labored breathing', 'is_notifiable' => true],
            ['name' => 'Mastitis (Clinical)', 'category' => 'Infectious', 'common_signs' => 'Swollen/hot quarter, abnormal milk (clots, watery, blood-tinged), cow flinching at milking'],
            ['name' => 'Mastitis (Subclinical)', 'category' => 'Infectious', 'common_signs' => 'No visible signs, high SCC, detected by CMT test'],
            ['name' => 'Foot-and-Mouth Disease (FMD)', 'category' => 'Infectious', 'common_signs' => 'Blisters on tongue/feet, severe lameness, drooling, milk drop', 'is_notifiable' => true],
            ['name' => 'Lumpy Skin Disease (LSD)', 'category' => 'Infectious', 'common_signs' => 'Skin nodules 2–5cm, fever, nasal/eye discharge, reduced milk', 'is_notifiable' => true],
            ['name' => 'Milk Fever (Hypocalcemia)', 'category' => 'Metabolic', 'common_signs' => 'Within 72h of calving: staggers, sternal recumbency, cold extremities, bloat'],
            ['name' => 'Bloat (Frothy)', 'category' => 'Metabolic', 'common_signs' => 'Rapid left flank distension, labored breathing'],
            ['name' => 'Brucellosis', 'category' => 'Infectious', 'common_signs' => 'Late-term abortion, retained placenta, low conception rates', 'is_notifiable' => true],
            ['name' => 'Foot Rot', 'category' => 'Infectious', 'common_signs' => 'Sudden severe lameness, swelling between toes, foul odor'],
            ['name' => 'Pneumonia (BRD)', 'category' => 'Infectious', 'common_signs' => 'Nasal discharge, cough, fever, labored breathing, reduced growth'],
            ['name' => 'Internal Parasites (Worms)', 'category' => 'Parasitic', 'common_signs' => 'Weight loss, bottle jaw, diarrhea, poor BCS, reduced milk'],
            ['name' => 'Tick Infestation', 'category' => 'Parasitic', 'common_signs' => 'Heavy tick burden, irritation, anemia, vector for ECF/Anaplasmosis'],
            ['name' => 'Ketosis', 'category' => 'Metabolic', 'common_signs' => 'Early lactation: off-feed, weight loss, sweet/ketone smell on breath, reduced milk'],
            ['name' => 'Retained Placenta', 'category' => 'Reproductive', 'common_signs' => 'Placenta not expelled >12h post-calving, foul discharge'],
            ['name' => 'Diarrhea (Scours — Calf)', 'category' => 'Infectious', 'common_signs' => 'Watery diarrhea in calves, dehydration, weakness'],
            ['name' => 'Injury / Wound', 'category' => 'Other', 'common_signs' => 'Visible wound, swelling, lameness'],
            ['name' => 'Other / Undiagnosed', 'category' => 'Other', 'common_signs' => null],
        ];

        foreach ($diseases as $d) {
            DiseaseType::firstOrCreate(['name' => $d['name']], [
                'id'            => Str::uuid(),
                'category'      => $d['category'],
                'common_signs'  => $d['common_signs'] ?? null,
                'is_notifiable' => $d['is_notifiable'] ?? false,
            ]);
        }

        // ─── Medication Types ─────────────────────────────────────────────────
        $meds = [
            // ECF
            ['name' => 'Buparvaquone (Butalex)', 'active_ingredient' => 'Buparvaquone', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 0],
            // Antibiotics
            ['name' => 'Oxytetracycline (LA-200)', 'active_ingredient' => 'Oxytetracycline', 'category' => 'Antibiotic', 'unit' => 'ml', 'withdrawal' => 5],
            ['name' => 'Penicillin-Streptomycin (Penstrep)', 'active_ingredient' => 'Penicillin + Streptomycin', 'category' => 'Antibiotic', 'unit' => 'ml', 'withdrawal' => 4],
            ['name' => 'Enrofloxacin (Baytril)', 'active_ingredient' => 'Enrofloxacin', 'category' => 'Antibiotic', 'unit' => 'ml', 'withdrawal' => 5],
            ['name' => 'Florfenicol (Nuflor)', 'active_ingredient' => 'Florfenicol', 'category' => 'Antibiotic', 'unit' => 'ml', 'withdrawal' => 4],
            ['name' => 'Tylosin (Tylan)', 'active_ingredient' => 'Tylosin', 'category' => 'Antibiotic', 'unit' => 'ml', 'withdrawal' => 4],
            // Intramammary
            ['name' => 'Cloxacillin Intramammary (Masticlox)', 'active_ingredient' => 'Cloxacillin', 'category' => 'Antibiotic', 'unit' => 'tube', 'withdrawal' => 5],
            ['name' => 'Dry Cow Therapy (Bovaclox DC)', 'active_ingredient' => 'Cloxacillin + Ampicillin', 'category' => 'Antibiotic', 'unit' => 'tube', 'withdrawal' => 0],
            // NSAIDs / Anti-inflammatories
            ['name' => 'Flunixin Meglumine (Finadyne)', 'active_ingredient' => 'Flunixin', 'category' => 'NSAID', 'unit' => 'ml', 'withdrawal' => 4],
            ['name' => 'Dexamethasone', 'active_ingredient' => 'Dexamethasone', 'category' => 'Corticosteroid', 'unit' => 'ml', 'withdrawal' => 3],
            // Calcium / Metabolic
            ['name' => 'Calcium Borogluconate (40%)', 'active_ingredient' => 'Calcium Borogluconate', 'category' => 'Mineral', 'unit' => 'ml', 'withdrawal' => 0],
            // Dewormers
            ['name' => 'Albendazole (Valbazen)', 'active_ingredient' => 'Albendazole', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 14],
            ['name' => 'Fenbendazole (Panacur)', 'active_ingredient' => 'Fenbendazole', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 0],
            ['name' => 'Levamisole', 'active_ingredient' => 'Levamisole', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 7],
            ['name' => 'Ivermectin (Ivomec)', 'active_ingredient' => 'Ivermectin', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 28],
            ['name' => 'Triclabendazole (Fasinex)', 'active_ingredient' => 'Triclabendazole', 'category' => 'Antiparasitic', 'unit' => 'ml', 'withdrawal' => 28],
            // Acaricides
            ['name' => 'Amitraz (Triatix)', 'active_ingredient' => 'Amitraz', 'category' => 'Acaricide', 'unit' => 'ml', 'withdrawal' => 1],
            ['name' => 'Cypermethrin (Bayticol)', 'active_ingredient' => 'Cypermethrin', 'category' => 'Acaricide', 'unit' => 'ml', 'withdrawal' => 0],
            // Bloat
            ['name' => 'Poloxalene (Bloatenz)', 'active_ingredient' => 'Poloxalene', 'category' => 'Other', 'unit' => 'ml', 'withdrawal' => 0],
        ];

        foreach ($meds as $m) {
            MedicationType::firstOrCreate(['name' => $m['name']], [
                'id'                    => Str::uuid(),
                'active_ingredient'     => $m['active_ingredient'],
                'category'              => $m['category'],
                'unit_of_measure'       => $m['unit'],
                'withdrawal_period_days'=> $m['withdrawal'],
            ]);
        }

        // ─── Vaccine Types ────────────────────────────────────────────────────
        $vaccines = [
            ['name' => 'FMD Polyvalent Vaccine', 'disease' => 'Foot-and-Mouth Disease', 'interval' => 180],
            ['name' => 'LSD / Sheeppox Vaccine', 'disease' => 'Lumpy Skin Disease', 'interval' => 365],
            ['name' => 'Anthrax Spore Vaccine (Sterne)', 'disease' => 'Anthrax', 'interval' => 365],
            ['name' => 'Brucella S19', 'disease' => 'Brucellosis', 'interval' => null], // Once only
            ['name' => 'Brucella RB51', 'disease' => 'Brucellosis', 'interval' => null],
            ['name' => 'Blackleg (Blanthax)', 'disease' => 'Blackleg / Clostridial', 'interval' => 365],
            ['name' => 'Bovilis MH (BRD)', 'disease' => 'Bovine Respiratory Disease', 'interval' => 180],
            ['name' => 'ECF-ITM Vaccination', 'disease' => 'East Coast Fever (ECF)', 'interval' => null], // Lifetime
        ];

        foreach ($vaccines as $v) {
            VaccineType::firstOrCreate(['name' => $v['name']], [
                'id'                    => Str::uuid(),
                'disease_prevented'     => $v['disease'],
                'booster_interval_days' => $v['interval'],
            ]);
        }

        $this->command->info('✓ Disease types seeded: ' . DiseaseType::count());
        $this->command->info('✓ Medication types seeded: ' . MedicationType::count());
        $this->command->info('✓ Vaccine types seeded: ' . VaccineType::count());
    }
}
