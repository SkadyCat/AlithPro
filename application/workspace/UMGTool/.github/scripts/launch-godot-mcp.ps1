param(
    [switch]$PrintOnly
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$serverRoot = Join-Path $repoRoot 'application\godot-mcp'
$entrypoint = Join-Path $serverRoot 'build\index.js'

if (-not (Test-Path $serverRoot)) {
    throw "Godot MCP server directory not found: $serverRoot"
}

if (-not (Test-Path $entrypoint)) {
    throw "Godot MCP entrypoint not found: $entrypoint"
}

if (-not $env:GODOT_PATH) {
    $env:GODOT_PATH = 'C:\Users\罗长生\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.6.2-stable_win64_console.exe'
}

if (-not $env:DEBUG) {
    $env:DEBUG = 'true'
}

if ($PrintOnly) {
    [pscustomobject]@{
        repoRoot = [string]$repoRoot
        serverRoot = $serverRoot
        entrypoint = $entrypoint
        godotPath = $env:GODOT_PATH
    } | ConvertTo-Json -Compress
    exit 0
}

Push-Location $serverRoot
try {
    & node $entrypoint
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
