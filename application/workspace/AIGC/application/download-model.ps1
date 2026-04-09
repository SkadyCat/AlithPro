# Civitai 模型下载辅助脚本
# 用法：powershell -File download-model.ps1 -ModelId <id> -Type checkpoint
#       powershell -File download-model.ps1 -Url "https://civitai.com/api/download/models/<vid>"

param(
    [string]$ModelId,
    [string]$Url,
    [ValidateSet("checkpoint","lora","vae","controlnet","embedding","upscaler")]
    [string]$Type = "checkpoint",
    [string]$Proxy = "http://127.0.0.1:7897"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComfyDir = Join-Path $ScriptDir "ComfyUI"

$typeMap = @{
    "checkpoint" = "checkpoints"
    "lora"       = "loras"
    "vae"        = "vae"
    "controlnet" = "controlnet"
    "embedding"  = "embeddings"
    "upscaler"   = "upscale_models"
}

$targetDir = Join-Path $ComfyDir "models\$($typeMap[$Type])"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$env:HTTP_PROXY = $Proxy
$env:HTTPS_PROXY = $Proxy

if ($ModelId) {
    Write-Host "[INFO] Downloading model $ModelId (type: $Type) via civitai-dl..." -ForegroundColor Cyan
    civitai-dl download model $ModelId --dir $targetDir
} elseif ($Url) {
    $apiKey = $env:CIVITAI_API_KEY
    if ($apiKey) { $Url = "$Url`?token=$apiKey" }
    $fileName = "model_$(Get-Date -Format 'yyyyMMdd_HHmmss').safetensors"
    $outPath = Join-Path $targetDir $fileName
    Write-Host "[INFO] Downloading from URL to $outPath..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $Url -OutFile $outPath -Proxy $Proxy
    Write-Host "[DONE] Saved to $outPath" -ForegroundColor Green
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  download-model.ps1 -ModelId 12345 -Type checkpoint" -ForegroundColor White
    Write-Host "  download-model.ps1 -Url 'https://civitai.com/api/download/models/...' -Type lora" -ForegroundColor White
}
