"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import {
  buildMetricRows, formatValue, formatChange,
  type MetricRow, type MetricPoint,
} from "../lib/insights";
import type { Patient, DailyLog } from "../lib/types";

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

function MetricRowItem({ row }: { row: MetricRow }) {
  const { text: changeText, color: changeColor, direction } = formatChange(
    row.change7d, row.unit, row.higherIsBetter
  );
  const sparkColor = direction === "neutral" ? "#94A3B8" : changeColor;
  const latestText = row.latestValue !== null ? formatValue(row.latestValue, row.unit) : "—";

  return (
    <Link
      href={`/insights/${row.key}`}
      className="flex items-center gap-3 px-5 py-4 transition-colors active:bg-slate-50"
      style={{ borderBottom: "1px solid #F1F5F9" }}
    >
      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-navy truncate">{row.label}</p>
        <p className="text-sm text-slate-400 mt-0.5">
          {row.unit === "days" ? "lifestyle" :
           row.unit === "%" ? "adherence" :
           row.unit === "/10" ? "severity" : row.unit}
        </p>
      </div>

      {/* Sparkline */}
      <Sparkline points={row.points7d} color={sparkColor} />

      {/* Value + change */}
      <div className="text-right flex-shrink-0 min-w-[72px]">
        <p className="text-base font-bold text-navy">{latestText}</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: changeColor }}>
          {direction !== "neutral" && (direction === "up" ? "▲ " : "▼ ")}{changeText}
        </p>
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

  // Refresh when window regains focus (e.g. after logging)
  useEffect(() => {
    function onFocus() { if (!dataLoading) loadData(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData, dataLoading]);

  // Precompute metric rows only when logs change
  const allMedications = patient?.medications ?? [];
  const metricRows = useMemo(
    () => buildMetricRows(logs, allMedications),
    [logs, allMedications]
  );

  const symptomRows = metricRows.filter((r) => r.unit === "/10");
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
        )}

        {logs.length < 7 && metricRows.length > 0 && (
          <p className="text-sm text-slate-400 text-center px-4">
            Log at least 7 days to see trend changes. Correlation insights appear after 21 days.
          </p>
        )}
      </div>
    </div>
  );
}
