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

const SEVERITY_CHIPS = [
  { label: "OK", value: 1 },
  { label: "Mild", value: 3 },
  { label: "Moderate", value: 6 },
  { label: "Severe", value: 9 },
];

const ACTIVITY_OPTIONS: { type: string; label: string }[] = [
  { type: "music", label: "Music" },
  { type: "art", label: "Art" },
  { type: "journaling", label: "Journaling" },
  { type: "brain_stimulating", label: "Brain Games" },
  { type: "exercise", label: "Exercise" },
  { type: "outside", label: "Outdoors" },
];

const LIFESTYLE_OPTIONS: { key: keyof Lifestyle; label: string }[] = [
  { key: "ate_well", label: "Ate Well" },
  { key: "smoked", label: "Smoked" },
  { key: "alcohol", label: "Alcohol" },
  { key: "stressed", label: "Stressed" },
];

const TIME_PRESETS = [
  { label: "Now", getValue: () => new Date().toTimeString().slice(0, 5) },
  { label: "Morning", getValue: () => "08:00" },
  { label: "Afternoon", getValue: () => "12:00" },
  { label: "Evening", getValue: () => "18:00" },
];

// ── Accordion section ─────────────────────────────────────────────────────────

function AccordionSection({
  id, title, summaryLine, bgColor, borderColor, headingColor,
  isOpen, onToggle, children,
}: {
  id: string; title: string; summaryLine: string;
  bgColor: string; borderColor: string; headingColor: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: bgColor }}
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-lg font-bold" style={{ color: headingColor }}>{title}</p>
          {!isOpen && (
            <p className="text-sm mt-0.5 truncate" style={{ color: headingColor + "99" }}>{summaryLine}</p>
          )}
        </div>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform"
          style={{ color: headingColor, transform: isOpen ? "rotate(180deg)" : "none" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4" style={{ background: bgColor }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────

function LabeledSlider({
  label, value, min, max, step = 1, onChange, leftLabel, rightLabel, unit = "",
}: {
  label: string; value: number | null; min: number; max: number; step?: number;
  onChange: (v: number) => void; leftLabel?: string; rightLabel?: string; unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold text-slate-700">{label}</label>
        <span className="text-base font-bold" style={{ color: "#0D9488" }}>
          {value !== null ? `${value}${unit}` : "—"}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value ?? min}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-sm text-slate-400">
          <span>{leftLabel}</span><span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Tile ──────────────────────────────────────────────────────────────────────

function Tile({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 text-center transition-all min-h-[72px]"
      style={{ borderColor: active ? "#0D9488" : "#CBD5E1", background: active ? "#0D9488" : "white" }}
    >
      {active ? (
        <svg className="w-5 h-5" style={{ color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#CBD5E1" }} />
      )}
      <span className="text-sm font-semibold leading-tight" style={{ color: active ? "white" : "#334155" }}>{label}</span>
    </button>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" onClick={() => onChange(!value)}
      className="relative w-14 h-7 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? "#0D9488" : "#CBD5E1" }}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(30px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Water stepper ─────────────────────────────────────────────────────────────

function WaterStepper({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const oz = value ?? 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold text-slate-700">Water intake</label>
        <span className="text-base font-bold" style={{ color: "#0D9488" }}>
          {oz > 0 ? `${oz} oz (${(oz / 8).toFixed(0)} cups)` : "—"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(0, oz - 8))}
          className="w-11 h-11 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl">−</button>
        <div className="flex-1 flex gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <button key={i} type="button" onClick={() => onChange((i + 1) * 8)}
              className="flex-1 h-8 rounded transition-colors"
              style={{ background: oz >= (i + 1) * 8 ? "#0D9488" : "#E2E8F0" }} />
          ))}
        </div>
        <button type="button" onClick={() => onChange(Math.min(128, oz + 8))}
          className="w-11 h-11 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl">+</button>
      </div>
      <div className="flex justify-between text-sm text-slate-400"><span>0</span><span>8 cups</span><span>16 cups</span></div>
    </div>
  );
}

// ── Local storage ─────────────────────────────────────────────────────────────

const LS_KEY = "truefit_log_draft";

interface LogDraft {
  date: string; patientId: number | null;
  medicationsTaken: MedicationTaken[]; symptoms: Symptom[];
  medicationSideEffects: MedicationSideEffect[];
  sleepHours: number | null; moodScore: number | null;
  waterIntakeOz: number | null; activities: Activity[];
  lifestyle: Lifestyle; notes: string;
}

function defaultDraft(patientId: number | null, meds: Medication[]): LogDraft {
  return {
    date: new Date().toISOString().split("T")[0], patientId,
    medicationsTaken: meds.filter(m => m.active).map(m => ({ medication_id: m.id, taken: false, time_taken: null })),
    symptoms: SYMPTOM_NAMES.map(name => ({ name, severity: 5 })),
    medicationSideEffects: meds.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
    sleepHours: null, moodScore: null, waterIntakeOz: null,
    activities: [], lifestyle: { smoked: false, alcohol: false, stressed: false, ate_well: false }, notes: "",
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
  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("medications");
  const [expandedSE, setExpandedSE] = useState<number | null>(null);

  // Auto-expand section from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) setOpenSection(hash);
  }, []);

  const loadPatient = useCallback(async () => {
    try {
      const patients = await api.getPatients() as Patient[];
      if (!patients.length) { router.push("/onboarding"); return; }
      const p = patients[0];
      setPatient(p);

      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed: LogDraft = JSON.parse(saved);
        if (parsed.date === today && parsed.patientId === p.id) {
          setDraft(parsed); setLoading(false); return;
        }
      }

      const todayLog = await api.getTodayLog(p.id) as Record<string, unknown> | null;
      if (todayLog) {
        setDraft({
          date: today, patientId: p.id,
          medicationsTaken: (todayLog.medications_taken as MedicationTaken[]) || p.medications.filter(m => m.active).map(m => ({ medication_id: m.id, taken: false, time_taken: null })),
          symptoms: (todayLog.symptoms as Symptom[]) || SYMPTOM_NAMES.map(name => ({ name, severity: 5 })),
          medicationSideEffects: (todayLog.medication_side_effects as MedicationSideEffect[]) || p.medications.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
          sleepHours: todayLog.sleep_hours as number | null,
          moodScore: todayLog.mood_score as number | null,
          waterIntakeOz: todayLog.water_intake_oz as number | null,
          activities: (todayLog.activities as Activity[]) || [],
          lifestyle: (todayLog.lifestyle as Lifestyle) || { smoked: false, alcohol: false, stressed: false, ate_well: false },
          notes: (todayLog.notes as string) || "",
        });
      } else {
        setDraft(defaultDraft(p.id, p.medications));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) loadPatient();
  }, [user, isLoading, loadPatient, router]);

  useEffect(() => {
    if (draft) localStorage.setItem(LS_KEY, JSON.stringify(draft));
  }, [draft]);

  function update(patch: Partial<LogDraft>) {
    setDraft(d => d ? { ...d, ...patch } : d);
  }

  function setMedTaken(medId: number, taken: boolean) {
    update({ medicationsTaken: draft!.medicationsTaken.map(m => m.medication_id === medId ? { ...m, taken } : m) });
  }
  function setMedTime(medId: number, time: string) {
    update({ medicationsTaken: draft!.medicationsTaken.map(m => m.medication_id === medId ? { ...m, time_taken: time || null } : m) });
  }
  function setSymptomSeverity(name: string, severity: number) {
    update({ symptoms: draft!.symptoms.map(s => s.name === name ? { ...s, severity } : s) });
  }
  function toggleSideEffect(medId: number, seName: string) {
    update({
      medicationSideEffects: draft!.medicationSideEffects.map(mse => {
        if (mse.medication_id !== medId) return mse;
        const has = mse.side_effects.some(se => se.name === seName);
        return { ...mse, side_effects: has ? mse.side_effects.filter(se => se.name !== seName) : [...mse.side_effects, { name: seName, severity: 5 }] };
      }),
    });
  }
  function setSideEffectSeverity(medId: number, seName: string, severity: number) {
    update({
      medicationSideEffects: draft!.medicationSideEffects.map(mse =>
        mse.medication_id !== medId ? mse : { ...mse, side_effects: mse.side_effects.map(se => se.name === seName ? { ...se, severity } : se) }
      ),
    });
  }
  function toggleActivity(type: string) {
    const acts = draft!.activities;
    update({ activities: acts.some(a => a.type === type) ? acts.filter(a => a.type !== type) : [...acts, { type }] });
  }
  function toggleLifestyle(key: keyof Lifestyle) {
    update({ lifestyle: { ...draft!.lifestyle, [key]: !draft!.lifestyle[key] } });
  }

  function toggle(id: string) {
    setOpenSection(prev => prev === id ? null : id);
  }

  async function handleSubmit() {
    if (!draft || !patient) return;
    setSaving(true);
    try {
      await api.createLog({
        patient_id: patient.id, date: draft.date,
        medications_taken: draft.medicationsTaken, symptoms: draft.symptoms,
        medication_side_effects: draft.medicationSideEffects.filter(mse => mse.side_effects.length > 0),
        sleep_hours: draft.sleepHours, mood_score: draft.moodScore,
        water_intake_oz: draft.waterIntakeOz, activities: draft.activities,
        lifestyle: draft.lifestyle, notes: draft.notes || null,
      });
      localStorage.removeItem(LS_KEY);
      setSaved(true);
      setTimeout(() => { router.push("/dashboard"); }, 800);
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

  const activeMeds = patient.medications.filter(m => m.active);
  const medsText = `${draft.medicationsTaken.filter(m => m.taken).length}/${activeMeds.length} taken`;
  const symptomsText = draft.symptoms.length ? `${draft.symptoms[0]?.severity ?? "—"}/10 · ...` : "Not recorded";
  const sleepText = draft.sleepHours !== null ? `${draft.sleepHours}hrs · ${draft.waterIntakeOz ?? 0}oz water` : "Tap to record";
  const moodText = draft.moodScore !== null ? `Mood ${draft.moodScore}/10` : "Tap to record";
  const activitiesText = draft.activities.length ? `${draft.activities.length} selected` : "None selected";
  const lifestyleText = Object.values(draft.lifestyle).some(Boolean)
    ? Object.entries(draft.lifestyle).filter(([,v]) => v).map(([k]) => k.replace("_", " ")).join(", ")
    : "None selected";
  const notesText = draft.notes ? draft.notes.slice(0, 40) + (draft.notes.length > 40 ? "…" : "") : "Optional — tap to add";

  return (
    <div className="min-h-screen pb-36" style={{ background: "#F8FAFC" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Daily Log</h1>
          <p className="text-base text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── Medications ── */}
        <AccordionSection id="medications" title="Medications" summaryLine={medsText}
          bgColor="#FFFBF0" borderColor="#FDE68A" headingColor="#92400E"
          isOpen={openSection === "medications"} onToggle={() => toggle("medications")}>

          {activeMeds.length === 0 && <p className="text-base text-slate-400">No active medications on file.</p>}

          {activeMeds.map((med, idx) => {
            const taken = draft.medicationsTaken.find(m => m.medication_id === med.id);
            const mse = draft.medicationSideEffects.find(m => m.medication_id === med.id);
            const seOpen = expandedSE === med.id;

            return (
              <div key={med.id} className="space-y-3">
                {idx > 0 && <div className="border-t border-amber-100" />}

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-navy">{med.name}</p>
                    <p className="text-sm text-slate-500">{med.dose} · {med.time_of_day}</p>
                  </div>
                  <Toggle value={taken?.taken ?? false} onChange={v => setMedTaken(med.id, v)} />
                </div>

                {taken?.taken && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">When was it given?</p>
                    <div className="flex gap-2 flex-wrap">
                      {TIME_PRESETS.map(preset => (
                        <button
                          key={preset.label} type="button"
                          onClick={() => setMedTime(med.id, preset.getValue())}
                          className="px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                          style={{
                            borderColor: taken.time_taken === preset.getValue() ? "#0D9488" : "#CBD5E1",
                            background: taken.time_taken === preset.getValue() ? "#0D9488" : "white",
                            color: taken.time_taken === preset.getValue() ? "white" : "#334155",
                          }}
                        >{preset.label}</button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const custom = taken.time_taken || new Date().toTimeString().slice(0, 5);
                          setMedTime(med.id, custom);
                        }}
                        className="px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                        style={{ borderColor: "#CBD5E1", background: "white", color: "#334155" }}
                      >Custom</button>
                    </div>
                    {/* Custom time input — shown when time is set and doesn't match presets */}
                    {taken.time_taken && !TIME_PRESETS.some(p => p.getValue() === taken.time_taken) && (
                      <input
                        type="time" value={taken.time_taken}
                        onChange={e => setMedTime(med.id, e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-navy text-base focus:outline-none"
                      />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedSE(seOpen ? null : med.id)}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: (mse?.side_effects?.length ?? 0) > 0 ? "#EF4444" : "#94A3B8" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(mse?.side_effects?.length ?? 0) > 0 ? `${mse!.side_effects.length} side effect(s)` : "Log side effects"}
                  <span style={{ display: "inline-block", transition: "transform 0.2s", transform: seOpen ? "rotate(180deg)" : "none" }}>▾</span>
                </button>

                {seOpen && (
                  <div className="space-y-3 border-l-2 border-amber-200 pl-3">
                    <p className="text-sm text-slate-500">Select any side effects observed today:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SIDE_EFFECT_OPTIONS.map(se => {
                        const active = mse?.side_effects.some(s => s.name === se) ?? false;
                        return (
                          <button key={se} type="button" onClick={() => toggleSideEffect(med.id, se)}
                            className="text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                            style={{ borderColor: active ? "#EF4444" : "#E2E8F0", background: active ? "#FEF2F2" : "white", color: active ? "#EF4444" : "#64748B" }}>
                            {se}
                          </button>
                        );
                      })}
                    </div>
                    {(mse?.side_effects ?? []).map(se => (
                      <div key={se.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{se.name}</span>
                          <span className="font-bold" style={{ color: "#EF4444" }}>{se.severity}/10</span>
                        </div>
                        <input type="range" min={1} max={10} value={se.severity}
                          onChange={e => setSideEffectSeverity(med.id, se.name, parseInt(e.target.value))}
                          className="w-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </AccordionSection>

        {/* ── Symptoms ── */}
        <AccordionSection id="symptoms" title="Symptoms" summaryLine={symptomsText}
          bgColor="#FFF5F5" borderColor="#FCA5A5" headingColor="#991B1B"
          isOpen={openSection === "symptoms"} onToggle={() => toggle("symptoms")}>

          {SYMPTOM_NAMES.map(name => {
            const s = draft.symptoms.find(s => s.name === name);
            const val = s?.severity ?? 5;
            const activeChip = SEVERITY_CHIPS.find(c => c.value === val);

            return (
              <div key={name} className="space-y-3">
                <p className="text-base font-semibold text-slate-700">{name}</p>

                {/* Quick chips */}
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITY_CHIPS.map(chip => {
                    const isActive = activeChip?.label === chip.label;
                    return (
                      <button
                        key={chip.label} type="button"
                        onClick={() => setSymptomSeverity(name, chip.value)}
                        className="py-2.5 rounded-xl border-2 text-sm font-semibold transition-all"
                        style={{
                          borderColor: isActive ? "#991B1B" : "#CBD5E1",
                          background: isActive ? "#991B1B" : "white",
                          color: isActive ? "white" : "#334155",
                        }}
                      >{chip.label}</button>
                    );
                  })}
                </div>

                {/* Slider for fine control */}
                <LabeledSlider label="" value={val} min={1} max={10}
                  onChange={v => setSymptomSeverity(name, v)}
                  leftLabel="1 — Minimal" rightLabel="10 — Severe" />
              </div>
            );
          })}
        </AccordionSection>

        {/* ── Sleep ── */}
        <AccordionSection id="sleep" title="Sleep" summaryLine={sleepText}
          bgColor="#F0F9FF" borderColor="#BAE6FD" headingColor="#1E40AF"
          isOpen={openSection === "sleep"} onToggle={() => toggle("sleep")}>

          <LabeledSlider label="Hours of sleep last night" value={draft.sleepHours}
            min={0} max={12} step={0.5} onChange={v => update({ sleepHours: v })}
            leftLabel="0 hrs" rightLabel="12 hrs" unit=" hrs" />
        </AccordionSection>

        {/* ── Mood ── */}
        <AccordionSection id="mood" title="Mood" summaryLine={moodText}
          bgColor="#FAF5FF" borderColor="#C4B5FD" headingColor="#5B21B6"
          isOpen={openSection === "mood"} onToggle={() => toggle("mood")}>

          <LabeledSlider label="Overall mood today" value={draft.moodScore}
            min={1} max={10} onChange={v => update({ moodScore: v })}
            leftLabel="1 — Very low" rightLabel="10 — Excellent" />
        </AccordionSection>

        {/* ── Hydration ── */}
        <AccordionSection id="hydration" title="Hydration" summaryLine={`${draft.waterIntakeOz ?? 0}oz water`}
          bgColor="#F0FDFA" borderColor="#99F6E4" headingColor="#065F46"
          isOpen={openSection === "hydration"} onToggle={() => toggle("hydration")}>

          <WaterStepper value={draft.waterIntakeOz} onChange={v => update({ waterIntakeOz: v })} />
        </AccordionSection>

        {/* ── Activities ── */}
        <AccordionSection id="activities" title="Activities" summaryLine={activitiesText}
          bgColor="#F0FDF4" borderColor="#86EFAC" headingColor="#166534"
          isOpen={openSection === "activities"} onToggle={() => toggle("activities")}>

          <div className="grid grid-cols-3 gap-3">
            {ACTIVITY_OPTIONS.map(a => (
              <Tile key={a.type} label={a.label}
                active={draft.activities.some(act => act.type === a.type)}
                onClick={() => toggleActivity(a.type)} />
            ))}
          </div>
        </AccordionSection>

        {/* ── Lifestyle ── */}
        <AccordionSection id="lifestyle" title="Lifestyle" summaryLine={lifestyleText}
          bgColor="#FFF7ED" borderColor="#FDBA74" headingColor="#9A3412"
          isOpen={openSection === "lifestyle"} onToggle={() => toggle("lifestyle")}>

          <div className="grid grid-cols-2 gap-3">
            {LIFESTYLE_OPTIONS.map(item => (
              <Tile key={item.key} label={item.label}
                active={draft.lifestyle[item.key]}
                onClick={() => toggleLifestyle(item.key)} />
            ))}
          </div>
        </AccordionSection>

        {/* ── Notes ── */}
        <AccordionSection id="notes" title="Notes" summaryLine={notesText}
          bgColor="white" borderColor="#E2E8F0" headingColor="#0D1B2A"
          isOpen={openSection === "notes"} onToggle={() => toggle("notes")}>

          <div className="flex justify-between mb-1">
            <span className="text-sm text-slate-500">Any observations worth noting</span>
            <span className="text-sm text-slate-400">{draft.notes.length}/500</span>
          </div>
          <textarea
            value={draft.notes}
            onChange={e => { if (e.target.value.length <= 500) update({ notes: e.target.value }); }}
            rows={4}
            placeholder="Behaviours, context, anything unusual..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-base focus:outline-none resize-none"
          />
        </AccordionSection>
      </div>

      {/* ── Sticky save bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-lg mx-auto px-4 pb-[72px] pt-3"
          style={{ background: "linear-gradient(to top, rgba(248,250,252,1) 70%, transparent)" }}>
          <button
            onClick={handleSubmit} disabled={saving || saved}
            className="w-full py-5 rounded-2xl font-bold text-white text-xl shadow-xl transition-all active:scale-[0.98]"
            style={{ background: saved ? "#16A34A" : saving ? "#0B7A70" : "linear-gradient(135deg, #0D9488, #0B7A70)", opacity: saving ? 0.9 : 1 }}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
