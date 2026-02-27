import type { DailyLog, Medication } from "./types";

// ── Core types ────────────────────────────────────────────────────────────────

export interface MetricPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface EventMarker {
  date: string;
  type: "missed_dose" | "alcohol" | "smoked" | "low_sleep" | "symptom_spike";
  label: string;
}

export interface MetricRow {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  latestValue: number | null;
  change7d: number | null;
  points7d: MetricPoint[];
  allPoints: MetricPoint[];
}

export interface Observation {
  text: string;
  r: number;
}

export type Timeframe = "1W" | "1M" | "3M" | "1Y";

// ── Key helpers ───────────────────────────────────────────────────────────────

function nameToKey(name: string): string {
  return name.toLowerCase().replace(/[\s/]+/g, "-").replace(/-+/g, "-");
}

// ── Extract helpers ───────────────────────────────────────────────────────────

export function extractSymptom(logs: DailyLog[], name: string): MetricPoint[] {
  return logs
    .filter((l) => l.symptoms?.some((s) => s.name === name))
    .map((l) => ({ date: l.date, value: l.symptoms!.find((s) => s.name === name)!.severity }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function extractSleep(logs: DailyLog[]): MetricPoint[] {
  return logs
    .filter((l) => l.sleep_hours != null)
    .map((l) => ({ date: l.date, value: l.sleep_hours! }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function extractWater(logs: DailyLog[]): MetricPoint[] {
  return logs
    .filter((l) => l.water_intake_oz != null)
    .map((l) => ({ date: l.date, value: l.water_intake_oz! }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function extractLifestyle(logs: DailyLog[], key: "smoked" | "alcohol"): MetricPoint[] {
  return logs
    .filter((l) => l.lifestyle != null)
    .map((l) => ({ date: l.date, value: l.lifestyle![key] ? 1 : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function extractMedAdherence(logs: DailyLog[], medId: number): MetricPoint[] {
  return logs
    .filter((l) => l.medications_taken?.some((m) => m.medication_id === medId))
    .map((l) => {
      const med = l.medications_taken!.find((m) => m.medication_id === medId)!;
      return { date: l.date, value: med.taken ? 100 : 0 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function extractOverallAdherence(logs: DailyLog[]): MetricPoint[] {
  return logs
    .filter((l) => l.medications_taken && l.medications_taken.length > 0)
    .map((l) => {
      const meds = l.medications_taken!;
      const taken = meds.filter((m) => m.taken).length;
      return { date: l.date, value: Math.round((taken / meds.length) * 100) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Change computation ────────────────────────────────────────────────────────

export function compute7dChange(points: MetricPoint[]): number | null {
  if (!points.length) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const priorCutoff = new Date();
  priorCutoff.setDate(priorCutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const priorCutoffStr = priorCutoff.toISOString().split("T")[0];

  const recent = points.filter((p) => p.date >= cutoffStr);
  const prior = points.filter((p) => p.date >= priorCutoffStr && p.date < cutoffStr);

  if (!recent.length || !prior.length) return null;
  const recentAvg = recent.reduce((s, p) => s + p.value, 0) / recent.length;
  const priorAvg = prior.reduce((s, p) => s + p.value, 0) / prior.length;
  return recentAvg - priorAvg;
}

export function sparkline7d(points: MetricPoint[]): MetricPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return points
    .filter((p) => p.date >= cutoff.toISOString().split("T")[0])
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Timeframe filtering ───────────────────────────────────────────────────────

export function filterByTimeframe(points: MetricPoint[], tf: Timeframe): MetricPoint[] {
  const days = tf === "1W" ? 7 : tf === "1M" ? 30 : tf === "3M" ? 90 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return points.filter((p) => p.date >= cutoff.toISOString().split("T")[0]);
}

export function aggregateWeekly(points: MetricPoint[]): MetricPoint[] {
  if (points.length <= 60) return points;
  const weeks: Record<string, number[]> = {};
  for (const p of points) {
    const d = new Date(p.date);
    d.setDate(d.getDate() - d.getDay());
    const key = d.toISOString().split("T")[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(p.value);
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, value: vals.reduce((s, v) => s + v, 0) / vals.length }));
}

// ── Event markers ─────────────────────────────────────────────────────────────

export function extractEvents(logs: DailyLog[]): EventMarker[] {
  const markers: EventMarker[] = [];
  for (const log of logs) {
    const missed = log.medications_taken?.filter((m) => !m.taken) ?? [];
    if (missed.length > 0)
      markers.push({ date: log.date, type: "missed_dose", label: `${missed.length} missed` });
    if (log.lifestyle?.alcohol)
      markers.push({ date: log.date, type: "alcohol", label: "Alcohol" });
    if (log.lifestyle?.smoked)
      markers.push({ date: log.date, type: "smoked", label: "Smoked" });
    if (log.sleep_hours != null && log.sleep_hours < 5)
      markers.push({ date: log.date, type: "low_sleep", label: `${log.sleep_hours}h sleep` });
    if (log.symptoms?.some((s) => s.severity >= 7))
      markers.push({ date: log.date, type: "symptom_spike", label: "High symptom" });
  }
  return markers;
}

export const EVENT_COLORS: Record<EventMarker["type"], string> = {
  missed_dose: "#94A3B8",
  alcohol: "#F59E0B",
  smoked: "#F97316",
  low_sleep: "#3B82F6",
  symptom_spike: "#EF4444",
};

export const EVENT_LABELS: Record<EventMarker["type"], string> = {
  missed_dose: "Missed dose",
  alcohol: "Alcohol",
  smoked: "Smoked",
  low_sleep: "Low sleep",
  symptom_spike: "Symptom spike",
};

// ── Pearson correlation ───────────────────────────────────────────────────────

export function pearsonR(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return 0;
  const a = xs.slice(0, n), b = ys.slice(0, n);
  const am = a.reduce((s, v) => s + v, 0) / n;
  const bm = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da2 = 0, db2 = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - am, db = b[i] - bm;
    num += da * db; da2 += da * da; db2 += db * db;
  }
  const denom = Math.sqrt(da2 * db2);
  return denom === 0 ? 0 : num / denom;
}

function alignByDate(a: MetricPoint[], b: MetricPoint[]): [number[], number[]] {
  const bMap = new Map(b.map((p) => [p.date, p.value]));
  const xs: number[] = [], ys: number[] = [];
  for (const pa of a) {
    if (bMap.has(pa.date)) {
      xs.push(pa.value);
      ys.push(bMap.get(pa.date)!);
    }
  }
  return [xs, ys];
}

function alignLagged(x: MetricPoint[], y: MetricPoint[]): [number[], number[]] {
  // x[day] paired with y[day+1]
  const yMap = new Map(y.map((p) => {
    const d = new Date(p.date);
    d.setDate(d.getDate() - 1);
    return [d.toISOString().split("T")[0], p.value];
  }));
  const xs: number[] = [], ys: number[] = [];
  for (const px of x) {
    if (yMap.has(px.date)) {
      xs.push(px.value);
      ys.push(yMap.get(px.date)!);
    }
  }
  return [xs, ys];
}

// ── Observations ──────────────────────────────────────────────────────────────

export function computeObservations(logs: DailyLog[]): Observation[] {
  if (logs.length < 21) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const agitation = extractSymptom(sorted, "Agitation");
  const mood = extractSymptom(sorted, "Mood / Affect");
  const clarity = extractSymptom(sorted, "Clarity / Cognition");
  const sleep = extractSleep(sorted);
  const alcohol = extractLifestyle(sorted, "alcohol");
  const adherence = extractOverallAdherence(sorted);

  const results: Observation[] = [];

  const checks: Array<[MetricPoint[], MetricPoint[], boolean, string, string]> = [
    [sleep, agitation, false,
      "Higher sleep duration is associated with lower agitation scores.",
      "Higher sleep duration is associated with higher agitation scores."],
    [sleep, mood, false,
      "Higher sleep is associated with lower mood difficulty.",
      "Lower sleep is associated with lower mood difficulty."],
    [sleep, clarity, false,
      "Higher sleep is associated with lower clarity difficulty.",
      "Higher sleep is associated with higher clarity difficulty."],
    [alcohol, agitation, true,
      "Alcohol use days tend to coincide with higher agitation.",
      "Alcohol use days tend to coincide with lower agitation."],
  ];

  for (const [a, b, expectPositive, positiveText, negativeText] of checks) {
    const [xs, ys] = alignByDate(a, b);
    const r = pearsonR(xs, ys);
    if (Math.abs(r) > 0.5 && xs.length >= 21) {
      results.push({ r, text: r > 0 ? positiveText : negativeText });
    }
  }

  // Lagged: adherence → agitation next day
  {
    const [xs, ys] = alignLagged(adherence, agitation);
    const r = pearsonR(xs, ys);
    if (Math.abs(r) > 0.5 && xs.length >= 21) {
      results.push({
        r,
        text: r < 0
          ? "Agitation tends to be lower the day after higher medication adherence."
          : "Agitation tends to be higher the day after lower medication adherence.",
      });
    }
  }

  return results.slice(0, 3);
}

// ── Build all metric rows ─────────────────────────────────────────────────────

export function buildMetricRows(logs: DailyLog[], medications: Medication[]): MetricRow[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  function row(
    key: string, label: string, unit: string,
    higherIsBetter: boolean, points: MetricPoint[]
  ): MetricRow | null {
    if (!points.length) return null;
    return {
      key, label, unit, higherIsBetter,
      latestValue: points[points.length - 1]?.value ?? null,
      change7d: compute7dChange(points),
      points7d: sparkline7d(points),
      allPoints: points,
    };
  }

  const rows: MetricRow[] = [];

  for (const name of ["Agitation", "Mood / Affect", "Clarity / Cognition"]) {
    const r = row(nameToKey(name), name, "/10", false, extractSymptom(sorted, name));
    if (r) rows.push(r);
  }

  const sleepR = row("sleep", "Sleep", "hrs", true, extractSleep(sorted));
  if (sleepR) rows.push(sleepR);

  const waterR = row("water", "Water intake", "oz", true, extractWater(sorted));
  if (waterR) rows.push(waterR);

  const smokedPts = extractLifestyle(sorted, "smoked");
  if (smokedPts.some((p) => p.value > 0)) {
    const r = row("smoked", "Cigarettes", "days", false, smokedPts);
    if (r) rows.push(r);
  }

  const alcoholPts = extractLifestyle(sorted, "alcohol");
  if (alcoholPts.some((p) => p.value > 0)) {
    const r = row("alcohol", "Alcohol", "days", false, alcoholPts);
    if (r) rows.push(r);
  }

  const overallR = row("adherence-overall", "Overall adherence", "%", true, extractOverallAdherence(sorted));
  if (overallR) rows.push(overallR);

  for (const med of medications.filter((m) => m.active)) {
    const pts = extractMedAdherence(sorted, med.id);
    const r = row(`adherence-med-${med.id}`, med.name, "%", true, pts);
    if (r) rows.push(r);
  }

  return rows;
}

// ── Metric config lookup (for detail page) ────────────────────────────────────

export interface MetricConfig {
  label: string;
  unit: string;
  higherIsBetter: boolean;
  color: string;
  extract: (logs: DailyLog[]) => MetricPoint[];
}

export function getMetricConfig(key: string, medications: Medication[]): MetricConfig | null {
  const symptomMap: Record<string, string> = {
    "agitation": "Agitation",
    "mood-affect": "Mood / Affect",
    "clarity-cognition": "Clarity / Cognition",
  };
  if (symptomMap[key]) {
    const name = symptomMap[key];
    return { label: name, unit: "/10", higherIsBetter: false, color: "#EF4444", extract: (l) => extractSymptom(l, name) };
  }
  if (key === "sleep") return { label: "Sleep", unit: "hrs", higherIsBetter: true, color: "#3B82F6", extract: extractSleep };
  if (key === "water") return { label: "Water intake", unit: "oz", higherIsBetter: true, color: "#06B6D4", extract: extractWater };
  if (key === "smoked") return { label: "Cigarettes", unit: "days", higherIsBetter: false, color: "#F97316", extract: (l) => extractLifestyle(l, "smoked") };
  if (key === "alcohol") return { label: "Alcohol", unit: "days", higherIsBetter: false, color: "#F59E0B", extract: (l) => extractLifestyle(l, "alcohol") };
  if (key === "adherence-overall") return { label: "Overall adherence", unit: "%", higherIsBetter: true, color: "#0D9488", extract: extractOverallAdherence };
  if (key.startsWith("adherence-med-")) {
    const medId = parseInt(key.replace("adherence-med-", ""), 10);
    const med = medications.find((m) => m.id === medId);
    if (!med) return null;
    return { label: med.name, unit: "%", higherIsBetter: true, color: "#0D9488", extract: (l) => extractMedAdherence(l, medId) };
  }
  return null;
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(0)}%`;
  if (unit === "/10") return value.toFixed(1);
  if (unit === "hrs") return `${value.toFixed(1)}h`;
  if (unit === "oz") return `${value.toFixed(0)}oz`;
  if (unit === "days") return value > 0 ? "Yes" : "No";
  return value.toFixed(1);
}

export function formatChange(change: number | null, unit: string, higherIsBetter: boolean): {
  text: string; color: string; direction: "up" | "down" | "neutral";
} {
  if (change === null || Math.abs(change) < 0.05)
    return { text: "—", color: "#94A3B8", direction: "neutral" };

  const up = change > 0;
  const isGood = (up && higherIsBetter) || (!up && !higherIsBetter);
  const color = isGood ? "#16A34A" : "#DC2626";
  const sign = up ? "+" : "";
  const text = unit === "%" ? `${sign}${change.toFixed(0)}%`
    : unit === "/10" ? `${sign}${change.toFixed(1)}`
    : unit === "hrs" ? `${sign}${change.toFixed(1)}h`
    : unit === "oz" ? `${sign}${change.toFixed(0)}oz`
    : `${sign}${change.toFixed(1)}`;

  return { text, color, direction: up ? "up" : "down" };
}
