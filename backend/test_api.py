"""
Automated Test Suite for Rockfall Prediction Backend API
Tests all endpoints: health, presets, predictions (XGBoost, RF, LR), SHAP, CV crack detection, history, alerts, and model comparison.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_all_tests():
    print("=" * 60)
    print("Running Automated Backend Verification Tests")
    print("=" * 60)
    
    # 1. Health Check
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] GET /api/health passed")
    
    # 2. Presets
    r = client.get("/api/presets")
    assert r.status_code == 200
    data = r.json()
    assert "presets" in data and "feature_metadata" in data
    print(f"[PASS] GET /api/presets passed ({len(data['presets'])} presets loaded)")
    
    # 3. Model Comparison Metrics
    r = client.get("/api/model-comparison")
    assert r.status_code == 200
    metrics = r.json()["models"]
    for model_name in ["XGBoost", "Random Forest", "Logistic Regression"]:
        assert model_name in metrics, f"Missing model {model_name}"
        assert metrics[model_name]["accuracy"] > 85.0
        assert metrics[model_name]["roc_auc"] > 0.90
    print("[PASS] GET /api/model-comparison passed (All 3 models verified > 85% accuracy)")
    
    # 4. Predict Endpoint with Monsoon Critical Scenario
    critical_payload = {
        "rainfall_mm": 75.0,
        "pore_water_pressure_kpa": 135.0,
        "rock_displacement_mm": 58.0,
        "displacement_rate_mm_day": 14.5,
        "crack_width_mm": 42.0,
        "crack_growth_rate_mm_day": 8.0,
        "vibration_ppv_mm_s": 48.0,
        "slope_angle_deg": 65.0,
        "rock_mass_rating_rmr": 35.0,
        "temperature_c": 22.0,
        "humidity_pct": 95.0,
        "model_choice": "xgboost"
    }
    r = client.post("/api/predict", json=critical_payload)
    assert r.status_code == 200, f"Predict failed: {r.text}"
    pred = r.json()
    assert pred["risk_level"] in ["HIGH", "CRITICAL"]
    assert pred["probability_pct"] >= 60.0
    assert len(pred["feature_contributions"]) == 11
    assert "prediction_id" in pred
    print(f"[PASS] POST /api/predict (High/Critical test) passed: {pred['risk_level']} ({pred['probability_pct']}%)")
    
    # 5. Predict Endpoint with Stable Bench Scenario
    stable_payload = {
        "rainfall_mm": 0.0,
        "pore_water_pressure_kpa": 5.0,
        "rock_displacement_mm": 2.0,
        "displacement_rate_mm_day": 0.1,
        "crack_width_mm": 1.0,
        "crack_growth_rate_mm_day": 0.02,
        "vibration_ppv_mm_s": 1.5,
        "slope_angle_deg": 45.0,
        "rock_mass_rating_rmr": 78.0,
        "temperature_c": 25.0,
        "humidity_pct": 40.0,
        "model_choice": "xgboost"
    }
    r = client.post("/api/predict", json=stable_payload)
    assert r.status_code == 200
    pred_stable = r.json()
    assert pred_stable["risk_level"] == "LOW"
    print(f"[PASS] POST /api/predict (Stable test) passed: {pred_stable['risk_level']} ({pred_stable['probability_pct']}%)")
    
    # 6. Computer Vision Samples & Analysis
    r = client.get("/api/cv/samples")
    assert r.status_code == 200
    samples = r.json()["samples"]
    assert len(samples) >= 3
    print(f"[PASS] GET /api/cv/samples passed ({len(samples)} benchmark rockfaces)")
    
    r = client.post("/api/cv/analyze", data={"sample_id": "critical_shear_crack.jpg", "scale_mm_per_pixel": 0.25})
    assert r.status_code == 200
    cv_res = r.json()
    assert cv_res["crack_count"] > 0
    assert "annotated_image" in cv_res
    print(f"[PASS] POST /api/cv/analyze passed: {cv_res['crack_count']} cracks, visual severity: {cv_res['visual_severity']}")
    
    # 7. History & Telemetry
    r = client.get("/api/history")
    assert r.status_code == 200
    history = r.json()["history"]
    assert len(history) >= 2
    print(f"[PASS] GET /api/history passed ({len(history)} predictions recorded in SQLite)")
    
    r = client.get("/api/telemetry")
    assert r.status_code == 200
    telemetry = r.json()["telemetry"]
    assert len(telemetry) == 30
    print(f"[PASS] GET /api/telemetry passed (30 temporal data points)")
    
    # 8. Alerts
    r = client.get("/api/alerts")
    assert r.status_code == 200
    alerts = r.json()["alerts"]
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]
    r_ack = client.post(f"/api/alerts/{alert_id}/acknowledge")
    assert r_ack.status_code == 200
    print(f"[PASS] GET & POST /api/alerts passed (Alert {alert_id} acknowledged)")
    

    # 9. Field observations: validation + spam protection (these cases never write to the database)
    base = {"operator_id": "OPS-2026-0001", "sector": "Bench 4", "observed_crack_width_mm": 12.0,
            "lat": 23.74, "lon": 85.93, "severity": "moderate"}
    r = client.post("/api/observations", json={**base, "lat": 123.0})
    assert r.status_code == 422, "out-of-range latitude must be rejected"
    r = client.post("/api/observations", json={**base, "severity": "apocalyptic"})
    assert r.status_code == 422, "unknown severity must be rejected"
    r = client.post("/api/observations", json={**base, "website": "http://spam.example"})
    assert r.status_code == 201 and r.json()["id"] == 0, "honeypot must be silently dropped"
    import time as _t
    r = client.post("/api/observations", json={**base, "form_started_at": int(_t.time() * 1000)})
    assert r.status_code == 429, "instant submissions must be rejected"
    print("[PASS] POST /api/observations validation + honeypot + timing checks passed")

    # 10. Security headers
    r = client.get("/api/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    print("[PASS] Security headers present")

    print("=" * 60)
    print("ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
