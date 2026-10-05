"""
SQLite Database Layer for Rockfall System
Stores prediction history, geotechnical alerts, and continuous temporal monitoring telemetry.
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "rockfall_system.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        model_used TEXT NOT NULL,
        probability REAL NOT NULL,
        risk_level TEXT NOT NULL,
        status_text TEXT NOT NULL,
        rainfall_mm REAL,
        pore_water_pressure_kpa REAL,
        rock_displacement_mm REAL,
        displacement_rate_mm_day REAL,
        crack_width_mm REAL,
        crack_growth_rate_mm_day REAL,
        vibration_ppv_mm_s REAL,
        slope_angle_deg REAL,
        rock_mass_rating_rmr REAL,
        temperature_c REAL,
        humidity_pct REAL,
        primary_factors TEXT
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL,
        probability REAL NOT NULL,
        message TEXT NOT NULL,
        advisory TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historical_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        day_label TEXT NOT NULL,
        rainfall_mm REAL,
        displacement_mm REAL,
        crack_growth_rate REAL,
        vibration_ppv REAL,
        risk_probability REAL,
        risk_level TEXT
    );
    """)
    
    conn.commit()
    
    # Pre-seed historical telemetry if empty
    cursor.execute("SELECT COUNT(*) FROM historical_telemetry")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_historical_telemetry(cursor)
        conn.commit()
        
    conn.close()

def seed_historical_telemetry(cursor):
    """
    Populates 30 days of realistic geotechnical telemetry demonstrating
    a progressive slope deterioration cycle for Recharts visualizations.
    """
    base_date = datetime.now() - timedelta(days=29)
    
    # 30-day simulated slope behavior
    for i in range(30):
        current_date = base_date + timedelta(days=i)
        day_str = current_date.strftime("%b %d")
        
        # Phases:
        # Days 0-14: Stable dry conditions
        # Days 15-22: Monsoon storm & pore water buildup
        # Days 23-27: Blasting vibration + secondary creep
        # Days 28-29: Rapid acceleration (tertiary creep)
        if i < 15:
            rainfall = max(0.0, float(round(1.5 + 2.0 * (i % 3 == 0), 1)))
            displacement = round(2.0 + i * 0.15, 1)
            crack_rate = round(0.05 + 0.02 * (i % 2), 2)
            ppv = round(3.5 + 2.0 * (i % 4 == 0), 1)
            prob = round(0.04 + i * 0.005, 3)
            level = "LOW"
        elif i < 23:
            rainfall = round(18.0 + (i - 14) * 6.5, 1)
            displacement = round(4.5 + (i - 14) * 1.8, 1)
            crack_rate = round(0.35 + (i - 14) * 0.25, 2)
            ppv = round(6.0 + (i % 2) * 12.0, 1)
            prob = round(0.18 + (i - 14) * 0.05, 3)
            level = "MEDIUM" if prob >= 0.30 else "LOW"
        elif i < 28:
            rainfall = round(35.0 - (i - 22) * 4.0, 1)
            displacement = round(19.0 + (i - 22) * 6.5, 1)
            crack_rate = round(2.2 + (i - 22) * 0.9, 2)
            ppv = round(28.0 + (i % 2) * 18.0, 1)
            prob = round(0.62 + (i - 22) * 0.04, 3)
            level = "HIGH"
        else:
            rainfall = 48.0
            displacement = round(52.0 + (i - 27) * 18.0, 1)
            crack_rate = round(7.5 + (i - 27) * 3.5, 2)
            ppv = 44.0
            prob = round(0.84 + (i - 27) * 0.07, 3)
            level = "CRITICAL"
            
        cursor.execute("""
        INSERT INTO historical_telemetry (
            timestamp, day_label, rainfall_mm, displacement_mm, crack_growth_rate,
            vibration_ppv, risk_probability, risk_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_date.strftime("%Y-%m-%d %H:%M:%S"),
            day_str,
            rainfall,
            displacement,
            crack_rate,
            ppv,
            prob,
            level
        ))

def save_prediction(data: Dict[str, Any]) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    params = data.get("input_parameters", {})
    
    cursor.execute("""
    INSERT INTO predictions (
        timestamp, model_used, probability, risk_level, status_text,
        rainfall_mm, pore_water_pressure_kpa, rock_displacement_mm,
        displacement_rate_mm_day, crack_width_mm, crack_growth_rate_mm_day,
        vibration_ppv_mm_s, slope_angle_deg, rock_mass_rating_rmr,
        temperature_c, humidity_pct, primary_factors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp,
        data.get("model_used", "XGBoost"),
        data.get("probability", 0.0),
        data.get("risk_level", "LOW"),
        data.get("status_text", ""),
        params.get("rainfall_mm", 0.0),
        params.get("pore_water_pressure_kpa", 0.0),
        params.get("rock_displacement_mm", 0.0),
        params.get("displacement_rate_mm_day", 0.0),
        params.get("crack_width_mm", 0.0),
        params.get("crack_growth_rate_mm_day", 0.0),
        params.get("vibration_ppv_mm_s", 0.0),
        params.get("slope_angle_deg", 0.0),
        params.get("rock_mass_rating_rmr", 0.0),
        params.get("temperature_c", 0.0),
        params.get("humidity_pct", 0.0),
        json.dumps(data.get("key_risk_factors", []))
    ))
    
    pred_id = cursor.lastrowid
    
    # Automatically log alert if HIGH or CRITICAL
    if data.get("alert_required", False):
        cursor.execute("""
        INSERT INTO alerts (
            timestamp, severity, probability, message, advisory, acknowledged
        ) VALUES (?, ?, ?, ?, ?, 0)
        """, (
            timestamp,
            data.get("risk_level"),
            data.get("probability"),
            f"Rockfall Risk Alert: {data.get('risk_level')} ({data.get('probability_pct')}%) detected.",
            data.get("advisory", "")
        ))
        
    conn.commit()
    conn.close()
    return pred_id

def get_predictions(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM predictions ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        if d.get("primary_factors"):
            try:
                d["primary_factors"] = json.loads(d["primary_factors"])
            except:
                d["primary_factors"] = []
        results.append(d)
    return results

def get_alerts(limit: int = 30) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM alerts ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def acknowledge_alert(alert_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE alerts SET acknowledged = 1 WHERE id = ?
    """, (alert_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

def get_telemetry_history() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM historical_telemetry ORDER BY id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Initialize database tables on import
init_db()

if __name__ == "__main__":
    print(f"Database initialized at {DB_PATH}")
    hist = get_telemetry_history()
    print(f"Historical telemetry rows: {len(hist)}")
    alerts = get_alerts()
    print(f"Active alerts: {len(alerts)}")
