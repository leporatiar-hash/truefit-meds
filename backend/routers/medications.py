from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()

# ── Known side effects reference data ─────────────────────────────────────────
# Keyed by lowercase drug name pattern; matched via substring check against medication.name.
# Includes generic names and common brand names as separate keys pointing to same effects.

_KNOWN_SIDE_EFFECTS: dict[str, list[dict]] = {
    "sertraline": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "uncommon", "category": "neurological"},
        {"name": "Sweating", "frequency": "uncommon", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
    ],
    "zoloft": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "uncommon", "category": "neurological"},
        {"name": "Sweating", "frequency": "uncommon", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
    ],
    "fluoxetine": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Anxiety", "frequency": "common", "category": "psychiatric"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
        {"name": "Rash", "frequency": "uncommon", "category": "dermatological"},
    ],
    "prozac": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Anxiety", "frequency": "common", "category": "psychiatric"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
    ],
    "escitalopram": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "uncommon", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
    ],
    "lexapro": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
    ],
    "citalopram": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "QT prolongation", "frequency": "rare", "category": "cardiovascular"},
    ],
    "venlafaxine": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Elevated blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
    ],
    "effexor": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Elevated blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
    ],
    "duloxetine": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
        {"name": "Elevated blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
    ],
    "cymbalta": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "uncommon", "category": "sexual"},
    ],
    "bupropion": [
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Anxiety", "frequency": "uncommon", "category": "psychiatric"},
        {"name": "Elevated blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Seizure risk", "frequency": "rare", "category": "neurological"},
    ],
    "wellbutrin": [
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Seizure risk", "frequency": "rare", "category": "neurological"},
    ],
    "mirtazapine": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Increased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "uncommon", "category": "neurological"},
    ],
    "remeron": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Increased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
    ],
    "quetiapine": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Elevated blood sugar", "frequency": "uncommon", "category": "metabolic"},
        {"name": "Low blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "seroquel": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Elevated blood sugar", "frequency": "uncommon", "category": "metabolic"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "risperidone": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
        {"name": "Elevated prolactin", "frequency": "uncommon", "category": "endocrine"},
    ],
    "risperdal": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "aripiprazole": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Anxiety", "frequency": "common", "category": "psychiatric"},
        {"name": "Akathisia", "frequency": "common", "category": "neurological"},
        {"name": "Tremor", "frequency": "uncommon", "category": "neurological"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "abilify": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Anxiety", "frequency": "common", "category": "psychiatric"},
        {"name": "Akathisia", "frequency": "common", "category": "neurological"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "olanzapine": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Elevated blood sugar", "frequency": "common", "category": "metabolic"},
        {"name": "Low blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "zyprexa": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Elevated blood sugar", "frequency": "common", "category": "metabolic"},
        {"name": "Tardive dyskinesia", "frequency": "rare", "category": "neurological"},
    ],
    "lithium": [
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Increased thirst", "frequency": "common", "category": "metabolic"},
        {"name": "Increased urination", "frequency": "common", "category": "renal"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Cognitive slowing", "frequency": "uncommon", "category": "neurological"},
        {"name": "Kidney toxicity", "frequency": "rare", "category": "renal"},
        {"name": "Thyroid dysfunction", "frequency": "uncommon", "category": "endocrine"},
    ],
    "valproate": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Hair loss", "frequency": "common", "category": "dermatological"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Liver toxicity", "frequency": "rare", "category": "hepatic"},
        {"name": "Platelet reduction", "frequency": "uncommon", "category": "hematological"},
    ],
    "depakote": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Weight gain", "frequency": "common", "category": "metabolic"},
        {"name": "Hair loss", "frequency": "common", "category": "dermatological"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Liver toxicity", "frequency": "rare", "category": "hepatic"},
    ],
    "lamotrigine": [
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Blurred vision", "frequency": "common", "category": "ophthalmological"},
        {"name": "Rash", "frequency": "uncommon", "category": "dermatological"},
        {"name": "Stevens-Johnson syndrome", "frequency": "rare", "category": "dermatological"},
    ],
    "lamictal": [
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Rash", "frequency": "uncommon", "category": "dermatological"},
        {"name": "Stevens-Johnson syndrome", "frequency": "rare", "category": "dermatological"},
    ],
    "clonazepam": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Coordination problems", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Depression", "frequency": "uncommon", "category": "psychiatric"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "klonopin": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Coordination problems", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "lorazepam": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Coordination problems", "frequency": "common", "category": "neurological"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "ativan": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "alprazolam": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
        {"name": "Coordination problems", "frequency": "common", "category": "neurological"},
    ],
    "xanax": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Memory impairment", "frequency": "common", "category": "neurological"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "buspirone": [
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Nervousness", "frequency": "common", "category": "psychiatric"},
        {"name": "Drowsiness", "frequency": "uncommon", "category": "neurological"},
    ],
    "buspar": [
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Nervousness", "frequency": "common", "category": "psychiatric"},
    ],
    "methylphenidate": [
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Stomach pain", "frequency": "common", "category": "GI"},
        {"name": "Elevated heart rate", "frequency": "uncommon", "category": "cardiovascular"},
        {"name": "Anxiety", "frequency": "uncommon", "category": "psychiatric"},
        {"name": "Elevated blood pressure", "frequency": "uncommon", "category": "cardiovascular"},
    ],
    "ritalin": [
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Stomach pain", "frequency": "common", "category": "GI"},
        {"name": "Elevated heart rate", "frequency": "uncommon", "category": "cardiovascular"},
    ],
    "concerta": [
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Stomach pain", "frequency": "common", "category": "GI"},
        {"name": "Elevated heart rate", "frequency": "uncommon", "category": "cardiovascular"},
    ],
    "amphetamine": [
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Elevated heart rate", "frequency": "common", "category": "cardiovascular"},
        {"name": "Elevated blood pressure", "frequency": "common", "category": "cardiovascular"},
        {"name": "Anxiety", "frequency": "uncommon", "category": "psychiatric"},
        {"name": "Dependence risk", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "adderall": [
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Elevated heart rate", "frequency": "common", "category": "cardiovascular"},
        {"name": "Anxiety", "frequency": "uncommon", "category": "psychiatric"},
    ],
    "donepezil": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Vomiting", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Muscle cramps", "frequency": "common", "category": "musculoskeletal"},
        {"name": "Fatigue", "frequency": "common", "category": "general"},
        {"name": "Bradycardia", "frequency": "rare", "category": "cardiovascular"},
    ],
    "aricept": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Vomiting", "frequency": "common", "category": "GI"},
        {"name": "Insomnia", "frequency": "common", "category": "psychiatric"},
        {"name": "Muscle cramps", "frequency": "common", "category": "musculoskeletal"},
    ],
    "memantine": [
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Confusion", "frequency": "uncommon", "category": "neurological"},
    ],
    "namenda": [
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
        {"name": "Headache", "frequency": "common", "category": "neurological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Confusion", "frequency": "uncommon", "category": "neurological"},
    ],
    "galantamine": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Vomiting", "frequency": "common", "category": "GI"},
        {"name": "Diarrhea", "frequency": "common", "category": "GI"},
        {"name": "Decreased appetite", "frequency": "common", "category": "metabolic"},
        {"name": "Dizziness", "frequency": "common", "category": "neurological"},
    ],
    "paroxetine": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Constipation", "frequency": "common", "category": "GI"},
        {"name": "Sexual dysfunction", "frequency": "common", "category": "sexual"},
        {"name": "Weight gain", "frequency": "uncommon", "category": "metabolic"},
    ],
    "paxil": [
        {"name": "Nausea", "frequency": "common", "category": "GI"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Sweating", "frequency": "common", "category": "dermatological"},
        {"name": "Sexual dysfunction", "frequency": "common", "category": "sexual"},
    ],
    "haloperidol": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Muscle stiffness", "frequency": "common", "category": "neurological"},
        {"name": "Restlessness", "frequency": "common", "category": "neurological"},
        {"name": "Dry mouth", "frequency": "common", "category": "GI"},
        {"name": "Tardive dyskinesia", "frequency": "uncommon", "category": "neurological"},
        {"name": "QT prolongation", "frequency": "rare", "category": "cardiovascular"},
    ],
    "haldol": [
        {"name": "Drowsiness", "frequency": "common", "category": "neurological"},
        {"name": "Tremor", "frequency": "common", "category": "neurological"},
        {"name": "Muscle stiffness", "frequency": "common", "category": "neurological"},
        {"name": "Tardive dyskinesia", "frequency": "uncommon", "category": "neurological"},
    ],
}


def lookup_known_side_effects(med_name: str) -> list[dict]:
    """Return known side effects for a medication by substring-matching against drug name patterns."""
    name_lower = med_name.lower()
    for drug_key, effects in _KNOWN_SIDE_EFFECTS.items():
        if drug_key in name_lower:
            return effects
    return []


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


@router.get("/{medication_id}/known-side-effects", response_model=List[schemas.KnownSideEffectResponse])
def get_known_side_effects(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return known side effects for a medication based on its name."""
    med = _get_owned_medication(medication_id, current_user, db)
    return lookup_known_side_effects(med.name)
