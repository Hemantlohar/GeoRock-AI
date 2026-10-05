"""
FastAPI Server for AI-Based Rockfall Prediction and Alert System
Provides endpoints for real-time risk assessment, SHAP feature attributions,
multi-model research comparisons, computer vision crack detection, and alert management.
"""

import os
import sys
import json
import random
from typing import Dict, Any, Optional
from datetime import datetime

import time
from typing import Literal

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure local packages are resolvable
sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))
sys.path.append(os.path.join(os.path.dirname(__file__), "cv"))
sys.path.append(os.path.join(os.path.dirname(__file__), "db"))

from predictor import risk_engine, FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES, FEATURE_UNITS
from data_generator import PRESET_SCENARIOS, FEATURE_RANGES
from cv_analyzer import cv_analyzer
import repository as db
from services import config, upstash
from services.security import (
    HTTPSRedirectMiddleware, SecurityHeadersMiddleware,
    rate_limit, client_ip, hash_ip, verify_turnstile,
)

app = FastAPI(
    title="AI Rockfall Prediction & Alert System",
    description="Open-Pit Mine Geotechnical Slope Stability Monitoring API",
    version="1.1.0",
    # Interactive docs are handy locally but are not exposed in production
    docs_url=None if config.IS_PROD else "/docs",
    redoc_url=None,
    openapi_url=None if config.IS_PROD else "/openapi.json",
)

# CORS: only the origins you list in ALLOWED_ORIGINS (no wildcard, no credentials needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    max_age=600,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(HTTPSRedirectMiddleware)  # added last = runs first

class PredictionRequest(BaseModel):
    rainfall_mm: float = Field(default=25.0, ge=0.0, le=120.0, description="24h cumulative rainfall in mm")
    pore_water_pressure_kpa: float = Field(default=45.0, ge=0.0, le=180.0, description="Bench pore water pressure in kPa")
    rock_displacement_mm: float = Field(default=15.0, ge=0.0, le=120.0, description="Cumulative rock displacement in mm")
    displacement_rate_mm_day: float = Field(default=2.5, ge=0.0, le=25.0, description="Displacement velocity in mm/day")
    crack_width_mm: float = Field(default=12.0, ge=0.0, le=80.0, description="Tension crack aperture in mm")
    crack_growth_rate_mm_day: float = Field(default=1.8, ge=0.0, le=15.0, description="Crack growth rate in mm/day")
    vibration_ppv_mm_s: float = Field(default=14.0, ge=0.0, le=60.0, description="Peak Particle Velocity from blasting in mm/s")
    slope_angle_deg: float = Field(default=55.0, ge=35.0, le=75.0, description="Slope inclination in degrees")
    rock_mass_rating_rmr: float = Field(default=52.0, ge=15.0, le=90.0, description="Bieniawski Rock Mass Rating (15-90)")
    temperature_c: float = Field(default=24.0, ge=-10.0, le=50.0, description="Ambient temperature in °C")
    humidity_pct: float = Field(default=65.0, ge=10.0, le=100.0, description="Atmospheric relative humidity in %")
    model_choice: Optional[str] = Field(default="xgboost", description="Selected ML model: xgboost, random_forest, or logistic_regression")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Rockfall Prediction System",
        "timestamp": datetime.now().isoformat(),
        "primary_model": "XGBoost Classifier",
        "supported_models": ["XGBoost", "Random Forest", "Logistic Regression"],
        "database": db.backend_name(),
        "rate_limiting": "Upstash Redis" if upstash.enabled() else "in-memory (dev)"
    }

def _presets_payload():
    return {
        "presets": PRESET_SCENARIOS,
        "feature_metadata": {
            col: {
                "name": FEATURE_DISPLAY_NAMES[col],
                "unit": FEATURE_UNITS[col],
                "min": FEATURE_RANGES[col][0],
                "max": FEATURE_RANGES[col][1]
            }
            for col in FEATURE_COLUMNS
        }
    }

@app.get("/api/presets")
def get_presets():
    # static data: cached for 10 min (Upstash if configured, else in-process)
    return upstash.cached("presets:v1", 600, _presets_payload)

@app.post("/api/predict", dependencies=[Depends(rate_limit("predict", 60, 60))])
def predict_rockfall(req: PredictionRequest):
    try:
        input_data = req.model_dump()
        model_choice = input_data.pop("model_choice", "xgboost")
        
        # Execute prediction and SHAP calculation
        result = risk_engine.predict(input_data, model_choice=model_choice)
        
        # Save record to SQLite
        pred_id = db.save_prediction(result)
        result["prediction_id"] = pred_id
        
        return result
    except Exception as e:
        # never leak internal error text to the client; log it server-side instead
        import logging
        logging.getLogger("georock").exception("prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

@app.get("/api/history")
def get_prediction_history(limit: int = 50):
    limit = max(1, min(limit, 200))
    predictions = db.get_predictions(limit=limit)
    return {"history": predictions}

@app.get("/api/telemetry")
def get_telemetry():
    telemetry = db.get_telemetry_history()
    return {"telemetry": telemetry}

@app.get("/api/telemetry/simulate")
def simulate_telemetry_tick(baseline_risk: float = 0.45):
    """
    Generates a single streaming telemetry observation for real-time dashboard simulation.
    """
    fluctuation = (random.random() - 0.48) * 0.08
    prob = max(0.02, min(0.98, baseline_risk + fluctuation))
    
    classification = risk_engine.classify_risk(prob)
    
    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "rainfall_mm": round(max(0.0, random.gauss(25.0, 8.0)), 1),
        "displacement_mm": round(max(0.0, random.gauss(32.0, 4.0)), 1),
        "displacement_rate_mm_day": round(max(0.0, random.gauss(4.2, 1.2)), 2),
        "crack_growth_rate": round(max(0.0, random.gauss(2.1, 0.8)), 2),
        "vibration_ppv": round(max(0.5, random.gauss(16.0, 9.0)), 1),
        "risk_probability": round(prob, 3),
        "risk_level": classification["level"],
        "risk_color": classification["color"],
        "status_text": classification["status_text"],
        "alert_required": classification["alert_required"]
    }

