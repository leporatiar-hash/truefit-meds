"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, calculateStreak } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, DailyLog } from "../lib/types";

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ── Today checklist row ───────────────────────────────────────────────────────

function TodayRow({
  label,
  summary,
  done,
  href,
}: {
  label: string;
  summary: string;
  done: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-slate-50"
      style={{ borderBottom: "1px solid #F1F5F9" }}
    >
      {/* Status icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: done ? "#CCFBF1" : "#F1F5F9" }}
      >
        {done ? (
          <svg className="w-4 h-4" style={{ color: "#0D9488" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "#CBD5E1" }} />
        )}
      </div>

      {/* Label + summary */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold" style={{ color: done ? "#0D1B2A" : "#334155" }}>{label}</p>
        <p className="text-sm mt-0.5" style={{ color: done ? "#0B7A70" : "#94A3B8" }}>{summary}</p>
      </div>

      {/* Chevron */}
      <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#CBD5E1" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      const p = patients[0];
      setPatient(p);

      const [logsData, todayData] = await Promise.all([
        api.getLogs(p.id) as Promise<DailyLog[]>,
        api.getTodayLog(p.id) as Promise<DailyLog | null>,
      ]);
      setLogs(logsData);
      setTodayLog(todayData);
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

  const calcStreak = calculateStreak(logs);

  // This month stats
  const thisMonth = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return logs.filter((l) => l.date >= start.toISOString().split("T")[0]);
  })();

  const monthAdherence = (() => {
    let taken = 0, total = 0;
    thisMonth.forEach((l) => {
      (l.medications_taken || []).forEach((m) => { total++; if (m.taken) taken++; });
    });
    return total > 0 ? Math.round((taken / total) * 100) : null;
  })();

  // Today checklist items
  const medsDone = !!(todayLog?.medications_taken?.some(m => m.taken));
  const medsSummary = todayLog?.medications_taken
    ? `${todayLog.medications_taken.filter(m => m.taken).length} of ${todayLog.medications_taken.length} taken`
    : "Not recorded";

  const symptomsDone = !!(todayLog?.symptoms?.length);
  const symptomsSummary = symptomsDone ? "Recorded" : "Not recorded";

  const sleepDone = todayLog?.sleep_hours != null;
  const sleepSummary = sleepDone
    ? `${todayLog!.sleep_hours}hrs sleep${todayLog!.water_intake_oz ? ` · ${todayLog!.water_intake_oz}oz water` : ""}`
    : "Not recorded";

  const notesDone = !!(todayLog?.notes?.trim());
  const notesSummary = notesDone ? "Added" : "Optional";

  const completedCount = [medsDone, symptomsDone, sleepDone].filter(Boolean).length;
  const totalRequired = 3;
  const allDone = completedCount === totalRequired;

  const ctaLabel = !todayLog ? "Start Today's Log" : allDone ? "Review Today's Log" : "Continue Today";
  const ctaHref = !todayLog ? "/log" : allDone ? "/log" : "/log";

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

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-navy">
            Good {getTimeOfDay()}, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="text-base text-slate-500 mt-1">
            {patient ? `Here's how ${patient.name} is doing.` : "Welcome back."}
          </p>
        </div>

        {patient ? (
          <>
            {/* Patient card — compact */}
            <div className="rounded-2xl px-5 py-4 flex items-center justify-between text-white" style={{ background: "#0D1B2A" }}>
              <div>
                <p className="text-slate-400 text-sm font-medium">{patient.diagnosis}</p>
                <p className="text-xl font-bold mt-0.5">{patient.name}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Streak</p>
                <p className="text-3xl font-bold" style={{ color: "#0D9488" }}>{calcStreak}<span className="text-base font-normal text-slate-400 ml-1">days</span></p>
              </div>
            </div>

            {/* Streak = 0 nudge */}
            {calcStreak === 0 && (
              <div className="rounded-2xl px-5 py-4 border" style={{ background: "#FFF8EC", borderColor: "#FDE68A" }}>
                <p className="text-base font-medium" style={{ color: "#92400E" }}>
                  Start logging today — every entry helps {patient.name}&apos;s doctor understand them better.
                </p>
              </div>
            )}

            {/* Today checklist card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy">Today</h2>
                <span className="text-sm font-semibold" style={{ color: completedCount === totalRequired ? "#0D9488" : "#94A3B8" }}>
                  {completedCount}/{totalRequired} done
                </span>
              </div>

              <div>
                <TodayRow label="Medications" summary={medsSummary} done={medsDone} href="/log#medications" />
                <TodayRow label="Symptoms" summary={symptomsSummary} done={symptomsDone} href="/log#symptoms" />
                <TodayRow label="Sleep & Hydration" summary={sleepSummary} done={sleepDone} href="/log#sleep" />
                <TodayRow label="Notes" summary={notesSummary} done={notesDone} href="/log#notes" />
              </div>

              {/* Progress bar inside card */}
              <div className="mx-5 mb-5 mt-3">
                <div className="w-full h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / totalRequired) * 100}%`, background: "#0D9488" }}
                  />
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <Link
              href={ctaHref}
              className="block w-full py-5 rounded-3xl text-center text-white font-bold text-xl shadow-lg transition-transform active:scale-[0.98]"
              style={{ background: allDone ? "#0B7A70" : "linear-gradient(135deg, #0D9488, #0B7A70)" }}
            >
              {ctaLabel}
            </Link>

            {/* Stats row */}
            <div className="flex gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-1 text-center">
                <p className="text-3xl font-bold text-navy">{monthAdherence !== null ? `${monthAdherence}%` : "—"}</p>
                <p className="text-sm text-slate-500 mt-1">Adherence this month</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-1 text-center">
                <p className="text-3xl font-bold text-navy">{thisMonth.length}</p>
                <p className="text-sm text-slate-500 mt-1">Days logged</p>
              </div>
            </div>

            {/* Summary shortcut */}
            <Link
              href="/summary"
              className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 transition-colors active:bg-slate-50"
            >
              <div>
                <p className="text-base font-semibold text-navy">AI Insights</p>
                <p className="text-sm text-slate-500 mt-0.5">Generate a doctor-ready summary</p>
              </div>
              <svg className="w-5 h-5" style={{ color: "#0D9488" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500 text-base mb-4">No patient profile yet.</p>
            <Link href="/onboarding" className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-base" style={{ background: "#0D9488" }}>
              Set up patient
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
