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
