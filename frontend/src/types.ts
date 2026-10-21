export interface TopFactor {
  feature: string;
  label: string;
  description: string;
  value: number | null;
  shap_impact: number;
}

export interface Reading {
  id?: number;
  unit_id?: string;
  unit?: string;
  ts: number;
  storage_c: number;
  ambient_c: number;
  door: number;
  cooling: number;
  prob: number;
  model_prob?: number;
  risk_level?: string;
  risk?: string;
  time_to_excursion_min?: number | null;
  ttx_min?: number | null;
  k3_flag?: number;
  k3?: number;
  explanation: string;
  top_factors?: TopFactor[];
  received_at?: string;
}

export interface UnitSummary {
  id: number;
  unit_id: string;
  ts: number;
  storage_c: number;
  ambient_c: number;
  door: number;
  cooling: number;
  prob: number;
  risk_level: string;
  k3_flag: number;
  time_to_excursion_min: number | null;
  explanation: string;
  received_at: string;
}

export interface MethodMetrics {
  name: string;
  event_recall: number;
  event_recall_ci95: [number, number];
  event_precision: number;
  event_precision_ci95: [number, number];
  false_alarms_per_day: number;
  false_alarms_per_day_ci95: [number, number];
  mean_lead_time_min: number;
  median_lead_time_min: number;
}

export interface EvalData {
  test_episodes_count: number;
  evaluation_notes: string;
  synthetic_data: boolean;
  metrics: {
    baseline_1_fixed: MethodMetrics;
    baseline_2_linear: MethodMetrics;
    aerocold: MethodMetrics;
  };
}

export interface ScenarioPoint {
  ts: number;
  rel_min: number;
  storage_c: number;
  true_c: number;
  ambient_c: number;
  door: number;
  cooling: number;
  prob: number;
  risk: string;
  ttx_min: number | null;
  reason: string;
}

export interface ScenarioTrace {
  title: string;
  description: string;
  data: ScenarioPoint[];
}

export interface ScenariosResponse {
  door_open_recovery: ScenarioTrace;
  compressor_failure: ScenarioTrace;
}

export interface InterventionPoint {
  minute: number;
  temp: number;
  is_breach?: boolean;
  is_safe?: boolean;
}

export interface InterventionResult {
  unit_id: string;
  action_type: string;
  action_name: string;
  protocol_description: string;
  initial_temp: number;
  payload: string;
  cargo_value_usd: number;
  time_to_breach_status_quo_min: number | null;
  time_saved_minutes: number;
  shelf_life_impact: string;
  counterfactual_status_quo: InterventionPoint[];
  counterfactual_mitigated: InterventionPoint[];
  regulatory_compliance: string;
  certificate_id: string;
  timestamp: number;
}

export interface DatasetSample {
  id: string;
  title: string;
  description: string;
  target_unit: string;
  content: string;
}

export interface DatasetUploadResult {
  status: string;
  rows_processed: number;
  units_affected: string[];
  metrics: {
    high_risk_alerts: number;
    medium_warning_alerts: number;
    normal_readings: number;
  };
  sample_readings: Reading[];
}

