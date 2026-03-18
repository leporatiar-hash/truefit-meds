from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import os
from dotenv import load_dotenv
from openai import OpenAI

from database import get_db
import models
import schemas
from auth import get_current_user

load_dotenv()

router = APIRouter()


@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = models.Patient(
        name=patient_data.name,
        date_of_birth=patient_data.date_of_birth,
        diagnosis=patient_data.diagnosis,
        notes=patient_data.notes,
        caregiver_id=current_user.id,
    )
    db.add(patient)
    db.flush()  # get patient.id without committing

    for med_data in (patient_data.medications or []):
        med = models.Medication(
            patient_id=patient.id,
            name=med_data.name,
            dose=med_data.dose,
            frequency=med_data.frequency,
            time_of_day=med_data.time_of_day,
        )
        db.add(med)

    db.commit()
    db.refresh(patient)
    return patient


@router.get("/", response_model=List[schemas.PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Patient)
        .filter(models.Patient.caregiver_id == current_user.id)
        .all()
    )


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id,
            models.Patient.caregiver_id == current_user.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/{patient_id}/medications", response_model=schemas.MedicationResponse)
def add_medication(
    patient_id: int,
    med_data: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id,
            models.Patient.caregiver_id == current_user.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    med = models.Medication(
        patient_id=patient_id,
        name=med_data.name,
        dose=med_data.dose,
        frequency=med_data.frequency,
        time_of_day=med_data.time_of_day,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


_DEFAULT_CONFIG = {
    "symptoms": ["Anxiety", "Aggression", "Confusion", "Fatigue", "Pain", "Nausea", "Crying", "Mood Changes"],
    "activities": ["walking", "music", "drawing", "reading", "socializing", "other"],
    "modules": ["medications", "symptoms", "mood", "sleep", "water", "activities"],
    "symptom_label": "Symptoms",
    "episode_label": "Notable Episodes",
    "lifestyle_flags": ["smoked", "alcohol", "stressed", "ate_well"],
    "substance_fields": ["cigarettes", "alcohol"],
    "condition_context": "Patient is being monitored by a caregiver.",
    "summary_style": "adaptive",
}


@router.post("/{patient_id}/generate-config", response_model=schemas.PatientResponse)
def generate_config(
    patient_id: int,
    survey: schemas.IntakeSurveyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id,
            models.Patient.caregiver_id == current_user.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    system_prompt = (
        "You are a health tracking assistant. Generate a personalized caregiver dashboard config. "
        "This app is used by caregivers tracking ANY illness — dementia, MS, Parkinson's, anxiety disorders, "
        "addiction recovery, cancer, chronic pain, ALS, epilepsy, autism, PTSD, pediatric conditions, and more. "
        "Your config must be fully specific to the exact condition described. "
        "Return ONLY valid JSON — no markdown fences, no explanation."
    )

    user_prompt = f"""A caregiver is setting up tracking for {patient.name}, diagnosed with {patient.diagnosis}.
Relationship to patient: {survey.relationship}
Situation/conditions: {", ".join(survey.conditions)}
Wants to track: {", ".join(survey.track_modules)}
Other notes: {survey.other_notes or "None"}

Generate a config tailored EXACTLY to this condition. Consider:
- Which symptoms actually matter for this diagnosis (not generic ones)
- Which lifestyle factors are clinically relevant (e.g. stressed/ate_well for most; smoked/alcohol only if relevant)
- Whether substance tracking is appropriate (e.g. remove for pediatric patients, include for addiction recovery)
- What tone the AI summaries should have (compassionate for mental health/dementia, clinical for physical conditions)

Return exactly this JSON structure:
{{
  "symptoms": ["4-8 condition-specific symptom names for {patient.diagnosis}"],
  "activities": ["4-6 slugs from: walking, running, music, drawing, reading, cooking, socializing, physical_therapy, meditation, journaling, other"],
  "modules": ["ordered list from: medications, symptoms, mood, sleep, water, activities, vitals, episode, side_effects"],
  "symptom_label": "condition-appropriate label for the symptoms section",
  "episode_label": "condition-appropriate label for notable episodes",
  "lifestyle_flags": ["subset of: smoked, alcohol, stressed, ate_well — only clinically relevant ones"],
  "substance_fields": ["subset of: cigarettes, alcohol — only if tracking is appropriate for this condition"],
  "condition_context": "1-2 sentence description of {patient.name}'s condition for use in clinical summaries",
  "summary_style": "one of: compassionate, clinical, adaptive"
}}"""

    config = _DEFAULT_CONFIG.copy()
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
            client = OpenAI(api_key=api_key)
            completion = client.chat.completions.create(
                model=model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            response_text = (completion.choices[0].message.content or "").strip()
            if response_text:
                parsed = json.loads(response_text)
                # Validate required keys are present before accepting
                if all(k in parsed for k in ("symptoms", "activities", "modules")):
                    config = parsed
                    config.setdefault("lifestyle_flags", ["smoked", "alcohol", "stressed", "ate_well"])
                    config.setdefault("substance_fields", ["cigarettes", "alcohol"])
                    config.setdefault("condition_context", f"Patient has {patient.diagnosis}.")
                    config.setdefault("summary_style", "adaptive")
    except Exception:
        pass  # Fall back to default config — onboarding must not break

    patient.dashboard_config = config
    db.commit()
    db.refresh(patient)
    return patient
