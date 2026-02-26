from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()


def _get_owned_medication(medication_id: int, current_user: models.User, db: Session):
    """Return medication if it belongs to one of the current user's patients."""
    med = (
        db.query(models.Medication)
        .join(models.Patient)
        .filter(
            models.Medication.id == medication_id,
            models.Patient.caregiver_id == current_user.id,
        )
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med


@router.put("/{medication_id}", response_model=schemas.MedicationResponse)
def update_medication(
    medication_id: int,
    med_data: schemas.MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    med = _get_owned_medication(medication_id, current_user, db)
    for field, value in med_data.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med


@router.delete("/{medication_id}")
def deactivate_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    med = _get_owned_medication(medication_id, current_user, db)
    med.active = False
    db.commit()
    return {"message": "Medication deactivated"}
