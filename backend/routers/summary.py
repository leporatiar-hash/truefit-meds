from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from collections import defaultdict
import anthropic
import json
import os
from dotenv import load_dotenv

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

    # Aggregate statistics
    sleep_vals, mood_vals, water_vals = [], [], []
    symptom_totals = defaultdict(list)
    activity_counts = defaultdict(int)
    side_effect_counts = defaultdict(lambda: defaultdict(int))
    lifestyle_totals = defaultdict(int)
    log_entries = []

    for log in logs:
        if log.sleep_hours is not None:
            sleep_vals.append(log.sleep_hours)
        if log.mood_score is not None:
            mood_vals.append(log.mood_score)
        if log.water_intake_oz is not None:
            water_vals.append(log.water_intake_oz)

        for s in (log.symptoms or []):
            symptom_totals[s["name"]].append(s["severity"])

        for a in (log.activities or []):
            activity_counts[a["type"]] += 1

        for med_se in (log.medication_side_effects or []):
            for se in med_se.get("side_effects", []):
                side_effect_counts[med_se["medication_name"]][se["name"]] += 1

        if log.lifestyle:
            for k, v in log.lifestyle.items():
                if v:
                    lifestyle_totals[k] += 1

        log_entries.append({
            "date": log.date.isoformat(),
            "mood": log.mood_score,
            "sleep_hours": log.sleep_hours,
            "water_oz": log.water_intake_oz,
            "symptoms": log.symptoms,
            "activities": log.activities,
            "lifestyle": log.lifestyle,
            "medications_taken": log.medications_taken,
            "medication_side_effects": log.medication_side_effects,
            "notes": log.notes,
        })

    avg_sleep = round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else None
    avg_mood = round(sum(mood_vals) / len(mood_vals), 1) if mood_vals else None
    avg_water = round(sum(water_vals) / len(water_vals), 1) if water_vals else None

    symptom_averages = {
        name: {
            "average": round(sum(scores) / len(scores), 1),
            "max": max(scores),
            "entries": len(scores),
        }
        for name, scores in symptom_totals.items()
    }

    med_list_text = "\n".join(
        f"  - {d['name']}: {d['percentage']}% adherence ({d['days_taken']}/{d['days_logged']} days)"
        for d in adherence.values()
    ) or "  No medications tracked."

    user_prompt = f"""Here is 30 days of health data for patient {patient.name}, diagnosed with {patient.diagnosis}.

MEDICATIONS:
{med_list_text}

AGGREGATED STATISTICS:
- Total log entries: {len(logs)}
- Average sleep: {avg_sleep} hours/night
- Average mood score: {avg_mood}/10
- Average daily water intake: {avg_water} oz

SYMPTOM AVERAGES (1–10 scale):
{json.dumps(symptom_averages, indent=2)}

ACTIVITY FREQUENCY (number of days each activity was logged):
{json.dumps(dict(activity_counts), indent=2)}

LIFESTYLE FACTOR TOTALS (out of {len(logs)} logged days):
{json.dumps(dict(lifestyle_totals), indent=2)}

MEDICATION SIDE EFFECT OCCURRENCES (medication → side effect → count):
{json.dumps({k: dict(v) for k, v in side_effect_counts.items()}, indent=2)}

KEY PATTERNS TO ANALYZE:
- Identify days where symptoms spiked and what preceded them (missed meds, lifestyle factors, activities)
- Identify activity types that correlate with better mood or lower symptom severity
- Note any concerning water intake or sleep trends
- Flag any persistent or severe medication side effects
- Note missed-dose patterns (day of week, time clusters)

RAW LOG DATA (chronological):
{json.dumps(log_entries, indent=2)}

Please generate a doctor-ready summary as JSON with exactly these fields:
{{
  "executive_summary": "2-3 sentence clinical summary",
  "adherence": [
    {{"medication": "name", "percentage": 85.0, "days_taken": 25, "days_logged": 30, "notes": "brief clinical observation"}}
  ],
  "patterns": [
    {{"finding": "specific pattern description with data", "significance": "clinical relevance"}}
  ],
  "lifestyle_notes": [
    "observation string"
  ],
  "discussion_items": [
    "specific item to discuss with doctor"
  ]
}}"""

    system_prompt = (
        "You are a clinical documentation assistant helping caregivers communicate patient health data to doctors. "
        "You receive structured daily health logs from a caregiver and produce a clear, concise, doctor-ready summary. "
        "Write in plain clinical language. Be specific with numbers and patterns. "
        "Highlight correlations between medication adherence, activity, and symptom changes. "
        "Flag anything that warrants the doctor's attention. "
        "Do not speculate beyond what the data shows. "
        "Return ONLY valid JSON — no markdown fences, no extra text."
    )

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    response_text = message.content[0].text.strip()

    # Strip code fences if Claude adds them despite instructions
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
