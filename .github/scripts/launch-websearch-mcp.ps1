param(
    [switch]$PrintOnly
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$appRoot = Join-Path $repoRoot 'application\workspace\WebSearch\application'
$serverRoot = Join-Path $appRoot 'web-search-mcp'
$entrypoint = Join-Path $appRoot 'web-search-mcp-wrapper.mjs'

if (-not (Test-Path $entrypoint)) {
    throw "WebSearch wrapper not found: $entrypoint"
}

if (-not (Test-Path $serverRoot)) {
    throw "WebSearch server directory not found: $serverRoot"
}

if ($PrintOnly) {
    [pscustomobject]@{
        repoRoot   = [string]$repoRoot
        appRoot    = $appRoot
        serverRoot = $serverRoot
        entrypoint = $entrypoint
    } | ConvertTo-Json -Compress
    exit 0
}

if (-not $env:BROWSER_HEADLESS) { $env:BROWSER_HEADLESS = 'true' }
if (-not $env:MAX_BROWSERS) { $env:MAX_BROWSERS = '2' }
if (-not $env:DEFAULT_TIMEOUT) { $env:DEFAULT_TIMEOUT = '6000' }
if (-not $env:MAX_CONTENT_LENGTH) { $env:MAX_CONTENT_LENGTH = '12000' }

Push-Location $serverRoot
try {
    & node $entrypoint
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