def _load_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "models", "metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Model metrics have not been generated yet.")
    with open(metrics_path, "r") as f:
        return json.load(f)

@app.get("/api/model-comparison")
def get_model_comparison():
    return {"models": upstash.cached("model-metrics:v1", 600, _load_metrics)}

@app.get("/api/alerts")
def get_alerts(limit: int = 30):
    limit = max(1, min(limit, 200))
    alerts = db.get_alerts(limit=limit)
    return {"alerts": alerts}

@app.post("/api/alerts/{alert_id}/acknowledge", dependencies=[Depends(rate_limit("ack", 30, 60))])
def acknowledge_alert(alert_id: int):
    success = db.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert ID not found")
    return {"message": "Alert marked as acknowledged by mine safety controller"}

@app.get("/api/cv/samples")
def get_cv_samples():
    sample_dir = os.path.join(os.path.dirname(__file__), "data", "sample_images")
    if not os.path.exists(sample_dir):
        cv_analyzer._ensure_sample_images()
    files = [
        {
            "id": "critical_shear_crack.jpg",
            "name": "High Wall Tension Shear Crack (Critical Hazard)",
            "description": "Severe vertical tension fissure traversing multiple production benches."
        },
        {
            "id": "moderate_fissures.jpg",
            "name": "Bench Crest Discontinuities (Moderate Hazard)",
            "description": "Secondary joint dilation and localized rock detachment fractures."
        },
        {
            "id": "stable_massive_bench.jpg",
            "name": "Competent Sandstone Face (Low Hazard)",
            "description": "Intact rock mass exhibiting tight joints and zero macroscopic tension cracks."
        }
    ]
    return {"samples": files}

@app.post("/api/cv/analyze", dependencies=[Depends(rate_limit("cv", 15, 60))])
async def analyze_slope_crack(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None),
    scale_mm_per_pixel: float = Form(0.25)
):
    try:
        if file is not None:
            contents = await file.read(config.MAX_UPLOAD_BYTES + 1)
            if len(contents) > config.MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="Image too large (max 8 MB).")
            if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
                raise HTTPException(status_code=415, detail="Please upload a JPG, PNG or WebP image.")
            res = cv_analyzer.analyze_image_bytes(contents, scale_mm_per_pixel=scale_mm_per_pixel)
        elif sample_id:
            res = cv_analyzer.analyze_sample(sample_id, scale_mm_per_pixel=scale_mm_per_pixel)
        else:
            res = cv_analyzer.analyze_sample("critical_shear_crack.jpg", scale_mm_per_pixel=scale_mm_per_pixel)
        return res
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Image analysis failed. Please try a different image.")

class ObservationRequest(BaseModel):
    operator_id: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    mission_ref: str = Field(default="", max_length=60)
    sector: str = Field(min_length=2, max_length=60)
    observed_crack_width_mm: Optional[float] = Field(default=None, ge=0, le=200)
    observed_rainfall_mm_h: Optional[float] = Field(default=None, ge=0, le=300)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    severity: Literal["none", "minor", "moderate", "severe", "critical"]
    notes: str = Field(default="", max_length=1000)
    relay_to_control: bool = False
    # --- anti-spam fields (the UI fills these; bots usually do not) ---
    website: str = Field(default="", max_length=200)          # honeypot: must stay empty
    form_started_at: Optional[int] = None                      # epoch ms when the form was opened
    turnstile_token: Optional[str] = Field(default=None, max_length=2048)

@app.post("/api/observations", status_code=201,
          dependencies=[Depends(rate_limit("observations", 5, 600))])
def submit_observation(req: ObservationRequest, request: Request):
    ip = client_ip(request)

    # 1) honeypot: pretend success so bots do not learn they were detected
    if req.website:
        return {"status": "received", "id": 0}
    # 2) humans need more than 3 seconds to fill a form
    if req.form_started_at is not None and (time.time() * 1000 - req.form_started_at) < 3000:
        raise HTTPException(status_code=429, detail="That was a little fast. Please review and submit again.")
    # 3) Cloudflare Turnstile (no-op if TURNSTILE_SECRET_KEY is not set)
    if not verify_turnstile(req.turnstile_token or "", ip):
        raise HTTPException(status_code=400, detail="Bot check failed. Please refresh and try again.")

    row = req.model_dump(exclude={"website", "form_started_at", "turnstile_token"})
    row["ip_hash"] = hash_ip(ip)
    try:
        new_id = db.save_observation(row)
    except Exception:
        import logging
        logging.getLogger("georock").exception("observation save failed")
        raise HTTPException(status_code=503, detail="Could not save the observation right now.")
    return {"status": "received", "id": new_id, "relayed": req.relay_to_control}

if __name__ == "__main__":
    import uvicorn
    print("Starting Rockfall Risk Prediction Backend on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=not config.IS_PROD,
                proxy_headers=True, forwarded_allow_ips="*" if config.TRUST_PROXY else "127.0.0.1")
