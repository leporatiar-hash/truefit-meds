from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os
from dotenv import load_dotenv
from openai import OpenAI

from database import get_db
import models
from auth import get_current_user

load_dotenv()

router = APIRouter()


def _calculate_adherence(logs, medications):
    med_stats = {
        med.id: {"name": med.name, "taken": 0, "total": 0}
        for med in medications
    }
    for log in logs:
        if not log.medications_taken:
            continue
        for entry in log.medications_taken:
            mid = entry.get("medication_id")
            if mid in med_stats:
                med_stats[mid]["total"] += 1
                if entry.get("taken"):
                    med_stats[mid]["taken"] += 1
    return {
        mid: {
            "name": data["name"],
            "percentage": round(data["taken"] / data["total"] * 100, 1) if data["total"] else 0,
            "days_taken": data["taken"],
            "days_logged": data["total"],
        }
        for mid, data in med_stats.items()
    }


@router.post("/{patient_id}")
def generate_summary(
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

    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    logs = (
        db.query(models.DailyLog)
        .filter(
            models.DailyLog.patient_id == patient_id,
            models.DailyLog.date >= thirty_days_ago,
        )
        .order_by(models.DailyLog.date.asc())
        .all()
    )

    if not logs:
        raise HTTPException(status_code=404, detail="No logs found for the last 30 days")

    medications = (
        db.query(models.Medication)
        .filter(
            models.Medication.patient_id == patient_id,
            models.Medication.active == True,
        )
        .all()
    )

    adherence = _calculate_adherence(logs, medications)

    # Read condition context and summary style from user config
    user_config = current_user.user_config or {}
    condition_context = user_config.get(
        "condition_context",
        f"{patient.name} has {patient.diagnosis} and is being monitored by a caregiver."
    )
    summary_style = user_config.get("summary_style", "adaptive")

    # Aggregate statistics
    sleep_vals, mood_vals, water_vals = [], [], []
    symptom_counts: dict = defaultdict(lambda: {"severe": 0, "moderate": 0, "none": 0})
    activity_counts = defaultdict(int)
    side_effect_counts = defaultdict(lambda: defaultdict(int))
    lifestyle_totals = defaultdict(int)
    log_entries = []

    HYDRATION_LABELS = {80: "Good", 48: "Fair", 24: "Poor"}

    for log in logs:
        if log.sleep_hours is not None:
            sleep_vals.append(log.sleep_hours)
        if log.mood_score is not None:
            mood_vals.append(log.mood_score)
        if log.water_intake_oz is not None:
            water_vals.append(log.water_intake_oz)

        for s in (log.symptoms or []):
            name = s["name"]
            sev = s["severity"]
            if sev >= 8:
                symptom_counts[name]["severe"] += 1
            elif sev >= 5:
                symptom_counts[name]["moderate"] += 1
            else:
                symptom_counts[name]["none"] += 1

        for a in (log.activities or []):
            activity_counts[a["type"]] += 1

        for med_se in (log.medication_side_effects or []):
            for se in med_se.get("side_effects", []):
                side_effect_counts[med_se["medication_name"]][se["name"]] += 1

        if log.lifestyle:
            for k, v in log.lifestyle.items():
                if v:
                    lifestyle_totals[k] += 1

        water_label = HYDRATION_LABELS.get(log.water_intake_oz) if log.water_intake_oz is not None else None
        log_entries.append({
            "date": log.date.isoformat(),
            "mood": log.mood_score,
            "sleep_hours": log.sleep_hours,
            "hydration": water_label or (f"{log.water_intake_oz}oz" if log.water_intake_oz is not None else None),
            "symptoms": log.symptoms,
            "activities": log.activities,
            "lifestyle": log.lifestyle,
            "medications_taken": log.medications_taken,
            "medication_side_effects": log.medication_side_effects,
            "notes": log.notes,
        })

    avg_sleep = round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else None
    avg_mood = round(sum(mood_vals) / len(mood_vals), 1) if mood_vals else None

    # Hydration summary
    hydration_counts: dict = defaultdict(int)
    for v in water_vals:
        label = HYDRATION_LABELS.get(v, "other")
        hydration_counts[label] += 1

    # Precompute for JSON serialisation (defaultdicts aren't directly serialisable)
    side_effects_serializable = {k: dict(v) for k, v in side_effect_counts.items()}

    # Build symptom tracking text
    total_logs = len(logs)
    symptom_lines = []
    for name, counts in symptom_counts.items():
        logged_days = counts["severe"] + counts["moderate"] + counts["none"]
        not_logged = total_logs - logged_days
        symptom_lines.append(
            f"  - {name}: {counts['severe']} Severe days, {counts['moderate']} Moderate days, "
            f"{not_logged} days not logged"
        )
    symptom_tracking_text = "\n".join(symptom_lines) if symptom_lines else "  No symptoms logged."

    med_list_text = "\n".join(
        f"  - {d['name']}: {d['percentage']}% adherence ({d['days_taken']}/{d['days_logged']} days)"
        for d in adherence.values()
    ) or "  No medications tracked."

    # Style guidance for the AI
    if summary_style == "compassionate":
        style_instruction = (
            f"Use {patient.name}'s name throughout. Write warmly and personally — this is a caregiver reading about "
            f"someone they love. Acknowledge difficult periods empathetically while still being factual. "
            f"Frame improvements positively. Avoid cold clinical language."
        )
    elif summary_style == "clinical":
        style_instruction = (
            f"Write in precise clinical language. Use {patient.name} by name. Be concise and data-driven. "
            f"Prioritize measurable findings and clinically significant patterns."
        )
    else:  # adaptive
        style_instruction = (
            f"Use {patient.name}'s name throughout. Balance clinical precision with accessible language "
            f"that a caregiver can understand and discuss with a doctor."
        )

    user_prompt = f"""Here is 30 days of health data for {patient.name}, diagnosed with {patient.diagnosis}.

PATIENT CONTEXT: {condition_context}

MEDICATIONS:
{med_list_text}

AGGREGATED STATISTICS:
- Total log entries: {total_logs}
- Average sleep: {avg_sleep} hours/night
- Average mood score: {avg_mood}/10
- Hydration days logged: Good={hydration_counts.get("Good", 0)}, Fair={hydration_counts.get("Fair", 0)}, Poor={hydration_counts.get("Poor", 0)}

SYMPTOM TRACKING (Severity logged as Moderate or Severe — out of {total_logs} logged days):
{symptom_tracking_text}

ACTIVITY FREQUENCY (number of days each activity was logged):
{json.dumps(dict(activity_counts), indent=2)}

LIFESTYLE FACTOR TOTALS (out of {total_logs} logged days):
{json.dumps(dict(lifestyle_totals), indent=2)}

MEDICATION SIDE EFFECT OCCURRENCES (medication → side effect → count):
{json.dumps(side_effects_serializable, indent=2)}

KEY PATTERNS TO ANALYZE:
- Identify days where symptoms were Severe and what preceded them (missed meds, lifestyle factors, activities)
- Note correlations between Severe symptom days and lifestyle factors (alcohol, stress, poor sleep)
- Note activity types that appear to correlate with fewer Severe symptom days
- Flag any persistent or severe medication side effects
- Note missed-dose patterns
- Highlight week-over-week changes if visible in the raw data

RAW LOG DATA (chronological):
{json.dumps(log_entries, indent=2)}

Please generate a summary as JSON with exactly these fields:
{{
  "executive_summary": "2-3 sentence summary of the period",
  "adherence": [
    {{"medication": "name", "percentage": 85.0, "days_taken": 25, "days_logged": 30, "notes": "brief observation"}}
  ],
  "patterns": [
    {{"finding": "specific pattern description with data", "significance": "clinical or caregiver relevance"}}
  ],
  "lifestyle_notes": [
    "observation string"
  ],
  "discussion_items": [
    "specific item to discuss with doctor"
  ]
}}"""

    system_prompt = (
        f"You are a clinical documentation assistant helping caregivers communicate patient health data to doctors. "
        f"Patient context: {condition_context} "
        f"{style_instruction} "
        f"You receive structured daily health logs and produce a clear, doctor-ready summary. "
        f"Be specific with numbers and patterns. Note that symptoms are logged as Moderate or Severe (not on a 1-10 scale) — "
        f"report them as counts of Severe days and Moderate days, not as averages. "
        f"Highlight correlations between medication adherence, activities, and symptom severity. "
        f"Flag anything that warrants the doctor's attention. "
        f"Do not speculate beyond what the data shows. "
        f"Return ONLY valid JSON — no markdown fences, no extra text."
    )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    if not response_text:
        raise HTTPException(status_code=500, detail="AI returned an empty response")

    # Strip code fences if the model adds them despite instructions
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[-1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0].strip()

    try:
        summary_data = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON")

    # Attach our server-calculated adherence data alongside AI data
    summary_data["adherence_data"] = {
        str(mid): d for mid, d in adherence.items()
    }

    return summary_data
