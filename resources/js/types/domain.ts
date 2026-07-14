// ─── Enumerations ────────────────────────────────────────────────────────────

export type AnimalSex = 'male' | 'female';

export type AnimalStatus =
  | 'calf'
  | 'heifer'
  | 'lactating'
  | 'dry'
  | 'bull'
  | 'culled'
  | 'sold'
  | 'dead';

export type AnimalBreed =
  | 'Friesian'
  | 'Ayrshire'
  | 'Jersey'
  | 'Guernsey'
  | 'Brown Swiss'
  | 'Sahiwal'
  | 'Crossbreed'
  | 'Other';

export type MilkingSession = 'morning' | 'midday' | 'evening';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'failed';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

export type UserRole = 'farm_owner' | 'farm_manager' | 'farm_worker' | 'veterinarian';

// ─── Farm & User ──────────────────────────────────────────────────────────────

export interface Farm {
  id: string;
  name: string;
  county: string;
  sub_county: string | null;
  owner_name: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  subscription_plan: 'free' | 'basic' | 'pro';
  settings: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  // Resolved via farm_users pivot
  role?: UserRole;
  farm_id?: string;
}

// ─── Animal ───────────────────────────────────────────────────────────────────

export interface Animal {
  id: string;
  farm_id: string;
  tag_number: string;
  name: string | null;
  sex: AnimalSex;
  status: AnimalStatus;
  breed: AnimalBreed;
  birth_date: string | null;
  date_acquired: string | null;
  acquisition_cost: number | null;
  acquisition_source: string | null;
  sire_id: string | null;
  dam_id: string | null;
  is_pregnant: boolean;
  expected_calving_date: string | null;
  last_calving_date: string | null;
  parity: number;
  weight_kg: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnimalWithRelations extends Animal {
  dam: Animal | null;
  sire: Animal | null;
  days_in_milk: number | null;
  current_lactation_number: number;
  latest_health_event: HealthEvent | null;
  total_milk_today: number;
}

// ─── Milk Production ──────────────────────────────────────────────────────────

export interface MilkRecord {
  id: string;
  farm_id: string;
  animal_id: string;
  milked_on: string;
  session: MilkingSession;
  quantity_litres: number;
  fat_percentage: number | null;
  somatic_cell_count: number | null;
  milked_by: string | null;
  notes: string | null;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface DailyMilkSummary {
  date: string;
  total_litres: number;
  morning_litres: number;
  midday_litres: number;
  evening_litres: number;
  cows_milked: number;
  avg_per_cow: number;
  vs_yesterday_delta: number;
  vs_yesterday_percent: number;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  farm_id: string;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  animal_id: string | null;
  due_on: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface DiseaseType {
  id: string;
  name: string;
  category: string | null;
  common_signs: string | null;
  is_notifiable: boolean;
}

export interface MedicationType {
  id: string;
  name: string;
  active_ingredient: string | null;
  category: string | null;
  unit_of_measure: string;
  withdrawal_period_days: number;
}

export interface VaccineType {
  id: string;
  name: string;
  disease_prevented: string | null;
  booster_interval_days: number | null;
}

export interface HealthEvent {
  id: string;
  farm_id: string;
  animal_id: string;
  disease_type_id: string | null;
  observed_on: string;
  symptoms: string | null;
  severity: 'mild' | 'moderate' | 'severe';
  is_recovered: boolean;
  recovery_date: string | null;
  outcome: string | null;
  vet_consulted: boolean;
  vet_name: string | null;
  consultation_cost: number | null;
  notes: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'breed'>;
  disease_type?: Pick<DiseaseType, 'id' | 'name'>;
  treatments?: Treatment[];
  treatment_cost?: number;
  total_cost?: number;
}

export interface Treatment {
  id: string;
  farm_id: string;
  health_event_id: string;
  animal_id: string;
  medication_type_id: string | null;
  treated_on: string;
  dose_amount: number;
  dose_unit: string;
  route: string;
  withdrawal_end_date: string | null;
  cost: number | null;
  is_in_withdrawal?: boolean;
  medication?: Pick<MedicationType, 'id' | 'name' | 'withdrawal_period_days'>;
}

export interface Vaccination {
  id: string;
  farm_id: string;
  animal_id: string;
  vaccine_type_id: string | null;
  vaccinated_on: string;
  batch_number: string | null;
  dose_ml: number | null;
  next_due_date: string | null;
  cost: number | null;
  adverse_reaction: boolean;
  notes: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
  vaccine_type?: Pick<VaccineType, 'id' | 'name' | 'disease_prevented'>;
}

export interface DewormingRecord {
  id: string;
  farm_id: string;
  animal_id: string;
  drug_name: string;
  active_ingredient: string | null;
  dose_amount: number;
  dose_unit: string;
  dewormed_on: string;
  next_due_date: string | null;
  cost: number | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
}

export interface HealthKPIs {
  open_cases: number;
  on_withdrawal: number;
  vaccinations_due_14d: number;
  deworming_due_14d: number;
  mtd_vet_cost: number;
}

// ─── Breeding ────────────────────────────────────────────────────────────────

export interface HeatEvent {
  id: string;
  farm_id: string;
  animal_id: string;
  observed_on: string;
  observed_at: string | null;
  detection_method: 'visual' | 'tail_paint' | 'pedometer' | 'other';
  confidence: 'certain' | 'probable' | 'suspected';
  signs_observed: string[];
  ai_window_start: string | null;
  ai_window_end: string | null;
  acted_on: boolean;
  notes: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'breed'>;
}

export interface SemenInventory {
  id: string;
  farm_id: string;
  bull_name: string;
  batch_number: string | null;
  semen_type: 'conventional' | 'sexed';
  cost_per_straw: number | null;
  inseminator: string | null;
  straws_received: number;
  straws_remaining: number;
  received_on: string;
  // legacy fields kept for backwards compat
  bull_breed?: string | null;
  supplier?: string | null;
  expiry_date?: string | null;
}

export type AIResult = 'pending' | 'confirmed_pregnant' | 'not_pregnant' | 'repeat';

export interface AIService {
  id: string;
  farm_id: string;
  animal_id: string;
  heat_event_id: string | null;
  semen_inventory_id: string | null;
  service_date: string;
  service_time: string | null;
  technician_name: string | null;
  service_cost: number | null;
  result: AIResult;
  conception_confirmed_on: string | null;
  expected_calving_date: string | null;
  expected_dry_off_date: string | null;
  service_number: number;
  notes: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'breed' | 'parity'>;
  semen?: Pick<SemenInventory, 'id' | 'bull_name' | 'batch_number' | 'semen_type' | 'inseminator'>;
}

export interface PregnancyCheck {
  id: string;
  farm_id: string;
  animal_id: string;
  ai_service_id: string | null;
  checked_on: string;
  days_post_service: number | null;
  method: 'rectal_palpation' | 'ultrasound' | 'blood_test' | 'visual';
  result: 'pregnant' | 'not_pregnant' | 'inconclusive';
  expected_calving_date: string | null;
  checked_by: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string;
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
}

export interface CalvingRecord {
  id: string;
  farm_id: string;
  dam_id: string;
  calf_id: string | null;
  calved_on: string;
  ease: 'easy' | 'slight_assistance' | 'major_assistance' | 'caesarean' | 'abnormal';
  calf_outcome: 'alive' | 'stillborn' | 'died_within_24h';
  calf_sex: AnimalSex;
  calf_tag: string | null;
  calf_birth_weight_kg: number | null;
  is_twin: boolean;
  colostrum_given: boolean;
  complications: string | null;
  notes: string | null;
  created_at: string;
  dam?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
}

export interface SyncProgram {
  id: string;
  farm_id: string;
  animal_id: string;
  program_type: 'Ovsynch' | 'CIDR' | 'Custom';
  start_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'aborted';
  steps: SyncProgramStep[];
  animal?: Pick<Animal, 'id' | 'tag_number' | 'name'>;
}

export interface SyncProgramStep {
  id: string;
  event_type: string;
  custom_label: string | null;
  scheduled_on: string;
  completed_on: string | null;
  drug_name: string | null;
  is_completed: boolean;
}

export interface BreedingKPIs {
  total_services_90d: number;
  conception_rate_90d: number;
  confirmed_pregnant: number;
  pending_pd_checks: number;
  upcoming_calvings_14d: number;
}

// ─── Growth & Feeding ────────────────────────────────────────────────────────

export type AdgRating = 'good' | 'acceptable' | 'poor' | 'unknown';

export interface WeightRecord {
  id: string;
  farm_id: string;
  animal_id: string;
  measured_on: string;
  weight_kg: number;
  body_condition_score: number | null;
  method: string | null;
  age_days: number | null;
  adg_kg_day: number | null;
  notes: string | null;
}

export interface CalfFeedingRecord {
  id: string;
  farm_id: string;
  animal_id: string;
  fed_on: string;
  session: 'morning' | 'midday' | 'evening' | null;
  feed_type: 'whole_milk' | 'milk_replacer' | 'starter_pellets' | 'hay' | 'water' | 'other';
  quantity: number;
  unit: 'litres' | 'kg' | 'g';
  cost: number | null;
  notes: string | null;
}

export interface CalfSummary {
  id: string;
  tag_number: string;
  name: string | null;
  breed: string;
  status: 'calf' | 'heifer';
  birth_date: string | null;
  age_days: number | null;
  age_weeks: number | null;
  current_weight: number;
  adg: number | null;
  adg_rating: AdgRating;
  last_weighed: string | null;
  target_weight: number | null;
  record_count: number;
  needs_weighing: boolean;
  rank?: number;
}

export interface GrowthDataPoint {
  date: string;
  age_days: number | null;
  weight_kg: number;
  bcs: number | null;
  adg: number | null;
}

export interface CalfGrowthData {
  animal: { id: string; tag_number: string; name: string | null; breed: string; status: string; birth_date: string | null };
  actual: GrowthDataPoint[];
  targets: { age_days: number; weight_kg: number }[];
  current_adg: number | null;
  latest_weight: number | null;
  latest_age_days: number | null;
  target_adg: number;
  projected_calving: string | null;
  record_count: number;
}

export interface CalfKPIs {
  total_calves_heifers: number;
  need_weighing: number;
  low_adg_alerts: number;
  target_adg_preweaning: number;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedType {
  id: string;
  name: string;
  category: 'roughage' | 'concentrate' | 'mineral' | 'supplement' | 'silage' | 'hay' | 'other';
  crude_protein_percent: number | null;
  metabolizable_energy: number | null;
  default_unit: string;
  description: string | null;
}

export interface FeedInventoryItem {
  id: string;
  feed_type_id: string;
  name: string;
  category: string;
  quantity_kg: number;
  reorder_level_kg: number | null;
  avg_cost_per_kg: number | null;
  days_remaining: number | null;
  daily_avg_kg: number | null;
  consumed_7d_kg: number;
  is_low: boolean;
  is_critical: boolean;
  last_restocked: string | null;
  storage_location: string | null;
}

export interface FeedTransaction {
  id: string;
  farm_id: string;
  feed_inventory_id: string;
  feed_type_id: string;
  transaction_type: 'purchase' | 'harvest' | 'consumption' | 'adjustment' | 'wastage';
  transaction_date: string;
  quantity_kg: number;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  reference_number: string | null;
  animal_group: string | null;
  notes: string | null;
  created_at: string;
  feed_type?: Pick<FeedType, 'id' | 'name'>;
}

export interface FeedKPIs {
  month_purchase_cost: number;
  month_consumption_cost: number;
  lactating_consumption_cost: number;
  other_herd_consumption_cost: number;
  feed_cost_per_litre: number | null;
  month_milk_litres: number;
  low_stock_count: number;
  cost_breakdown_30d: { feed_type: string; total_cost: number }[];
}

// ─── Milk Sales ──────────────────────────────────────────────────────────────

export interface MilkBuyer {
  id: string;
  farm_id: string;
  name: string;
  buyer_type: 'cooperative' | 'processor' | 'hotel' | 'direct' | 'home_use' | 'calf_feeding';
  default_price_per_litre: number | null;
  payment_terms_days: number | null;
  is_active: boolean;
  phone: string | null;
  notes: string | null;
}

export interface MilkSale {
  id: string;
  farm_id: string;
  milk_buyer_id: string;
  sale_date: string;
  session: MilkingSession | null;
  quantity_litres: number;
  price_per_litre: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: 'cash' | 'mpesa' | 'bank' | 'credit' | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  buyer?: Pick<MilkBuyer, 'id' | 'name' | 'buyer_type'>;
}

// ─── Daily Reports ───────────────────────────────────────────────────────────

export interface DailyReport {
  id: string;
  farm_id: string;
  report_date: string;
  status: 'draft' | 'submitted';
  total_milk_litres: number | null;
  morning_litres: number | null;
  midday_litres: number | null;
  evening_litres: number | null;
  cows_milked: number | null;
  milk_sold_litres: number | null;
  milk_revenue: number | null;
  health_events_count: number;
  breeding_events_count: number;
  total_feed_cost: number | null;
  weather: string | null;
  manager_notes: string | null;
  general_notes: string | null;
  draft_data: Record<string, unknown> | null;
  draft_step: number | null;
  submitted_at: string | null;
  whatsapp_sent: boolean;
  created_at: string;
}

// ─── Milk Animal Record (for entry form) ─────────────────────────────────────

export interface AnimalMilkRecord {
  animal_id: string;
  tag_number: string;
  name: string | null;
  breed: string;
  morning: { id: string; litres: number; withheld: boolean } | null;
  midday: { id: string; litres: number; withheld: boolean } | null;
  evening: { id: string; litres: number; withheld: boolean } | null;
  daily_total: number;
}

// ─── Formulation ─────────────────────────────────────────────────────────────

export interface MealIngredient {
  id: string;
  name: string;
  category: 'energy' | 'protein' | 'mineral' | 'additive' | 'binder';
  crude_protein_percent: number;
  metabolizable_energy: number;
  dry_matter_percent: number;
  calcium_percent: number;
  phosphorus_percent: number;
  max_inclusion_percent: number | null;
  notes: string | null;
  price_per_kg: number | null;
}

export interface FormulaIngredientEntry {
  meal_ingredient_id: string;
  inclusion_percent: number;
  quantity_kg: number;
  cost: number | null;
  ingredient?: MealIngredient;
}

export interface MealFormula {
  id: string;
  farm_id: string;
  name: string;
  description: string | null;
  batch_size_kg: number;
  target_cp_percent: number | null;
  computed_cp_percent: number | null;
  computed_me: number | null;
  computed_calcium_percent: number | null;
  cost_per_kg: number | null;
  total_batch_cost: number | null;
  season: 'general' | 'wet_season' | 'dry_season' | null;
  is_active: boolean;
  created_at: string;
  ingredients_with_details?: (FormulaIngredientEntry & { ingredient: MealIngredient })[];
}

export interface FormulaCalculation {
  computed_cp_percent: number;
  computed_me: number;
  computed_calcium_percent: number;
  computed_phosphorus_percent: number;
  cost_per_kg: number;
  total_batch_cost: number;
  total_inclusion_percent: number;
  ingredient_details: {
    meal_ingredient_id: string;
    name: string;
    inclusion_percent: number;
    quantity_kg: number;
    price_per_kg: number;
    line_cost: number;
    cp_contribution: number;
  }[];
  warnings: { type: 'error' | 'warning' | 'danger'; message: string }[];
}

export interface RationComponent {
  component_name: string;
  quantity_kg_per_head: number;
  dm_kg_per_head: number;
  cp_contribution_percent: number;
  me_contribution: number;
  cost_per_head: number;
}

export interface RationCalculation {
  animal_group: string;
  target_milk_yield_l: number;
  animal_weight_kg: number;
  head_count: number;
  components: RationComponent[];
  total_dm_kg_per_head: number;
  computed_cp_percent: number;
  computed_me: number;
  cost_per_head_per_day: number;
  total_daily_cost: number;
  cp_target: { cp_min: number; cp_max: number; me_min: number; me_max: number };
  warnings: string[];
}

export interface RationPlan {
  id: string;
  farm_id: string;
  name: string;
  animal_group: string;
  head_count: number | null;
  valid_from: string;
  valid_until: string | null;
  target_milk_yield_l: number | null;
  computed_cp_percent: number | null;
  cost_per_head_per_day: number | null;
  components: RationComponent[];
  created_at: string;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'feed' | 'vet' | 'veterinary' | 'labour' | 'equipment' | 'utilities' | 'land' | 'transport' | 'breeding' | 'other';
export type RevenueCategory = 'milk_sales' | 'animal_sales' | 'manure_sales' | 'crop_sales' | 'subsidy' | 'other';

export interface Expense {
  id: string;
  farm_id: string;
  category: ExpenseCategory;
  expense_date: string;
  description: string;
  amount: number;
  supplier: string | null;
  receipt_number: string | null;
  payment_method: string | null;
  is_paid: boolean;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
}

export interface Revenue {
  id: string;
  farm_id: string;
  category: RevenueCategory;
  revenue_date: string;
  description: string;
  amount: number;
  buyer_name: string | null;
  payment_method: string | null;
  is_received: boolean;
  notes: string | null;
  created_at: string;
}

export interface ProfitabilitySnapshot {
  id: string;
  farm_id: string;
  period_year: number;
  period_month: number;
  total_milk_litres: number | null;
  total_milk_revenue: number | null;
  total_other_revenue: number | null;
  total_revenue: number | null;
  total_feed_cost: number | null;
  total_vet_cost: number | null;
  total_labour_cost: number | null;
  total_other_expenses: number | null;
  total_expenses: number | null;
  gross_margin: number | null;
  net_profit: number | null;
  cost_per_litre: number | null;
  revenue_per_litre: number | null;
  computed_at: string | null;
}

export interface FinanceKPIs {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  cost_per_litre: number | null;
  revenue_per_litre: number | null;
  margin_percent: number | null;
  revenue_delta_pct: number | null;
  month_label: string;
}

export interface BreakEven {
  fixed_costs: number;
  variable_costs: number;
  price_per_litre: number;
  var_cost_per_litre: number;
  contribution_margin: number;
  break_even_litres: number | null;
  break_even_per_day: number | null;
  current_per_day: number | null;
  margin_above_be: number | null;
  is_profitable: boolean;
}

export interface FinanceTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  cost_per_litre: number | null;
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardKPIs {
  milk_today_litres: number;
  milk_yesterday_litres: number;
  milk_delta_percent: number | null;
  milk_delta_litres: number;
  milk_display_litres: number;
  milk_display_date: string;
  milk_display_label: string;
  milk_mtd_litres: number;
  morning_litres: number;
  midday_litres: number;
  evening_litres: number;
  cows_milked: number;
  avg_litres_per_cow: number;
  revenue_today_kes: number;
  revenue_mtd_kes: number;
  active_animals: number;
  lactating_cows: number;
  dry_cows: number;
  pregnant_cows: number;
  calves: number;
  active_alerts_count: number;
  critical_alerts_count: number;
  pending_tasks_count: number;
}
