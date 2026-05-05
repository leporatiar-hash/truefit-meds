export interface User {
  id: number;
  email: string;
  name: string;
  role: "caregiver" | "patient";
  created_at: string;
  user_config: DashboardConfig | null;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: "bearer";
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
  substance_fields?: string[]; // "cigarettes", "alcohol", or any custom substance name
  condition_context?: string;
  summary_style?: "compassionate" | "clinical" | "adaptive";
  dose_timing_mode?: "simple" | "exact";
  tracking_modules?: string[]; // "sleep" | "hydration" | "vitals" | custom names
  custom_vitals?: string[];    // e.g. ["Weight", "Blood Sugar"]
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
  severity?: number | null;
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
  custom_substances?: Record<string, boolean>;
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
  socialization: Socialization | null;
  created_at: string;
}

export interface SocialContact {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface Socialization {
  left_house: boolean | null;
  had_contact: boolean | null;
  contact_ids: number[];
  quality: "good" | "neutral" | "difficult" | null;
  initiated_by: "self" | "other" | null;
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

export interface SavedSummary {
  id: number;
  user_id: number;
  patient_id: number;
  title: string;
  content: string;
  date_range_start: string;
  date_range_end: string;
  created_at: string;
}
