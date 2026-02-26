"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, calculateStreak } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, DailyLog } from "../lib/types";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-1">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: "#0D1B2A" }}>{value}</p>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

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
      if (!patients.length) {
        router.push("/onboarding");
        return;
      }
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
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!isLoading && user) loadData();
  }, [user, isLoading, loadData, router]);

  const streak = calculateStreak(logs);

  const thisMonth = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = start.toISOString().split("T")[0];
    return logs.filter((l) => l.date >= startStr);
  })();

  const monthAdherence = (() => {
    if (!thisMonth.length) return null;
    let taken = 0, total = 0;
    thisMonth.forEach((l) => {
      (l.medications_taken || []).forEach((m) => {
        total++;
        if (m.taken) taken++;
      });
    });
    return total > 0 ? Math.round((taken / total) * 100) : null;
  })();

  const avgSymptom = (() => {
    if (!thisMonth.length) return null;
    let sum = 0, count = 0;
    thisMonth.forEach((l) => {
      (l.symptoms || []).forEach((s) => {
        sum += s.severity;
        count++;
      });
    });
    return count > 0 ? (sum / count).toFixed(1) : null;
  })();

  const todayComplete = todayLog !== null;
  const missedToday = !todayComplete;

  const last7 = logs.filter((l) => {
    const d = new Date(l.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });
  const alertDays = last7.filter((l) =>
    (l.symptoms || []).some((s) => s.severity >= 7)
  );

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Warm greeting */}
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
            {/* Patient card */}
            <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: "#0D1B2A" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wide font-semibold">Patient</p>
                  <h2 className="text-2xl font-bold mt-1">{patient.name}</h2>
                  <p className="text-slate-300 text-base mt-0.5">{patient.diagnosis}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm uppercase tracking-wide font-semibold">Streak</p>
                  <div className="flex items-center gap-1.5 justify-end mt-1">
                    <span className="text-3xl font-bold" style={{ color: "#0D9488" }}>{streak}</span>
                    <span className="text-slate-300 text-base">days</span>
                  </div>
                  <p className="text-slate-400 text-sm">consecutive</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  {patient.medications.filter((m) => m.active).length} active medications
                </p>
              </div>
            </div>

            {/* Streak = 0 motivational message */}
            {streak === 0 && (
              <div className="rounded-2xl p-4 border" style={{ background: "#FFF8EC", borderColor: "#F59E0B" }}>
                <p className="text-base font-medium leading-snug" style={{ color: "#92400E" }}>
                  Start logging today — every entry helps {patient.name}&apos;s doctor understand them better.
                </p>
              </div>
            )}

            {/* Today's status */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: todayComplete ? "#CCFBF1" : "#FFF8EC",
                borderColor: todayComplete ? "#0D9488" : "#F59E0B",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: todayComplete ? "#0D9488" : "#F59E0B" }}
                >
                  {todayComplete ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-base" style={{ color: "#0D1B2A" }}>
                    {todayComplete ? "Today's log is complete" : "Today hasn't been logged yet"}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: todayComplete ? "#0B7A70" : "#B45309" }}>
                    {todayComplete
                      ? "Great job keeping the streak alive!"
                      : "Tap 'Log Today' below to record today's health data."}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
              <StatCard
                label="Monthly adherence"
                value={monthAdherence !== null ? `${monthAdherence}%` : "—"}
                sub={`${thisMonth.length} days logged`}
              />
              <StatCard
                label="Avg symptom score"
                value={avgSymptom ?? "—"}
                sub="this month (1–10)"
              />
            </div>

            {/* AI Alert */}
            {alertDays.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FEF3C7" }}>
                    <svg className="w-5 h-5" style={{ color: "#D97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-navy">Pattern detected</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {alertDays.length} high-symptom day{alertDays.length !== 1 ? "s" : ""} in the last 7 days. Consider generating an AI summary before the next appointment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Log Today CTA — large, prominent */}
            {missedToday && (
              <Link
                href="/log"
                className="block w-full py-6 rounded-3xl text-center text-white font-bold text-2xl shadow-xl transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, #0D9488, #0B7A70)" }}
              >
                Log Today
              </Link>
            )}

            {todayComplete && (
              <div className="flex gap-3">
                <Link
                  href="/log"
                  className="flex-1 py-4 rounded-2xl text-center font-semibold text-base border-2 transition-colors"
                  style={{ borderColor: "#0D9488", color: "#0D9488" }}
                >
                  Edit Today&apos;s Log
                </Link>
                <Link
                  href="/summary"
                  className="flex-1 py-4 rounded-2xl text-center text-white font-semibold text-base"
                  style={{ background: "#0D9488" }}
                >
                  View Summary
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500 text-base mb-4">No patient profile yet.</p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-base"
              style={{ background: "#0D9488" }}
            >
              Set up patient
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
