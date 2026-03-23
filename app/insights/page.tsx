"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import {
  buildMetricRows, formatValue,
  type MetricRow, type MetricPoint,
} from "../lib/insights";
import type { Patient, DailyLog } from "../lib/types";

// ── Severity helpers ──────────────────────────────────────────────────────────
// Values are always 6 (Moderate) or 9 (Severe) — matching caregiver's own words.
// Avoid alarming labels like "Critical" that escalate beyond what was logged.

function severityLevel(value: number): { label: string; color: string; bg: string } {
  if (value >= 8) return { label: "Severe",   color: "#EA580C", bg: "#FFF7ED" };
  if (value >= 4) return { label: "Moderate", color: "#D97706", bg: "#FFFBEB" };
  return           { label: "Mild",     color: "#16A34A", bg: "#F0FDF4" };
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points, color }: { points: MetricPoint[]; color: string }) {
  if (points.length < 2) {
    return <div style={{ width: 64, height: 28, background: "#F1F5F9", borderRadius: 4 }} />;
  }
  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const W = 64, H = 28, P = 2;
  const xs = points.map((_, i) => P + (i / (points.length - 1)) * (W - P * 2));
  const ys = points.map((p) => H - P - ((p.value - minV) / range) * (H - P * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────

function TrendBadge({ row }: { row: MetricRow }) {
  if (!row.trend || row.trend === "stable" || !row.trendLabel) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">—</span>;
  }
  const isImproving = row.trend === "improving";
  const bg = isImproving ? "#DCFCE7" : "#FEE2E2";
  const color = isImproving ? "#16A34A" : "#DC2626";
  const arrow = isImproving
    ? (row.higherIsBetter ? "↑" : "↓")
    : (row.higherIsBetter ? "↓" : "↑");
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: bg, color }}
    >
      {arrow} {row.trendLabel}
    </span>
  );
}

function MetricRowItem({ row }: { row: MetricRow }) {
  const sparkColor = row.trend === "improving" ? "#16A34A" : row.trend === "worsening" ? "#EA580C" : "#94A3B8";

  const isSymptom = row.unit === "/10";
  const sev = isSymptom && row.latestValue !== null ? severityLevel(row.latestValue) : null;

  // For symptoms, show the severity label as primary text (not raw number)
  const primaryText = sev ? sev.label : (row.latestValue !== null ? formatValue(row.latestValue, row.unit) : "—");
  const subLabel = row.unit === "days" ? "lifestyle"
    : row.unit === "%" ? "adherence"
    : row.unit === "hrs" ? "sleep"
    : row.unit === "oz" ? "hydration"
    : "";

  return (
    <Link
      href={`/insights/${row.key}`}
      className="flex items-center gap-3 px-5 py-4 transition-colors active:bg-slate-50"
      style={{ borderBottom: "1px solid #F1F5F9" }}
    >
      {/* Severity dot for symptoms */}
      {sev && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: sev.color }}
        />
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-navy truncate">{row.label}</p>
        {subLabel && (
          <p className="text-sm mt-0.5 font-medium text-slate-400">{subLabel}</p>
        )}
      </div>

      {/* Sparkline */}
      <Sparkline points={row.points7d} color={sparkColor} />

      {/* Value + trend badge */}
      <div className="text-right flex-shrink-0 min-w-[80px] flex flex-col items-end gap-1">
        <p className="text-base font-bold" style={{ color: sev ? sev.color : "#0D1B2A" }}>{primaryText}</p>
        <TrendBadge row={row} />
      </div>

      <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#CBD5E1" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 pt-4 pb-2">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
    </div>
  );
}

// ── Highlights card ───────────────────────────────────────────────────────────

interface Highlight {
  type: "attention" | "worsening" | "improving";
  label: string;
  symptom: string;
  valueText: string;
  color: string;
}

