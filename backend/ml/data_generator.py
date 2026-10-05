"""
Geotechnical Open-Pit Mine Slope Monitoring Dataset Generator
Based on rock mechanics principles (Limit Equilibrium, Hoek-Brown, Saito's Tertiary Creep, and Blast Vibration Peak Particle Velocity).
"""

import os
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "rainfall_mm",
    "pore_water_pressure_kpa",
    "rock_displacement_mm",
    "displacement_rate_mm_day",
    "crack_width_mm",
    "crack_growth_rate_mm_day",
    "vibration_ppv_mm_s",
    "slope_angle_deg",
    "rock_mass_rating_rmr",
    "temperature_c",
    "humidity_pct"
]

FEATURE_RANGES = {
    "rainfall_mm": (0.0, 120.0),
    "pore_water_pressure_kpa": (0.0, 180.0),
    "rock_displacement_mm": (0.0, 120.0),
    "displacement_rate_mm_day": (0.0, 25.0),
    "crack_width_mm": (0.0, 80.0),
    "crack_growth_rate_mm_day": (0.0, 15.0),
    "vibration_ppv_mm_s": (0.0, 60.0),
    "slope_angle_deg": (35.0, 75.0),
    "rock_mass_rating_rmr": (15.0, 90.0),
    "temperature_c": (-5.0, 45.0),
    "humidity_pct": (15.0, 100.0)
}

