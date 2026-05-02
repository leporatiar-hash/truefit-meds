"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, DailyLog, MedicationTaken, Vitals } from "../lib/types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtMed(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric",
  });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

// ── Aggregate computation ─────────────────────────────────────────────────────

function computeStatusSummary(logs: DailyLog[]): { text: string; warn: boolean } {
  const concernRe = /suicid|command hallucin/i;
  for (const log of logs) {
    if (log.symptoms?.some(s => concernRe.test(s.name))) {
      return { text: "⚠ Concerning — see episode notes", warn: true };
    }
    if (log.episode?.occurred && concernRe.test(log.episode.description || "")) {
      return { text: "⚠ Concerning — see episode notes", warn: true };
    }
  }
  const symptomDays = logs.filter(l => (l.symptoms?.length ?? 0) > 0).length;
  if (symptomDays >= 4) return { text: "Symptomatic — review below", warn: false };
  return { text: "Relatively stable over this period", warn: false };
}

interface MedRow {
  name: string;
  dose: string;
  takenDays: number;
  trackedDays: number;
  missedDates: string[];
}

function computeMedAggregates(logs: DailyLog[], patient: Patient): MedRow[] {
  return patient.medications
    .filter(m => m.active)
    .map(med => {
      let takenDays = 0, trackedDays = 0;
      const missedDates: string[] = [];
      for (const log of logs) {
        const entries = (log.medications_taken ?? [] as MedicationTaken[]).filter(
          (m: MedicationTaken) => m.medication_id === med.id
        );
        if (!entries.length) continue;
        trackedDays++;
        if (entries.some(e => e.taken)) takenDays++;
        else missedDates.push(log.date);
      }
      return { name: med.name, dose: med.dose, takenDays, trackedDays, missedDates };
    })
    .filter(r => r.trackedDays > 0);
}

interface SymptomRow {
  name: string;
  daysReported: number;
  totalDays: number;
  lastDate: string;
}

function computeSymptomTable(logs: DailyLog[]): SymptomRow[] {
  const map = new Map<string, { count: number; lastDate: string }>();
  const total = logs.length;
  for (const log of logs) {
    const seen = new Set<string>();
    for (const s of (log.symptoms ?? [])) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      const existing = map.get(s.name);
      if (existing) {
        existing.count++;
        if (log.date > existing.lastDate) existing.lastDate = log.date;
      } else {
        map.set(s.name, { count: 1, lastDate: log.date });
      }
    }
  }
  return Array.from(map.entries())
    .map(([name, { count, lastDate }]) => ({ name, daysReported: count, totalDays: total, lastDate }))
    .sort((a, b) => b.daysReported - a.daysReported);
}

interface EpisodeRow {
  date: string;
  time: string | null;
  description: string | null;
}

