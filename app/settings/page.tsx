"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";
import type { User } from "../lib/types";

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-lg font-bold text-navy">{title}</p>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 pb-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Chip with remove ──────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #86EFAC" }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
        style={{ color: "#166534" }}
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function SubstanceChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ background: "#FFF7ED", color: "#9A3412", border: "1px solid #FDBA74" }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors"
        style={{ color: "#9A3412" }}
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
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

// ── Add input ─────────────────────────────────────────────────────────────────

function AddInput({
  placeholder, onAdd, borderColor = "#86EFAC", buttonColor = "#166534",
}: {
  placeholder: string;
  onAdd: (val: string) => void;
  borderColor?: string;
  buttonColor?: string;
}) {
  const [val, setVal] = useState("");
  function submit() {
    const trimmed = val.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setVal("");
  }
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 rounded-xl border text-base text-navy focus:outline-none bg-white"
        style={{ borderColor }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!val.trim()}
        className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
        style={{ background: buttonColor }}
      >
        Add
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Symptom list
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // Substance toggles + custom list
  const [showCigarettes, setShowCigarettes] = useState(true);
  const [showAlcohol, setShowAlcohol] = useState(true);
  const [customSubstances, setCustomSubstances] = useState<string[]>([]);

  // Dose timing
  const [doseTimingMode, setDoseTimingMode] = useState<"simple" | "exact">("simple");

  const loadFromUser = useCallback((u: User) => {
    const cfg = u.user_config;
    if (!cfg) return;

    if (cfg.symptoms) setSymptoms(cfg.symptoms);

    const sf: string[] = cfg.substance_fields ?? ["cigarettes", "alcohol"];
    setShowCigarettes(sf.includes("cigarettes"));
    setShowAlcohol(sf.includes("alcohol"));
    setCustomSubstances(sf.filter((s: string) => s !== "cigarettes" && s !== "alcohol"));

    setDoseTimingMode(cfg.dose_timing_mode ?? "simple");
  }, []);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) loadFromUser(user);
  }, [user, isLoading, loadFromUser, router]);

  function addSymptom(name: string) {
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (symptoms.includes(normalized)) return;
    setSymptoms(prev => [...prev, normalized]);
  }

  function removeSymptom(name: string) {
    setSymptoms(prev => prev.filter(s => s !== name));
  }

  function addCustomSubstance(name: string) {
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (customSubstances.includes(normalized)) return;
    setCustomSubstances(prev => [...prev, normalized]);
  }

  function removeCustomSubstance(name: string) {
    setCustomSubstances(prev => prev.filter(s => s !== name));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const substanceFields: string[] = [
        ...(showCigarettes ? ["cigarettes"] : []),
        ...(showAlcohol ? ["alcohol"] : []),
        ...customSubstances,
      ];

      const updates = {
        symptoms,
        substance_fields: substanceFields,
        dose_timing_mode: doseTimingMode,
      };

      const updated = await api.updateUserConfig(updates) as User;
      updateUser(updated);
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
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
        <div>
          <h1 className="text-3xl font-bold text-navy">Settings</h1>
          <p className="text-base text-slate-500 mt-1">Customize your daily log experience</p>
        </div>

        {/* ── Symptoms ── */}
        <Section
          title="Symptoms"
          subtitle="Choose exactly which symptoms to track every day"
        >
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {symptoms.map(s => (
                <Chip key={s} label={s} onRemove={() => removeSymptom(s)} />
              ))}
            </div>
          )}
          {symptoms.length === 0 && (
            <p className="text-sm text-slate-400">No symptoms added yet. Add some below.</p>
          )}
          <AddInput
            placeholder="e.g. Spasticity, Vision Issues, Tremor…"
            onAdd={addSymptom}
          />
        </Section>

        {/* ── Substances ── */}
        <Section
          title="Substances"
          subtitle="Track what's relevant — turn off what isn't"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-700">Cigarettes / Tobacco</p>
                <p className="text-sm text-slate-400">Track daily cigarette count</p>
              </div>
              <Toggle value={showCigarettes} onChange={setShowCigarettes} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-700">Alcohol</p>
                <p className="text-sm text-slate-400">Track alcohol use and drinks</p>
              </div>
              <Toggle value={showAlcohol} onChange={setShowAlcohol} />
            </div>
          </div>

          {customSubstances.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {customSubstances.map(s => (
                <SubstanceChip key={s} label={s} onRemove={() => removeCustomSubstance(s)} />
              ))}
            </div>
          )}

          <AddInput
            placeholder="Add custom substance (e.g. Cannabis, Opioids…)"
            onAdd={addCustomSubstance}
            borderColor="#FDBA74"
            buttonColor="#9A3412"
          />
        </Section>

        {/* ── Dose Timing ── */}
        <Section
          title="Dose Timing"
          subtitle="How do you want to log when medications are taken?"
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setDoseTimingMode("simple")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: doseTimingMode === "simple" ? "#0D9488" : "#CBD5E1",
                background: doseTimingMode === "simple" ? "#F0FDFA" : "white",
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: doseTimingMode === "simple" ? "#0D9488" : "#CBD5E1" }}
              >
                {doseTimingMode === "simple" && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#0D9488" }} />
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-navy">Simple</p>
                <p className="text-sm text-slate-500 mt-0.5">Morning · Afternoon · Evening · Night</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDoseTimingMode("exact")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: doseTimingMode === "exact" ? "#0D9488" : "#CBD5E1",
                background: doseTimingMode === "exact" ? "#F0FDFA" : "white",
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: doseTimingMode === "exact" ? "#0D9488" : "#CBD5E1" }}
              >
                {doseTimingMode === "exact" && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#0D9488" }} />
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-navy">Exact Time</p>
                <p className="text-sm text-slate-500 mt-0.5">Pick the precise time for each dose</p>
              </div>
            </button>
          </div>
        </Section>

        {/* ── Save ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 rounded-2xl font-bold text-white text-xl shadow-xl transition-all active:scale-[0.98]"
          style={{ background: saving ? "#0B7A70" : "linear-gradient(135deg, #0D9488, #0B7A70)", opacity: saving ? 0.9 : 1 }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
