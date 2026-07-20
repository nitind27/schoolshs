@echo off
title SHS Scanner Bridge
cd /d "%~dp0.."
echo Starting USB Scanner Bridge for Scholarship Portal...
echo Keep this window OPEN while scanning documents.
echo.
call npm run scanner-bridge
pause
