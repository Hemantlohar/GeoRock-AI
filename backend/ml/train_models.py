"""
Model Training and Comparison Pipeline
Trains XGBoost (Primary), Random Forest, and Logistic Regression models.
Generates comprehensive benchmark metrics, ROC curves, feature importances, and SHAP explainer.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_curve
)
from xgboost import XGBClassifier
import shap

from data_generator import FEATURE_COLUMNS, generate_mine_slope_dataset

def train_and_evaluate_all():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "..", "data", "mine_slope_dataset.csv")
    models_dir = os.path.join(base_dir, "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(data_path):
        print("Dataset not found, generating new dataset...")
        df = generate_mine_slope_dataset()
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    X = df[FEATURE_COLUMNS]
    y = df["rockfall_event"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 1. Primary Model: XGBoost
    xgb_model = XGBClassifier(
        n_estimators=180,
        max_depth=5,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42
    )
    xgb_model.fit(X_train, y_train)
    
    # 2. Comparison Model 1: Random Forest
    rf_model = RandomForestClassifier(
        n_estimators=160,
        max_depth=9,
        min_samples_split=4,
        random_state=42
    )
    rf_model.fit(X_train, y_train)
    
    # 3. Comparison Model 2: Logistic Regression
    lr_model = LogisticRegression(
        max_iter=1000,
        random_state=42
    )
    lr_model.fit(X_train_scaled, y_train)
    
    models = {
        "XGBoost": (xgb_model, X_test, False),
        "Random Forest": (rf_model, X_test, False),
        "Logistic Regression": (lr_model, X_test_scaled, True)
    }
    
    metrics_summary = {}
    print("\n" + "=" * 68)
    print(f"{'MODEL':<20} | {'ACCURACY':<9} | {'ROC-AUC':<9} | {'PRECISION':<9} | {'RECALL':<8} | {'F1':<6}")
    print("=" * 68)
    
    for name, (model, test_features, is_scaled) in models.items():
        y_pred = model.predict(test_features)
        y_prob = model.predict_proba(test_features)[:, 1]
        
        acc = float(accuracy_score(y_test, y_pred))
        auc = float(roc_auc_score(y_test, y_prob))
        prec = float(precision_score(y_test, y_pred))
        rec = float(recall_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))
        
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        # Sample ~25 ROC points for clean JSON frontend visualization
        indices = np.linspace(0, len(fpr) - 1, min(25, len(fpr)), dtype=int)
        roc_points = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in indices]
        
        if hasattr(model, "feature_importances_"):
            importances = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_COLUMNS, model.feature_importances_)}
            sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
        else:
            # For Logistic Regression, normalized absolute coefficients
            coefs = np.abs(model.coef_[0])
            norm_coefs = coefs / np.sum(coefs)
            importances = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_COLUMNS, norm_coefs)}
            sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
            
        metrics_summary[name] = {
            "accuracy": round(acc * 100, 2),
            "roc_auc": round(auc, 4),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "confusion_matrix": cm,
            "roc_curve": roc_points,
            "feature_importance": dict(sorted_imp)
        }
        
        print(f"{name:<20} | {acc*100:>7.2f}% | {auc:>9.4f} | {prec*100:>7.2f}% | {rec*100:>6.2f}% | {f1*100:>5.2f}%")
    print("=" * 68)
    
    # Initialize SHAP TreeExplainer for XGBoost
    print("\nFitting SHAP TreeExplainer for XGBoost model...")
    explainer = shap.TreeExplainer(xgb_model)
    
    # Save Model Artifacts
    with open(os.path.join(models_dir, "xgboost_model.pkl"), "wb") as f:
        pickle.dump(xgb_model, f)
    with open(os.path.join(models_dir, "random_forest_model.pkl"), "wb") as f:
        pickle.dump(rf_model, f)
    with open(os.path.join(models_dir, "logistic_regression_model.pkl"), "wb") as f:
        pickle.dump(lr_model, f)
    with open(os.path.join(models_dir, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(models_dir, "shap_explainer.pkl"), "wb") as f:
        pickle.dump(explainer, f)
        
    metrics_path = os.path.join(models_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_summary, f, indent=2)
        
    print(f"All models and metrics successfully saved to {models_dir}")
    return metrics_summary

if __name__ == "__main__":
    train_and_evaluate_all()
