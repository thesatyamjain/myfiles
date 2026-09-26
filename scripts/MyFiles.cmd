@echo off
setlocal
cd /d "%~dp0\.."
if "%~1"=="" (
    npm run electron
) else (
    npm run electron -- "%~1"
)
