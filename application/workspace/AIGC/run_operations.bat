@echo off
cd /d "E:\Alith2\AlithEx\application\workspace\AIGC"

echo Step 1: Creating inprocess directory...
mkdir "inprocess" 2>nul
echo. 

echo Step 2: Copying file...
copy "sessions\msg-2026-04-07T12-47-01-442Z.md" "inprocess\msg-2026-04-07T12-47-01-442Z.md"
echo.

echo Step 3: Deleting original file...
del "sessions\msg-2026-04-07T12-47-01-442Z.md"
echo.

echo Step 4: Appending to log...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set timestamp=%mydate%-%mytime%

echo [%timestamp%] [INFO] Agent started. Active workspace: AIGC (local-workspace mode). >> logs\agent-realtime.log
echo [%timestamp%] [TASK_DETECTED] Found task: msg-2026-04-07T12-47-01-442Z.md >> logs\agent-realtime.log
echo [%timestamp%] [TASK_START] Processing: AIGC self-check >> logs\agent-realtime.log

echo.
echo All operations completed!
