"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, Medication, MedicationTaken, Symptom, MedicationSideEffect, Activity, Lifestyle } from "../lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SYMPTOM_NAMES = [
  "Agitation", "Mood / Affect", "Clarity / Cognition",
  "Catatonic Episode", "Intrusive Thoughts", "Auditory Hallucinations",
  "Visual Hallucinations", "Suicidal Ideation", "Command Hallucinations",
];
const SYMPTOMS_LS_KEY = "witness_symptom_names";

function loadSymptomNames(): string[] {
  if (typeof window === "undefined") return DEFAULT_SYMPTOM_NAMES;
  const saved = localStorage.getItem(SYMPTOMS_LS_KEY);
  if (!saved) return DEFAULT_SYMPTOM_NAMES;
  const existing: string[] = JSON.parse(saved);
  // Merge any new defaults not yet in the saved list
  let changed = false;
  const merged = [...existing];
  for (const name of DEFAULT_SYMPTOM_NAMES) {
    if (!merged.includes(name)) { merged.push(name); changed = true; }
  }
  if (changed) localStorage.setItem(SYMPTOMS_LS_KEY, JSON.stringify(merged));
  return merged;
}

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
  { type: "skateboarding", label: "Skateboarding" },
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

interface Episode {
  occurred: boolean;
  time: string;
  description: string;
}

interface Vitals {
  heart_rate: string;
  blood_pressure: string;
}

interface LogDraft {
  date: string; patientId: number | null;
  medicationsTaken: MedicationTaken[]; symptoms: Symptom[];
  medicationSideEffects: MedicationSideEffect[];
  sleepHours: number | null; moodScore: number | null;
  waterIntakeOz: number | null; activities: Activity[];
  lifestyle: Lifestyle; notes: string;
  episode: Episode;
  vitals: Vitals;
}

