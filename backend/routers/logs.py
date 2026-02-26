from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()


def _serialize_log_field(value):
    """Convert Pydantic models in lists/dicts to plain dicts for JSON storage."""
    if isinstance(value, list):
        return [item.model_dump() if hasattr(item, "model_dump") else item for item in value]
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return value


@router.post("/", response_model=schemas.DailyLogResponse)
def create_or_update_log(
    log_data: schemas.DailyLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify patient belongs to this caregiver
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == log_data.patient_id,
            models.Patient.caregiver_id == current_user.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    fields = {
        "medications_taken": _serialize_log_field(log_data.medications_taken),
        "symptoms": _serialize_log_field(log_data.symptoms),
        "medication_side_effects": _serialize_log_field(log_data.medication_side_effects),
        "sleep_hours": log_data.sleep_hours,
        "mood_score": log_data.mood_score,
        "water_intake_oz": log_data.water_intake_oz,
        "activities": _serialize_log_field(log_data.activities),
        "lifestyle": _serialize_log_field(log_data.lifestyle),
        "notes": log_data.notes,
    }

    # Upsert: update if a log for this patient+date already exists
    existing = (
        db.query(models.DailyLog)
        .filter(
            models.DailyLog.patient_id == log_data.patient_id,
            models.DailyLog.date == log_data.date,
        )
        .first()
    )

    if existing:
        for key, val in fields.items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing

    log = models.DailyLog(
        patient_id=log_data.patient_id,
        logged_by=current_user.id,
        date=log_data.date,
        **fields,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{patient_id}/today", response_model=Optional[schemas.DailyLogResponse])
def get_today_log(
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

    today = datetime.now().date()
    return (
        db.query(models.DailyLog)
        .filter(
            models.DailyLog.patient_id == patient_id,
            models.DailyLog.date == today,
        )
        .first()
    )


@router.get("/{patient_id}", response_model=List[schemas.DailyLogResponse])
def get_logs(
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

    ninety_days_ago = datetime.now().date() - timedelta(days=90)
    return (
        db.query(models.DailyLog)
        .filter(
            models.DailyLog.patient_id == patient_id,
            models.DailyLog.date >= ninety_days_ago,
        )
        .order_by(models.DailyLog.date.desc())
        .all()
    )
