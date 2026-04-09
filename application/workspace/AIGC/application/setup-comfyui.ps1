# ComfyUI 部署脚本
# 运行方式：powershell -ExecutionPolicy Bypass -File setup-comfyui.ps1

param(
    [string]$Proxy = "http://127.0.0.1:7897",
    [switch]$SkipProxy
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 配置代理
if (-not $SkipProxy) {
    Write-Host "[INFO] Setting proxy: $Proxy" -ForegroundColor Cyan
    $env:HTTP_PROXY = $Proxy
    $env:HTTPS_PROXY = $Proxy
}

# 克隆 ComfyUI
$comfyDir = Join-Path $ScriptDir "ComfyUI"
if (-not (Test-Path $comfyDir)) {
    Write-Host "[INFO] Cloning ComfyUI..." -ForegroundColor Cyan
    git -c http.proxy=$Proxy clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git $comfyDir
} else {
    Write-Host "[INFO] ComfyUI directory exists, pulling latest..." -ForegroundColor Yellow
    Push-Location $comfyDir
    git pull
    Pop-Location
}

# 步骤 1：安装 PyTorch CUDA（RTX 4070 Ti 需要 CUDA 12.1+）
Write-Host "[INFO] Installing PyTorch with CUDA 12.1 support..." -ForegroundColor Cyan
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 步骤 2：安装 ComfyUI 依赖
Write-Host "[INFO] Installing ComfyUI dependencies..." -ForegroundColor Cyan
Push-Location $comfyDir
pip install -r requirements.txt
Pop-Location

# 步骤 3：安装 ComfyUI-Manager
$managerDir = Join-Path $comfyDir "custom_nodes\ComfyUI-Manager"
if (-not (Test-Path $managerDir)) {
    Write-Host "[INFO] Installing ComfyUI-Manager..." -ForegroundColor Cyan
    git -c http.proxy=$Proxy clone --depth 1 https://github.com/ltdrdata/ComfyUI-Manager.git $managerDir
} else {
    Write-Host "[INFO] ComfyUI-Manager exists, pulling latest..." -ForegroundColor Yellow
    Push-Location $managerDir
    git pull
    Pop-Location
}

# 步骤 4：安装 civitai-dl（可选，失败不阻塞）
Write-Host "[INFO] Installing civitai-dl for model downloads..." -ForegroundColor Cyan
pip install civitai-dl 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] civitai-dl install failed, you can install it manually later" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ComfyUI 部署完成！" -ForegroundColor Green
Write-Host "  启动方式：运行 start-comfyui.bat" -ForegroundColor Green
Write-Host "  访问地址：http://127.0.0.1:8188" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
