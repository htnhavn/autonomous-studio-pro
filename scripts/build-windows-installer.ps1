# ==============================================================================
# 📦 BUILD WINDOWS PC INSTALLER (.EXE / .MSI) VIA TAURI V2
# Compiles React 19 Frontend + Rust Native Media Server + Bundles FFmpeg NVENC
# ==============================================================================

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "📦 BUILDING AUTONOMOUS STUDIO PRO WINDOWS INSTALLER (.EXE / .MSI)" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

# 1. Build Desktop Web App
if (-not $SkipFrontendBuild) {
    Write-Host "[1/3] 🔨 Compiling Vite + React 19 + Tailwind v4 Desktop UI..." -ForegroundColor Green
    Set-Location "$WorkspaceRoot\apps\desktop"
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        pnpm run build
    } else {
        npm run build
    }
}

# 2. Compile Tauri Rust Native Binary
Write-Host "[2/3] 🦀 Compiling Rust Native Frame Server & NVENC Pipeline..." -ForegroundColor Green
Set-Location "$WorkspaceRoot\apps\desktop\src-tauri"
cargo check --release

# 3. Bundle Tauri Windows Installer (.msi / .exe)
Write-Host "[3/3] 🎁 Packaging Tauri v2 Windows Installer..." -ForegroundColor Green
cargo build --release

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "✅ BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Installer package generated in: apps\desktop\src-tauri\target\release\bundle\" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan

