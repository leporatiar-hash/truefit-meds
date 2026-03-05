"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, DailyLog } from "../lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function severityLabel(v: number) {
  if (v <= 2) return "Minimal";
  if (v <= 4) return "Mild";
  if (v <= 7) return "Moderate";
  return "Severe";
}

// ── Print styles injected at render time ──────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body { font-family: Georgia, serif; font-size: 11pt; color: #000; background: #fff; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  h1, h2, h3 { page-break-after: avoid; }
  table { page-break-inside: avoid; }
}
`;

// ── Log Day Card ──────────────────────────────────────────────────────────────

function DayCard({ log, patient }: { log: DailyLog; patient: Patient }) {
  const meds = log.medications_taken ?? [];
  const symptoms = log.symptoms ?? [];
  const activities = log.activities ?? [];
  const ep = log.episode;
  const vt = log.vitals;

  const takenCount = meds.filter(m => m.taken).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 print:mb-3 print:border-slate-300">
      {/* Date header */}
      <div className="px-5 py-3 font-bold text-base" style={{ background: "#0D1B2A", color: "white" }}>
        {fmt(log.date)}
      </div>

      <div className="px-5 py-4 space-y-4 bg-white">
        {/* Medications */}
        {meds.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Medications ({takenCount}/{meds.length} taken)</p>
            <div className="space-y-1">
              {meds.map(m => {
                const med = patient.medications.find(pm => pm.id === m.medication_id);
                const medName = med?.name ?? `Medication #${m.medication_id}`;
                return (
                  <div key={m.medication_id} className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{m.taken ? "✓" : "✗"}</span>
                    <span style={{ color: m.taken ? "#0D9488" : "#94A3B8" }}>
                      {medName}{m.time_taken ? ` at ${m.time_taken}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Symptoms */}
        {symptoms.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Symptoms</p>
            <div className="space-y-1">
              {symptoms.map(s => (
                <div key={s.name} className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-navy min-w-[160px]">{s.name}</span>
                  <span className="text-slate-600">
                    {s.severity}/10 — {severityLabel(s.severity)}
                    {s.worse_than_usual && <span className="ml-2 text-orange-600 font-semibold">(worse than usual)</span>}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Episode */}
        {ep && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Episode</p>
            {ep.occurred ? (
              <div className="text-sm space-y-1">
                <p className="font-semibold text-red-700">Episode occurred{ep.time ? ` at ${ep.time}` : ""}</p>
                {ep.description && <p className="text-slate-700">{ep.description}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No episode</p>
            )}
          </section>
        )}

        {/* Vitals */}
        {vt && (vt.heart_rate || vt.blood_pressure) && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Vitals</p>
            <div className="flex gap-6 text-sm">
              {vt.heart_rate && <span><span className="text-slate-400">HR</span> <strong>{vt.heart_rate} bpm</strong></span>}
              {vt.blood_pressure && <span><span className="text-slate-400">BP</span> <strong>{vt.blood_pressure}</strong></span>}
            </div>
          </section>
        )}

        {/* Sleep & Hydration */}
        {(log.sleep_hours != null || log.water_intake_oz != null) && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sleep & Hydration</p>
            <div className="flex gap-6 text-sm">
              {log.sleep_hours != null && <span><span className="text-slate-400">Sleep</span> <strong>{log.sleep_hours} hrs</strong></span>}
              {log.water_intake_oz != null && <span><span className="text-slate-400">Water</span> <strong>{log.water_intake_oz} oz</strong></span>}
            </div>
          </section>
        )}

        {/* Mood */}
        {log.mood_score != null && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mood</p>
            <p className="text-sm"><strong>{log.mood_score}/10</strong></p>
          </section>
        )}

        {/* Activities */}
        {activities.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Activities</p>
            <p className="text-sm text-slate-700">{activities.map(a => a.type.replace("_", " ")).join(", ")}</p>
          </section>
        )}

        {/* Notes */}
        {log.notes?.trim() && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

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

  const filtered = logs
    .filter(l => l.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));

  const printedOn = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{PRINT_STYLE}</style>

      <div className="min-h-screen pb-28" style={{ background: "#F8FAFC" }}>
        <div className="no-print">
          <NavBar />
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6">

          {/* Controls — hidden on print */}
          <div className="no-print mb-6 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-navy">Print Report</h1>
              <p className="text-base text-slate-500 mt-1">Generate a clean summary for the doctor.</p>
            </div>

            {/* Range selector */}
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
                {filtered.length > 0 && ` (${fmtShort(filtered[0].date)} – ${fmtShort(filtered[filtered.length - 1].date)})`}
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

          {/* Printable report */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 print:shadow-none print:border-none print:rounded-none print:p-0">

            {/* Report header */}
            <div className="mb-6 pb-4 border-b-2 border-slate-200">
              <h1 className="text-2xl font-bold text-navy print:text-3xl">Clinical Observation Report</h1>
              {patient && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-base text-slate-700"><span className="font-semibold">Patient:</span> {patient.name}</p>
                  {patient.diagnosis && <p className="text-base text-slate-700"><span className="font-semibold">Diagnosis:</span> {patient.diagnosis}</p>}
                  <p className="text-base text-slate-700"><span className="font-semibold">Reporting period:</span> Last {range} days ({filtered.length} days logged)</p>
                  <p className="text-base text-slate-700"><span className="font-semibold">Prepared by:</span> {user?.name}</p>
                  <p className="text-base text-slate-700"><span className="font-semibold">Printed on:</span> {printedOn}</p>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="text-slate-500 text-base py-8 text-center">No logs found for this period.</p>
            ) : (
              <div>
                {filtered.map(log => (
                  <DayCard key={log.id} log={log} patient={patient!} />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
              Generated by Witness · {printedOn}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
