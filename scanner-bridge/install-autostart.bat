@echo off
title SHS Scanner Helper — one-time setup
cd /d "%~dp0.."

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "HELPER_DIR=%LOCALAPPDATA%\SHS\scanner-helper"
if not exist "%HELPER_DIR%" mkdir "%HELPER_DIR%"

> "%HELPER_DIR%\silent-start.vbs" (
  echo Set sh = CreateObject("Wscript.Shell"^)
  echo sh.CurrentDirectory = "%CD%"
  echo sh.Run "cmd /c npx --yes tsx scanner-bridge/server.ts", 0, False
)
copy /Y "%HELPER_DIR%\silent-start.vbs" "%STARTUP%\SHS-Scanner-Helper.vbs" >nul

echo Starting scanner helper...
wscript "%HELPER_DIR%\silent-start.vbs"

echo.
echo Done. Scanner helper will start automatically when you log in to Windows.
echo You can close this window. Scan from the school portal as usual.
echo.
pause
