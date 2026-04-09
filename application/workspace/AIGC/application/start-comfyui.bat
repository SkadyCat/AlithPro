@echo off
title ComfyUI - AIGC Workspace
cd /d "%~dp0ComfyUI"
echo ========================================
echo   ComfyUI Starting...
echo   URL: http://127.0.0.1:8188
echo ========================================
python main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc
pause
