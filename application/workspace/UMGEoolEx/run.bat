@echo off
echo ========================================
echo   GitHub Copilot CLI launcher (wmsxwd)
echo ========================================

:: Keep this file in CRLF format so cmd.exe reads each command correctly.
:: If your proxy port differs, update PROXY_PORT below.
set PROXY_PORT=7897

:: Configure proxy
set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%
set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%
set NO_PROXY=localhost,127.0.0.1,.github.com,.githubusercontent.com,*.github.com

copilot --allow-all --model=claude-opus-4.6
