"""
Real-time Risk Prediction & Explainability Engine
Loads pre-trained XGBoost model and SHAP TreeExplainer to compute risk probabilities,
risk severity classifications, and exact feature attributions.
"""

import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from data_generator import FEATURE_COLUMNS, FEATURE_RANGES

FEATURE_DISPLAY_NAMES = {
    "rainfall_mm": "24h Cumulative Rainfall",
    "pore_water_pressure_kpa": "Pore Water Pressure",
    "rock_displacement_mm": "Rock Displacement",
    "displacement_rate_mm_day": "Displacement Velocity",
    "crack_width_mm": "Tension Crack Width",
    "crack_growth_rate_mm_day": "Crack Growth Rate",
    "vibration_ppv_mm_s": "Blast Vibration (PPV)",
    "slope_angle_deg": "Bench Slope Angle",
    "rock_mass_rating_rmr": "Rock Mass Rating (RMR)",
    "temperature_c": "Ambient Temperature",
    "humidity_pct": "Relative Humidity"
}

FEATURE_UNITS = {
    "rainfall_mm": "mm",
    "pore_water_pressure_kpa": "kPa",
    "rock_displacement_mm": "mm",
    "displacement_rate_mm_day": "mm/day",
    "crack_width_mm": "mm",
    "crack_growth_rate_mm_day": "mm/day",
    "vibration_ppv_mm_s": "mm/s",
    "slope_angle_deg": "°",
    "rock_mass_rating_rmr": "pts",
    "temperature_c": "°C",
    "humidity_pct": "%"
}

class RockfallRiskEngine:
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
        
        xgb_path = os.path.join(models_dir, "xgboost_model.pkl")
        rf_path = os.path.join(models_dir, "random_forest_model.pkl")
        lr_path = os.path.join(models_dir, "logistic_regression_model.pkl")
        scaler_path = os.path.join(models_dir, "scaler.pkl")
        shap_path = os.path.join(models_dir, "shap_explainer.pkl")
        
        with open(xgb_path, "rb") as f:
            self.xgb_model = pickle.load(f)
        with open(rf_path, "rb") as f:
            self.rf_model = pickle.load(f)
        with open(lr_path, "rb") as f:
            self.lr_model = pickle.load(f)
        with open(scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
        with open(shap_path, "rb") as f:
            self.shap_explainer = pickle.load(f)

    def classify_risk(self, probability: float) -> Dict[str, Any]:
        """
        Converts probability (0.0 to 1.0) into PRD risk tiers and action advisories.
        """
        prob_pct = round(probability * 100, 1)
        
        if probability < 0.30:
            return {
                "level": "LOW",
                "color": "#10b981", # Emerald green
                "code": "green",
                "status_text": "Normal Monitoring Conditions",
                "alert_required": False,
                "advisory": "Slope stability indicators remain within acceptable safety margins. Standard scheduled radar and prism scans apply."
            }
        elif probability < 0.60:
            return {
                "level": "MEDIUM",
                "color": "#f59e0b", # Amber
                "code": "yellow",
                "status_text": "Increased Monitoring Recommended",
                "alert_required": False,
                "advisory": "Elevated displacement or pore pressure observed. Increase crack extensometer logging frequency and alert bench supervisor."
            }
        elif probability < 0.80:
            return {
                "level": "HIGH",
                "color": "#f97316", # Orange
                "code": "orange",
                "status_text": "Warning: High Risk Detected",
                "alert_required": True,
                "advisory": "Significant slope destabilization in progress. Restrict haul truck transit below bench toe and inspect tension crack berm."
            }
        else:
            return {
                "level": "CRITICAL",
                "color": "#ef4444", # Red
                "code": "red",
                "status_text": "Urgent Warning: Imminent Rockfall Hazard",
                "alert_required": True,
                "advisory": "DANGER: Tertiary accelerating creep detected. Immediately evacuate personnel within 150m bench radius and initiate emergency exclusion protocol."
            }

    def predict(self, raw_params: Dict[str, float], model_choice: str = "xgboost") -> Dict[str, Any]:
        # Clean and validate parameters
        feature_values = []
        for col in FEATURE_COLUMNS:
            val = float(raw_params.get(col, 0.0))
            # Clip within physical plausibility
            min_v, max_v = FEATURE_RANGES[col]
            val = max(min_v, min(val, max_v))
            feature_values.append(val)
            
        df = pd.DataFrame([feature_values], columns=FEATURE_COLUMNS)
        
        # Primary XGBoost prediction
        xgb_prob = float(self.xgb_model.predict_proba(df)[0][1])
        
        # Comparative predictions for reference
        rf_prob = float(self.rf_model.predict_proba(df)[0][1])
        scaled_input = self.scaler.transform(df)
        lr_prob = float(self.lr_model.predict_proba(scaled_input)[0][1])
        
        active_prob = xgb_prob
        if model_choice.lower() == "random_forest":
            active_prob = rf_prob
        elif model_choice.lower() == "logistic_regression":
            active_prob = lr_prob
            
        risk_info = self.classify_risk(active_prob)
        
        # Explainable AI via SHAP
        shap_values = self.shap_explainer(df)
        shap_array = shap_values.values[0] # array of shape (n_features,)
        
        feature_explanations = []
        for i, col in enumerate(FEATURE_COLUMNS):
            val = feature_values[i]
            shap_val = float(shap_array[i])
            feature_explanations.append({
                "feature": col,
                "display_name": FEATURE_DISPLAY_NAMES[col],
                "value": round(val, 2),
                "unit": FEATURE_UNITS[col],
                "shap_impact": round(shap_val, 3),
                "is_destabilizing": shap_val > 0
            })
            
        # Sort by absolute SHAP magnitude
        feature_explanations.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)
        
        # Top 3 driving factors
        top_destabilizing = [f for f in feature_explanations if f["is_destabilizing"]][:3]
        top_stabilizing = [f for f in feature_explanations if not f["is_destabilizing"]][:2]
        
        summary_bullets = []
        for f in top_destabilizing:
            summary_bullets.append(f"{f['display_name']} ({f['value']} {f['unit']}) increases rockfall risk")
        if not summary_bullets:
            summary_bullets.append("All monitoring parameters remain inside safe geotechnical thresholds")
            
        return {
            "probability": round(active_prob, 4),
            "probability_pct": round(active_prob * 100, 1),
            "risk_level": risk_info["level"],
            "risk_color": risk_info["color"],
            "risk_code": risk_info["code"],
            "status_text": risk_info["status_text"],
            "alert_required": risk_info["alert_required"],
            "advisory": risk_info["advisory"],
            "model_used": model_choice,
            "model_probabilities": {
                "XGBoost": round(xgb_prob * 100, 1),
                "Random Forest": round(rf_prob * 100, 1),
                "Logistic Regression": round(lr_prob * 100, 1)
            },
            "feature_contributions": feature_explanations,
            "key_risk_factors": summary_bullets,
            "input_parameters": {col: round(val, 2) for col, val in zip(FEATURE_COLUMNS, feature_values)}
        }

# Global singleton
risk_engine = RockfallRiskEngine()

if __name__ == "__main__":
    from data_generator import PRESET_SCENARIOS
    print("Testing Risk Engine with Preset Scenarios:")
    for key, scenario in PRESET_SCENARIOS.items():
        res = risk_engine.predict(scenario["parameters"])
        print(f"\nScenario: {scenario['name']}")
        print(f"Risk: {res['risk_level']} ({res['probability_pct']}%)")
        print(f"Key Factors: {', '.join(res['key_risk_factors'][:2])}")
