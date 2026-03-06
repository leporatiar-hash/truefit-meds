from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import os
import re
from dotenv import load_dotenv

from sqlalchemy import text
from database import engine, Base
import models  # noqa: F401 — ensures models are registered before create_all
from routers import auth, patients, medications, logs, summary

load_dotenv()

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Safe column migrations — add new columns to existing tables without data loss
_MIGRATIONS = [
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS episode JSON",
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS vitals JSON",
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS photo TEXT",
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS water_intake_oz FLOAT",
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS activities JSON",
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS medication_side_effects JSON",
]

with engine.connect() as conn:
    for stmt in _MIGRATIONS:
        conn.execute(text(stmt))
    conn.commit()

app = FastAPI(title="TrueFit Meds API", version="1.0.0")

# ALLOWED_ORIGINS: comma-separated explicit origins
_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,https://truefit-meds.vercel.app",
)
allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

# Also allow all Vercel preview deployments via regex
_origin_regex = os.getenv(
    "ALLOWED_ORIGINS_REGEX",
    r"https://.*\.vercel\.app",
)

# Compile regex for use in exception handler
_origin_pattern = re.compile(_origin_regex) if _origin_regex else None


def _is_allowed_origin(origin: str | None) -> bool:
    """Check if origin is allowed."""
    if not origin:
        return False
    if origin in allowed_origins:
        return True
    if _origin_pattern and _origin_pattern.match(origin):
        return True
    return False


# Custom exception handler to ensure CORS headers are included on error responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin")
    headers = {}
    if _is_allowed_origin(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(medications.router, prefix="/medications", tags=["medications"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])
app.include_router(summary.router, prefix="/summary", tags=["summary"])


@app.get("/")
def root():
    return {"message": "TrueFit Meds API is running"}
