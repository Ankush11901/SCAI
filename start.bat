@echo off
REM ============================================================================
REM SCAI Article Generator - One-Click Deployment Script
REM ============================================================================
REM This script checks all dependencies, installs if needed, and launches
REM the application in Chrome browser.
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo    SCAI Article Generator - Deployment Script
echo ============================================================================
echo.

REM Store the script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ============================================================================
REM Step 1: Check Node.js Installation
REM ============================================================================
echo [1/6] Checking Node.js installation...

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 18.17 or higher from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo       Found Node.js %NODE_VERSION%

REM Check Node version is 18+
for /f "tokens=1 delims=v." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 18 (
    echo.
    echo ERROR: Node.js 18.17 or higher is required. You have %NODE_VERSION%
    echo Please update Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM ============================================================================
REM Step 2: Check npm Installation
REM ============================================================================
echo [2/6] Checking npm installation...

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: npm is not installed or not in PATH.
    echo Please reinstall Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo       Found npm v%NPM_VERSION%

REM ============================================================================
REM Step 3: Check/Create Environment File
REM ============================================================================
echo [3/6] Checking environment configuration...

if not exist ".env.local" (
    echo.
    echo WARNING: .env.local file not found!
    echo Creating default configuration...
    echo.
    
    (
        echo # SCAI Article Generator Environment Variables
        echo.
        echo # Authentication - password to access the app
        echo SCAI_PASSWORD=demo123
        echo.
        echo # Google Gemini API Key
        echo # Get your key at: https://aistudio.google.com/app/apikey
        echo GOOGLE_GENERATIVE_AI_API_KEY=
        echo.
        echo # Daily generation quota
        echo DAILY_QUOTA=10
    ) > .env.local
    
    echo       Created .env.local with default settings
    echo.
    echo IMPORTANT: Please edit .env.local and add your GOOGLE_GENERATIVE_AI_API_KEY
    echo.
) else (
    echo       Environment file exists
)

REM ============================================================================
REM Step 4: Install Dependencies
REM ============================================================================
echo [4/6] Checking dependencies...

if not exist "node_modules" (
    echo       Installing dependencies ^(this may take a few minutes^)...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo ERROR: Failed to install dependencies.
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo       Dependencies installed successfully
) else (
    echo       Dependencies already installed
    
    REM Quick check if package.json changed
    call npm ls --depth=0 >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo       Updating dependencies...
        call npm install
    )
)

REM ============================================================================
REM Step 5: Kill any existing process on port 3000
REM ============================================================================
echo [5/6] Preparing server port...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
    echo       Stopping existing process on port 3000...
    taskkill /F /PID %%a >nul 2>nul
)

echo       Port 3000 is ready

REM ============================================================================
REM Step 6: Start Development Server
REM ============================================================================
echo [6/6] Starting development server...
echo.
echo ============================================================================
echo    Application Starting
echo ============================================================================
echo.
echo    URL:      http://localhost:3000
echo    Password: demo123
echo.
echo    The browser will open automatically in 5 seconds...
echo    Press Ctrl+C to stop the server.
echo.
echo ============================================================================
echo.

REM Start browser after delay
start "" cmd /c "timeout /t 5 /nobreak >nul && start chrome http://localhost:3000"

REM Start the development server (this will block)
call npm run dev

REM If we get here, server was stopped
echo.
echo Server stopped.
pause

