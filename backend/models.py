from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class UserRole(str, enum.Enum):
    caregiver = "caregiver"
    patient = "patient"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.caregiver)
    created_at = Column(DateTime, default=datetime.utcnow)

    patients = relationship("Patient", back_populates="caregiver")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    date_of_birth = Column(Date, nullable=True)
    diagnosis = Column(String)
    notes = Column(Text, nullable=True)
    caregiver_id = Column(Integer, ForeignKey("users.id"))

    caregiver = relationship("User", back_populates="patients")
    medications = relationship("Medication", back_populates="patient")
    daily_logs = relationship("DailyLog", back_populates="patient")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    name = Column(String)
    dose = Column(String)
    frequency = Column(String)
    time_of_day = Column(String)
    active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="medications")


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    logged_by = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)

    # [{medication_id, taken: bool, time_taken: "HH:MM" | null}]
    medications_taken = Column(JSON, nullable=True)

    # [{name: str, severity: 1-10}]
    symptoms = Column(JSON, nullable=True)

    # [{medication_id, medication_name, side_effects: [{name, severity}]}]
    medication_side_effects = Column(JSON, nullable=True)

    sleep_hours = Column(Float, nullable=True)
    mood_score = Column(Integer, nullable=True)
    water_intake_oz = Column(Float, nullable=True)

    # [{type: "music"|"art"|"journaling"|"brain_stimulating"|"exercise"|"outside"|"other", duration_minutes: int|null}]
    activities = Column(JSON, nullable=True)

    # {smoked: bool, alcohol: bool, stressed: bool, ate_well: bool}
    lifestyle = Column(JSON, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="daily_logs")
    logger = relationship("User", foreign_keys=[logged_by])
