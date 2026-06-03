# Run session reminders every hour (Windows Task Scheduler)
# Schedule: hourly at minute 0
$ErrorActionPreference = "Stop"
$ServerDir = Split-Path -Parent $PSScriptRoot
Set-Location $ServerDir
& "..\.venv\Scripts\python.exe" manage.py send_session_reminders
