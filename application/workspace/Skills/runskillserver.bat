@echo off
cd /d "%~dp0application"
echo Starting Skill Node Visualizer on port 3220...
node server.js
pause
