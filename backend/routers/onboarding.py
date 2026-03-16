from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
import os
from dotenv import load_dotenv
import anthropic

from database import get_db
import models
import schemas
from auth import get_current_user

load_dotenv()

router = APIRouter()

# Universal fallback — works for all caregiving situations, not just mental health
_DEFAULT_USER_CONFIG = {
    "symptoms": ["Pain", "Fatigue", "Sleep Issues", "Appetite Changes", "Mood", "Anxiety", "Nausea", "Confusion"],
    "activities": ["walking", "reading", "socializing", "music", "other"],
    "modules": ["medications", "symptoms", "mood", "sleep", "water", "activities"],
    "symptom_label": "Symptoms",
    "episode_label": "Notable Episodes",
    "greeting": "Tracking your loved one's journey",
}


@router.post("/config", response_model=schemas.UserResponse)
def complete_onboarding_survey(
    survey: schemas.OnboardingSurveyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    config = _DEFAULT_USER_CONFIG.copy()

    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            client = anthropic.Anthropic(api_key=api_key)

            system_prompt = (
                "You are a health tracking assistant. Generate a personalized dashboard config "
                "for a caregiver app. Return ONLY valid JSON — no markdown fences, no explanation."
            )

            user_prompt = f"""A caregiver is setting up tracking:
Relationship to patient: {survey.relationship}
Primary condition: {survey.condition}
Wants to track: {", ".join(survey.track_modules)}
Medications a daily concern: {"Yes" if survey.medications_daily else "No"}
What a good day looks like: {survey.good_day or "Not specified"}

Return exactly this JSON structure:
{{
  "symptoms": [4-8 specific symptom names relevant to their situation],
  "activities": [4-6 slugs from: walking, running, music, drawing, reading, cooking, socializing, physical_therapy, meditation, journaling, other],
  "modules": [ordered list from: medications, symptoms, mood, sleep, water, activities, vitals, episode, side_effects],
  "symptom_label": "label for the symptoms section",
  "episode_label": "label for episodes section",
  "greeting": "one warm dashboard greeting sentence (10-15 words, e.g. Tracking your mom's journey with care)"
}}"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            response_text = (message.content[0].text or "").strip()

            # Strip code fences if model adds them despite instructions
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            if response_text:
                parsed = json.loads(response_text)
                if all(k in parsed for k in ("symptoms", "activities", "modules")):
                    config = parsed
                    if "greeting" not in config:
                        config["greeting"] = "Tracking your loved one's journey"

    except Exception:
        pass  # Never let onboarding break — fall back to universal defaults

    current_user.user_config = config
    db.commit()
    db.refresh(current_user)
    return current_user
