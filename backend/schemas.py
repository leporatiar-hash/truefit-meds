from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import date, datetime
from enum import Enum


class UserRole(str, Enum):
    caregiver = "caregiver"
    patient = "patient"


# ── Auth ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.caregiver


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: datetime
    user_config: Optional[Any] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class UserConfigPatch(BaseModel):
    updates: Dict[str, Any]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ── Medications ───────────────────────────────────────────────────────────────

class MedicationCreate(BaseModel):
    name: str
    dose: str
    frequency: str
    time_of_day: str


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    time_of_day: Optional[str] = None
    active: Optional[bool] = None


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    dose: str
    frequency: str
    time_of_day: str
    active: bool

    model_config = {"from_attributes": True}


# ── Patients ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    date_of_birth: Optional[date] = None
    diagnosis: str
    notes: Optional[str] = None
    medications: Optional[List[MedicationCreate]] = []


class PatientResponse(BaseModel):
    id: int
    name: str
    date_of_birth: Optional[date] = None
    diagnosis: str
    notes: Optional[str] = None
    caregiver_id: int
    medications: List[MedicationResponse] = []
    dashboard_config: Optional[Any] = None

    model_config = {"from_attributes": True}


class IntakeSurveyRequest(BaseModel):
    relationship: str
    conditions: List[str]
    track_modules: List[str]
    reminder_frequency: Optional[str] = None
    other_notes: Optional[str] = None


class OnboardingSurveyRequest(BaseModel):
    relationship: str
    condition: str
    track_modules: List[str]
    medications_daily: bool
    good_day: Optional[str] = None


# ── Daily Logs ────────────────────────────────────────────────────────────────

class MedicationTaken(BaseModel):
    medication_id: int
    taken: bool
    time_taken: Optional[str] = None  # "HH:MM" 24-hour format


class Symptom(BaseModel):
    name: str
    severity: Optional[int] = None  # 1–10; None for legacy entries logged before severity was added
    worse_than_usual: Optional[bool] = None


class SideEffect(BaseModel):
    name: str
    severity: int  # 1–10


class MedicationSideEffect(BaseModel):
    medication_id: int
    medication_name: str
    side_effects: List[SideEffect]


class Activity(BaseModel):
    type: str  # music | art | journaling | brain_stimulating | exercise | outside | other
    duration_minutes: Optional[int] = None


class Lifestyle(BaseModel):
    smoked: bool = False
    alcohol: bool = False
    stressed: bool = False
    ate_well: bool = False


class DailyLogCreate(BaseModel):
    patient_id: int
    date: date
    medications_taken: List[MedicationTaken] = []
    symptoms: List[Symptom] = []
    medication_side_effects: List[MedicationSideEffect] = []
    sleep_hours: Optional[float] = None
    mood_score: Optional[int] = None
    water_intake_oz: Optional[float] = None
    activities: List[Activity] = []
    lifestyle: Optional[Lifestyle] = None
    notes: Optional[str] = None
    episode: Optional[Any] = None
    vitals: Optional[Any] = None
    photo: Optional[str] = None
    socialization: Optional[Socialization] = None


class DailyLogResponse(BaseModel):
    id: int
    patient_id: int
    logged_by: int
    date: date
    medications_taken: Optional[Any] = None
    symptoms: Optional[Any] = None
    medication_side_effects: Optional[Any] = None
    sleep_hours: Optional[float] = None
    mood_score: Optional[int] = None
    water_intake_oz: Optional[float] = None
    activities: Optional[Any] = None
    lifestyle: Optional[Any] = None
    notes: Optional[str] = None
    episode: Optional[Any] = None
    vitals: Optional[Any] = None
    photo: Optional[str] = None
    socialization: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Social Contacts ───────────────────────────────────────────────────────────

class SocialContactCreate(BaseModel):
    name: str


class SocialContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Socialization(BaseModel):
    left_house: Optional[bool] = None
    had_contact: Optional[bool] = None
    contact_ids: List[int] = []
    quality: Optional[str] = None   # "good" | "neutral" | "difficult"
    initiated_by: Optional[str] = None  # "self" | "other"


# ── Saved Summaries ───────────────────────────────────────────────────────────

class SavedSummaryCreate(BaseModel):
    patient_id: int
    title: str
    content: str
    date_range_start: date
    date_range_end: date


class SavedSummaryResponse(BaseModel):
    id: int
    user_id: int
    patient_id: int
    title: str
    content: str
    date_range_start: date
    date_range_end: date
    created_at: datetime

    model_config = {"from_attributes": True}
