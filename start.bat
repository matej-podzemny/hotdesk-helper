@echo off
setlocal enabledelayedexpansion

echo Starting Hotdesk Helper...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: Python is not installed or not in PATH
        echo Please install Python 3 and try again
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo Using Python command: !PYTHON_CMD!

REM Check if proxy server file exists
if not exist "proxy_server.py" (
    echo Error: proxy_server.py not found in current directory
    echo Please make sure you're running this script from the hotdesk-helper directory
    pause
    exit /b 1
)

REM Check if index.html exists
if not exist "index.html" (
    echo Error: index.html not found in current directory
    echo Please make sure you're running this script from the hotdesk-helper directory
    pause
    exit /b 1
)

echo Starting proxy server...

REM Start the proxy server in the background
start /b "" !PYTHON_CMD! proxy_server.py
set PROXY_PID=%ERRORLEVEL%

echo Proxy server started
echo Proxy server is running at: http://localhost:3000

REM Wait a moment for the server to start
echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

echo Opening Hotdesk Helper interface...

REM Get the absolute path to index.html
set "HTML_PATH=%CD%\index.html"

REM Open the HTML file in the default browser
start "" "file:///%HTML_PATH:\=/%"

echo.
echo Hotdesk Helper is now ready!
echo.
echo What's running:
echo     Proxy Server: http://localhost:3000
echo     Web Interface: file:///%HTML_PATH:\=/%
echo.
echo Instructions:
echo    1. Configure your email, seat number, and bearer token
echo    2. Select the dates you want to book
echo    3. Click 'Book Now' to submit your reservations
echo.
echo To stop the proxy server, close this window or press Ctrl+C
echo.
echo   Press any key to stop the proxy server and exit
pause >nul

REM Cleanup - kill any python processes (this is a simple approach)
echo.
echo Stopping proxy server...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im python3.exe >nul 2>&1
echo Cleanup complete