def generate_mine_slope_dataset(n_samples: int = 3500, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a physically realistic open-pit mine slope stability dataset.
    """
    np.random.seed(random_seed)
    
    # 1. Environmental variables
    # Rainfall: skewed distribution with monsoon / heavy downpour events
    rainfall = np.random.exponential(scale=18.0, size=n_samples)
    rainfall = np.clip(rainfall, 0.0, 120.0)
    
    # Temperature & Humidity
    temperature = np.random.normal(loc=26.0, scale=9.0, size=n_samples)
    temperature = np.clip(temperature, -5.0, 45.0)
    
    humidity = 35.0 + 0.45 * rainfall + np.random.normal(loc=0, scale=10.0, size=n_samples)
    humidity = np.clip(humidity, 15.0, 100.0)
    
    # Pore water pressure increases significantly with rainfall and poor drainage
    pore_water_pressure = (
        0.85 * rainfall + 
        np.random.gamma(shape=2.0, scale=12.0, size=n_samples)
    )
    pore_water_pressure = np.clip(pore_water_pressure, 0.0, 180.0)
    
    # 2. Geotechnical & Structural parameters
    # Slope angle (bench face angle / inter-ramp angle in degrees)
    slope_angle = np.random.normal(loc=54.0, scale=8.5, size=n_samples)
    slope_angle = np.clip(slope_angle, 35.0, 75.0)
    
    # Rock Mass Rating (Bieniawski RMR: 15-30 Very Poor, 30-50 Poor, 50-70 Fair, 70-90 Good)
    rock_mass_rating = np.random.normal(loc=52.0, scale=15.0, size=n_samples)
    rock_mass_rating = np.clip(rock_mass_rating, 15.0, 90.0)
    
    # Dynamic blasting vibration: Peak Particle Velocity (PPV in mm/s)
    # Most days have low background PPV (<10 mm/s), but production blasts reach 30-60 mm/s
    is_blast_day = np.random.rand(n_samples) < 0.28
    vibration_ppv = np.where(
        is_blast_day,
        np.random.uniform(15.0, 58.0, size=n_samples),
        np.random.uniform(0.5, 9.5, size=n_samples)
    )
    vibration_ppv = np.clip(vibration_ppv, 0.0, 60.0)
    
    # Tension crack parameters
    # Poor rock mass (low RMR) and steep slope accelerate crack opening
    instability_predisposition = (
        ((75.0 - rock_mass_rating) / 60.0) * 0.4 +
        ((slope_angle - 35.0) / 40.0) * 0.3 +
        (pore_water_pressure / 180.0) * 0.3
    )
    instability_predisposition = np.clip(instability_predisposition, 0.05, 0.95)
    
    crack_width = np.random.exponential(scale=8.0, size=n_samples) * (1.0 + 2.0 * instability_predisposition)
    crack_width = np.clip(crack_width, 0.0, 80.0)
    
    crack_growth_rate = np.random.exponential(scale=1.2, size=n_samples) * (1.0 + 3.0 * instability_predisposition)
    crack_growth_rate = np.clip(crack_growth_rate, 0.0, 15.0)
    
    # Displacement parameters (cumulative and velocity rate)
    rock_displacement = 0.9 * crack_width + np.random.exponential(scale=6.0, size=n_samples)
    rock_displacement = np.clip(rock_displacement, 0.0, 120.0)
    
    displacement_rate = (
        0.7 * crack_growth_rate + 
        (vibration_ppv / 60.0) * 3.5 + 
        (pore_water_pressure / 180.0) * 4.0 + 
        np.random.exponential(scale=0.8, size=n_samples)
    )
    displacement_rate = np.clip(displacement_rate, 0.0, 25.0)
    
    # 3. Geotechnical Factor of Safety (FoS) & Rockfall Occurrence Formulation
    # Driving Force index (Fd):
    # - Gravity shear component ~ sin(slope_angle)
    # - Hydrostatic water thrust ~ pore_water_pressure + rainfall
    # - Dynamic seismic acceleration ~ vibration_ppv
    # - Accelerating kinematic velocity ~ displacement_rate & crack_growth_rate
    slope_rad = np.radians(slope_angle)
    driving_index = (
        np.sin(slope_rad) * 35.0 +
        (pore_water_pressure / 180.0) * 26.0 +
        (rainfall / 120.0) * 16.0 +
        (vibration_ppv / 60.0) * 18.0 +
        (displacement_rate / 25.0) * 32.0 +
        (crack_growth_rate / 15.0) * 28.0 +
        (crack_width / 80.0) * 14.0
    )
    
    # Resisting Force index (Fr):
    # - Friction and shear strength ~ cos(slope_angle) * RMR
    resisting_index = (
        np.cos(slope_rad) * (rock_mass_rating * 0.9) +
        (100.0 - humidity) * 0.08 +
        12.0
    )
    
    # Factor of Safety proxy (FoS = Resisting / Driving)
    # Calibrated so FoS typically ranges from 0.7 to 2.2
    fos_ratio = (resisting_index * 1.55) / np.maximum(driving_index, 1e-3)
    
    # Failure probability follows a logistic curve centered around FoS = 1.0
    # Higher FoS => much lower probability of rockfall
    log_odds = -5.8 * (fos_ratio - 1.02) + np.random.normal(loc=0.0, scale=0.4, size=n_samples)
    failure_prob = 1.0 / (1.0 + np.exp(-log_odds))
    
    # Binary event label
    rockfall_event = (failure_prob >= 0.50).astype(int)
    
    df = pd.DataFrame({
        "rainfall_mm": np.round(rainfall, 2),
        "pore_water_pressure_kpa": np.round(pore_water_pressure, 2),
        "rock_displacement_mm": np.round(rock_displacement, 2),
        "displacement_rate_mm_day": np.round(displacement_rate, 2),
        "crack_width_mm": np.round(crack_width, 2),
        "crack_growth_rate_mm_day": np.round(crack_growth_rate, 2),
        "vibration_ppv_mm_s": np.round(vibration_ppv, 2),
        "slope_angle_deg": np.round(slope_angle, 2),
        "rock_mass_rating_rmr": np.round(rock_mass_rating, 1),
        "temperature_c": np.round(temperature, 1),
        "humidity_pct": np.round(humidity, 1),
        "rockfall_event": rockfall_event
    })
    
    return df

PRESET_SCENARIOS = {
    "monsoon_blast": {
        "name": "Monsoon Deluge & Production Blast",
        "description": "High rainfall with heavy blast vibrations triggers acute slope destabilization.",
        "parameters": {
            "rainfall_mm": 68.5,
            "pore_water_pressure_kpa": 142.0,
            "rock_displacement_mm": 54.0,
            "displacement_rate_mm_day": 12.8,
            "crack_width_mm": 38.0,
            "crack_growth_rate_mm_day": 7.4,
            "vibration_ppv_mm_s": 46.5,
            "slope_angle_deg": 64.0,
            "rock_mass_rating_rmr": 38.0,
            "temperature_c": 24.0,
            "humidity_pct": 92.0
        },
        "expected_risk": "CRITICAL"
    },
    "stable_bench": {
        "name": "Stable Dry Bench (Normal Operations)",
        "description": "Competent rock mass with no rainfall, minimal crack aperture, and stable baseline.",
        "parameters": {
            "rainfall_mm": 0.0,
            "pore_water_pressure_kpa": 8.5,
            "rock_displacement_mm": 3.2,
            "displacement_rate_mm_day": 0.15,
            "crack_width_mm": 1.8,
            "crack_growth_rate_mm_day": 0.05,
            "vibration_ppv_mm_s": 2.2,
            "slope_angle_deg": 48.0,
            "rock_mass_rating_rmr": 76.0,
            "temperature_c": 28.5,
            "humidity_pct": 42.0
        },
        "expected_risk": "LOW"
    },
    "progressive_creep": {
        "name": "Secondary Creep & Tension Cracking",
        "description": "Moderate rainfall and continuous crack growth signaling progressive bench movement.",
        "parameters": {
            "rainfall_mm": 24.0,
            "pore_water_pressure_kpa": 55.0,
            "rock_displacement_mm": 22.5,
            "displacement_rate_mm_day": 3.4,
            "crack_width_mm": 18.0,
            "crack_growth_rate_mm_day": 2.8,
            "vibration_ppv_mm_s": 11.0,
            "slope_angle_deg": 56.0,
            "rock_mass_rating_rmr": 48.0,
            "temperature_c": 22.0,
            "humidity_pct": 68.0
        },
        "expected_risk": "MEDIUM"
    },
    "critical_shear": {
        "name": "Active Shear Plane Failure",
        "description": "Severe acceleration in rock displacement rate and critical crest crack dilation.",
        "parameters": {
            "rainfall_mm": 45.0,
            "pore_water_pressure_kpa": 110.0,
            "rock_displacement_mm": 82.0,
            "displacement_rate_mm_day": 18.5,
            "crack_width_mm": 62.0,
            "crack_growth_rate_mm_day": 11.2,
            "vibration_ppv_mm_s": 28.0,
            "slope_angle_deg": 68.0,
            "rock_mass_rating_rmr": 28.0,
            "temperature_c": 19.5,
            "humidity_pct": 84.0
        },
        "expected_risk": "CRITICAL"
    }
}

if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "mine_slope_dataset.csv")
    
    print(f"Generating geotechnical mine slope dataset (3,500 samples)...")
    df = generate_mine_slope_dataset(n_samples=3500)
    df.to_csv(csv_path, index=False)
    
    pos_count = (df['rockfall_event'] == 1).sum()
    total = len(df)
    print(f"Dataset generated and saved to {csv_path}")
    print(f"Total records: {total}, Rockfall events: {pos_count} ({pos_count/total*100:.1f}%)")
