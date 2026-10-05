# GeoRock AI: AI-Based Rockfall Prediction and Alert System for Open-Pit Mines

An enterprise-grade, geotechnical AI platform designed to evaluate slope stability, predict rockfall probability, provide local and global Explainable AI (XAI) feature attributions, detect rock fractures using Computer Vision, and trigger real-time operational safety alarms in open-pit mining environments.

> **Launch/setup guide:** see [DEPLOY.md](DEPLOY.md) (Supabase, Upstash, https, SEO, privacy pages).

---

## 🏗️ System Architecture & 3-Version Roadmap

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
                                           │ REST API
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

### Version 1 — MVP (Core Engine)
- **Monitoring Parameter Input**: Interactive sliders and preset scenario loaders for 11 environmental and geotechnical features.
- **AI Prediction Engine**: Tuned **XGBoost Classifier** calculating rockfall failure probability ($0.0$ to $1.0$).
- **Risk Severity Categorization**:
  - `0% - 30%` 🟢 **LOW**: Normal monitoring operations.
  - `30% - 60%` 🟡 **MEDIUM**: Increased monitoring recommended.
  - `60% - 80%` 🟠 **HIGH**: Warning generated; haulage restriction.
  - `80% - 100%` 🔴 **CRITICAL**: Imminent hazard; evacuation protocol.
- **Alert Dispatcher**: Audio-visual warning banners with operational checklists and SQLite alert logging.
- **Audit Persistence**: Every prediction recorded in SQLite with full parameter traces.

### Version 2 — Research Version (Model Benchmarking & Explainable AI)
- **Multi-Model Comparison**: Side-by-side benchmark of **XGBoost** ($92.4\%$ Acc, $0.980$ ROC-AUC), **Random Forest** ($92.1\%$ Acc, $0.976$ ROC-AUC), and **Logistic Regression** ($95.0\%$ Acc, $0.988$ ROC-AUC).
- **Interactive Visualizations**: Recharts comparative metric bars, ROC curves, and confusion matrices.
- **Explainable AI (SHAP)**: Real-time TreeExplainer feature attributions highlighting destabilizing (shear-promoting) and stabilizing (resisting) factors.

### Version 3 — Advanced Version (Computer Vision & Live Simulation)
- **Computer Vision Crack Extraction**: OpenCV edge segmentation, adaptive thresholding, and morphological skeletonization on high-wall rockface photos.
- **Fracture Quantification**: Estimates crack count, max aperture width (mm), cumulative length, and visual hazard score.
- **Direct Model Integration**: One-click transfer of CV-detected crack widths into the ML prediction engine.
- **Real-Time Telemetry Simulator**: Live streaming radar & sensor feed with dynamic charting and automatic alert triggering.

---

## 📊 Geotechnical Monitoring Features

| Parameter | Unit | Safe Range | Destabilizing Trigger | Geomechanical Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Rainfall (24h)** | mm | $0 - 15$ | $> 50$ | Rainfall infiltration increases pore water pressure and reduces effective normal stress ($\sigma' = \sigma - u$). |
| **Pore Water Pressure** | kPa | $0 - 30$ | $> 100$ | Destabilizes joint planes via hydrostatic uplift forces. |
| **Displacement** | mm | $0 - 10$ | $> 50$ | Cumulative shear displacement across bench crest. |
| **Displacement Rate** | mm/day | $0.0 - 0.5$ | $> 5.0$ | **Tertiary Creep**: Accelerating movement velocity indicates imminent slope collapse (Saito's Law). |
| **Crack Width** | mm | $0 - 5$ | $> 25$ | Dilation of tension crack behind bench crest. |
| **Crack Growth Rate** | mm/day | $0.0 - 0.2$ | $> 3.0$ | Rapid fissure opening rate precedes block release. |
| **Blasting PPV** | mm/s | $0 - 10$ | $> 35$ | Dynamic ground acceleration from production blasts inducing shear failure. |
| **Bench Slope Angle** | degrees | $35 - 55$ | $> 65$ | Steeper angles increase driving gravitational shear stresses ($\tau = \gamma h \sin \theta$). |
| **Rock Mass Rating (RMR)** | points | $65 - 90$ | $< 40$ | Bieniawski geomechanical quality; low RMR denotes heavily jointed/weathered rock. |
| **Temperature** | °C | $10 - 35$ | $< 0$ or $> 40$ | Thermal expansion/contraction and freeze-thaw wedge action. |
| **Relative Humidity** | % | $30 - 70$ | $> 90$ | Atmospheric saturation indicator. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested through Python 3.14)
- **Node.js 18+** & **npm**

### 1. One-Click Launch (Windows)
Double-click:
```cmd
run_project.bat
```
This automatically verifies ML models, starts the FastAPI backend on `http://127.0.0.1:8000`, starts the Vite frontend on `http://127.0.0.1:5173`, and opens the browser.

### 2. Manual Startup

#### Terminal 1 — Backend:
```bash
cd backend
python -m pip install -r requirements.txt
python ml/train_models.py
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

#### Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in your web browser.

---

## 🧪 Automated Testing

To run the automated backend test suite covering all 8 endpoints, multi-model inferences, SHAP explainability, CV crack detection, and SQLite persistence:

```bash
python backend/test_api.py
```

Expected output:
```
============================================================
Running Automated Backend Verification Tests
============================================================
[PASS] GET /api/health passed
[PASS] GET /api/presets passed (4 presets loaded)
[PASS] GET /api/model-comparison passed (All 3 models verified > 85% accuracy)
[PASS] POST /api/predict (High/Critical test) passed: CRITICAL (100.0%)
[PASS] POST /api/predict (Stable test) passed: LOW (0.0%)
[PASS] GET /api/cv/samples passed (3 benchmark rockfaces)
[PASS] POST /api/cv/analyze passed: 6 cracks, visual severity: CRITICAL
[PASS] GET /api/history passed (2 predictions recorded in SQLite)
[PASS] GET /api/telemetry passed (30 temporal data points)
[PASS] GET & POST /api/alerts passed (Alert 1 acknowledged)
============================================================
ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY!
============================================================
```

---

## 🛡️ License & Academic Usage
Developed for Open-Pit Mining Geotechnical & Geohazard AI Research.
