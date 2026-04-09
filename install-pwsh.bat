@echo off
:: Install PowerShell 7 (pwsh) for Copilot CLI
:: Run as Administrator

echo ============================================================
echo  Copilot CLI Fix Tool - Install PowerShell 7 (pwsh)
echo ============================================================
echo.

:: Check if pwsh is already available
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] pwsh is already installed:
    pwsh --version
    echo.
    echo If Copilot CLI still cannot run shell commands:
    echo   - Run fix-pwsh-path.bat as Administrator  (no restart needed)
    echo   - OR close this terminal and open a new one, then restart Copilot CLI
    goto :end
)

echo [INFO] pwsh not found. Installing PowerShell 7 via winget...
echo.

:: Method 1: winget (recommended, available on Windows 10 1709+)
winget --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Installing via winget...
    winget install --id Microsoft.PowerShell --source winget --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [OK] PowerShell 7 installed successfully!
        echo.
        echo Next step: run fix-pwsh-path.bat as Administrator to apply PATH fix
        echo without restarting the terminal.
        goto :end
    )
)

:: Method 2: Manual download fallback
echo.
echo [WARN] winget install failed or unavailable. Download manually:
echo.
echo   https://github.com/PowerShell/PowerShell/releases/latest
echo.
echo Download PowerShell-7.x.x-win-x64.msi and run the installer.
echo During install, check:
echo   [x] Add PowerShell to Path Environment Variable

:end
echo.
pause
