"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, SummaryResponse, AdherenceItem } from "../lib/types";

// ── Adherence bar ─────────────────────────────────────────────────────────────

function AdherenceBar({ item }: { item: AdherenceItem }) {
  const pct = Math.min(100, Math.max(0, item.percentage));
  const color = pct >= 85 ? "#16A34A" : pct >= 70 ? "#D97706" : "#DC2626";
  const bgColor = pct >= 85 ? "#DCFCE7" : pct >= 70 ? "#FEF3C7" : "#FEE2E2";
  const label = pct >= 85 ? "Good" : pct >= 70 ? "Fair" : "Low";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-navy">{item.medication}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold px-2.5 py-1 rounded-full" style={{ background: bgColor, color }}>{label}</span>
          <span className="text-base font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="w-full h-3 rounded-full" style={{ background: "#E2E8F0" }}>
        <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-sm text-slate-400">{item.days_taken}/{item.days_logged} days taken{item.notes ? ` · ${item.notes}` : ""}</p>
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({
  title, accentColor, bgColor, borderColor, children,
}: {
  title: string; accentColor: string; bgColor: string; borderColor: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor }}>
      <div className="px-5 py-3 border-b" style={{ background: accentColor, borderColor }}>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-3" style={{ background: bgColor }}>
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const { user } = useAuth();

  const loadPatient = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      setPatient(patients[0]);
    } catch { /* silent */ } finally { setPageLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) loadPatient();
  }, [user, isLoading, loadPatient, router]);

  async function handleGenerate() {
    if (!patient) return;
    setGenerating(true);
    setSummary(null);
    try {
      const result = await api.generateSummary(patient.id) as SummaryResponse;
      setSummary(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 print-container" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-navy">Insights</h1>
          {patient && (
            <p className="text-base text-slate-500 mt-1">{patient.name} · {patient.diagnosis}</p>
          )}
        </div>

        {/* Generate prompt */}
        {!summary && !generating && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "#CCFBF1" }}>
              <svg className="w-7 h-7" style={{ color: "#0D9488" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy">Ready to generate insights</p>
              <p className="text-base text-slate-500 mt-1">
                Analyzes the last 30 days of logs and produces a doctor-ready summary.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="w-full py-4 rounded-2xl font-bold text-white text-base"
              style={{ background: "linear-gradient(135deg, #0D9488, #0B7A70)" }}
            >
              Generate Insights
            </button>
          </div>
        )}

        {/* Loading */}
        {generating && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col items-center gap-5">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
            <div className="text-center">
              <p className="text-lg font-semibold text-navy">Analyzing 30 days of data</p>
              <p className="text-base text-slate-400 mt-1">Reviewing logs, calculating patterns, drafting your summary.</p>
            </div>
          </div>
        )}

        {/* Results — stacked insight cards */}
        {summary && (
          <>
            {/* Export row */}
            <div className="flex gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-base font-semibold text-slate-600 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / PDF
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-base font-semibold text-slate-600 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>

            {/* Executive Summary */}
            <InsightCard title="Executive Summary" accentColor="#0D1B2A" bgColor="white" borderColor="#E2E8F0">
              <p className="text-base leading-relaxed text-slate-700">{summary.executive_summary}</p>
            </InsightCard>

            {/* Adherence */}
            {summary.adherence?.length > 0 && (
              <InsightCard title="Adherence" accentColor="#0D9488" bgColor="#F0FDFA" borderColor="#99F6E4">
                <div className="space-y-5">
                  {summary.adherence.map((item, i) => <AdherenceBar key={i} item={item} />)}
                </div>
              </InsightCard>
            )}

            {/* Patterns */}
            {summary.patterns?.length > 0 && (
              <InsightCard title="Patterns" accentColor="#1E40AF" bgColor="#F0F9FF" borderColor="#BAE6FD">
                <div className="space-y-3">
                  {summary.patterns.map((p, i) => (
                    <div key={i} className="rounded-xl p-4 border-l-4" style={{ background: "white", borderColor: "#1E40AF" }}>
                      <p className="text-base font-semibold text-navy">{p.finding}</p>
                      <p className="text-sm text-slate-500 mt-1">{p.significance}</p>
                    </div>
                  ))}
                </div>
              </InsightCard>
            )}

            {/* Lifestyle */}
            {summary.lifestyle_notes?.length > 0 && (
              <InsightCard title="Lifestyle Notes" accentColor="#166534" bgColor="#F0FDF4" borderColor="#86EFAC">
                <ul className="space-y-2">
                  {summary.lifestyle_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0" style={{ background: "#0D9488" }} />
                      {note}
                    </li>
                  ))}
                </ul>
              </InsightCard>
            )}

            {/* Discussion items */}
            {summary.discussion_items?.length > 0 && (
              <InsightCard title="Bring Up at the Appointment" accentColor="#92400E" bgColor="#FFFBF0" borderColor="#FDE68A">
                <div className="space-y-3">
                  {summary.discussion_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white">
                      <span className="text-base font-bold flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm" style={{ background: "#92400E" }}>
                        {i + 1}
                      </span>
                      <p className="text-base text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </InsightCard>
            )}

            {/* Regenerate */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 text-base font-semibold text-slate-400 no-print transition-colors hover:border-slate-300"
            >
              Regenerate Insights
            </button>
          </>
        )}
      </div>
    </div>
  );
}
