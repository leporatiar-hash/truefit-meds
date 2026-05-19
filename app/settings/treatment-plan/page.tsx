"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { useAuth } from "../../components/AuthProvider";
import { NavBar } from "../../components/NavBar";
import type { Patient, TreatmentPlan } from "../../lib/types";

type PlanDraft = Omit<TreatmentPlan, "id" | "patient_id" | "created_at" | "updated_at">;

function emptyDraft(): PlanDraft {
  return {
    therapy_type: "",
    therapy_frequency: "",
    therapy_days: "",
    therapy_location: "",
    therapist_name: "",
    therapist_specialty: "",
    therapist_contact: "",
    primary_doctor_name: "",
    primary_doctor_specialty: "",
    primary_doctor_contact: "",
    bedtime: "",
    wake_time: "",
    sleep_notes: "",
    substances_to_avoid: "",
    care_goals: "",
    next_appointment_date: "",
    next_appointment_with: "",
  };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <p className="text-base font-bold text-navy">{title}</p>
      </div>
      <div className="px-5 pb-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function TreatmentPlanPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user) {
      api.getPatients().then(async (pts) => {
        const list = pts as Patient[];
        if (!list.length) { router.push("/onboarding"); return; }
        const p = list[0];
        setPatient(p);
        try {
          const plan = await api.getTreatmentPlan(p.id) as TreatmentPlan;
          setDraft({
            therapy_type: plan.therapy_type ?? "",
            therapy_frequency: plan.therapy_frequency ?? "",
            therapy_days: plan.therapy_days ?? "",
            therapy_location: plan.therapy_location ?? "",
            therapist_name: plan.therapist_name ?? "",
            therapist_specialty: plan.therapist_specialty ?? "",
            therapist_contact: plan.therapist_contact ?? "",
            primary_doctor_name: plan.primary_doctor_name ?? "",
            primary_doctor_specialty: plan.primary_doctor_specialty ?? "",
            primary_doctor_contact: plan.primary_doctor_contact ?? "",
            bedtime: plan.bedtime ?? "",
            wake_time: plan.wake_time ?? "",
            sleep_notes: plan.sleep_notes ?? "",
            substances_to_avoid: plan.substances_to_avoid ?? "",
            care_goals: plan.care_goals ?? "",
            next_appointment_date: plan.next_appointment_date ?? "",
            next_appointment_with: plan.next_appointment_with ?? "",
          });
        } catch {
          // 404 = no plan yet, start with empty form
        }
      }).catch(() => toast.error("Failed to load patient"))
        .finally(() => setLoading(false));
    }
  }, [user, isLoading, router]);

  function set(field: keyof PlanDraft, value: string) {
    setDraft(d => ({ ...d, [field]: value }));
  }

  async function handleSave() {
    if (!patient) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) {
        payload[k] = (v as string).trim() || null;
      }
      await api.saveTreatmentPlan(patient.id, payload);
      toast.success("Treatment plan saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 text-base text-navy focus:outline-none bg-white";
  const textareaClass = `${inputClass} resize-none`;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#4a7c59", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#faf9f6" }}>
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-navy transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy">Treatment Plan</h1>
            {patient && <p className="text-sm text-slate-500">For {patient.name}</p>}
          </div>
        </div>

        <p className="text-sm text-slate-500 -mt-1">
          All fields optional. This context appears in AI summaries so clinicians see what was planned vs. what happened.
        </p>

        {/* ── Therapy ── */}
        <SectionCard title="Therapy & Treatment">
          <Field label="Therapy type" hint='e.g. "IOP", "Individual Therapy", "Group Therapy"'>
            <input type="text" value={draft.therapy_type ?? ""} onChange={e => set("therapy_type", e.target.value)}
              placeholder="Individual Therapy" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <input type="text" value={draft.therapy_frequency ?? ""} onChange={e => set("therapy_frequency", e.target.value)}
                placeholder="3x/week" className={inputClass} />
            </Field>
            <Field label="Days">
              <input type="text" value={draft.therapy_days ?? ""} onChange={e => set("therapy_days", e.target.value)}
                placeholder="Mon, Wed, Fri" className={inputClass} />
            </Field>
          </div>
          <Field label="Location (optional)">
            <input type="text" value={draft.therapy_location ?? ""} onChange={e => set("therapy_location", e.target.value)}
              placeholder="Clinic name or address" className={inputClass} />
          </Field>
        </SectionCard>

        {/* ── Clinicians ── */}
        <SectionCard title="Clinicians">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Therapist</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input type="text" value={draft.therapist_name ?? ""} onChange={e => set("therapist_name", e.target.value)}
                placeholder="Dr. Smith" className={inputClass} />
            </Field>
            <Field label="Specialty">
              <input type="text" value={draft.therapist_specialty ?? ""} onChange={e => set("therapist_specialty", e.target.value)}
                placeholder="Psychiatry" className={inputClass} />
            </Field>
          </div>
          <Field label="Contact">
            <input type="text" value={draft.therapist_contact ?? ""} onChange={e => set("therapist_contact", e.target.value)}
              placeholder="Phone or email" className={inputClass} />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-1">Primary Doctor</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input type="text" value={draft.primary_doctor_name ?? ""} onChange={e => set("primary_doctor_name", e.target.value)}
                placeholder="Dr. Jones" className={inputClass} />
            </Field>
            <Field label="Specialty">
              <input type="text" value={draft.primary_doctor_specialty ?? ""} onChange={e => set("primary_doctor_specialty", e.target.value)}
                placeholder="Internal Medicine" className={inputClass} />
            </Field>
          </div>
          <Field label="Contact">
            <input type="text" value={draft.primary_doctor_contact ?? ""} onChange={e => set("primary_doctor_contact", e.target.value)}
              placeholder="Phone or email" className={inputClass} />
          </Field>
        </SectionCard>

        {/* ── Sleep ── */}
        <SectionCard title="Sleep Plan">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bedtime">
              <input type="time" value={draft.bedtime ?? ""} onChange={e => set("bedtime", e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="Wake time">
              <input type="time" value={draft.wake_time ?? ""} onChange={e => set("wake_time", e.target.value)}
                className={inputClass} />
            </Field>
          </div>
          <Field label="Sleep notes" hint='e.g. "No screens after 9pm", "Take melatonin at 9pm"'>
            <textarea rows={2} value={draft.sleep_notes ?? ""} onChange={e => set("sleep_notes", e.target.value)}
              placeholder="Any sleep hygiene instructions…" className={textareaClass} />
          </Field>
        </SectionCard>

        {/* ── Substance Avoidance ── */}
        <SectionCard title="Substance Avoidance">
          <Field label="What should they avoid?" hint="Appears in summaries to flag any logged substance use">
            <textarea rows={2} value={draft.substances_to_avoid ?? ""} onChange={e => set("substances_to_avoid", e.target.value)}
              placeholder="e.g. alcohol, cannabis, stimulants" className={textareaClass} />
          </Field>
        </SectionCard>

        {/* ── Care Goals ── */}
        <SectionCard title="Care Goals">
          <Field label="Main treatment goals" hint="The AI will reference these when evaluating 30-day progress">
            <textarea rows={4} value={draft.care_goals ?? ""} onChange={e => set("care_goals", e.target.value)}
              placeholder={"Increase social engagement\nReduce isolation\nStabilize mood\nMaintain medication adherence"}
              className={textareaClass} />
          </Field>
        </SectionCard>

        {/* ── Next Appointment ── */}
        <SectionCard title="Next Appointment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={draft.next_appointment_date ?? ""} onChange={e => set("next_appointment_date", e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="With">
              <input type="text" value={draft.next_appointment_with ?? ""} onChange={e => set("next_appointment_with", e.target.value)}
                placeholder="Clinician name" className={inputClass} />
            </Field>
          </div>
        </SectionCard>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 rounded-2xl font-bold text-white text-xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #4a7c59, #2d4f38)" }}
        >
          {saving ? "Saving…" : "Save Treatment Plan"}
        </button>
      </div>
    </div>
  );
}
