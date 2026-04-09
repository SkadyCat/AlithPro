@echo off
:: ============================================================
::  Copilot CLI One-Click PowerShell Fix
::  Handles: not installed + not-in-PATH scenarios
::  Run as Administrator for best results
:: ============================================================

setlocal EnableDelayedExpansion
set "PWSH_EXE="
set "FIXED=0"

echo.
echo ============================================================
echo  Copilot CLI - PowerShell (pwsh) One-Click Fix
echo ============================================================
echo.

:: ---- Step 1: Check if pwsh is already reachable ----
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%P in ('where pwsh 2^>nul') do set "PWSH_EXE=%%P"
    echo [OK] pwsh already in PATH: !PWSH_EXE!
    goto :create_wrapper
)

echo [INFO] pwsh not found in PATH. Searching common install paths...

:: ---- Step 2: Search known installation directories ----
for %%D in (
    "C:\Program Files\PowerShell\7"
    "C:\Program Files\PowerShell\7.5.4"
    "C:\Program Files\PowerShell\7.5.3"
    "C:\Program Files\PowerShell\7.5.2"
    "C:\Program Files\PowerShell\7.5.1"
    "C:\Program Files\PowerShell\7.5.0"
    "C:\Program Files\PowerShell\7.5"
    "C:\Program Files\PowerShell\7.4"
    "C:\Program Files\PowerShell\7.3"
    "C:\Program Files\PowerShell\7.2"
    "%LOCALAPPDATA%\Microsoft\WindowsApps"
) do (
    if exist "%%~D\pwsh.exe" (
        set "PWSH_EXE=%%~D\pwsh.exe"
        set "PWSH_DIR=%%~D"
    )
)

if defined PWSH_EXE (
    echo [OK] Found pwsh at: !PWSH_EXE!
    goto :create_wrapper
)

:: ---- Step 3: Deep search in ProgramFiles ----
echo [INFO] Deep searching Program Files for pwsh.exe...
for /r "C:\Program Files\PowerShell" %%F in (pwsh.exe) do (
    if not defined PWSH_EXE (
        set "PWSH_EXE=%%F"
        for %%X in ("%%F") do set "PWSH_DIR=%%~dpX"
    )
)

if defined PWSH_EXE (
    echo [OK] Found pwsh at: !PWSH_EXE!
    goto :create_wrapper
)

:: ---- Step 4: Install via winget ----
echo [INFO] pwsh not found anywhere. Attempting installation via winget...
echo.

winget --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] winget not available.
    echo.
    echo  Please install PowerShell 7 manually:
    echo    https://github.com/PowerShell/PowerShell/releases/latest
    echo.
    echo  Download: PowerShell-7.x.x-win-x64.msi
    echo  During install, check:  [x] Add PowerShell to Path Environment Variable
    echo.
    goto :end_fail
)

winget install --id Microsoft.PowerShell --source winget --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] winget install failed. Try running as Administrator or download manually.
    goto :end_fail
)

echo [OK] PowerShell 7 installed.

:: Re-locate after install
for %%D in (
    "C:\Program Files\PowerShell\7"
    "C:\Program Files\PowerShell\7.5.4"
    "C:\Program Files\PowerShell\7.5.3"
    "C:\Program Files\PowerShell\7.5.2"
    "C:\Program Files\PowerShell\7.5.1"
    "C:\Program Files\PowerShell\7.5.0"
    "C:\Program Files\PowerShell\7.5"
    "C:\Program Files\PowerShell\7.4"
    "C:\Program Files\PowerShell\7.3"
) do (
    if exist "%%~D\pwsh.exe" (
        set "PWSH_EXE=%%~D\pwsh.exe"
        set "PWSH_DIR=%%~D"
    )
)

if not defined PWSH_EXE (
    echo [ERROR] Could not locate pwsh.exe after installation. Please restart and run fix-pwsh-path.bat.
    goto :end_fail
)

:create_wrapper
:: Extract PWSH_DIR if not already set
if not defined PWSH_DIR (
    for %%F in ("!PWSH_EXE!") do set "PWSH_DIR=%%~dpF"
    :: Remove trailing backslash
    if "!PWSH_DIR:~-1!"=="\" set "PWSH_DIR=!PWSH_DIR:~0,-1!"
)

:: ---- Step 5: Create System32 wrapper (immediate effect, no restart needed) ----
set "WRAPPER=%SystemRoot%\System32\pwsh.bat"
echo @echo off > "%WRAPPER%"
echo "!PWSH_EXE!" %%* >> "%WRAPPER%"

if exist "%WRAPPER%" (
    echo [OK] Wrapper created: %WRAPPER%
    echo      Active Copilot CLI can now find pwsh immediately.
) else (
    echo [WARN] Cannot write to System32. Please re-run this script as Administrator.
)

:: ---- Step 6: Update System PATH (permanent) ----
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"

echo !SYS_PATH! | find /i "!PWSH_DIR!" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Adding !PWSH_DIR! to System PATH...
    setx /M PATH "!SYS_PATH!;!PWSH_DIR!" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] System PATH updated permanently.
    ) else (
        echo [WARN] Could not update System PATH (needs Admin). Wrapper still active.
    )
) else (
    echo [OK] !PWSH_DIR! already in System PATH.
)

:: ---- Step 7: Verify ----
echo.
echo [TEST] Verifying pwsh is callable...
"!PWSH_EXE!" -NoProfile -Command "Write-Host '[PASS] pwsh' $PSVersionTable.PSVersion.ToString() 'is working!'"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo  SUCCESS! PowerShell is now available.
    echo.
    echo  * Copilot CLI in this terminal: FIXED (via System32 wrapper)
    echo  * New terminals: will use pwsh from System PATH
    echo.
    echo  If Copilot CLI still shows errors, restart the Copilot CLI
    echo  process only (no system restart required).
    echo ============================================================
    set "FIXED=1"
) else (
    echo [FAIL] pwsh still fails to run. Check installation integrity.
)
goto :end

:end_fail
echo.
echo ============================================================
echo  MANUAL STEPS REQUIRED:
echo  1. Download PowerShell 7 MSI from:
echo     https://github.com/PowerShell/PowerShell/releases/latest
echo  2. Install with "Add PowerShell to Path" checked
echo  3. Re-run this script
echo ============================================================

:end
echo.
pause
