"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, Medication, MedicationTaken, Symptom, MedicationSideEffect, Activity, Lifestyle } from "../lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const SYMPTOM_NAMES = ["Agitation", "Mood / Affect", "Clarity / Cognition"];

const SIDE_EFFECT_OPTIONS = [
  "Nausea", "Vomiting", "Constipation", "Diarrhea",
  "Dizziness", "Drowsiness", "Headache", "Rash",
  "Dry mouth", "Loss of appetite",
];

const ACTIVITY_OPTIONS: { type: string; label: string; emoji: string }[] = [
  { type: "music", label: "Music", emoji: "🎵" },
  { type: "art", label: "Art", emoji: "🎨" },
  { type: "journaling", label: "Journaling", emoji: "✍️" },
  { type: "brain_stimulating", label: "Brain Games", emoji: "🧩" },
  { type: "exercise", label: "Exercise", emoji: "🏃" },
  { type: "outside", label: "Outdoors", emoji: "🌿" },
];

const LIFESTYLE_OPTIONS: { key: keyof Lifestyle; label: string; emoji: string }[] = [
  { key: "ate_well", label: "Ate Well", emoji: "🥗" },
  { key: "smoked", label: "Smoked", emoji: "🚬" },
  { key: "alcohol", label: "Alcohol", emoji: "🍷" },
  { key: "stressed", label: "Stressed", emoji: "😰" },
];

// ── Slider with label ─────────────────────────────────────────────────────────

