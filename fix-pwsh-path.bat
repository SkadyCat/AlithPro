@echo off
:: Fix Copilot CLI "File not found" when pwsh is installed but not found in PATH
:: Creates a pwsh.bat wrapper in System32 - takes effect IMMEDIATELY, no terminal restart needed
:: Run as Administrator

setlocal EnableDelayedExpansion

echo ============================================================
echo  Copilot CLI Fix - pwsh PATH Repair (no restart needed)
echo ============================================================
echo.

:: ---- 1. Locate pwsh.exe ----
set "PWSH_EXE="
for %%D in (
    "C:\Program Files\PowerShell\7"
    "C:\Program Files\PowerShell\7.5.4"
    "C:\Program Files\PowerShell\7.5"
    "C:\Program Files\PowerShell\7.4"
    "C:\Program Files\PowerShell\7.3"
) do (
    if exist "%%~D\pwsh.exe" (
        set "PWSH_EXE=%%~D\pwsh.exe"
        set "PWSH_DIR=%%~D"
    )
)

:: Also try where command
if not defined PWSH_EXE (
    for /f "delims=" %%P in ('where pwsh.exe 2^>nul') do (
        set "PWSH_EXE=%%P"
        for %%F in ("%%P") do set "PWSH_DIR=%%~dpF"
    )
)

if not defined PWSH_EXE (
    echo [ERROR] pwsh.exe not found. Please install PowerShell 7 first:
    echo   Run install-pwsh.bat  OR  winget install --id Microsoft.PowerShell
    pause & exit /b 1
)

echo [OK] Found pwsh: %PWSH_EXE%
echo.

:: ---- 2. Create pwsh.bat wrapper in System32 (immediate effect for all running processes) ----
set "WRAPPER=%SystemRoot%\System32\pwsh.bat"
echo @echo off > "%WRAPPER%"
echo "%PWSH_EXE%" %%* >> "%WRAPPER%"

if exist "%WRAPPER%" (
    echo [OK] Wrapper created: %WRAPPER%
    echo      All running processes (including active Copilot CLI) can now find pwsh.
) else (
    echo [WARN] Cannot write to System32. Please re-run this script as Administrator.
)
echo.

:: ---- 3. Ensure pwsh directory is in the System PATH (permanent) ----
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"

echo %SYS_PATH% | find /i "%PWSH_DIR%" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Adding %PWSH_DIR% to System PATH (permanent)...
    setx /M PATH "%SYS_PATH%;%PWSH_DIR%" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] System PATH updated. New terminal windows will find pwsh automatically.
    ) else (
        echo [WARN] Admin rights required to update System PATH. Re-run as Administrator.
    )
) else (
    echo [OK] %PWSH_DIR% is already in System PATH.
)
echo.

:: ---- 4. Verify ----
echo [TEST] Verifying pwsh is callable...
"%PWSH_EXE%" -NoProfile -Command "Write-Host '[PASS] pwsh version:' $PSVersionTable.PSVersion.ToString()"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Fix complete!
    echo   - Current terminal/Copilot CLI can now use pwsh via the wrapper.
    echo   - New terminals will use pwsh directly from System PATH.
    echo.
    echo If Copilot CLI still reports errors, restart the Copilot CLI process only
    echo (no system restart needed).
) else (
    echo [FAIL] pwsh still cannot run. Check if the installation is complete.
)

:end
echo.
pause