function defaultDraft(patientId: number | null, meds: Medication[], symptomNamesArg: string[]): LogDraft {
  return {
    date: new Date().toISOString().split("T")[0], patientId,
    medicationsTaken: meds.filter(m => m.active).map(m => ({ medication_id: m.id, taken: false, time_taken: null })),
    symptoms: symptomNamesArg.map(name => ({ name, severity: 5, worse_than_usual: false })),
    medicationSideEffects: meds.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
    sleepHours: null, moodScore: null, waterIntakeOz: null,
    activities: [], lifestyle: { smoked: false, alcohol: false, stressed: false, ate_well: false }, notes: "",
    episode: { occurred: false, time: "", description: "" },
    vitals: { heart_rate: "", blood_pressure: "" },
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
  const [symptomNames, setSymptomNames] = useState<string[]>(() => loadSymptomNames());
  const [newSymptomInput, setNewSymptomInput] = useState("");

  // Medication management
  const [showMedManage, setShowMedManage] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("morning");
  const [addingMed, setAddingMed] = useState(false);

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
      const savedDraft = localStorage.getItem(LS_KEY);
      if (savedDraft) {
        const parsed: LogDraft = JSON.parse(savedDraft);
        if (parsed.date === today && parsed.patientId === p.id) {
          // Ensure episode and vitals exist (for older drafts)
          if (!parsed.episode) parsed.episode = { occurred: false, time: "", description: "" };
          if (!parsed.vitals) parsed.vitals = { heart_rate: "", blood_pressure: "" };
          setDraft(parsed); setLoading(false); return;
        }
      }

      const todayLog = await api.getTodayLog(p.id) as Record<string, unknown> | null;
      if (todayLog) {
        const ep = todayLog.episode as Episode | null;
        const vt = todayLog.vitals as Vitals | null;
        setDraft({
          date: today, patientId: p.id,
          medicationsTaken: (todayLog.medications_taken as MedicationTaken[]) || p.medications.filter(m => m.active).map(m => ({ medication_id: m.id, taken: false, time_taken: null })),
          symptoms: (todayLog.symptoms as Symptom[]) || loadSymptomNames().map((name: string) => ({ name, severity: 5, worse_than_usual: false })),
          medicationSideEffects: (todayLog.medication_side_effects as MedicationSideEffect[]) || p.medications.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
          sleepHours: todayLog.sleep_hours as number | null,
          moodScore: todayLog.mood_score as number | null,
          waterIntakeOz: todayLog.water_intake_oz as number | null,
          activities: (todayLog.activities as Activity[]) || [],
          lifestyle: (todayLog.lifestyle as Lifestyle) || { smoked: false, alcohol: false, stressed: false, ate_well: false },
          notes: (todayLog.notes as string) || "",
          episode: ep ?? { occurred: false, time: "", description: "" },
          vitals: vt ?? { heart_rate: "", blood_pressure: "" },
        });
      } else {
        setDraft(defaultDraft(p.id, p.medications, loadSymptomNames()));
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
  function toggleSymptomWorse(name: string) {
    update({ symptoms: draft!.symptoms.map(s => s.name === name ? { ...s, worse_than_usual: !s.worse_than_usual } : s) });
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
  function addSymptom(name: string) {
    const trimmed = name.trim();
    if (!trimmed || symptomNames.includes(trimmed)) return;
    const updated = [...symptomNames, trimmed];
    setSymptomNames(updated);
    localStorage.setItem(SYMPTOMS_LS_KEY, JSON.stringify(updated));
    update({ symptoms: [...(draft?.symptoms ?? []), { name: trimmed, severity: 5, worse_than_usual: false }] });
    setNewSymptomInput("");
  }
  function removeSymptom(name: string) {
    const updated = symptomNames.filter(n => n !== name);
    setSymptomNames(updated);
    localStorage.setItem(SYMPTOMS_LS_KEY, JSON.stringify(updated));
    update({ symptoms: draft!.symptoms.filter(s => s.name !== name) });
  }
  function updateEpisode(patch: Partial<Episode>) {
    update({ episode: { ...draft!.episode, ...patch } });
  }
  function updateVitals(patch: Partial<Vitals>) {
    update({ vitals: { ...draft!.vitals, ...patch } });
  }

  async function handleAddMed() {
    if (!newMedName.trim() || !patient) return;
    setAddingMed(true);
    try {
      const added = await api.addMedication(patient.id, {
        name: newMedName.trim(),
        dose: "",
        frequency: "daily",
        time_of_day: newMedTime,
      }) as Medication;
      // Update patient medications in state
      const updatedPatient = { ...patient, medications: [...patient.medications, added] };
      setPatient(updatedPatient);
      // Add to draft
      update({
        medicationsTaken: [...draft!.medicationsTaken, { medication_id: added.id, taken: false, time_taken: null }],
        medicationSideEffects: [...draft!.medicationSideEffects, { medication_id: added.id, medication_name: added.name, side_effects: [] }],
      });
      setNewMedName("");
      toast.success(`${added.name} added`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add medication");
    } finally {
      setAddingMed(false);
    }
  }

  async function handleRemoveMed(medId: number) {
    if (!patient) return;
    try {
      await api.deleteMedication(medId);
      const updatedPatient = {
        ...patient,
        medications: patient.medications.map(m => m.id === medId ? { ...m, active: false } : m),
      };
      setPatient(updatedPatient);
      update({
        medicationsTaken: draft!.medicationsTaken.filter(m => m.medication_id !== medId),
        medicationSideEffects: draft!.medicationSideEffects.filter(m => m.medication_id !== medId),
      });
      toast.success("Medication removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove medication");
    }
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
        episode: draft.episode,
        vitals: (draft.vitals.heart_rate || draft.vitals.blood_pressure) ? draft.vitals : null,
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
  const episodeText = draft.episode.occurred ? `Episode at ${draft.episode.time || "unknown time"}` : "No episode today";
  const vitalsText = draft.vitals.heart_rate || draft.vitals.blood_pressure
    ? [draft.vitals.heart_rate && `HR ${draft.vitals.heart_rate}`, draft.vitals.blood_pressure && `BP ${draft.vitals.blood_pressure}`].filter(Boolean).join(" · ")
    : "Tap to record";

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
                    <p className="text-sm text-slate-500">{med.time_of_day}</p>
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

          {/* ── Manage medications ── */}
          <div className="pt-2 border-t border-amber-100">
            <button
              type="button"
              onClick={() => setShowMedManage(v => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage medications
              <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showMedManage ? "rotate(180deg)" : "none" }}>▾</span>
            </button>

            {showMedManage && (
              <div className="mt-3 space-y-3">
                {/* Existing meds with remove button */}
                {patient.medications.filter(m => m.active).map(med => (
                  <div key={med.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                    <span className="text-sm font-medium text-navy">{med.name} <span className="text-slate-400 font-normal">· {med.time_of_day}</span></span>
                    <button type="button" onClick={() => handleRemoveMed(med.id)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none transition-colors" title="Remove">×</button>
                  </div>
                ))}

                {/* Add new med form */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Add medication</p>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={e => setNewMedName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMed(); } }}
                    placeholder="Medication name"
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-navy text-sm focus:outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    {["morning", "noon", "night"].map(t => (
                      <button key={t} type="button" onClick={() => setNewMedTime(t)}
                        className="flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-all"
                        style={{
                          borderColor: newMedTime === t ? "#0D9488" : "#CBD5E1",
                          background: newMedTime === t ? "#0D9488" : "white",
                          color: newMedTime === t ? "white" : "#64748B",
                        }}
                      >{t}</button>
                    ))}
                  </div>
                  <button
                    type="button" onClick={handleAddMed} disabled={addingMed || !newMedName.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: newMedName.trim() ? "#0D9488" : "#CBD5E1" }}
                  >{addingMed ? "Adding…" : "Add medication"}</button>
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* ── Symptoms ── */}
        <AccordionSection id="symptoms" title="Symptoms" summaryLine={symptomsText}
          bgColor="white" borderColor="#E2E8F0" headingColor="#0D1B2A"
          isOpen={openSection === "symptoms"} onToggle={() => toggle("symptoms")}>

          {symptomNames.map(name => {
            const s = draft.symptoms.find(s => s.name === name);
            const val = s?.severity ?? 5;
            const activeChip = SEVERITY_CHIPS.find(c => c.value === val);
            const isChecked = val > 1; // anything above "OK" counts as present

            return (
              <div key={name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-700">{name}</p>
                  <button
                    type="button" onClick={() => removeSymptom(name)}
                    className="text-slate-300 hover:text-red-400 text-lg leading-none transition-colors"
                    title="Remove symptom"
                  >×</button>
                </div>

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
                          borderColor: isActive ? "#0D9488" : "#CBD5E1",
                          background: isActive ? "#0D9488" : "white",
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

                {/* Worse than usual toggle — only when symptom is present */}
                {isChecked && (
                  <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                    <span className="text-sm font-medium text-orange-800">Worse than usual?</span>
                    <Toggle
                      value={s?.worse_than_usual ?? false}
                      onChange={() => toggleSymptomWorse(name)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add symptom */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={newSymptomInput}
              onChange={e => setNewSymptomInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSymptom(newSymptomInput); } }}
              placeholder="Add a symptom…"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-navy text-sm focus:outline-none"
            />
            <button
              type="button" onClick={() => addSymptom(newSymptomInput)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#0D9488" }}
            >Add</button>
          </div>
        </AccordionSection>

        {/* ── Episode ── */}
        <AccordionSection id="episode" title="Episode" summaryLine={episodeText}
          bgColor="#FFF1F2" borderColor="#FECDD3" headingColor="#9F1239"
          isOpen={openSection === "episode"} onToggle={() => toggle("episode")}>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: "#9F1239" }}>Did an episode occur today?</p>
              <Toggle value={draft.episode.occurred} onChange={v => updateEpisode({ occurred: v })} />
            </div>

            {draft.episode.occurred && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Time of episode</label>
                  <input
                    type="time"
                    value={draft.episode.time}
                    onChange={e => updateEpisode({ time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 text-navy text-base focus:outline-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Describe what happened</label>
                  <textarea
                    value={draft.episode.description}
                    onChange={e => updateEpisode({ description: e.target.value })}
                    rows={4}
                    placeholder="e.g. At 4pm Jack had a catatonic episode that lasted about 20 minutes…"
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 text-navy text-base focus:outline-none resize-none bg-white"
                  />
                </div>
              </>
            )}
          </div>
        </AccordionSection>

        {/* ── Vitals ── */}
        <AccordionSection id="vitals" title="Vitals" summaryLine={vitalsText}
          bgColor="#F0F9FF" borderColor="#BAE6FD" headingColor="#1E40AF"
          isOpen={openSection === "vitals"} onToggle={() => toggle("vitals")}>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-700">Heart Rate <span className="text-sm font-normal text-slate-400">(bpm)</span></label>
              <input
                type="number"
                inputMode="numeric"
                value={draft.vitals.heart_rate}
                onChange={e => updateVitals({ heart_rate: e.target.value })}
                placeholder="e.g. 72"
                className="w-full px-4 py-3 rounded-xl border border-sky-200 text-navy text-base focus:outline-none bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-700">Blood Pressure <span className="text-sm font-normal text-slate-400">(e.g. 120/80)</span></label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.vitals.blood_pressure}
                onChange={e => updateVitals({ blood_pressure: e.target.value })}
                placeholder="120/80"
                className="w-full px-4 py-3 rounded-xl border border-sky-200 text-navy text-base focus:outline-none bg-white"
              />
            </div>
          </div>
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
