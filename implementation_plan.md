# Implementation Plan: AI-Based Rockfall Prediction and Alert System for Open-Pit Mines

The **AI-Based Rockfall Prediction and Alert System** is a software platform designed to evaluate geotechnical and environmental slope stability in open-pit mines. It takes critical monitoring parameters (rainfall, rock displacement, vibration, crack width, crack growth rate, slope angle, pore water pressure, temperature, etc.), runs trained machine learning models (XGBoost, Random Forest, Logistic Regression), generates rockfall risk probabilities and severity categories (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), provides Explainable AI (SHAP) feature attributions, runs computer vision crack detection on slope images, and delivers alerts via an interactive command-center web dashboard.

## User Review Required

> [!IMPORTANT]
> **Dataset & Ground Truth Strategy**: Since real-world open-pit mine geotechnical sensor failure datasets are proprietary and rarely publicly accessible with complete multivariable telemetry, we will implement a physically realistic **Geotechnical Open-Pit Slope Failure Dataset Generator** based on established rock mechanics principles (e.g., Barton's empirical shear strength, Hoek-Brown failure criterion, rainfall infiltration/pore-pressure destabilization, blast vibration peak particle velocity (PPV), and accelerating creep curves). This provides a reproducible, realistic foundation with train/test splits, benchmark metrics, and pre-trained model weights.

> [!NOTE]
> **Modular 3-in-1 Architecture**: We will structure the implementation into a cohesive system that covers the MVP while providing immediate access to the Version 2 (Research: Model Comparison & SHAP) and Version 3 (Advanced: Computer Vision crack analysis & real-time telemetry simulation) modules.

---

## Architecture Overview

```
                          ┌────────────────────────────────────────────────────────┐
                          │            OPEN-PIT MINE SENSORS / USER INPUT          │
                          │   (Rainfall, Displacement, Vibration, Cracks, Slope)   │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                      FASTAPI BACKEND (Python)                                   │
 │                                                                                                 │
 │  ┌───────────────────────────┐    ┌───────────────────────────┐    ┌─────────────────────────┐  │
 │  │      ML Risk Engine       │    │     Explainable AI (XAI)  │    │     Computer Vision     │  │
 │  │ • XGBoost (Primary)       │    │ • SHAP TreeExplainer      │    │ • OpenCV Crack Analysis │  │
 │  │ • Random Forest           │    │ • Dynamic Factor Impact   │    │ • Skeletonization       │  │
 │  │ • Logistic Regression     │    │ • Feature Attribution     │    │ • Anomaly Detection     │  │
 │  └─────────────┬─────────────┘    └─────────────┬─────────────┘    └────────────┬────────────┘  │
 │                │                                │                               │               │
 │                └────────────────────────┬───────┴───────────────────────────────┘               │
 │                                         ▼                                                       │
 │                         ┌───────────────────────────────┐                                       │
 │                         │   Risk & Alert Engine         │                                       │
 │                         │   0-30% LOW | 30-60% MEDIUM   │                                       │
 │                         │   60-80% HIGH | 80-100% CRIT  │                                       │
 │                         └───────────────┬───────────────┘                                       │
 │                                         │                                                       │
 │                         ┌───────────────┴───────────────┐                                       │
 │                         │       SQLite Database         │                                       │
 │                         │ (Predictions, Alerts, Logs)   │                                       │
 │                         └───────────────┬───────────────┘                                       │
 └─────────────────────────────────────────┼───────────────────────────────────────────────────────┘
                                           │ REST API / WebSocket
                                           ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                REACT + VITE COMMAND CENTER DASHBOARD                            │
 │                                                                                                 │
 │  ┌────────────────────┐ ┌────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐  │
 │  │  Risk Overview &   │ │  Model Comparison  │ │    SHAP Feature   │ │  Computer Vision Slope │  │
 │  │  Interactive Test  │ │  (XGB vs RF vs LR) │ │    Attributions   │ │  Crack Inspection      │  │
 │  └────────────────────┘ └────────────────────┘ └───────────────────┘ └────────────────────────┘  │
 │  ┌────────────────────┐ ┌────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐  │
 │  │  Risk Trends &     │ │  Active Alerts &   │ │  Live Telemetry   │ │  Geotechnical Preset   │  │
 │  │  Temporal History  │ │  Safety Protocols  │ │  Stream Simulator │ │  Scenario Loader       │  │
 │  └────────────────────┘ └────────────────────┘ └───────────────────┘ └────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Proposed Changes

### 1. Backend & Machine Learning Pipeline (`/backend`)

#### [NEW] [requirements.txt](file:///d:/Hemant/d/Research%20project/backend/requirements.txt)
- Specifies pinned backend packages: `fastapi`, `uvicorn`, `pydantic`, `numpy`, `pandas`, `scikit-learn`, `xgboost`, `shap`, `opencv-python-headless`, `pillow`.

#### [NEW] [data_generator.py](file:///d:/Hemant/d/Research%20project/backend/ml/data_generator.py)
- Synthesizes 3,000+ realistic open-pit mine slope monitoring records based on geotechnical relationships:
  - Factors: `rainfall_mm` (24h cumulative), `pore_water_pressure_kpa`, `rock_displacement_mm`, `displacement_rate_mm_day`, `crack_width_mm`, `crack_growth_rate_mm_day`, `vibration_ppv_mm_s`, `slope_angle_deg`, `rock_mass_rating_rmr`, `temperature_c`, `humidity_pct`.
  - Realistic target label: `rockfall_event` (binary failure event within 24-48 hours) derived from combined limit-equilibrium and factor-of-safety destabilization formulas with stochastic natural variance.
  - Generates reproducible CSV dataset in `backend/data/mine_slope_dataset.csv`.

#### [NEW] [train_models.py](file:///d:/Hemant/d/Research%20project/backend/ml/train_models.py)
- Trains and benchmarks three distinct models:
  1. **XGBoost Classifier** (Primary, tuned with log-loss optimization, probability calibration).
  2. **Random Forest Classifier** (Ensemble benchmark).
  3. **Logistic Regression** (Linear baseline).
- Computes comprehensive evaluation metrics:
  - Accuracy, ROC-AUC, Precision, Recall, F1-Score, Confusion Matrix, and cross-validation scores.
- Precomputes SHAP explainer (`shap.TreeExplainer`) for fast real-time inference explanations.
- Serializes trained models, scalers, and metric summaries to `backend/models/`.

#### [NEW] [predictor.py](file:///d:/Hemant/d/Research%20project/backend/ml/predictor.py)
- Inference service loading the trained XGBoost model and SHAP explainer:
  - Computes probability of rockfall (0.0 to 1.0).
  - Classifies into standard risk tiers:
    - `0% - 30%`: **LOW** 🟢 (Normal monitoring)
    - `30% - 60%`: **MEDIUM** 🟡 (Increased monitoring recommended)
    - `60% - 80%`: **HIGH** 🟠 (Warning generated, alert dispatched)
    - `80% - 100%`: **CRITICAL** 🔴 (Urgent warning, evacuation/halt advisory)
  - Calculates real SHAP values for the specific input to explain top contributing destabilizing and stabilizing factors.

#### [NEW] [cv_analyzer.py](file:///d:/Hemant/d/Research%20project/backend/cv/cv_analyzer.py)
- Computer Vision module for slope crack inspection:
  - Accepts uploaded slope image or sample bench image.
  - Applies preprocessing: grayscale, bilateral filtering, adaptive thresholding, morphological closing.
  - Detects crack contours, computes skeletonized crack length, maximum crack width, total crack area ratio, and visual severity index.
  - Generates an annotated output image with highlighted crack fissures and diagnostic bounding boxes.

#### [NEW] [database.py](file:///d:/Hemant/d/Research%20project/backend/db/database.py)
- SQLite database initialization and ORM models:
  - `predictions`: records timestamp, input parameters, rockfall probability, risk level, primary factors.
  - `alerts`: records generated warnings, severity, acknowledgment state, recommended safety actions.
  - `historical_telemetry`: pre-populated temporal mine log showing 30-day continuous sensor trends leading up to slope distress events.

#### [NEW] [main.py](file:///d:/Hemant/d/Research%20project/backend/main.py)
- FastAPI application with CORS middleware, request validation (Pydantic), and endpoints:
  - `POST /api/predict`: Runs real-time ML prediction + SHAP explanation.
  - `GET /api/history`: Returns historical sensor logs and prediction history.
  - `GET /api/model-comparison`: Returns benchmark comparison metrics and ROC data.
  - `GET /api/alerts`: Retrieves active alerts with acknowledge/dismiss actions.
  - `POST /api/cv/analyze`: Computer vision crack detection on uploaded/sample slope image.
  - `GET /api/presets`: Pre-configured mining scenarios (e.g., "Monsoon Deluge & Blasting", "Stable Dry Bench", "Active Bench Shearing", "Gradual Freeze-Thaw Creep").
  - `GET /api/telemetry/simulate`: Provides next time-step simulation point for live streaming mode.

---

### 2. Frontend Command Center Dashboard (`/frontend`)

Built using React (Vite) + Recharts + Vanilla CSS Design System with a modern dark-mode mining command center theme.

#### [NEW] [package.json](file:///d:/Hemant/d/Research%20project/frontend/package.json)
- React 18/19, Vite, Recharts, Lucide-react (or SVG icons), standard modern toolchain.

#### [NEW] [index.html](file:///d:/Hemant/d/Research%20project/frontend/index.html)
- Modern Google Fonts (`Outfit`, `Inter`, `JetBrains Mono`), title, viewport and meta tags.

#### [NEW] [src/index.css](file:///d:/Hemant/d/Research%20project/frontend/src/index.css)
- Comprehensive CSS design system with custom variables:
  - Palette: deep slate backgrounds (`#0a0f1d`, `#0f172a`), neon/amber/rose risk colors, frosted glass surfaces (`backdrop-filter`), glowing borders, crisp typography, and responsive layouts.

#### [NEW] [src/components/RiskGauge.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/RiskGauge.jsx)
- High-impact radial risk meter visualizing 0–100% probability with color transitions (Green → Yellow → Orange → Red), pulsating risk badge, and safety status headline.

#### [NEW] [src/components/PredictionForm.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/PredictionForm.jsx)
- Interactive parameter input station with sliders and numerical inputs:
  - Rainfall, Vibration PPV, Rock Displacement, Displacement Rate, Crack Width, Crack Growth, Slope Angle, RMR.
  - Quick-preset loader buttons for rapid geotechnical scenario testing.
  - "Analyze Rockfall Risk" action triggering instant ML inference.

#### [NEW] [src/components/ExplainabilityView.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/ExplainabilityView.jsx)
- Visual Explainable AI (XAI) widget showing SHAP feature attributions:
  - Destabilizing factors pushing risk higher (red/orange bars with exact impact percentage).
  - Stabilizing factors mitigating risk (green bars).
  - Human-readable engineering summary ("Heavy 24h rainfall of 54mm and rapid crack growth (+3.2mm/day) are the primary drivers of this HIGH risk classification").

#### [NEW] [src/components/ModelComparisonView.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/ModelComparisonView.jsx)
- Version 2 Research Module:
  - Side-by-side metric cards for XGBoost vs Random Forest vs Logistic Regression.
  - Accuracy, AUC-ROC, Precision, Recall, F1 comparison bar charts.
  - Confusion Matrix visualization and feature importance rankings.

#### [NEW] [src/components/CrackInspectionView.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/CrackInspectionView.jsx)
- Version 3 Advanced Module:
  - Interactive slope image inspection interface.
  - Upload user image or select from realistic open-pit rock slope benchmarks.
  - Side-by-side view: Original rockface vs CV Edge/Crack Skeletonization with measured crack width, length, and visual hazard score.

#### [NEW] [src/components/TemporalTrendsView.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/TemporalTrendsView.jsx)
- Recharts multi-axis line and area charts:
  - 30-day temporal trend tracking displacement acceleration, rainfall accumulation, vibration events, and calculated rockfall risk over time.
  - Prediction history table with search, filter, and alert markers.

#### [NEW] [src/components/AlertBanner.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/AlertBanner.jsx)
- Dynamic critical alert system:
  - Audio-visual alert banner when risk >= 60% (HIGH) or >= 80% (CRITICAL).
  - Actionable evacuation/operational protocols (e.g. "Trigger Bench Clearance", "Halt Haulage", "Deploy Slope Stability Radar").

#### [NEW] [src/components/LiveSimulator.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/components/LiveSimulator.jsx)
- Real-time telemetry feed simulator:
  - Toggle live sensor feed (1 tick / 2 seconds) to simulate real-time mine operations, displaying dynamic chart updates and live alarm triggers.

#### [NEW] [src/App.jsx](file:///d:/Hemant/d/Research%20project/frontend/src/App.jsx)
- Master command center layout coordinating navigation tabs:
  1. 🎯 **Risk Monitor & Prediction** (Core MVP)
  2. 📈 **Temporal Trends & History** (Telemetry over time)
  3. 🔬 **Model Comparison & SHAP** (Research Version 2)
  4. 📷 **Computer Vision Crack Detection** (Advanced Version 3)
  5. 🚨 **Alerts & Mine Safety Protocols**

---

### 3. Orchestration & Automation

#### [NEW] [run_project.bat](file:///d:/Hemant/d/Research%20project/run_project.bat)
- Windows batch script to train the models (if not yet trained), launch the FastAPI backend, and launch the Vite dev server with single-click ease.

---

## Verification Plan

### Automated Tests
1. **Data Generation & Model Training Test**:
   - Run `backend/ml/data_generator.py` and ensure `backend/data/mine_slope_dataset.csv` has valid distribution and no NaN values.
   - Run `backend/ml/train_models.py` and verify all 3 models (XGBoost, Random Forest, Logistic Regression) train cleanly, output accuracy > 85%, and save `.pkl` artifacts and metric JSON files.
2. **Backend API Endpoints Test**:
   - Run a test script `python backend/test_api.py` testing:
     - `POST /api/predict` with normal and extreme inputs.
     - `GET /api/model-comparison` verifying metric payloads.
     - `POST /api/cv/analyze` testing crack detection image processing.
     - `GET /api/history` and `GET /api/alerts`.

### Manual & Visual Verification
1. **Frontend Build & UI Testing**:
   - Launch backend and frontend development servers.
   - Verify all 5 dashboard views via browser subagent or local HTTP checks.
   - Test scenario presets ("Monsoon Blast", "Stable Bench", etc.) and verify that the Risk Gauge, probability percentages, and SHAP factor attribution bars respond instantaneously.
   - Test the Computer Vision crack detection tab with slope rock sample images.
   - Verify alert popups and audio-visual triggers when risk exceeds 60% and 80%.