function computeEpisodes(logs: DailyLog[]): EpisodeRow[] {
  return logs
    .filter(l => l.episode?.occurred)
    .map(l => ({
      date: l.date,
      time: (l.episode as { occurred: boolean; time?: string; description?: string }).time || null,
      description: (l.episode as { occurred: boolean; time?: string; description?: string }).description || null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

interface VitalsRange {
  hrMin: number | null;
  hrMax: number | null;
  hrAvg: number | null;
  bpValues: string[];
}

function computeVitalsRange(logs: DailyLog[]): VitalsRange {
  const hrs: number[] = [];
  const bpSet = new Set<string>();
  for (const log of logs) {
    if (!log.vitals) continue;
    const v = log.vitals as Vitals;
    const hr = parseInt(v.heart_rate || "");
    if (!isNaN(hr)) hrs.push(hr);
    if (v.blood_pressure?.trim()) bpSet.add(v.blood_pressure.trim());
  }
  return {
    hrMin: hrs.length ? Math.min(...hrs) : null,
    hrMax: hrs.length ? Math.max(...hrs) : null,
    hrAvg: hrs.length ? Math.round(hrs.reduce((a, b) => a + b) / hrs.length) : null,
    bpValues: Array.from(bpSet),
  };
}

interface ActivityRow { type: string; daysActive: number }

function computeActivities(logs: DailyLog[]): ActivityRow[] {
  const map = new Map<string, number>();
  for (const log of logs) {
    const seen = new Set<string>();
    for (const a of (log.activities ?? [])) {
      if (seen.has(a.type)) continue;
      seen.add(a.type);
      map.set(a.type, (map.get(a.type) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([type, daysActive]) => ({
      type: type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      daysActive,
    }))
    .sort((a, b) => b.daysActive - a.daysActive);
}

// ── Print stylesheet ──────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; margin: 0; }
  .no-print { display: none !important; }
  .print-page { background: #fff !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; }
  .section-rule { border-top: 1.5px solid #000 !important; }
  .section-title { color: #000 !important; border-bottom: 1.5px solid #000 !important; }
  table { width: 100%; border-collapse: collapse; }
  th { font-weight: bold; border-bottom: 1.5px solid #000; padding: 3pt 8pt 3pt 0; text-align: left; }
  td { border-bottom: 0.5px solid #bbb; padding: 3pt 8pt 3pt 0; vertical-align: top; }
  .status-badge { border: 1px solid #000 !important; background: #fff !important; color: #000 !important; }
  h1 { font-size: 16pt; }
}
`;

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, children, accent = "#0D1B2A",
}: {
  title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="mb-7">
      <h2
        className="section-title text-xs font-bold uppercase tracking-widest pb-1.5 mb-4 border-b-2"
        style={{ color: accent, borderColor: accent }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Clinical report ───────────────────────────────────────────────────────────

function ClinicalReport({
  patient, logs, userName,
}: {
  patient: Patient;
  logs: DailyLog[];
  userName: string | undefined;
}) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const startDate = logs.length ? fmtShort(logs[0].date) : "—";
  const endDate = logs.length ? fmtShort(logs[logs.length - 1].date) : "—";
  const totalDays = logs.length;

  const status = computeStatusSummary(logs);
  const medRows = computeMedAggregates(logs, patient);
  const symptomRows = computeSymptomTable(logs);
  const episodes = computeEpisodes(logs);
  const vitals = computeVitalsRange(logs);
  const activityRows = computeActivities(logs);
  const noteEntries = [...logs]
    .filter(l => l.notes?.trim())
    .sort((a, b) => a.date.localeCompare(b.date));

  const hasVitals = vitals.hrMin !== null || vitals.bpValues.length > 0;

  return (
    <div className="print-page bg-white rounded-2xl shadow-sm border border-slate-100 p-6">

      {/* ── Report header ── */}
      <div className="mb-7 pb-5 border-b-2 border-slate-300">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Caregiver Observation Report
        </p>
        <h1 className="text-2xl font-bold text-navy">{patient.name}</h1>

        <div className="mt-3 text-sm text-slate-600 space-y-0.5">
          {patient.diagnosis && (
            <p><span className="font-semibold">Diagnosis:</span> {patient.diagnosis}</p>
          )}
          <p>
            <span className="font-semibold">Reporting period:</span>{" "}
            {startDate} – {endDate}{" "}
            <span className="text-slate-400">({totalDays} day{totalDays !== 1 ? "s" : ""} logged)</span>
          </p>
          <p><span className="font-semibold">Generated:</span> {today}</p>
          <p><span className="font-semibold">Prepared by:</span> Advocate — Caregiver Health Tracking</p>
        </div>

        {/* Status summary */}
        {totalDays > 0 && (
          <div
            className="status-badge mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold inline-block"
            style={{
              background: status.warn ? "#FEF2F2" : "#F0FDF4",
              color: status.warn ? "#991B1B" : "#14532D",
              border: `1.5px solid ${status.warn ? "#FECACA" : "#86EFAC"}`,
            }}
          >
            {status.text}
          </div>
        )}
      </div>

      {totalDays === 0 ? (
        <p className="text-slate-400 text-base py-8 text-center">No logs found for this period.</p>
      ) : (
        <>
          {/* ── Medications ── */}
          {medRows.length > 0 && (
            <Section title="Medications" accent="#0D9488">
              <table>
                <thead>
                  <tr>
                    <th className="text-xs text-slate-500 font-semibold">Medication</th>
                    <th className="text-xs text-slate-500 font-semibold">Dose</th>
                    <th className="text-xs text-slate-500 font-semibold">Days Taken</th>
                    <th className="text-xs text-slate-500 font-semibold">Missed Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {medRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-sm font-semibold text-navy py-2">{row.name}</td>
                      <td className="text-sm text-slate-600 py-2">{row.dose || "—"}</td>
                      <td className="text-sm text-slate-700 py-2">{row.takenDays} of {row.trackedDays}</td>
                      <td className="text-sm text-slate-500 py-2">
                        {row.missedDates.length === 0
                          ? <span className="text-slate-300">—</span>
                          : row.missedDates.map(d => fmtMed(d)).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Symptoms ── */}
          {symptomRows.length > 0 && (
            <Section title="Symptoms" accent="#1E40AF">
              <table>
                <thead>
                  <tr>
                    <th className="text-xs text-slate-500 font-semibold w-1/2">Symptom</th>
                    <th className="text-xs text-slate-500 font-semibold">Days Reported</th>
                    <th className="text-xs text-slate-500 font-semibold">Last Occurrence</th>
                  </tr>
                </thead>
                <tbody>
                  {symptomRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-sm font-semibold text-navy py-2">{row.name}</td>
                      <td className="text-sm text-slate-700 py-2">{row.daysReported} / {row.totalDays}</td>
                      <td className="text-sm text-slate-500 py-2">{fmtMed(row.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Episodes ── */}
          <Section title="Episodes" accent="#7C3AED">
            {episodes.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No acute episodes logged in this period.</p>
            ) : (
              <div className="space-y-3">
                {episodes.map((ep, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="font-semibold text-navy flex-shrink-0 min-w-[140px]">
                      {fmtMed(ep.date)}{ep.time ? `, ${ep.time}` : ""}
                    </span>
                    <span className="text-slate-700 leading-relaxed">
                      {ep.description ?? <span className="italic text-slate-400">No description logged.</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Vitals ── */}
          {hasVitals && (
            <Section title="Vitals" accent="#0D1B2A">
              <div className="space-y-2 text-sm">
                {vitals.hrMin !== null && (
                  <p className="text-slate-700">
                    <span className="font-semibold text-navy">Heart Rate:</span>{" "}
                    {vitals.hrMin}–{vitals.hrMax} bpm over period (avg: {vitals.hrAvg})
                  </p>
                )}
                {vitals.bpValues.length > 0 && (
                  <p className="text-slate-700">
                    <span className="font-semibold text-navy">Blood Pressure:</span>{" "}
                    {vitals.bpValues.join(", ")}
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* ── Caregiver Observations ── */}
          {noteEntries.length > 0 && (
            <Section title="Caregiver Observations" accent="#166534">
              <div className="space-y-3">
                {noteEntries.map((log, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="font-semibold text-navy flex-shrink-0 min-w-[80px]">
                      {fmtMed(log.date)}
                    </span>
                    <span className="text-slate-700 leading-relaxed whitespace-pre-wrap">{log.notes}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Functional Engagement ── */}
          {activityRows.length > 0 && (
            <Section title="Functional Engagement" accent="#92400E">
              <table>
                <thead>
                  <tr>
                    <th className="text-xs text-slate-500 font-semibold w-1/2">Activity</th>
                    <th className="text-xs text-slate-500 font-semibold">Days Active</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-sm font-semibold text-navy py-2">{row.type}</td>
                      <td className="text-sm text-slate-700 py-2">{row.daysActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
        Generated by Advocate · Caregiver Health Tracking · {today}
        {userName ? ` · Submitted by ${userName}` : ""}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrintPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [range, setRange] = useState<7 | 30>(7);

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

  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - range);
    return d.toISOString().split("T")[0];
  })();

  const filtered = [...logs]
    .filter(l => l.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));

  const fmtShortLocal = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>

      <div className="min-h-screen pb-28" style={{ background: "#F8FAFC" }}>
        <div className="no-print">
          <NavBar />
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6">

          {/* Controls */}
          <div className="no-print mb-6 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-navy">Print Report</h1>
              <p className="text-base text-slate-500 mt-1">Generate a clinical summary for the doctor.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <p className="text-sm font-semibold text-slate-600">Reporting period</p>
              <div className="flex gap-3">
                {([7, 30] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRange(r)}
                    className="flex-1 py-3 rounded-xl border-2 text-base font-semibold transition-all"
                    style={{
                      borderColor: range === r ? "#0D9488" : "#CBD5E1",
                      background: range === r ? "#0D9488" : "white",
                      color: range === r ? "white" : "#334155",
                    }}
                  >Last {r} days</button>
                ))}
              </div>
              <p className="text-sm text-slate-400">
                {filtered.length} log{filtered.length !== 1 ? "s" : ""} found
                {filtered.length > 0 && ` (${fmtShortLocal(filtered[0].date)} – ${fmtShortLocal(filtered[filtered.length - 1].date)})`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #0D9488, #0B7A70)" }}
            >
              Print / Save as PDF
            </button>
          </div>

          {patient && (
            <ClinicalReport
              patient={patient}
              logs={filtered}
              userName={user?.name}
            />
          )}

        </div>
      </div>
    </>
  );
}
