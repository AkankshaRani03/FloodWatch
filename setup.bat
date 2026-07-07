@echo off
REM ===============================================
REM Flood Prediction System - Quick Setup Script
REM For Windows Systems
REM ===============================================

echo.
echo ========================================
echo   FLOOD PREDICTION SYSTEM SETUP
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.10 or higher from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [1/5] Python detected...
python --version

REM Create virtual environment
echo.
echo [2/5] Creating virtual environment...
if exist venv (
    echo Virtual environment already exists. Skipping...
) else (
    python -m venv venv
    echo Virtual environment created!
)

REM Activate virtual environment
echo.
echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo.
echo [4/5] Installing dependencies...
echo This may take 2-5 minutes...
pip install -r requirements.txt

REM Authenticate Google Earth Engine
echo.
echo [5/5] Google Earth Engine Authentication...
echo.
echo IMPORTANT: A browser will open. Please:
echo   1. Log in with YOUR Google account
echo   2. Click "Generate Token"
echo   3. Copy the authorization code
echo   4. Paste it back here
echo.
pause
earthengine authenticate

REM Verify setup
echo.
echo ========================================
echo   VERIFYING INSTALLATION
echo ========================================
echo.
python -c "import ee; ee.Initialize(project='flood-prediction-0325'); print('✓ Google Earth Engine: CONNECTED')" 2>nul
if errorlevel 1 (
    echo [WARNING] GEE authentication may have failed
    echo Please run: earthengine authenticate
) else (
    echo ✓ Google Earth Engine: CONNECTED
)

python -c "import flask; print('✓ Flask: INSTALLED')" 2>nul
if errorlevel 1 (
    echo [ERROR] Flask not installed
) else (
    echo ✓ Flask: INSTALLED
)

python -c "import sklearn; print('✓ scikit-learn: INSTALLED')" 2>nul
if errorlevel 1 (
    echo [ERROR] scikit-learn not installed
) else (
    echo ✓ scikit-learn: INSTALLED
)

echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo To run the application:
echo   1. Run: start_server.bat
echo   2. Open browser: http://localhost:5000
echo.
echo For detailed instructions, see: DEPLOYMENT_GUIDE.md
echo.
pause
