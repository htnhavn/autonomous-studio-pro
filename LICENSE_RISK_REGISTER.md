# ⚖️ PHASE 0: LICENSE INVENTORY & COMMERCIAL RISK REGISTER (`LICENSE_RISK_REGISTER.md`)

> **Audit Date:** 2026-11-03  
> **Scope:** Direct & transitive dependencies, reference repositories, AI model weights, bundled media binaries, shaders, fonts, and stock assets for a commercial Desktop application.

---

## 1. HIGH / CRITICAL RISK ITEMS (BLOCKED FROM CORE BUNDLING)

| Component / Dependency | License | Risk Level | Specific Legal / Commercial Hazard | Mandatory Mitigation Action |
| :--- | :--- | :---: | :--- | :--- |
| **`olive-editor/olive`** (`references/olive`) | **GPL-3.0** | 🔴 **CRITICAL** | Viral copyleft: copying or statically/dynamically linking any C++/GLSL code from `olive` forces the entire desktop application to be distributed under GPL-3.0. | **Strictly `REFERENCE` only.** Zero lines of code or shaders may be copied from `references/olive`. |
| **`YOLO11` (`ultralytics`)** | **AGPL-3.0** | 🔴 **CRITICAL** | Ultralytics licenses YOLO11 under AGPL-3.0 unless a commercial enterprise license is purchased. | **Do not depend on or bundle `ultralytics`.** Replace with Apache-2.0 `RT-DETRv2` / `MediaPipe` or `SAM 2.1` (Apache-2.0) in isolated workers. |
| **`Remotion` (`@remotion/*` inside `references/autobroll`)** | **Remotion License** | 🔴 **HIGH** | Free only for individuals and companies ≤ 3 employees; commercial or automated video-production products require paid per-seat/company licensing. | **Reject `@remotion/*`.** Never import or install Remotion packages. Use our MIT-licensed `MotionEngine` + `StageEngine`. |
| **`Video-Depth-Anything-Large` (`vitl` weights)** | **CC-BY-NC-4.0 (Non-Commercial)** | 🔴 **HIGH** | While the code is Apache-2.0, the `vitl` (Large) weights derive from DINOv2-Giant (`CC-BY-NC-4.0`), prohibiting commercial use. | **Restrict Depth Worker exclusively to `Video-Depth-Anything-Small` (`vits`)**, which is licensed under **Apache-2.0**. |
| **FFmpeg compiled with `--enable-gpl` (`libx264` / `libx265`)** | **GPL-2.0+ / GPL-3.0** | 🟠 **HIGH** | Bundling a GPL-compiled `ffmpeg` binary inside a proprietary installer triggers GPL distribution obligations for the binary and potentially linked wrappers. | 1. Invoke `ffmpeg` strictly via **isolated OS subprocess** (`std::process::Command` / `subprocess.run`), never static C linking.<br>2. For commercial bundling, use an **LGPL-2.1 FFmpeg build** with hardware encoders (`h264_nvenc`, `hevc_nvenc`, `av1_nvenc`, `h264_mf` MediaFoundation on Windows, `h264_videotoolbox` on macOS) or OpenH264 (BSD). |
| **`whisperX` Speaker Diarization (`pyannote.audio`)** | **MIT Code / Gated HuggingFace Weights** | 🟠 **MEDIUM** | `pyannote/speaker-diarization-3.1` requires accepting user terms on HuggingFace; bundling pre-downloaded weights in an installer violates redistribution terms. | Keep `WhisperX` in an optional isolated worker; use `faster-whisper` (MIT + Apache-2.0/MIT CTranslate2) for core transcription/alignment, and require user's own HF token if diarization is enabled. |
| **`yt-dlp` (Referenced in `ShortGPT`)** | **Unlicense (Code) / Platform ToS Risk** | 🟠 **MEDIUM** | Downloading copyrighted third-party YouTube videos without permission violates YouTube Terms of Service. | **Disable arbitrary third-party YouTube scraping.** Only allow importing user-owned local files or licensed stock APIs (Pexels, Pixabay, Unsplash). |

---

## 2. APPROVED / PERMISSIVE DEPENDENCIES INVENTORY

### A. Desktop Application (`apps/desktop` & `packages/*`)
| Package | Version | License | Status |
| :--- | :--- | :---: | :--- |
| `react` / `react-dom` | `^19.0.0` | **MIT** | ✅ Approved |
| `zustand` | `^5.0.0` | **MIT** | ✅ Approved |
| `lucide-react` | `^0.460.0` | **ISC** (MIT-equivalent) | ✅ Approved |
| `tailwindcss` / `postcss` / `autoprefixer` | `^3.4.15` | **MIT** | ✅ Approved |
| `vite` / `typescript` | `^6.0.0` / `^5.6.3` | **MIT** / **Apache-2.0** | ✅ Approved |
| `gl-transitions` (`.glsl` transition shaders) | Commit `3bd19c5` | **MIT** | ✅ Approved (Retain copyright notice in `THIRD_PARTY_NOTICES.md`) |

### B. Rust Native Core & Workers (`apps/desktop/src-tauri`)
| Crate | Version | License | Status |
| :--- | :--- | :---: | :--- |
| `serde` / `serde_json` | `1.0` | **MIT OR Apache-2.0** | ✅ Approved |
| `tokio` / `axum` / `tower-http` | `1.40` / `0.7` / `0.6` | **MIT** | ✅ Approved |
| `anyhow` | `1.0` | **MIT OR Apache-2.0** | ✅ Approved |

### C. Python Workers (`services/ai-sidecar`)
| Package | License | Status & Isolation Rule |
| :--- | :---: | :--- |
| `fastapi` / `uvicorn` / `pydantic` / `websockets` | **MIT** / **BSD-3-Clause** | ✅ Approved |
| `Pillow` (`PIL`) | **MIT-CMU** | ✅ Approved |
| `faster-whisper` / `ctranslate2` | **MIT** | ✅ Approved (Isolated Worker) |
| `DeepFilterNet3` | **MIT OR Apache-2.0** | ✅ Approved (Isolated Worker) |
| `SAM 2.1` (`sam2`) | **Apache-2.0** | ✅ Approved (Isolated Worker) |

---

## 3. STOCK ASSET & FONT PROVENANCE POLICY

Every asset registered in the **Asset Registry (`packages/core-schema/src/asset-registry.ts`)** MUST carry an explicit `licenseInfo` record:
1. **Pexels API**: Free for commercial and non-commercial use; attribution appreciated, redistribution of unaltered stock media as a standalone stock wallpaper product prohibited.
2. **Pixabay API**: Content License (Free for commercial use, no attribution required when integrated into a derivative video).
3. **Unsplash API**: Unsplash License (Free for commercial use; hotlinking/triggering download endpoint required per API guidelines; attribution `Photo by <Name> on Unsplash` stored in `AssetRegistryEntry.attributionText`).
4. **Built-in Pre-Assets (Stickman Rigs, Vector Shapes, Procedural Motion Templates, Built-in SFX)**: 100% first-party original code/vectors authored in this repository (MIT/Proprietary clean-room).
5. **Security & Sandbox Enforcement**:
   - External AI agents **cannot** execute arbitrary shell commands from inside the application.
   - All AI modifications must pass through the typed **Command Gateway** (`CommandEnvelope`) or declarative **Video DSL Compiler**.
   - Local media workers restrict file system reads/writes strictly to the active `.vproj` workspace directory and designated asset cache directory.