function LabeledSlider({
  label, value, min, max, step = 1, onChange, leftLabel, rightLabel, unit = "",
}: {
  label: string;
  value: number | null;
  min: number; max: number; step?: number;
  onChange: (v: number) => void;
  leftLabel?: string; rightLabel?: string;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold" style={{ color: "#0D9488" }}>
          {value !== null ? `${value}${unit}` : "—"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? min}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Tile button ───────────────────────────────────────────────────────────────

function Tile({
  emoji, label, active, onClick,
}: {
  emoji: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all"
      style={{
        borderColor: active ? "#0D9488" : "#E2E8F0",
        background: active ? "#CCFBF1" : "white",
      }}
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-xs font-medium" style={{ color: active ? "#0D9488" : "#64748B" }}>
        {label}
      </span>
    </button>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? "#0D9488" : "#CBD5E1" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(26px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Water intake stepper ──────────────────────────────────────────────────────

function WaterStepper({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const oz = value ?? 0;
  const cups = (oz / 8).toFixed(1);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Water intake</label>
        <span className="text-sm font-bold" style={{ color: "#0D9488" }}>
          {oz > 0 ? `${oz} oz (${cups} cups)` : "—"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, oz - 8))}
          className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg"
        >
          −
        </button>
        <div className="flex-1 flex gap-1">
          {[8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8].map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange((i + 1) * 8)}
              className="flex-1 h-8 rounded"
              style={{ background: oz >= (i + 1) * 8 ? "#0D9488" : "#E2E8F0" }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(128, oz + 8))}
          className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg"
        >
          +
        </button>
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>0</span>
        <span>8 cups (64 oz)</span>
        <span>16 cups</span>
      </div>
    </div>
  );
}

// ── Local storage key ─────────────────────────────────────────────────────────

const LS_KEY = "truefit_log_draft";

interface LogDraft {
  date: string;
  patientId: number | null;
  medicationsTaken: MedicationTaken[];
  symptoms: Symptom[];
  medicationSideEffects: MedicationSideEffect[];
  sleepHours: number | null;
  moodScore: number | null;
  waterIntakeOz: number | null;
  activities: Activity[];
  lifestyle: Lifestyle;
  notes: string;
}

function defaultDraft(patientId: number | null, meds: Medication[]): LogDraft {
  return {
    date: new Date().toISOString().split("T")[0],
    patientId,
    medicationsTaken: meds.filter((m) => m.active).map((m) => ({
      medication_id: m.id,
      taken: false,
      time_taken: null,
    })),
    symptoms: SYMPTOM_NAMES.map((name) => ({ name, severity: 5 })),
    medicationSideEffects: meds.filter((m) => m.active).map((m) => ({
      medication_id: m.id,
      medication_name: m.name,
      side_effects: [],
    })),
    sleepHours: null,
    moodScore: null,
    waterIntakeOz: null,
    activities: [],
    lifestyle: { smoked: false, alcohol: false, stressed: false, ate_well: false },
    notes: "",
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [draft, setDraft] = useState<LogDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Which medication's side-effects panel is expanded
  const [expandedSE, setExpandedSE] = useState<number | null>(null);

  const loadPatient = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      const p = patients[0];
      setPatient(p);

      // Load existing draft from localStorage if for same patient+date
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed: LogDraft = JSON.parse(saved);
        if (parsed.date === today && parsed.patientId === p.id) {
          setDraft(parsed);
          setLoading(false);
          return;
        }
      }

      // Try loading today's existing log from server
      const todayLog = await api.getTodayLog(p.id) as Record<string, unknown> | null;
      if (todayLog) {
        const d: LogDraft = {
          date: today,
          patientId: p.id,
          medicationsTaken: (todayLog.medications_taken as MedicationTaken[]) || p.medications.filter((m) => m.active).map((m) => ({ medication_id: m.id, taken: false, time_taken: null })),
          symptoms: (todayLog.symptoms as Symptom[]) || SYMPTOM_NAMES.map((name) => ({ name, severity: 5 })),
          medicationSideEffects: (todayLog.medication_side_effects as MedicationSideEffect[]) || p.medications.filter((m) => m.active).map((m) => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
          sleepHours: todayLog.sleep_hours as number | null,
          moodScore: todayLog.mood_score as number | null,
          waterIntakeOz: todayLog.water_intake_oz as number | null,
          activities: (todayLog.activities as Activity[]) || [],
          lifestyle: (todayLog.lifestyle as Lifestyle) || { smoked: false, alcohol: false, stressed: false, ate_well: false },
          notes: (todayLog.notes as string) || "",
        };
        setDraft(d);
      } else {
        setDraft(defaultDraft(p.id, p.medications));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) loadPatient();
  }, [user, isLoading, loadPatient, router]);

  // Persist draft to localStorage on every change
  useEffect(() => {
    if (draft) localStorage.setItem(LS_KEY, JSON.stringify(draft));
  }, [draft]);

  function update(patch: Partial<LogDraft>) {
    setDraft((d) => d ? { ...d, ...patch } : d);
  }

  function setMedTaken(medId: number, taken: boolean) {
    update({
      medicationsTaken: draft!.medicationsTaken.map((m) =>
        m.medication_id === medId ? { ...m, taken } : m
      ),
    });
  }

  function setMedTime(medId: number, time: string) {
    update({
      medicationsTaken: draft!.medicationsTaken.map((m) =>
        m.medication_id === medId ? { ...m, time_taken: time || null } : m
      ),
    });
  }

  function setSymptomSeverity(name: string, severity: number) {
    update({
      symptoms: draft!.symptoms.map((s) => s.name === name ? { ...s, severity } : s),
    });
  }

  function toggleSideEffect(medId: number, seName: string) {
    const current = draft!.medicationSideEffects.map((mse) => {
      if (mse.medication_id !== medId) return mse;
      const existing = mse.side_effects.find((se) => se.name === seName);
      if (existing) {
        return { ...mse, side_effects: mse.side_effects.filter((se) => se.name !== seName) };
      } else {
        return { ...mse, side_effects: [...mse.side_effects, { name: seName, severity: 5 }] };
      }
    });
    update({ medicationSideEffects: current });
  }

  function setSideEffectSeverity(medId: number, seName: string, severity: number) {
    const current = draft!.medicationSideEffects.map((mse) => {
      if (mse.medication_id !== medId) return mse;
      return {
        ...mse,
        side_effects: mse.side_effects.map((se) => se.name === seName ? { ...se, severity } : se),
      };
    });
    update({ medicationSideEffects: current });
  }

  function toggleActivity(type: string) {
    const acts = draft!.activities;
    const exists = acts.find((a) => a.type === type);
    update({
      activities: exists
        ? acts.filter((a) => a.type !== type)
        : [...acts, { type }],
    });
  }

  function toggleLifestyle(key: keyof Lifestyle) {
    update({ lifestyle: { ...draft!.lifestyle, [key]: !draft!.lifestyle[key] } });
  }

  async function handleSubmit() {
    if (!draft || !patient) return;
    setSaving(true);
    try {
      await api.createLog({
        patient_id: patient.id,
        date: draft.date,
        medications_taken: draft.medicationsTaken,
        symptoms: draft.symptoms,
        medication_side_effects: draft.medicationSideEffects.filter((mse) => mse.side_effects.length > 0),
        sleep_hours: draft.sleepHours,
        mood_score: draft.moodScore,
        water_intake_oz: draft.waterIntakeOz,
        activities: draft.activities,
        lifestyle: draft.lifestyle,
        notes: draft.notes || null,
      });
      localStorage.removeItem(LS_KEY);
      toast.success("Log saved!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save log");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0D9488", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!draft || !patient) return null;

  const activeMeds = patient.medications.filter((m) => m.active);

  return (
    <div className="min-h-screen pb-32" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Daily Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── Medications ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h2 className="font-semibold text-navy">Medications</h2>

          {activeMeds.length === 0 && (
            <p className="text-sm text-slate-400">No active medications on file.</p>
          )}

          {activeMeds.map((med) => {
            const taken = draft.medicationsTaken.find((m) => m.medication_id === med.id);
            const mse = draft.medicationSideEffects.find((m) => m.medication_id === med.id);
            const seExpanded = expandedSE === med.id;

            return (
              <div key={med.id} className="space-y-3">
                {/* Taken toggle row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{med.name}</p>
                    <p className="text-xs text-slate-400">{med.dose} · {med.time_of_day}</p>
                  </div>
                  <Toggle
                    value={taken?.taken ?? false}
                    onChange={(v) => setMedTaken(med.id, v)}
                  />
                </div>

                {/* Time given (only if taken) */}
                {taken?.taken && (
                  <div className="flex items-center gap-2 pl-0">
                    <label className="text-xs text-slate-500 flex-shrink-0">Time given:</label>
                    <input
                      type="time"
                      value={taken.time_taken ?? ""}
                      onChange={(e) => setMedTime(med.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none"
                    />
                  </div>
                )}

                {/* Side effects accordion */}
                <button
                  type="button"
                  onClick={() => setExpandedSE(seExpanded ? null : med.id)}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: (mse?.side_effects?.length ?? 0) > 0 ? "#EF4444" : "#94A3B8" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(mse?.side_effects?.length ?? 0) > 0
                    ? `${mse!.side_effects.length} side effect(s) reported`
                    : "Log side effects"}
                  <span style={{ transform: seExpanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
                </button>

                {seExpanded && (
                  <div className="pl-0 space-y-3 border-l-2 border-slate-100 pl-3">
                    <p className="text-xs text-slate-500">Select any side effects observed today:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SIDE_EFFECT_OPTIONS.map((se) => {
                        const active = mse?.side_effects.some((s) => s.name === se) ?? false;
                        return (
                          <button
                            key={se}
                            type="button"
                            onClick={() => toggleSideEffect(med.id, se)}
                            className="text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                            style={{
                              borderColor: active ? "#EF4444" : "#E2E8F0",
                              background: active ? "#FEF2F2" : "white",
                              color: active ? "#EF4444" : "#64748B",
                            }}
                          >
                            {se}
                          </button>
                        );
                      })}
                    </div>
                    {/* Severity for active side effects */}
                    {(mse?.side_effects ?? []).map((se) => (
                      <div key={se.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{se.name} severity</span>
                          <span className="font-bold" style={{ color: "#EF4444" }}>{se.severity}/10</span>
                        </div>
                        <input
                          type="range" min={1} max={10}
                          value={se.severity}
                          onChange={(e) => setSideEffectSeverity(med.id, se.name, parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider between meds */}
                {activeMeds.indexOf(med) < activeMeds.length - 1 && (
                  <div className="border-t border-slate-100" />
                )}
              </div>
            );
          })}
        </section>

        {/* ── Symptoms ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
          <h2 className="font-semibold text-navy">Symptoms</h2>
          {SYMPTOM_NAMES.map((name) => {
            const s = draft.symptoms.find((s) => s.name === name);
            return (
              <LabeledSlider
                key={name}
                label={name}
                value={s?.severity ?? 5}
                min={1} max={10}
                onChange={(v) => setSymptomSeverity(name, v)}
                leftLabel="1 — Minimal"
                rightLabel="10 — Severe"
              />
            );
          })}
        </section>

        {/* ── Sleep ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <LabeledSlider
            label="Sleep last night"
            value={draft.sleepHours}
            min={0} max={12} step={0.5}
            onChange={(v) => update({ sleepHours: v })}
            leftLabel="0 hrs"
            rightLabel="12 hrs"
            unit=" hrs"
          />
        </section>

        {/* ── Mood ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <LabeledSlider
            label="Overall mood today"
            value={draft.moodScore}
            min={1} max={10}
            onChange={(v) => update({ moodScore: v })}
            leftLabel="1 — Very low"
            rightLabel="10 — Excellent"
          />
        </section>

        {/* ── Water ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <WaterStepper
            value={draft.waterIntakeOz}
            onChange={(v) => update({ waterIntakeOz: v })}
          />
        </section>

        {/* ── Activities ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-navy mb-3">Activities today</h2>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_OPTIONS.map((a) => (
              <Tile
                key={a.type}
                emoji={a.emoji}
                label={a.label}
                active={draft.activities.some((act) => act.type === a.type)}
                onClick={() => toggleActivity(a.type)}
              />
            ))}
          </div>
        </section>

        {/* ── Lifestyle ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-navy mb-3">Lifestyle</h2>
          <div className="grid grid-cols-2 gap-2">
            {LIFESTYLE_OPTIONS.map((item) => (
              <Tile
                key={item.key}
                emoji={item.emoji}
                label={item.label}
                active={draft.lifestyle[item.key]}
                onClick={() => toggleLifestyle(item.key)}
              />
            ))}
          </div>
        </section>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-navy">Notes</h2>
            <span className="text-xs text-slate-400">{draft.notes.length}/500</span>
          </div>
          <textarea
            value={draft.notes}
            onChange={(e) => {
              if (e.target.value.length <= 500) update({ notes: e.target.value });
            }}
            rows={4}
            placeholder="Any observations, behaviours, or context worth noting..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm focus:outline-none resize-none"
          />
        </section>
      </div>

      {/* ── Floating save button ──────────────────────────────────────── */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-xl disabled:opacity-60 transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg, #0D9488, #0B7A70)" }}
        >
          {saving ? "Saving…" : "Save Log"}
        </button>
      </div>
    </div>
  );
}
