@echo off
REM ===============================================
REM Start Flood Prediction System Server
REM ===============================================

echo.
echo ========================================
echo   STARTING FLOOD PREDICTION SERVER
echo ========================================
echo.

REM Check if venv exists
if not exist venv (
    echo [ERROR] Virtual environment not found!
    echo Please run: setup.bat first
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Start Flask server
echo.
echo Starting Flask server...
echo Press Ctrl+C to stop the server
echo.
echo Server will be available at:
echo   - http://localhost:5000
echo   - http://127.0.0.1:5000
echo.
python api\flask_app.py
