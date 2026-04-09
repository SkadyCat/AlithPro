@echo off
echo ========================================
echo   Copilot CLI ?????? (wmsxwd)
echo ========================================


set PROXY_PORT=7897

set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%
set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%
set NO_PROXY=localhost,127.0.0.1,.github.com,.githubusercontent.com,*.github.com

copilot --allow-all --model=claude-opus-4.6
