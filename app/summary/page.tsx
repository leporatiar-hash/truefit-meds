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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy">{item.medication}</span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: bgColor, color }}
          >
            {label}
          </span>
          <span className="text-sm font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: "#E2E8F0" }}>
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-xs text-slate-400">
        {item.days_taken}/{item.days_logged} days taken
        {item.notes ? ` · ${item.notes}` : ""}
      </p>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
      <h2 className="font-semibold text-navy flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const loadPatient = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      setPatient(patients[0]);
    } catch {
      // silent
    } finally {
      setPageLoading(false);
    }
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
      toast.error(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 print-container" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Doctor Summary</h1>
          {patient && (
            <p className="text-slate-500 text-sm mt-0.5">
              {patient.name} · {patient.diagnosis}
            </p>
          )}
        </div>

        {/* Generate button */}
        {!summary && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "#CCFBF1" }}>
              <svg className="w-8 h-8" style={{ color: "#0D9488" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-navy">Generate AI Summary</p>
              <p className="text-sm text-slate-500 mt-1">
                Analyzes the last 30 days of logs and produces a doctor-ready clinical summary using OpenAI.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all"
              style={{ background: "#0D9488" }}
            >
              {generating ? "Generating summary…" : "Generate Summary"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {generating && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
            <div className="text-center">
              <p className="font-medium text-navy">Analyzing 30 days of data…</p>
              <p className="text-sm text-slate-400 mt-1">OpenAI is reviewing logs, calculating patterns, and drafting your summary.</p>
            </div>
          </div>
        )}

        {/* Results */}
        {summary && (
          <>
            {/* Export actions */}
            <div className="flex gap-2 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / PDF
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>

            {/* Executive Summary */}
            <SectionCard title="Executive Summary" icon="📋">
              <p className="text-sm leading-relaxed text-slate-700">{summary.executive_summary}</p>
            </SectionCard>

            {/* Adherence */}
            {summary.adherence && summary.adherence.length > 0 && (
              <SectionCard title="Medication Adherence" icon="💊">
                <div className="space-y-4">
                  {summary.adherence.map((item, i) => (
                    <AdherenceBar key={i} item={item} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Key Patterns */}
            {summary.patterns && summary.patterns.length > 0 && (
              <SectionCard title="Key Patterns" icon="📊">
                <div className="space-y-3">
                  {summary.patterns.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 border-l-4"
                      style={{ background: "#F0FDF4", borderColor: "#0D9488" }}
                    >
                      <p className="text-sm font-medium text-navy">{p.finding}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.significance}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Lifestyle Notes */}
            {summary.lifestyle_notes && summary.lifestyle_notes.length > 0 && (
              <SectionCard title="Lifestyle Observations" icon="🌿">
                <ul className="space-y-2">
                  {summary.lifestyle_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-teal mt-0.5 flex-shrink-0" style={{ color: "#0D9488" }}>•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* Discussion Items */}
            {summary.discussion_items && summary.discussion_items.length > 0 && (
              <SectionCard title="Bring Up at Appointment" icon="🩺">
                <div className="space-y-2">
                  {summary.discussion_items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "#FFF8EC" }}
                    >
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#D97706" }}>
                        {i + 1}.
                      </span>
                      <p className="text-sm text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Regenerate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 no-print"
            >
              Regenerate Summary
            </button>
          </>
        )}
      </div>
    </div>
  );
}
