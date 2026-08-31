@echo off
title SHS Scanner Helper
cd /d "%~dp0"
echo Starting scanner helper...
wscript "%~dp0scanner-bridge\silent-start.vbs"
timeout /t 2 /nobreak >nul
echo Scanner helper is running in the background.
echo You can close this window and use Hardware Scanner in the portal.
pause
