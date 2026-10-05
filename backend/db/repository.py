"""
Storage facade. Uses Supabase (Postgres) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
are set, otherwise the bundled SQLite file. If a Supabase call fails we log it and
fall back to SQLite so a network blip never breaks a live risk assessment.
Return shapes match the old SQLite layer, so the frontend does not change.
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List

import database as sqlite_db
from services import supabase_store as sb

log = logging.getLogger("georock.repository")

# Re-export the pieces that are SQLite-only (demo telemetry seed data).
get_telemetry_history = sqlite_db.get_telemetry_history

PARAM_COLS = [
    "rainfall_mm", "pore_water_pressure_kpa", "rock_displacement_mm",
    "displacement_rate_mm_day", "crack_width_mm", "crack_growth_rate_mm_day",
    "vibration_ppv_mm_s", "slope_angle_deg", "rock_mass_rating_rmr",
    "temperature_c", "humidity_pct",
]


def backend_name() -> str:
    return "Supabase Postgres" if sb.enabled() else "SQLite (local)"


def _ts(row: Dict[str, Any]) -> Dict[str, Any]:
    row["timestamp"] = str(row.get("created_at", ""))[:19].replace("T", " ")
    return row


def save_prediction(data: Dict[str, Any]) -> int:
    if sb.enabled():
        try:
            params = data.get("input_parameters", {})
            row = {
                "model_used": data.get("model_used", "XGBoost"),
                "probability": data.get("probability", 0.0),
                "risk_level": data.get("risk_level", "LOW"),
                "status_text": data.get("status_text", ""),
                "primary_factors": data.get("key_risk_factors", []),
                **{c: params.get(c) for c in PARAM_COLS},
            }
            saved = sb.insert("predictions", row)
            if data.get("alert_required", False):
                sb.insert("alerts", {
                    "severity": data.get("risk_level"),
                    "probability": data.get("probability"),
                    "message": f"Rockfall Risk Alert: {data.get('risk_level')} ({data.get('probability_pct')}%) detected.",
                    "advisory": data.get("advisory", ""),
                })
            return int(saved["id"]) if saved else 0
        except Exception as exc:  # noqa: BLE001
            log.warning("Supabase save_prediction failed, using SQLite: %s", exc)
    return sqlite_db.save_prediction(data)


def get_predictions(limit: int = 50) -> List[Dict[str, Any]]:
    if sb.enabled():
        try:
            return [_ts(r) for r in sb.select("predictions", limit=limit)]
        except Exception as exc:  # noqa: BLE001
            log.warning("Supabase get_predictions failed, using SQLite: %s", exc)
    return sqlite_db.get_predictions(limit=limit)


def get_alerts(limit: int = 30) -> List[Dict[str, Any]]:
    if sb.enabled():
        try:
            rows = [_ts(r) for r in sb.select("alerts", limit=limit)]
            for r in rows:
                r["acknowledged"] = 1 if r.get("acknowledged") else 0
            return rows
        except Exception as exc:  # noqa: BLE001
            log.warning("Supabase get_alerts failed, using SQLite: %s", exc)
    return sqlite_db.get_alerts(limit=limit)


def acknowledge_alert(alert_id: int) -> bool:
    if sb.enabled():
        try:
            return bool(sb.update("alerts", {"id": f"eq.{alert_id}"}, {"acknowledged": True}))
        except Exception as exc:  # noqa: BLE001
            log.warning("Supabase acknowledge_alert failed, using SQLite: %s", exc)
    return sqlite_db.acknowledge_alert(alert_id)


def save_observation(obs: Dict[str, Any]) -> int:
    """Field observations: Supabase if configured, otherwise a local SQLite table."""
    if sb.enabled():
        saved = sb.insert("field_observations", obs)
        if obs.get("relay_to_control"):
            sb.insert("alerts", {
                "severity": "HIGH" if obs.get("severity") in ("severe", "critical") else "MEDIUM",
                "probability": 0,
                "message": f"Field report relayed from {obs.get('sector')} ({obs.get('severity')}).",
                "advisory": (obs.get("notes") or "")[:500],
            })
        return int(saved["id"]) if saved else 0

    conn = sqlite_db.get_connection()
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS field_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, data TEXT NOT NULL)""")
    cur.execute("INSERT INTO field_observations (created_at, data) VALUES (?, ?)",
                (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), json.dumps(obs)))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id
