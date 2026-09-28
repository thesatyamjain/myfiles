@echo off
title MyFiles Desktop Manager
cd /d "%~dp0"

echo ========================================================
echo Launching MyFiles Standalone Desktop App...
echo ========================================================

:: 1. Clear any orphaned headless Electron instances that have no window open
powershell -NoProfile -Command "$p = @(Get-Process electron -ErrorAction SilentlyContinue); if ($p.Count -gt 0 -and @($p | Where-Object { $_.MainWindowHandle -ne 0 }).Count -eq 0) { $p | Stop-Process -Force -ErrorAction SilentlyContinue }" >nul 2>nul

:: 2. Launch standalone Electron desktop app if available
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" . %*
  exit /b 0
)

where electron >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" electron . %*
  exit /b 0
)

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
  call npm run electron -- %*
  exit /b 0
)

:: 2. Fallback: Local Web Server in Browser if Electron is not installed
echo Electron not found. Starting browser server on http://127.0.0.1:5241...
netstat -ano | findstr :5241 >nul
if %ERRORLEVEL% neq 0 (
  start "MyFiles Server" /b node server.js
  timeout /t 1 /nobreak >nul
)

start http://127.0.0.1:5241
echo Server is running.

