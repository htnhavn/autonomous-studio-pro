# =============================================================================
# Script tải trọn bộ các Repo Mã Nguồn Mở Tinh Hoa về thư mục `references/`
# Chạy trên Windows PowerShell: .\scripts\clone-references.ps1
# (Thư mục `references/` dùng để mổ xẻ lấy Shaders, Timeline UI, MCP Tools, AI Pipelines)
# =============================================================================

$ErrorActionPreference = "Continue"
$RefDir = Join-Path $PSScriptRoot "..\references"
New-Item -ItemType Directory -Force -Path $RefDir | Out-Null
Set-Location $RefDir

$Repos = @(
    # 1. Core NLE, Premiere/AfterEffects Rust Clones & CapCut Desktop Replacements
    @{ Name = "artcraft";              Url = "https://github.com/storytold/artcraft.git" },
    @{ Name = "WeftCut";               Url = "https://github.com/WeftCut/WeftCut.git" },
    @{ Name = "Clypra";                Url = "https://github.com/AIEraDev/Clypra.git" },
    @{ Name = "OpenCut";               Url = "https://github.com/OpenCut-app/OpenCut.git" },
    @{ Name = "FableCut";              Url = "https://github.com/ronak-create/FableCut.git" },
    @{ Name = "olive";                 Url = "https://github.com/olive-editor/olive.git" },

    # 2. Shaders, Transitions & Programmatic Motion Graphics (Code-as-Motion)
    @{ Name = "gl-transitions";        Url = "https://github.com/gl-transitions/gl-transitions.git" },
    @{ Name = "revideo";               Url = "https://github.com/midrender/revideo.git" },

    # 3. Autonomous AI Video Agents, B-Roll Hunters & Multi-Agent Pipelines
    @{ Name = "agentic-video-editor";  Url = "https://github.com/poseljacob/agentic-video-editor.git" },
    @{ Name = "autobroll";             Url = "https://github.com/andriidrok1/autobroll.git" },
    @{ Name = "MoneyPrinterTurbo";     Url = "https://github.com/harry0703/MoneyPrinterTurbo.git" },
    @{ Name = "ShortGPT";              Url = "https://github.com/RayVentura/ShortGPT.git" },

    # 4. Audio, Word-Level Captions & Smart Silence Cutting
    @{ Name = "whisperX";              Url = "https://github.com/m-bain/whisperX.git" },
    @{ Name = "auto-editor";           Url = "https://github.com/WyattBlue/auto-editor.git" }
)

foreach ($Repo in $Repos) {
    if (-Not (Test-Path $Repo.Name)) {
        Write-Host ">>> Cloning $($Repo.Name) from $($Repo.Url)..." -ForegroundColor Cyan
        git clone --depth 1 $Repo.Url $Repo.Name
    } else {
        Write-Host ">>> [Skip] $($Repo.Name) already exists in references/" -ForegroundColor Green
    }
}

Write-Host "`n✅ Hoàn tất tải các repo tham khảo vào thư mục references/!" -ForegroundColor Yellow

