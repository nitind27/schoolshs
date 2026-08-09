@echo off
title SHS Scanner Bridge
cd /d "%~dp0.."
echo Starting Scanner Bridge (USB + Wi-Fi) for Scholarship Portal...
echo Keep this window OPEN while scanning documents.
echo.
call npm run scanner-bridge
pause