function HighlightsCard({ symptomRows }: { symptomRows: MetricRow[] }) {
  const highlights: Highlight[] = [];

  // Most severe (needs attention) — latestValue >= 7
  const mostSevere = [...symptomRows]
    .filter((r) => (r.latestValue ?? 0) >= 7)
    .sort((a, b) => (b.latestValue ?? 0) - (a.latestValue ?? 0))[0];
  if (mostSevere && mostSevere.latestValue !== null) {
    highlights.push({
      type: "attention",
      label: "Needs attention",
      symptom: mostSevere.label,
      valueText: mostSevere.latestValue.toFixed(1),
      color: "#DC2626",
    });
  }

  // Worsening — largest positive change7d (bad for symptoms)
  const worsening = [...symptomRows]
    .filter((r) => (r.change7d ?? 0) > 0.5)
    .sort((a, b) => (b.change7d ?? 0) - (a.change7d ?? 0))[0];
  if (worsening && worsening.change7d !== null && worsening !== mostSevere) {
    highlights.push({
      type: "worsening",
      label: "Worsening",
      symptom: worsening.label,
      valueText: `+${worsening.change7d.toFixed(1)} this week`,
      color: "#F97316",
    });
  }

  // Improving — most negative change7d (good for symptoms)
  const improving = [...symptomRows]
    .filter((r) => (r.change7d ?? 0) < -0.5)
    .sort((a, b) => (a.change7d ?? 0) - (b.change7d ?? 0))[0];
  if (improving && improving.change7d !== null) {
    highlights.push({
      type: "improving",
      label: "Improving",
      symptom: improving.label,
      valueText: `${improving.change7d.toFixed(1)} this week`,
      color: "#0D9488",
    });
  }

  // Net changes — all symptoms with meaningful week-over-week change
  const netChanges = symptomRows
    .filter((r) => r.trend && r.trend !== "stable" && r.trendLabel)
    .sort((a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0));

  if (highlights.length === 0 && netChanges.length === 0) return null;

  const icons: Record<Highlight["type"], string> = {
    attention: "●",
    worsening: "▲",
    improving: "▼",
  };

  return (
    <div
      className="rounded-2xl shadow-sm border overflow-hidden"
      style={{ background: "#FFFBF5", borderColor: "#FDE68A" }}
    >
      {highlights.length > 0 && (
        <>
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#92400E" }}>
              Highlights
            </p>
          </div>
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid #FEF3C7" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: h.color }}>{icons[h.type]}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: h.color }}>
                    {h.label}
                  </p>
                  <p className="text-sm font-semibold text-navy">{h.symptom}</p>
                </div>
              </div>
              <p className="text-sm font-bold" style={{ color: h.color }}>{h.valueText}</p>
            </div>
          ))}
        </>
      )}

      {netChanges.length > 0 && (
        <>
          <div className="px-5 pt-4 pb-2" style={{ borderTop: highlights.length > 0 ? "1px solid #FDE68A" : "none" }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#92400E" }}>
              Net Changes This Week
            </p>
          </div>
          {netChanges.map((r, i) => {
            const isImproving = r.trend === "improving";
            const color = isImproving ? "#16A34A" : "#DC2626";
            const arrow = isImproving ? "↓" : "↑";
            const desc = isImproving
              ? `${r.label} improved by ${Math.abs(r.change7d!).toFixed(1)} pts`
              : `${r.label} worsened by ${Math.abs(r.change7d!).toFixed(1)} pts`;
            return (
              <div
                key={r.key}
                className="flex items-center justify-between px-5 py-2.5"
                style={{ borderTop: i === 0 ? "none" : "1px solid #FEF3C7" }}
              >
                <p className="text-sm text-slate-700">{desc}</p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-3"
                  style={{ background: isImproving ? "#DCFCE7" : "#FEE2E2", color }}
                >
                  {arrow} {r.trendLabel}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      const p = patients[0];
      setPatient(p);
      const logsData = await api.getLogs(p.id) as DailyLog[];
      setLogs(logsData);
    } catch {
      // silent
    } finally {
      setDataLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) loadData();
  }, [user, isLoading, loadData, router]);

  // Refresh when the tab becomes visible again (e.g. after logging in another tab or returning from settings)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") loadData();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadData]);

  // Stable references for memo deps
  const allMedications = useMemo(() => patient?.medications ?? [], [patient]);

  // Symptom list from user config — controls which symptoms appear in insights.
  // Adding/removing symptoms in settings updates this and immediately re-filters the rows.
  const configuredSymptoms = useMemo(() => {
    if (user?.user_config?.symptoms?.length) return user.user_config.symptoms as string[];
    if (patient?.dashboard_config?.symptoms?.length) return patient.dashboard_config.symptoms as string[];
    return [] as string[];
  }, [user, patient]);

  // Precompute metric rows only when logs, meds, or symptom config change
  const metricRows = useMemo(
    () => buildMetricRows(logs, allMedications, configuredSymptoms),
    [logs, allMedications, configuredSymptoms]
  );

  // Sort symptoms by severity descending
  const symptomRows = useMemo(
    () => metricRows
      .filter((r) => r.unit === "/10")
      .sort((a, b) => (b.latestValue ?? 0) - (a.latestValue ?? 0)),
    [metricRows]
  );
  const healthRows = metricRows.filter((r) => r.unit === "hrs" || r.unit === "oz");
  const lifestyleRows = metricRows.filter((r) => r.unit === "days");
  const adherenceRows = metricRows.filter((r) => r.unit === "%");

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto pt-6 px-4 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-navy">Insights</h1>
          {patient && (
            <p className="text-base text-slate-500 mt-1">{patient.name} · last 7 days change</p>
          )}
        </div>

        {metricRows.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
            <p className="text-lg font-semibold text-navy">No data yet</p>
            <p className="text-base text-slate-500 mt-2">
              Start logging daily to see trends and patterns here.
            </p>
            <Link
              href="/log"
              className="inline-block mt-5 px-6 py-3 rounded-2xl text-white font-semibold text-base"
              style={{ background: "#0D9488" }}
            >
              Log Today
            </Link>
          </div>
        ) : (
          <>
            {/* Highlights card */}
            <HighlightsCard symptomRows={symptomRows} />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

              {symptomRows.length > 0 && (
                <>
                  <SectionHeader title="Symptoms" />
                  {symptomRows.map((r) => <MetricRowItem key={r.key} row={r} />)}
                </>
              )}

              {healthRows.length > 0 && (
                <>
                  <SectionHeader title="Health" />
                  {healthRows.map((r) => <MetricRowItem key={r.key} row={r} />)}
                </>
              )}

              {lifestyleRows.length > 0 && (
                <>
                  <SectionHeader title="Lifestyle" />
                  {lifestyleRows.map((r) => <MetricRowItem key={r.key} row={r} />)}
                </>
              )}

              {adherenceRows.length > 0 && (
                <>
                  <SectionHeader title="Adherence" />
                  {adherenceRows.map((r) => <MetricRowItem key={r.key} row={r} />)}
                </>
              )}

              {/* Bottom padding row */}
              <div className="h-2" />
            </div>
          </>
        )}

        {logs.length < 7 && metricRows.length > 0 && (
          <p className="text-sm text-slate-400 text-center px-4">
            Log at least 7 days to see trend changes. Correlation insights appear after 21 days.
          </p>
        )}

        {/* Scale legend */}
        {symptomRows.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <p className="w-full text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Symptom scale</p>
            {[
              { label: "Mild", color: "#16A34A" },
              { label: "Moderate", color: "#D97706" },
              { label: "Severe", color: "#EA580C" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
