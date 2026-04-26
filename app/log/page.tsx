"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, localDateStr } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { Patient, Medication, MedicationTaken, Symptom, MedicationSideEffect, Activity, Lifestyle } from "../lib/types";
import { DEFAULT_SYMPTOM_NAMES, DEFAULT_ACTIVITY_OPTIONS } from "../lib/constants";

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_CHIPS = [
  { label: "Moderate", value: 6 },
  { label: "Severe", value: 9 },
];

const SIMPLE_DOSE_TIMES = [
  { label: "Morning", time: "08:00" },
  { label: "Afternoon", time: "13:00" },
  { label: "Evening", time: "18:00" },
  { label: "Night", time: "21:00" },
];

const SIMPLE_TIME_LABELS: Record<string, string> = {
  "08:00": "Morning",
  "13:00": "Afternoon",
  "18:00": "Evening",
  "21:00": "Night",
};

const SIDE_EFFECT_OPTIONS = [
  "Nausea", "Vomiting", "Constipation", "Diarrhea",
  "Dizziness", "Drowsiness", "Headache", "Rash",
  "Dry mouth", "Loss of appetite",
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
          <p
            className="text-sm mt-0.5 truncate transition-opacity duration-200"
            style={{ color: headingColor + "99", opacity: isOpen ? 0 : 1 }}
          >{summaryLine}</p>
        </div>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
          style={{ color: headingColor, transform: isOpen ? "rotate(180deg)" : "none" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.25s ease",
          background: bgColor,
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="px-5 pb-5 space-y-4">
            {children}
          </div>
        </div>
      </div>
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
        <span className="text-base font-bold" style={{ color: "#4a7c59" }}>
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
      style={{ borderColor: active ? "#4a7c59" : "#CBD5E1", background: active ? "#4a7c59" : "white" }}
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
      className="relative w-14 h-7 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? "#4a7c59" : "#CBD5E1" }}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(30px)" : "translateX(2px)" }}
      />
    </button>
  );
}

interface Episode {
  occurred: boolean;
  time: string;
  description: string;
}

interface Vitals {
  heart_rate: string;
  blood_pressure: string;
  cigarettes: string;
  alcohol: boolean;
  alcohol_drinks: string;
  custom_substances?: Record<string, boolean>;
}


const HYDRATION_PRESETS = [
  { label: "Good", value: 80 },
  { label: "Fair", value: 48 },
  { label: "Poor", value: 24 },
] as const;

interface LogDraft {
  date: string;
  patientId: number | null;
  // Multi-dose: multiple entries per medication_id are allowed (each dose = one entry with taken: true)
  medicationsTaken: MedicationTaken[];
  symptoms: Symptom[];
  medicationSideEffects: MedicationSideEffect[];
  sleepHours: number | null;
  hydration: "Good" | "Fair" | "Poor" | null;
  lifestyle: Lifestyle;
  activities: Activity[];
  notes: string;
  episode: Episode;
  vitals: Vitals;
  photo: string | null; // base64 JPEG data URL (compressed ~50-100 KB)
}

// ── Photo compression ─────────────────────────────────────────────────────────

async function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

function emptyVitals(): Vitals {
  return { heart_rate: "", blood_pressure: "", cigarettes: "", alcohol: false, alcohol_drinks: "" };
}

function defaultDraft(patientId: number | null, meds: Medication[]): LogDraft {
  return {
    date: localDateStr(),
    patientId,
    medicationsTaken: [],
    symptoms: [],
    medicationSideEffects: meds.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
    sleepHours: null,
    hydration: null,
    lifestyle: { smoked: false, alcohol: false, stressed: false, ate_well: false },
    activities: [],
    notes: "",
    episode: { occurred: false, time: "", description: "" },
    vitals: emptyVitals(),
    photo: null,
  };
}

function fmt12(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function displayDoseTime(time: string | null): string {
  if (!time) return "";
  return SIMPLE_TIME_LABELS[time] ?? fmt12(time);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [draft, setDraft] = useState<LogDraft | null>(null);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("medications");
  const [expandedSE, setExpandedSE] = useState<number | null>(null);

  // Medication management
  const [showMedManage, setShowMedManage] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("morning");
  const [addingMed, setAddingMed] = useState(false);

  // Multi-dose: which med has "add dose" panel open + pending time
  const [addDoseOpenFor, setAddDoseOpenFor] = useState<number | null>(null);
  const [addDoseTime, setAddDoseTime] = useState("");

  // Photo capture
  const [photoLoading, setPhotoLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

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

      const today = localDateStr();

      const todayLog = await api.getTodayLog(p.id) as Record<string, unknown> | null;
      if (todayLog) {
        setLoadedFromServer(true);
        const ep = todayLog.episode as Episode | null;
        const vt = todayLog.vitals as Vitals | null;
        // Load saved doses — filter to only taken:true entries for history
        const savedDoses = (todayLog.medications_taken as MedicationTaken[] | null) ?? [];
        const takenDoses = savedDoses.filter(m => m.taken);
        const waterOz = todayLog.water_intake_oz as number | null;
        const hydrPreset = waterOz === 80 ? "Good" : waterOz === 48 ? "Fair" : waterOz === 24 ? "Poor" : null;
        setDraft({
          date: today,
          patientId: p.id,
          medicationsTaken: takenDoses,
          symptoms: (todayLog.symptoms as Symptom[]) ?? [],
          medicationSideEffects: (todayLog.medication_side_effects as MedicationSideEffect[]) ?? p.medications.filter(m => m.active).map(m => ({ medication_id: m.id, medication_name: m.name, side_effects: [] })),
          sleepHours: todayLog.sleep_hours as number | null,
          hydration: hydrPreset,
          lifestyle: (todayLog.lifestyle as Lifestyle | null) ?? { smoked: false, alcohol: false, stressed: false, ate_well: false },
          activities: (todayLog.activities as Activity[]) ?? [],
          notes: (todayLog.notes as string) ?? "",
          episode: ep ?? { occurred: false, time: "", description: "" },
          vitals: vt ? {
            heart_rate: vt.heart_rate ?? "",
            blood_pressure: vt.blood_pressure ?? "",
            cigarettes: (vt as Vitals).cigarettes ?? "",
            alcohol: (vt as Vitals).alcohol ?? false,
            alcohol_drinks: (vt as Vitals).alcohol_drinks ?? "",
          } : emptyVitals(),
          photo: (todayLog.photo as string | null) ?? null,
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

  function update(patch: Partial<LogDraft>) {
    setDraft(d => d ? { ...d, ...patch } : d);
  }

  function startFresh() {
    if (!patient) return;
    setDraft(defaultDraft(patient.id, patient.medications));
    setLoadedFromServer(false);
  }

  // ── Medication multi-dose ─────────────────────────────────────────────────

  function openAddDose(medId: number) {
    setAddDoseOpenFor(medId);
    setAddDoseTime(new Date().toTimeString().slice(0, 5));
  }

  function confirmDose(medId: number) {
    if (!addDoseTime) return;
    update({ medicationsTaken: [...draft!.medicationsTaken, { medication_id: medId, taken: true, time_taken: addDoseTime }] });
    setAddDoseOpenFor(null);
  }

  function confirmDoseSimple(medId: number, time: string) {
    update({ medicationsTaken: [...draft!.medicationsTaken, { medication_id: medId, taken: true, time_taken: time }] });
    setAddDoseOpenFor(null);
  }

  function removeDose(medId: number, time: string | null) {
    const idx = draft!.medicationsTaken.findIndex(m => m.medication_id === medId && m.time_taken === time);
    if (idx >= 0) {
      const updated = [...draft!.medicationsTaken];
      updated.splice(idx, 1);
      update({ medicationsTaken: updated });
    }
  }

  // ── Symptoms ─────────────────────────────────────────────────────────────

  function setSymptomSeverity(name: string, chipValue: number) {
    const existing = draft!.symptoms.find(s => s.name === name);
    if (existing?.severity === chipValue) {
      // Tap same chip → clear symptom
      update({ symptoms: draft!.symptoms.filter(s => s.name !== name) });
    } else if (existing) {
      update({ symptoms: draft!.symptoms.map(s => s.name === name ? { ...s, severity: chipValue } : s) });
    } else {
      update({ symptoms: [...draft!.symptoms, { name, severity: chipValue }] });
    }
  }

  // ── Side effects ──────────────────────────────────────────────────────────

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

  // ── Activities ────────────────────────────────────────────────────────────

  function toggleActivity(type: string) {
    const acts = draft!.activities;
    update({ activities: acts.some(a => a.type === type) ? acts.filter(a => a.type !== type) : [...acts, { type }] });
  }

  // ── Episode / Vitals ──────────────────────────────────────────────────────

  function updateEpisode(patch: Partial<Episode>) {
    update({ episode: { ...draft!.episode, ...patch } });
  }

  function updateVitals(patch: Partial<Vitals>) {
    update({ vitals: { ...draft!.vitals, ...patch } });
  }

  // ── Medication management ─────────────────────────────────────────────────

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
      setPatient({ ...patient, medications: [...patient.medications, added] });
      update({
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
      setPatient({ ...patient, medications: patient.medications.map(m => m.id === medId ? { ...m, active: false } : m) });
      update({
        medicationsTaken: draft!.medicationsTaken.filter(m => m.medication_id !== medId),
        medicationSideEffects: draft!.medicationSideEffects.filter(m => m.medication_id !== medId),
      });
      toast.success("Medication removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove medication");
    }
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const compressed = await compressPhoto(file);
      update({ photo: compressed });
    } catch {
      toast.error("Could not process photo");
    } finally {
      setPhotoLoading(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  }

  function toggle(id: string) {
    const el = document.getElementById(id);
    const beforeTop = el?.getBoundingClientRect().top ?? 0;
    flushSync(() => {
      setOpenSection(prev => prev === id ? null : id);
    });
    const afterTop = el?.getBoundingClientRect().top ?? 0;
    const delta = afterTop - beforeTop;
    if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
  }

  async function handleSubmit() {
    if (!draft || !patient) return;
    setSaving(true);
    try {
      const activeMeds = patient.medications.filter(m => m.active);
      const medsWithDoses = new Set(draft.medicationsTaken.map(d => d.medication_id));
      // Include untaken entries for meds with no doses (for adherence tracking)
      const notTakenEntries: MedicationTaken[] = activeMeds
        .filter(m => !medsWithDoses.has(m.id))
        .map(m => ({ medication_id: m.id, taken: false, time_taken: null }));

      const hydrationOz = draft.hydration === "Good" ? 80 : draft.hydration === "Fair" ? 48 : draft.hydration === "Poor" ? 24 : null;

      await api.createLog({
        patient_id: patient.id,
        date: draft.date,
        medications_taken: [...draft.medicationsTaken, ...notTakenEntries],
        symptoms: draft.symptoms,
        medication_side_effects: draft.medicationSideEffects.filter(mse => mse.side_effects.length > 0),
        sleep_hours: draft.sleepHours,
        mood_score: null,
        water_intake_oz: hydrationOz,
        activities: draft.activities,
        lifestyle: null,
        notes: draft.notes || null,
        episode: draft.episode,
        vitals: (draft.vitals.heart_rate || draft.vitals.blood_pressure || draft.vitals.cigarettes || draft.vitals.alcohol || draft.vitals.alcohol_drinks || Object.values(draft.vitals.custom_substances ?? {}).some(Boolean))
          ? draft.vitals
          : null,
        photo: draft.photo || null,
      });
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#4a7c59", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!draft || !patient) return null;

  const activeMeds = patient.medications.filter(m => m.active);

  // Dynamic symptom/activity lists — user_config first, fall back to patient config, then defaults
  // Use .length check so empty arrays fall through to the next level (same as missing)
  const symptomNames: string[] =
    user?.user_config?.symptoms?.length ? user.user_config.symptoms :
    patient?.dashboard_config?.symptoms?.length ? patient.dashboard_config.symptoms :
    DEFAULT_SYMPTOM_NAMES;

  const _activitySlugs =
    user?.user_config?.activities?.length ? user.user_config.activities :
    patient?.dashboard_config?.activities?.length ? patient.dashboard_config.activities :
    null;
  const activityOptions: { type: string; label: string }[] = _activitySlugs
    ? _activitySlugs.map((type: string) => {
        const found = DEFAULT_ACTIVITY_OPTIONS.find(a => a.type === type);
        return found ?? { type, label: type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) };
      })
    : DEFAULT_ACTIVITY_OPTIONS;

  const configSubstanceFields: string[] =
    user?.user_config?.substance_fields ?? patient?.dashboard_config?.substance_fields ?? ["cigarettes", "alcohol"];

  const customSubstanceNames = configSubstanceFields.filter(s => s !== "cigarettes" && s !== "alcohol");

  const doseTimingMode: "simple" | "exact" = user?.user_config?.dose_timing_mode ?? "simple";

  const totalDoses = draft.medicationsTaken.filter(m => m.taken).length;
  const medsText = totalDoses > 0 ? `${totalDoses} dose${totalDoses !== 1 ? "s" : ""} logged` : "Nothing logged yet";
  const symptomsText = draft.symptoms.length > 0 ? `${draft.symptoms.length} symptom${draft.symptoms.length !== 1 ? "s" : ""} noted` : "None noted";
  const activitiesText = draft.activities.length ? `${draft.activities.length} selected` : "None selected";
  const notesText = draft.notes ? draft.notes.slice(0, 40) + (draft.notes.length > 40 ? "…" : "") : "Tap to add";
  const photoText = draft.photo ? "Photo saved" : "No photo yet";
  const episodeText = draft.episode.occurred ? `Episode at ${draft.episode.time ? fmt12(draft.episode.time) : "unknown time"}` : "No episode today";
  const vitalsText = draft.vitals.heart_rate || draft.vitals.blood_pressure
    ? [draft.vitals.heart_rate && `HR ${draft.vitals.heart_rate}`, draft.vitals.blood_pressure && `BP ${draft.vitals.blood_pressure}`].filter(Boolean).join(" · ")
    : "Tap to record";
  const sleepText = draft.sleepHours !== null ? `${draft.sleepHours} hrs` : "Tap to record";
  const hydrationText = draft.hydration ?? "Tap to record";
  const substancesText = (() => {
    const parts = [];
    if (draft.vitals.cigarettes) parts.push(`${draft.vitals.cigarettes} cig${Number(draft.vitals.cigarettes) !== 1 ? "s" : ""}`);
    if (draft.vitals.alcohol) parts.push(`alcohol${draft.vitals.alcohol_drinks ? ` (${draft.vitals.alcohol_drinks})` : ""}`);
    return parts.length ? parts.join(" · ") : "None today";
  })();

  return (
    <div className="min-h-screen pb-36" style={{ background: "#faf9f6" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Daily Log</h1>
          <p className="text-base text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {loadedFromServer && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <span style={{ color: "#1D4ED8" }}>Previous entry loaded. Want to start fresh?</span>
            <button
              type="button"
              onClick={startFresh}
              className="ml-3 font-semibold underline underline-offset-2 flex-shrink-0"
              style={{ color: "#1D4ED8" }}
            >
              Clear form
            </button>
          </div>
        )}

        {/* ── Medications ── */}
        <AccordionSection id="medications" title="Medications" summaryLine={medsText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "medications"} onToggle={() => toggle("medications")}>

          {activeMeds.length === 0 && (
            <p className="text-base text-slate-400">No active medications on file.</p>
          )}

          {activeMeds.map((med, idx) => {
            const doses = draft.medicationsTaken.filter(m => m.medication_id === med.id && m.taken);
            const mse = draft.medicationSideEffects.find(m => m.medication_id === med.id);
            const seOpen = expandedSE === med.id;
            const doseOpen = addDoseOpenFor === med.id;

            return (
              <div key={med.id} className="space-y-3">
                {idx > 0 && <div className="border-t border-amber-100" />}

                {/* Med name + dose count */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-navy">{med.name}</p>
                    {doses.length > 0 ? (
                      <p className="text-sm" style={{ color: "#4a7c59" }}>
                        taken {doses.length}× today — {doses.map(d => displayDoseTime(d.time_taken)).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">{med.time_of_day} · not logged yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => doseOpen ? setAddDoseOpenFor(null) : openAddDose(med.id)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ background: "#4a7c59" }}
                  >
                    + Dose
                  </button>
                </div>

                {/* Logged dose chips with remove */}
                {doses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {doses.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ background: "#e8f0eb", color: "#065F46" }}>
                        {displayDoseTime(d.time_taken)}
                        <button type="button" onClick={() => removeDose(med.id, d.time_taken)}
                          className="text-teal-700 hover:text-red-500 leading-none transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline add-dose panel */}
                {doseOpen && doseTimingMode === "simple" && (
                  <div className="bg-white rounded-xl px-3 py-3 border border-amber-200 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      {SIMPLE_DOSE_TIMES.map(({ label, time }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => confirmDoseSimple(med.id, time)}
                          className="py-2 rounded-lg text-sm font-semibold border-2 transition-all active:scale-95"
                          style={{ borderColor: "#4a7c59", color: "#4a7c59", background: "white" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setAddDoseOpenFor(null)}
                      className="text-xs text-slate-400 w-full text-center">Cancel</button>
                  </div>
                )}

                {doseOpen && doseTimingMode === "exact" && (
                  <div className="flex gap-2 items-center bg-white rounded-xl px-3 py-2.5 border border-amber-200">
                    <input
                      type="time"
                      value={addDoseTime}
                      onChange={e => setAddDoseTime(e.target.value)}
                      className="flex-1 text-navy text-base focus:outline-none bg-transparent"
                    />
                    <button type="button" onClick={() => confirmDose(med.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: "#4a7c59" }}>Log</button>
                    <button type="button" onClick={() => setAddDoseOpenFor(null)}
                      className="text-slate-400 text-lg leading-none">×</button>
                  </div>
                )}

                {/* Side effects */}
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
                {patient.medications.filter(m => m.active).map(med => (
                  <div key={med.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                    <span className="text-sm font-medium text-navy">{med.name} <span className="text-slate-400 font-normal">· {med.time_of_day}</span></span>
                    <button type="button" onClick={() => handleRemoveMed(med.id)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none transition-colors" title="Remove">×</button>
                  </div>
                ))}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Add medication</p>
                  <input
                    type="text" value={newMedName} onChange={e => setNewMedName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMed(); } }}
                    placeholder="Medication name"
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-navy text-sm focus:outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    {["morning", "noon", "night"].map(t => (
                      <button key={t} type="button" onClick={() => setNewMedTime(t)}
                        className="flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-all"
                        style={{ borderColor: newMedTime === t ? "#4a7c59" : "#CBD5E1", background: newMedTime === t ? "#4a7c59" : "white", color: newMedTime === t ? "white" : "#64748B" }}
                      >{t}</button>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddMed} disabled={addingMed || !newMedName.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: newMedName.trim() ? "#4a7c59" : "#CBD5E1" }}
                  >{addingMed ? "Adding…" : "Add medication"}</button>
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* ── Symptoms ── */}
        <AccordionSection id="symptoms" title="Symptoms" summaryLine={symptomsText}
          bgColor="white" borderColor="#d4e0d7" headingColor="#1a2420"
          isOpen={openSection === "symptoms"} onToggle={() => toggle("symptoms")}>

          {symptomNames.map(name => {
            const s = draft.symptoms.find(s => s.name === name);
            const activeValue = s?.severity ?? null;
            const isNone = activeValue === null;

            return (
              <div key={name} className="space-y-2">
                <p className="text-base font-semibold text-slate-700">{name}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => update({ symptoms: draft!.symptoms.filter(s => s.name !== name) })}
                    className="py-2.5 rounded-xl border-2 text-sm font-semibold transition-all"
                    style={{
                      borderColor: isNone ? "#4a7c59" : "#CBD5E1",
                      background: isNone ? "#e8f0eb" : "white",
                      color: isNone ? "#4a7c59" : "#334155",
                    }}
                  >None</button>
                  {SEVERITY_CHIPS.map(chip => {
                    const isActive = activeValue === chip.value;
                    return (
                      <button
                        key={chip.label} type="button"
                        onClick={() => setSymptomSeverity(name, chip.value)}
                        className="py-2.5 rounded-xl border-2 text-sm font-semibold transition-all"
                        style={{
                          borderColor: isActive ? "#4a7c59" : "#CBD5E1",
                          background: isActive ? "#4a7c59" : "white",
                          color: isActive ? "white" : "#334155",
                        }}
                      >{chip.label}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </AccordionSection>

        {/* ── Episode ── */}
        <AccordionSection id="episode" title="Episode" summaryLine={episodeText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "episode"} onToggle={() => toggle("episode")}>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-slate-700">Did an episode happen today?</p>
              <Toggle value={draft.episode.occurred} onChange={v => updateEpisode({ occurred: v })} />
            </div>

            {draft.episode.occurred && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-500">What time?</label>
                  <input
                    type="time" value={draft.episode.time}
                    onChange={e => updateEpisode({ time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 text-navy text-base focus:outline-none bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-500">What happened?</label>
                  <textarea
                    value={draft.episode.description}
                    onChange={e => updateEpisode({ description: e.target.value })}
                    rows={4}
                    placeholder="e.g. Around 4pm Jack had a catatonic episode that lasted about 20 minutes…"
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 text-navy text-base focus:outline-none resize-none bg-white"
                  />
                </div>
              </>
            )}
          </div>
        </AccordionSection>

        {/* ── Vitals ── */}
        <AccordionSection id="vitals" title="Vitals" summaryLine={vitalsText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "vitals"} onToggle={() => toggle("vitals")}>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-base font-semibold text-slate-700">Heart Rate <span className="text-sm font-normal text-slate-400">(bpm)</span></label>
              <input type="number" inputMode="numeric" value={draft.vitals.heart_rate}
                onChange={e => updateVitals({ heart_rate: e.target.value })}
                placeholder="e.g. 72"
                className="w-full px-4 py-3 rounded-xl border border-sky-200 text-navy text-base focus:outline-none bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-base font-semibold text-slate-700">Blood Pressure <span className="text-sm font-normal text-slate-400">(e.g. 120/80)</span></label>
              <input type="text" inputMode="numeric" value={draft.vitals.blood_pressure}
                onChange={e => updateVitals({ blood_pressure: e.target.value })}
                placeholder="120/80"
                className="w-full px-4 py-3 rounded-xl border border-sky-200 text-navy text-base focus:outline-none bg-white"
              />
            </div>
          </div>
        </AccordionSection>

        {/* ── Sleep ── */}
        <AccordionSection id="sleep" title="Sleep" summaryLine={sleepText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "sleep"} onToggle={() => toggle("sleep")}>

          <LabeledSlider label="Hours of sleep last night" value={draft.sleepHours}
            min={0} max={12} step={0.5} onChange={v => update({ sleepHours: v })}
            leftLabel="0 hrs" rightLabel="12 hrs" unit=" hrs" />
        </AccordionSection>

        {/* ── Hydration ── */}
        <AccordionSection id="hydration" title="Hydration" summaryLine={hydrationText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "hydration"} onToggle={() => toggle("hydration")}>

          <div className="space-y-2">
            <p className="text-sm text-slate-500">How well hydrated was {patient.name} today?</p>
            <div className="grid grid-cols-3 gap-3">
              {HYDRATION_PRESETS.map(preset => {
                const isActive = draft.hydration === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => update({ hydration: isActive ? null : preset.label })}
                    className="py-4 rounded-xl border-2 text-base font-semibold transition-all"
                    style={{
                      borderColor: isActive ? "#4a7c59" : "#CBD5E1",
                      background: isActive ? "#4a7c59" : "white",
                      color: isActive ? "white" : "#334155",
                    }}
                  >{preset.label}</button>
                );
              })}
            </div>
          </div>
        </AccordionSection>

        {/* ── Activities ── */}
        <AccordionSection id="activities" title="Activities" summaryLine={activitiesText}
          bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
          isOpen={openSection === "activities"} onToggle={() => toggle("activities")}>

          <div className="grid grid-cols-3 gap-3">
            {activityOptions.map(a => (
              <Tile key={a.type} label={a.label}
                active={draft.activities.some(act => act.type === a.type)}
                onClick={() => toggleActivity(a.type)} />
            ))}
          </div>
        </AccordionSection>

        {/* ── Substances ── */}
        {configSubstanceFields.length > 0 && (
          <AccordionSection id="substances" title="Substances" summaryLine={substancesText}
            bgColor="#f2f7f3" borderColor="#d4e0d7" headingColor="#2d4f38"
            isOpen={openSection === "substances"} onToggle={() => toggle("substances")}>

            <div className="space-y-5">
              {/* Cigarettes */}
              {configSubstanceFields.includes("cigarettes") && (
                <div className="space-y-2">
                  <label className="text-base font-semibold text-slate-700">Cigarettes today</label>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => updateVitals({ cigarettes: String(Math.max(0, parseInt(draft.vitals.cigarettes || "0") - 1)) })}
                      className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl">−</button>
                    <input
                      type="number" inputMode="numeric" min={0}
                      value={draft.vitals.cigarettes}
                      onChange={e => updateVitals({ cigarettes: e.target.value })}
                      placeholder="0"
                      className="flex-1 text-center px-4 py-3 rounded-xl border border-orange-200 text-navy text-2xl font-bold focus:outline-none bg-white"
                    />
                    <button type="button"
                      onClick={() => updateVitals({ cigarettes: String(parseInt(draft.vitals.cigarettes || "0") + 1) })}
                      className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl">+</button>
                  </div>
                </div>
              )}

              {/* Alcohol */}
              {configSubstanceFields.includes("alcohol") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-base font-semibold text-slate-700">Alcohol today?</label>
                    <Toggle value={draft.vitals.alcohol} onChange={v => updateVitals({ alcohol: v, alcohol_drinks: v ? draft.vitals.alcohol_drinks : "" })} />
                  </div>
                  {draft.vitals.alcohol && (
                    <div className="space-y-1.5">
                      <label className="text-sm text-slate-500">How many drinks?</label>
                      <input
                        type="number" inputMode="numeric" min={0}
                        value={draft.vitals.alcohol_drinks}
                        onChange={e => updateVitals({ alcohol_drinks: e.target.value })}
                        placeholder="e.g. 2"
                        className="w-full px-4 py-3 rounded-xl border border-orange-200 text-navy text-base focus:outline-none bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Custom substances */}
              {customSubstanceNames.map(name => {
                const val = draft.vitals.custom_substances?.[name] ?? false;
                return (
                  <div key={name} className="flex items-center justify-between">
                    <label className="text-base font-semibold text-slate-700">{name} today?</label>
                    <Toggle
                      value={val}
                      onChange={v => updateVitals({ custom_substances: { ...draft.vitals.custom_substances, [name]: v } })}
                    />
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* ── Today's Photo ── */}
        <AccordionSection id="photo" title="Today's Photo" summaryLine={photoText}
          bgColor="white" borderColor="#d4e0d7" headingColor="#1a2420"
          isOpen={openSection === "photo"} onToggle={() => toggle("photo")}>

          {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handlePhotoFile} />
          <input ref={libraryInputRef} type="file" accept="image/*"
            className="hidden" onChange={handlePhotoFile} />

          {draft.photo ? (
            <div className="space-y-3">
              {/* Photo preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.photo}
                alt="Today's photo"
                className="w-full rounded-2xl object-cover"
                style={{ maxHeight: 320 }}
              />
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => libraryInputRef.current?.click()}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white">
                  Replace
                </button>
                <button type="button"
                  onClick={() => update({ photo: null })}
                  className="flex-1 py-3 rounded-xl border border-red-100 text-sm font-semibold text-red-500 bg-red-50">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">One photo per day. Saves with the log and appears in the photo timeline.</p>
              {photoLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#4a7c59", borderTopColor: "transparent" }} />
                </div>
              ) : (
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 bg-slate-50 active:bg-slate-100 transition-colors">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-semibold">Take Photo</span>
                  </button>
                  <button type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 bg-slate-50 active:bg-slate-100 transition-colors">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold">From Library</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </AccordionSection>

        {/* ── Notes ── */}
        <AccordionSection id="notes" title="Notes" summaryLine={notesText}
          bgColor="white" borderColor="#d4e0d7" headingColor="#1a2420"
          isOpen={openSection === "notes"} onToggle={() => toggle("notes")}>

          <div className="flex justify-between mb-1">
            <span className="text-sm text-slate-500" />
            <span className="text-sm text-slate-400">{draft.notes.length}/500</span>
          </div>
          <textarea
            value={draft.notes}
            onChange={e => { if (e.target.value.length <= 500) update({ notes: e.target.value }); }}
            rows={4}
            placeholder="Anything added here will appear in the summary report."
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
            style={{ background: saved ? "#16A34A" : saving ? "#2d4f38" : "linear-gradient(135deg, #4a7c59, #2d4f38)", opacity: saving ? 0.9 : 1 }}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
