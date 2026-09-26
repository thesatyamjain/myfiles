@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo   Setting MyFiles as Default Windows File Manager
echo ================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "LAUNCHER=%SCRIPT_DIR%launch.vbs"

echo Registering Directory / Folder shell association in HKCU...
reg add "HKCU\Software\Classes\Directory\shell\MyFiles" /ve /d "Open in MyFiles" /f >nul
reg add "HKCU\Software\Classes\Directory\shell\MyFiles\command" /ve /d "wscript.exe \"%LAUNCHER%\" \"%%1\"" /f >nul
reg add "HKCU\Software\Classes\Directory\shell" /ve /d "MyFiles" /f >nul

echo Registering Drive shell association in HKCU...
reg add "HKCU\Software\Classes\Drive\shell\MyFiles" /ve /d "Open in MyFiles" /f >nul
reg add "HKCU\Software\Classes\Drive\shell\MyFiles\command" /ve /d "wscript.exe \"%LAUNCHER%\" \"%%1\"" /f >nul
reg add "HKCU\Software\Classes\Drive\shell" /ve /d "MyFiles" /f >nul

echo.
echo ================================================================
echo  [SUCCESS] MyFiles is now registered as the default file manager!
echo ================================================================
echo.
echo  - Double-clicking any folder will now open MyFiles.
echo  - Opening drives or folder shortcuts will launch MyFiles.
echo  - Running instances will open additional folders as tabs.
echo.
echo  To revert back to Windows Explorer at any time, run:
echo  "%SCRIPT_DIR%restore-windows-explorer.bat"
echo.
pause
