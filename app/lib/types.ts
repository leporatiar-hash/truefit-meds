export interface User {
  id: number;
  email: string;
  name: string;
  role: "caregiver" | "patient";
  created_at: string;
  user_config: DashboardConfig | null;
}

export interface Medication {
  id: number;
  patient_id: number;
  name: string;
  dose: string;
  frequency: string;
  time_of_day: string;
  active: boolean;
}

export interface DashboardConfig {
  symptoms: string[];
  activities: string[];
  modules: string[];
  symptom_label?: string;
  episode_label?: string;
  greeting?: string;
  lifestyle_flags?: Array<"smoked" | "alcohol" | "stressed" | "ate_well">;
  substance_fields?: Array<"cigarettes" | "alcohol">;
  condition_context?: string;
  summary_style?: "compassionate" | "clinical" | "adaptive";
}

export interface Patient {
  id: number;
  name: string;
  date_of_birth: string | null;
  diagnosis: string;
  notes: string | null;
  caregiver_id: number;
  medications: Medication[];
  dashboard_config: DashboardConfig | null;
}

export interface MedicationTaken {
  medication_id: number;
  taken: boolean;
  time_taken: string | null; // "HH:MM"
}

export interface Symptom {
  name: string;
  severity: number;
  worse_than_usual?: boolean;
}

export interface Episode {
  occurred: boolean;
  time: string;
  description: string;
}

export interface Vitals {
  heart_rate: string;
  blood_pressure: string;
  cigarettes: string;
  alcohol: boolean;
  alcohol_drinks: string;
}

export interface SideEffect {
  name: string;
  severity: number;
}

export interface MedicationSideEffect {
  medication_id: number;
  medication_name: string;
  side_effects: SideEffect[];
}

export interface Activity {
  type: string;
  duration_minutes?: number | null;
}

export interface Lifestyle {
  smoked: boolean;
  alcohol: boolean;
  stressed: boolean;
  ate_well: boolean;
}

export interface DailyLog {
  id: number;
  patient_id: number;
  logged_by: number;
  date: string;
  medications_taken: MedicationTaken[] | null;
  symptoms: Symptom[] | null;
  medication_side_effects: MedicationSideEffect[] | null;
  sleep_hours: number | null;
  mood_score: number | null;
  water_intake_oz: number | null;
  activities: Activity[] | null;
  lifestyle: Lifestyle | null;
  notes: string | null;
  episode: Episode | null;
  vitals: Vitals | null;
  photo: string | null;
  created_at: string;
}

export interface AdherenceItem {
  medication: string;
  percentage: number;
  days_taken: number;
  days_logged: number;
  notes?: string;
}

export interface PatternItem {
  finding: string;
  significance: string;
}

export interface SummaryResponse {
  executive_summary: string;
  adherence: AdherenceItem[];
  patterns: PatternItem[];
  lifestyle_notes: string[];
  discussion_items: string[];
  adherence_data?: Record<string, { name: string; percentage: number; days_taken: number; days_logged: number }>;
}
