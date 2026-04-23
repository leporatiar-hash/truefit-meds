function normalizeApiBase(rawValue: string | undefined): string {
  const fallback = "http://localhost:8000";
  if (!rawValue) return fallback;

  let value = rawValue.trim().replace(/^["'`]|["'`]$/g, "").replace(/\/+$/, "");
  if (!value) return fallback;

  // Common env typo in dashboards: "ttps://..." (missing leading "h")
  if (value.startsWith("ttps://")) value = `h${value}`;
  if (value.startsWith("//")) value = `https:${value}`;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) value = `https://${value}`;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_URL: "${rawValue}". Use a full URL like https://truefit-meds-production.up.railway.app`
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_URL protocol: "${parsed.protocol}". Only http:// or https:// are supported`
    );
  }

  return parsed.origin;
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
    // Never serve stale API data from the browser cache
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const api = {
  // Auth
  register: (data: object) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: object) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () =>
    request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  // Patients
  createPatient: (data: object) =>
    request("/patients/", { method: "POST", body: JSON.stringify(data) }),
  getPatients: () => request("/patients/"),
  getPatient: (id: number) => request(`/patients/${id}`),
  generateConfig: (patientId: number, data: object) =>
    request(`/patients/${patientId}/generate-config`, { method: "POST", body: JSON.stringify(data) }),
  completeOnboardingSurvey: (data: object) =>
    request("/onboarding/config", { method: "POST", body: JSON.stringify(data) }),

  // Medications
  addMedication: (patientId: number, data: object) =>
    request(`/patients/${patientId}/medications`, { method: "POST", body: JSON.stringify(data) }),
  updateMedication: (id: number, data: object) =>
    request(`/medications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMedication: (id: number) =>
    request(`/medications/${id}`, { method: "DELETE" }),

  // Logs
  createLog: (data: object) =>
    request("/logs/", { method: "POST", body: JSON.stringify(data) }),
  getLogs: (patientId: number) => request(`/logs/${patientId}`),
  getTodayLog: (patientId: number) => request(`/logs/${patientId}/today?date=${localDateStr()}`),

  // User config
  updateUserConfig: (updates: object) =>
    request("/auth/config", { method: "PATCH", body: JSON.stringify({ updates }) }),

  // Summary
  generateSummary: (patientId: number) =>
    request(`/summary/${patientId}`, { method: "POST" }),

  // Password reset
  forgotPassword: (email: string) =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),
};

// Utility: get local date string (YYYY-MM-DD) — avoids UTC offset shifting the date
export function localDateStr(d: Date = new Date()): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// Utility: calculate streak from log array
export function calculateStreak(logs: Array<{ date: string }>): number {
  if (!logs.length) return 0;
  const dateSet = new Set(logs.map((l) => l.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cur = new Date(today);

  // Allow today to not be logged yet (check from yesterday in that case)
  const todayStr = localDateStr(cur);
  if (!dateSet.has(todayStr)) {
    cur.setDate(cur.getDate() - 1);
  }

  while (true) {
    const s = localDateStr(cur);
    if (dateSet.has(s)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
