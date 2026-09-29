@echo off
title MyFiles Desktop Manager
cd /d "%~dp0"

echo ========================================================
echo Launching MyFiles Desktop Application...
echo ========================================================

:: 1. Launch via local bundled electron if available
if exist "%~dp0node_modules\electron\dist\electron.exe" (
  start "" /d "%~dp0" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0." %*
  exit /b 0
)

:: 2. Launch installed MyFiles desktop app if available
if exist "%LOCALAPPDATA%\Programs\MyFiles\MyFiles.exe" (
  start "" /d "%LOCALAPPDATA%\Programs\MyFiles" "%LOCALAPPDATA%\Programs\MyFiles\MyFiles.exe" %*
  exit /b 0
)

:: 3. Launch via system electron if available
where electron >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" electron "%~dp0." %*
  exit /b 0
)

:: 4. Launch via npm start
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
  call npm start -- %*
  exit /b 0
)

:: 5. Fallback: Local Web Server in Browser if Electron is not installed
echo Electron not found. Starting browser server on http://127.0.0.1:5241...
netstat -ano | findstr :5241 >nul
if %ERRORLEVEL% neq 0 (
  start "MyFiles Server" /b node server.js
  timeout /t 1 /nobreak >nul
)

start http://127.0.0.1:5241
echo Server is running.
