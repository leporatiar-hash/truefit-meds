"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";

interface MedForm {
  name: string;
  dose: string;
  frequency: string;
  time_of_day: string;
}

const emptyMed = (): MedForm => ({ name: "", dose: "", frequency: "", time_of_day: "Morning" });
const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Bedtime", "With meals", "As needed"];

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  // Patient form
  const [patientName, setPatientName] = useState("");
  const [dob, setDob] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [patientId, setPatientId] = useState<number | null>(null);

  // Medication form
  const [meds, setMeds] = useState<MedForm[]>([emptyMed()]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  function updateMed(idx: number, field: keyof MedForm, value: string) {
    setMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  async function handlePatientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createPatient({
        name: patientName,
        date_of_birth: dob || null,
        diagnosis,
        notes: notes || null,
        medications: [],
      }) as { id: number };
      setPatientId(res.id);
      setStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMedsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setSubmitting(true);
    try {
      const validMeds = meds.filter((m) => m.name.trim());
      for (const med of validMeds) {
        await api.addMedication(patientId, med);
      }
      toast.success("All set! Welcome to TrueFit Meds.");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save medications");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto" style={{ background: "#F8FAFC" }}>
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? "bg-teal" : "bg-slate-200"}`} style={{ background: step >= 1 ? "#0D9488" : "#E2E8F0" }} />
        <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? "bg-teal" : "bg-slate-200"}`} style={{ background: step >= 2 ? "#0D9488" : "#E2E8F0" }} />
      </div>

      {step === 1 && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Who are you caring for?</h1>
            <p className="text-slate-500 text-sm mt-1">Set up the patient profile you&apos;ll be tracking.</p>
          </div>

          <form onSubmit={handlePatientSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient name *</label>
              <input
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#0D9488" } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Diagnosis / Condition *</label>
              <input
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Alzheimer's, Parkinson's, Diabetes"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context for the doctor..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm mt-2 disabled:opacity-60"
              style={{ background: "#0D9488" }}
            >
              {submitting ? "Saving…" : "Continue →"}
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy">Add medications</h1>
            <p className="text-slate-500 text-sm mt-1">List every medication. You can always add more later.</p>
          </div>

          <form onSubmit={handleMedsSubmit} className="space-y-4">
            {meds.map((med, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy">Medication {idx + 1}</span>
                  {meds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMeds((p) => p.filter((_, i) => i !== idx))}
                      className="text-red-400 text-xs font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  value={med.name}
                  onChange={(e) => updateMed(idx, "name", e.target.value)}
                  placeholder="Medication name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
                <input
                  value={med.dose}
                  onChange={(e) => updateMed(idx, "dose", e.target.value)}
                  placeholder="Dose (e.g. 10mg)"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
                <input
                  value={med.frequency}
                  onChange={(e) => updateMed(idx, "frequency", e.target.value)}
                  placeholder="Frequency (e.g. Once daily)"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
                <select
                  value={med.time_of_day}
                  onChange={(e) => updateMed(idx, "time_of_day", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none bg-white"
                >
                  {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setMeds((p) => [...p, emptyMed()])}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-medium hover:border-teal hover:text-teal transition-colors"
              style={{ "--tw-hover-border-color": "#0D9488" } as React.CSSProperties}
            >
              + Add another medication
            </button>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => meds.every((m) => !m.name.trim()) && router.push("/dashboard")}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-500 font-medium text-sm"
                style={{}}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                style={{ background: "#0D9488" }}
              >
                {submitting ? "Saving…" : "Go to Dashboard"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
