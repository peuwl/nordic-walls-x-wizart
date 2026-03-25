@echo off
:: Build script for Nordic Walls x WizArt (Windows)
:: Produces: dist\Nordic Walls x WizArt Setup 1.0.0.exe
cd /d "%~dp0"

echo.
echo ====================================================
echo   Nordic Walls x WizArt -- Build Script (Windows)
echo ====================================================
echo.

:: -- 1. Python dependencies ---------------------------------------------------
echo -- Step 1: Installing Python dependencies --
python -m pip install --quiet pyinstaller pillow requests openpyxl
if errorlevel 1 ( echo ERROR: pip install failed & exit /b 1 )
echo   Done

:: -- 2. PyInstaller -----------------------------------------------------------
echo.
echo -- Step 2: Building Python binary --
if exist dist-python rmdir /s /q dist-python

python -m PyInstaller ^
  --onefile ^
  --name run_import ^
  --distpath dist-python ^
  --workpath "%TEMP%\pyinstaller-work-nw" ^
  --specpath "%TEMP%\pyinstaller-spec-nw" ^
  --add-data "templates;templates" ^
  python\run_import.py

if errorlevel 1 ( echo ERROR: PyInstaller failed & exit /b 1 )
echo   Binary ready: dist-python\run_import.exe

:: -- 3. npm install -----------------------------------------------------------
echo.
echo -- Step 3: Installing npm dependencies --
call npm install --quiet
if errorlevel 1 ( echo ERROR: npm install failed & exit /b 1 )
echo   Done

:: -- 4. electron-builder ------------------------------------------------------
echo.
echo -- Step 4: Packaging Electron app --
call npm run build:win
if errorlevel 1 ( echo ERROR: electron-builder failed & exit /b 1 )
echo   App built

:: -- Done ---------------------------------------------------------------------
echo.
echo ====================================================
echo   Done! Installer is ready in: app\dist\
echo ====================================================
echo.
dir dist\*.exe 2>nul
pause
