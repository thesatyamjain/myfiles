@echo off
setlocal

echo ================================================================
echo   Restoring Windows File Explorer as Default
echo ================================================================
echo.

echo Resetting Directory shell association...
reg delete "HKCU\Software\Classes\Directory\shell" /ve /f >nul 2>&1
reg delete "HKCU\Software\Classes\Directory\shell\MyFiles" /f >nul 2>&1

echo Resetting Drive shell association...
reg delete "HKCU\Software\Classes\Drive\shell" /ve /f >nul 2>&1
reg delete "HKCU\Software\Classes\Drive\shell\MyFiles" /f >nul 2>&1

echo.
echo ================================================================
echo  [SUCCESS] Windows File Explorer has been restored as default!
echo ================================================================
echo.
pause
