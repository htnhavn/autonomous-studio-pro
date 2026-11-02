# ==============================================================================
# 🎬 AUTONOMOUS STUDIO PRO — ONE-CLICK WINDOWS PC LAUNCHER
# Starts Python AI Sidecar (FastAPI + MCP + GPU NVENC) & Desktop Studio (Vite/Tauri)
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🚀 STARTING AUTONOMOUS AI VIDEO STUDIO PRO (WINDOWS 64-BIT / NVENC)" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

# 1. Check Python virtual environment
$VenvPython = Join-Path $WorkspaceRoot "services\ai-sidecar\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = "python"
}

Write-Host "[1/2] 🐍 Launching Python AI Sidecar (WebSocket & MCP on port 8765)..." -ForegroundColor Green
$SidecarJob = Start-Process -FilePath $VenvPython -ArgumentList "services\ai-sidecar\main.py" -WorkingDirectory "$WorkspaceRoot\services\ai-sidecar" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 2. Launch Desktop UI (Vite or Tauri Dev)
Write-Host "[2/2] ⚛️ Launching Desktop Studio UI..." -ForegroundColor Green
Set-Location "$WorkspaceRoot\apps\desktop"

if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
    pnpm run dev
} elseif (Get-Command "npm" -ErrorAction SilentlyContinue) {
    npm run dev
} else {
    Write-Host "❌ Neither pnpm nor npm was found in PATH." -ForegroundColor Red
}

# Stop sidecar when UI exits
if ($SidecarJob -and -not $SidecarJob.HasExited) {
    Stop-Process -Id $SidecarJob.Id -Force
}

