const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

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
  me: () => request("/auth/me"),

  // Patients
  createPatient: (data: object) =>
    request("/patients/", { method: "POST", body: JSON.stringify(data) }),
  getPatients: () => request("/patients/"),
  getPatient: (id: number) => request(`/patients/${id}`),

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
  getTodayLog: (patientId: number) => request(`/logs/${patientId}/today`),

  // Summary
  generateSummary: (patientId: number) =>
    request(`/summary/${patientId}`, { method: "POST" }),
};

// Utility: calculate streak from log array
export function calculateStreak(logs: Array<{ date: string }>): number {
  if (!logs.length) return 0;
  const dateSet = new Set(logs.map((l) => l.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cur = new Date(today);

  // Allow today to not be logged yet (check from yesterday in that case)
  const todayStr = cur.toISOString().split("T")[0];
  if (!dateSet.has(todayStr)) {
    cur.setDate(cur.getDate() - 1);
  }

  while (true) {
    const s = cur.toISOString().split("T")[0];
    if (dateSet.has(s)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
