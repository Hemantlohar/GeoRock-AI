@echo off
TITLE GeoRock AI — Open-Pit Mine Rockfall Prediction System
echo ======================================================================
echo    GeoRock AI: AI-Based Rockfall Prediction & Alert System
echo    Open-Pit Mine Geotechnical Slope Stability Command Center
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Machine Learning Models and Artifacts...
if not exist "backend\models\xgboost_model.pkl" (
    echo Models not found. Training XGBoost, Random Forest, and Logistic Regression...
    python backend\ml\train_models.py
) else (
    echo Trained ML models and SHAP explainers ready.
)

echo.
echo [2/3] Launching FastAPI Backend Server on http://127.0.0.1:8000...
start "GeoRock Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo [3/3] Launching React Vite Frontend on http://127.0.0.1:5173...
start "GeoRock Frontend UI" cmd /k "cd /d %~dp0frontend && (if not exist node_modules npm install) && npm run dev"

timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173/

echo.
echo ======================================================================
echo    System successfully launched!
echo    - Frontend Dashboard: http://127.0.0.1:5173
echo    - Backend Swagger API: http://127.0.0.1:8000/docs
echo ======================================================================
pause
