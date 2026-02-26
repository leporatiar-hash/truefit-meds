from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_user

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
