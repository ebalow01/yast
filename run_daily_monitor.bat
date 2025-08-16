@echo off
REM Daily Risk Monitor Batch Script
REM Run this via Windows Task Scheduler for automated daily monitoring

echo Starting Daily Risk Monitor...
echo Date: %date% Time: %time%

cd /d "C:\Users\ebalo\new_dashboard\yast"

REM Run the automated daily monitor
python automated_daily_monitor.py

echo.
echo Daily monitoring complete.
echo Next run scheduled for tomorrow at 9:00 AM
pause