"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, SummaryResponse, AdherenceItem } from "../lib/types";

const PRINT_STYLE = `
@media print {
  @page { margin: 1.8cm 2cm; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #000 !important; background: #fff !important; }
  .no-print { display: none !important; }
  nav, footer { display: none !important; }

  /* Reset page background */
  .print-container { background: #fff !important; padding: 0 !important; min-height: auto !important; }

  /* Show print-only elements */
  .print-report-header, .print-footer { display: block !important; }

  /* Report header */
  .print-report-header { border-bottom: 2px solid #000 !important; padding-bottom: 12pt !important; margin-bottom: 16pt !important; }
  .print-report-title { font-size: 18pt !important; font-weight: bold !important; color: #000 !important; }
  .print-report-meta { font-size: 9pt !important; color: #333 !important; }

  /* Cards become plain sections */
  .insight-card {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
    margin-bottom: 14pt !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .insight-card-header {
    background: #fff !important;
    border-bottom: 1.5px solid #000 !important;
    padding: 0 0 4pt 0 !important;
    margin-bottom: 8pt !important;
  }
  .insight-card-header h2 {
    font-size: 10pt !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    color: #000 !important;
  }
  .insight-card-body {
    background: #fff !important;
    padding: 0 !important;
  }

  /* Text */
  p, li, span { color: #000 !important; font-size: 10.5pt !important; }
  .finding-card {
    background: #fff !important;
    border: none !important;
    border-left: 3px solid #000 !important;
    border-radius: 0 !important;
    padding: 4pt 0 4pt 8pt !important;
    margin-bottom: 6pt !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .finding-card p { font-size: 10pt !important; }
  .finding-significance { color: #444 !important; font-style: italic !important; }

  /* Adherence */
  .adherence-bar-track { background: #ddd !important; }
  .adherence-label { border: 1px solid #000 !important; background: #fff !important; color: #000 !important; }
  .adherence-pct { color: #000 !important; }

  /* Discussion items */
  .discussion-item {
    background: #fff !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 3pt 0 !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .discussion-num {
    background: #000 !important;
    color: #fff !important;
    font-size: 9pt !important;
  }

  /* Bullet dots */
  .lifestyle-dot { background: #000 !important; }

  /* Footer */
  .print-footer {
    border-top: 1px solid #000 !important;
    margin-top: 16pt !important;
    padding-top: 6pt !important;
    font-size: 8pt !important;
    color: #555 !important;
    text-align: center !important;
  }
}
`;


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
          <span className="adherence-label text-sm font-semibold px-2.5 py-1 rounded-full" style={{ background: bgColor, color }}>{label}</span>
          <span className="adherence-pct text-base font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="adherence-bar-track w-full h-3 rounded-full" style={{ background: "#E2E8F0" }}>
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
    <div className="insight-card rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor }}>
      <div className="insight-card-header px-5 py-3 border-b" style={{ background: accentColor, borderColor }}>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="insight-card-body px-5 py-4 space-y-3" style={{ background: bgColor }}>
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function summaryKey(patientId: number) {
  return `truefit_summary_${patientId}`;
}

export default function SummaryPage() {
  const { isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const { user } = useAuth();

  const loadPatient = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      const p = patients[0];
      setPatient(p);
      // Restore saved summary from localStorage
      const stored = localStorage.getItem(summaryKey(p.id));
      if (stored) {
        const parsed = JSON.parse(stored);
        setSummary(parsed.data);
        setSavedAt(parsed.savedAt);
      }
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
    setSavedAt(null);
    try {
      const result = await api.generateSummary(patient.id) as SummaryResponse;
      const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
      setSummary(result);
      setSavedAt(ts);
      localStorage.setItem(summaryKey(patient.id), JSON.stringify({ data: result, savedAt: ts }));
      toast.success("Insights saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  }

  function handleClear() {
    if (!patient) return;
    localStorage.removeItem(summaryKey(patient.id));
    setSummary(null);
    setSavedAt(null);
  }

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{PRINT_STYLE}</style>
    <div className="min-h-screen pb-28 print-container" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Header — screen only */}
        <div className="no-print">
          <h1 className="text-3xl font-bold text-navy">Insights</h1>
          {patient && (
            <p className="text-base text-slate-500 mt-1">{patient.name} · {patient.diagnosis}</p>
          )}
          {savedAt && (
            <p className="text-xs text-slate-400 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />
              Saved · {savedAt}
            </p>
          )}
        </div>

        {/* Print-only report header */}
        {summary && (
          <div className="print-report-header hidden" style={{ display: "none" }}>
            <p style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: "4pt" }}>
              Caregiver Observation Report — AI-Generated Insights
            </p>
            <p className="print-report-title">{patient?.name}</p>
            <div className="print-report-meta" style={{ marginTop: "6pt", lineHeight: "1.6" }}>
              {patient?.diagnosis && <span><strong>Diagnosis:</strong> {patient.diagnosis} &nbsp;·&nbsp; </span>}
              <span><strong>Generated:</strong> {today} &nbsp;·&nbsp; </span>
              <span><strong>Prepared by:</strong> Witness — Caregiver Health Tracking</span>
            </div>
          </div>
        )}

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
                onClick={handleClear}
                className="py-3 px-4 rounded-xl border border-slate-200 text-base font-semibold text-slate-400 flex items-center justify-center gap-2"
                title="Clear saved insights"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
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
                    <div key={i} className="finding-card rounded-xl p-4 border-l-4" style={{ background: "white", borderColor: "#1E40AF" }}>
                      <p className="text-base font-semibold text-navy">{p.finding}</p>
                      <p className="finding-significance text-sm text-slate-500 mt-1">{p.significance}</p>
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
                      <span className="lifestyle-dot w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0" style={{ background: "#0D9488" }} />
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
                    <div key={i} className="discussion-item flex items-start gap-3 p-4 rounded-xl bg-white">
                      <span className="discussion-num text-base font-bold flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm" style={{ background: "#92400E" }}>
                        {i + 1}
                      </span>
                      <p className="text-base text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </InsightCard>
            )}

            {/* Print footer — hidden on screen, shown when printing */}
            <div className="print-footer" style={{ display: "none" }}>
              Generated by Witness · Caregiver Health Tracking · {today}
            </div>

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
    </>
  );
}
