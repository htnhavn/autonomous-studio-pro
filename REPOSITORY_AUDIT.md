# 📚 PHASE 0: INDEPENDENT AUDIT OF 14 REFERENCE REPOSITORIES & SUPPLEMENTARY TECH (`REPOSITORY_AUDIT.md`)

> **Audit Date:** 2026-11-03  
> **Ground Truth:** Every repository in `references/` was inspected at its actual checked-out Git commit, manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, `ae.nimble`, `CMakeLists.txt`), and `LICENSE` file.

---

## 1. THE 14 CLONED REFERENCE REPOSITORIES — GROUND-TRUTH AUDIT & DECISIONS

| # | Repository | Checked-Out Commit & Date | Stack & Build System | Verified License | Core Capabilities | Integration Complexity | Commercial License Risk | Final Decision | Architectural Role in Autonomous Studio Pro |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | **`storytold/artcraft`** (`references/artcraft`) | `1f969a9` (2026-10-23) | Pure Rust (`egui`, `wgpu`, `Cargo.toml` workspace) | **MIT / Apache-2.0** (Dual) | Integer `RationalTime` math, Rust media/timeline crates, native GPU compositing patterns. | High (if embedding `egui`), Low (adapting time/timeline math) | **LOW** | **`ADAPT`** | Adapt integer `RationalTime` arithmetic and Rust media worker patterns. Do **not** adopt its `egui` UI. |
| 2 | **`WeftCut/WeftCut`** (`references/WeftCut`) | `b8541b6` (2026-11-02) | TypeScript, Electron, React, WebCodecs, MCP | **MIT** | AI-agent-driven NLE, MCP tool patterns, `Motifs` procedural 2D canvas motion templates, WebCodecs frame pool. | Low–Medium | **LOW** | **`ADAPT`** | Adapt procedural `Motifs` motion preset concepts and WebCodecs decoder pool behind our `MotionEngine` and `MediaEngine` adapters. |
| 3 | **`AIEraDev/Clypra`** (`references/Clypra`) | `b6cbc1f` (2026-11-01) | Rust, Tauri v2, React 19 (`@clypra-studio/engine`) | **MIT** | Hardware-accelerated Tauri v2 + React 19 NLE layout, color picker, engine-UI separation. | Medium | **LOW** | **`REFERENCE`** | Use as UX/layout reference for Tauri v2 + React 19 inspector/color panels. Do **not** import `@clypra-studio/types` as a second timeline model. |
| 4 | **`OpenCut-app/OpenCut`** (`references/OpenCut`) | `e668010` (2026-09-24) | Rust (`edition = "2024"`, `gpui = "0.2.2"`) | **MIT** | Native GPU UI (`gpui`) NLE workspace. | High (incompatible UI framework `gpui` vs React) | **LOW** | **`REFERENCE`** | Reference only for timeline UX ergonomics. Reject code integration because mixing `gpui` with React/Tauri is redundant. |
| 5 | **`ronak-create/FableCut`** (`references/FableCut`) | `579b08e` (2026-10-30) | Vanilla JS (`app.js`, `analyze.js`, `audio-fx.js`, `beats.js`) | **MIT** | Browser-based AI agent command dispatch, lightweight WebAudio beat/FX helpers. | Low | **LOW** | **`REFERENCE`** | Reference for lightweight browser audio-FX and beat-marker heuristics. Do **not** copy its untyped vanilla JS state into our TypeScript store. |
| 6 | **`gl-transitions/gl-transitions`** (`references/gl-transitions`) | `3bd19c5` (2026-11-02) | GLSL Shaders + JS/Rust (`crates/`, `packages/`) | **MIT** | 65+ standardized GLSL `vec4 transition(vec2 uv)` shaders (`crosswarp`, `directionalwipe`, `Dreamy`, `GlitchDisplace`, etc.). | Low | **LOW** | **`ADOPT`** | Adopt the pure `.glsl` transition shaders into `packages/shader-library` under a unified transition contract. |
| 7 | **`redotvideo/revideo`** (`references/revideo`) | `b5de67a` (2026-07-15) | TypeScript monorepo (Fork of Motion Canvas) | **MIT** | Procedural 2D vector animation, generator coroutines, audio-synced timelines, headless rendering. | Medium | **LOW** (MIT, unlike Remotion!) | **`ADAPT`** | Adapt Motion Canvas / Revideo signal, tweening, easing, and scene-graph concepts into our declarative `SceneComposition` & `MotionEngine`. |
| 8 | **`poseljacob/agentic-video-editor`** (`references/agentic-video-editor`) | `47248b5` (2026-04-14) | Python `>=3.11` (`google-adk`, `pydantic`, FFmpeg) | **MIT** | Multi-agent `Director` -> `TrimRefiner` -> `Reviewer` (5D rubric: adherence, pacing, visual quality, watchability) & structured `EditPlan`. | Low | **LOW** | **`ADAPT`** | Adapt `EditPlan`, `TrimRefiner`, and 5D `Reviewer` rubric into our deterministic **Batch Production Planner & Visual QA Framework**. |
| 9 | **`andriidrok1/autobroll`** (`references/autobroll`) | `4aef3af` (2026-09-29) | TypeScript, `@modelcontextprotocol/sdk`, **Remotion** | Repo is **MIT**, but depends on **`@remotion/*` (Proprietary Remotion License)** | Transcript-to-B-Roll semantic cue matching, silence cutting, MCP server tools. | Low (for B-roll matching logic) | **HIGH (if `@remotion/*` is kept)** | **`ADAPT` (Logic Only) / `REJECT` (Remotion Deps)** | Adapt only the pure transcript-to-B-Roll matching heuristics. **Strictly reject** its `@remotion/*` dependencies due to Remotion's commercial license. |
| 10 | **`harry0703/MoneyPrinterTurbo`** (`references/MoneyPrinterTurbo`) | `84e99b3` (2026-11-02) | Python (`pyproject.toml`, `uv.lock`, FastAPI) | **MIT** | Multi-provider stock asset harvesting (Pexels, Pixabay), TTS generation, subtitle alignment, batch short-video workflow. | Low | **LOW** | **`ADAPT`** | Adapt stock asset search/download patterns into our `AssetDiscoveryWorker` (behind our `AssetRegistry` with license & hash tracking). |
| 11 | **`RayVentura/ShortGPT`** (`references/ShortGPT`) | `3df4e0f` (2025-02-10) | Python (`openai==1.37.0`, `gradio`, `tinydb`, `yt-dlp`) | **MIT** | Declarative JSON `EditingStep` templates and automated voiceover-driven assembly. | High (outdated pinned deps from early 2025) | **MEDIUM** (`yt-dlp` ToS risks if scraping) | **`REFERENCE` / `REJECT` (Code)** | Use only as conceptual inspiration for declarative scene templates. **Reject** code/dependency integration due to outdated dependencies and `yt-dlp` scraping risk. |
| 12 | **`m-bain/whisperX`** (`references/whisperX`) | `5d3678b` (2026-10-22) | Python (`faster-whisper`, `torch`, `pyannote-audio`) | **BSD-2-Clause** (Code) / **Gated Model Weights** (`pyannote`) | Word-level ASR transcription and phoneme-level forced alignment. | Medium (heavy PyTorch/CUDA runtime) | **LOW–MEDIUM** (Check model weight licenses) | **`ISOLATE`** | Run strictly as an **optional isolated background worker** (`TranscriptionWorker`) communicating via JSON contract. Never bundle heavy PyTorch into the base editor. |
| 13 | **`WyattBlue/auto-editor`** (`references/auto-editor`) | `56a7866` (2026-11-01) | Nim (`ae.nimble`, `nim >= 2.2.2`, FFmpeg) | **Unlicense (Public Domain)** | Fast acoustic/motion silence & dead-air detection, outputs cut lists / OpenTimelineIO. | Low (CLI worker or algorithm port) | **NONE** (Public Domain) | **`ISOLATE` / `ADAPT`** | Run as an isolated CLI worker or use our pure RMS/dBFS silence detector in `SilenceDetectionWorker`. |
| 14 | **`olive-editor/olive`** (`references/olive`) | `7e0e94a` (2024-12-05) | C++17, Qt, OpenGL, OpenColorIO (`CMakeLists.txt`) | **GPL-3.0** | Node-based compositing, linear-light color pipeline, professional timeline trimming UX. | Very High (C++/Qt monolith) | **CRITICAL (GPL-3.0 Viral Copyleft)** | **`REFERENCE` ONLY** | **Never copy or link code from `olive`** to avoid GPL-3.0 infection. Use strictly as clean-room UX/architectural inspiration for color grading & node concepts. |

---

## 2. WEIGHTED SCORECARD OF THE 14 REFERENCE REPOSITORIES (SCALE 1–10)

Weights:
- **Functional Value (25%)**
- **Architectural Fit with Unified Model (20%)**
- **Code Quality & Maintenance (15%)**
- **Low Integration Cost (20%)**
- **Commercial License Safety (20%)**

| Repository | Functional (25%) | Arch Fit (20%) | Maintenance (15%) | Low Int. Cost (20%) | License Safety (20%) | **Weighted Score (/10)** | Decision |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`gl-transitions`** | 9.5 | 9.5 | 8.5 | 9.5 | 10.0 | **9.45** | `ADOPT` |
| **`poseljacob/agentic-video-editor`** | 9.0 | 9.0 | 8.5 | 9.0 | 10.0 | **9.13** | `ADAPT` |
| **`redotvideo/revideo`** | 9.0 | 8.5 | 8.5 | 8.0 | 10.0 | **8.83** | `ADAPT` |
| **`WeftCut/WeftCut`** | 8.5 | 8.5 | 8.5 | 8.0 | 10.0 | **8.70** | `ADAPT` |
| **`WyattBlue/auto-editor`** | 8.5 | 8.0 | 9.0 | 8.5 | 10.0 | **8.78** | `ISOLATE` / `ADAPT` |
| **`harry0703/MoneyPrinterTurbo`** | 8.5 | 7.5 | 8.5 | 8.0 | 10.0 | **8.50** | `ADAPT` |
| **`storytold/artcraft`** | 8.0 | 8.0 | 8.5 | 6.5 | 10.0 | **8.18** | `ADAPT` (Math/Crates) |
| **`m-bain/whisperX`** | 9.5 | 7.5 | 8.5 | 6.5 | 8.0 | **8.05** | `ISOLATE` |
| **`AIEraDev/Clypra`** | 8.0 | 7.0 | 8.0 | 6.0 | 10.0 | **7.80** | `REFERENCE` |
| **`andriidrok1/autobroll`** | 8.0 | 7.5 | 7.5 | 7.5 | 4.0 (Remotion) | **6.93** | `ADAPT` (No Remotion) |
| **`ronak-create/FableCut`** | 6.5 | 5.5 | 7.0 | 7.0 | 10.0 | **7.18** | `REFERENCE` |
| **`OpenCut-app/OpenCut`** | 7.0 | 4.0 (`gpui`) | 7.5 | 3.0 | 10.0 | **6.28** | `REFERENCE` |
| **`RayVentura/ShortGPT`** | 6.5 | 5.0 | 4.0 (Stale) | 4.5 | 7.0 | **5.53** | `REJECT` (Code) |
| **`olive-editor/olive`** | 9.0 | 5.0 (C++/Qt) | 6.0 | 2.0 | 1.0 (GPL-3.0) | **4.75** | `REFERENCE` ONLY |

---

## 3. AUDIT OF SUPPLEMENTARY AI & AUDIO COMPONENTS

| Component | License (Code & Weights) | Runtime Footprint | Maintenance & Stability | Commercial Risk | Decision & Architecture Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SAM 2.1 (`facebookresearch/sam2`)** | **Apache-2.0** (both code and SAM 2.1 checkpoints) | Heavy (~150MB–900MB weights, requires CUDA/MPS/ONNX) | Actively maintained by Meta FAIR | **LOW** | **`ISOLATE` (Phase 5 Worker)** — Run in an optional isolated `SegmentationWorker` subprocess. Never block core editing if absent. |
| **Video-Depth-Anything** | Code: **Apache-2.0**. Weights: **Small (`vits`) is Apache-2.0**, but **Large (`vitl`) is CC-BY-NC-4.0 (Non-Commercial!)** | Medium–Heavy (~110MB for `vits`) | Active | **HIGH if `vitl` weights used; LOW if restricted to `vits` Apache-2.0** | **`ISOLATE` (Phase 5 Worker)** — Strictly pin and allow only the **Apache-2.0 `Video-Depth-Anything-Small` (`vits`)** checkpoint in commercial builds. |
| **YOLO11 (`ultralytics`)** | **AGPL-3.0** (Requires paid Ultralytics Enterprise License for commercial distribution!) | Medium (~10–50MB) | Active, but aggressive commercial licensing | **CRITICAL (AGPL-3.0)** | **`REPLACE` / `REJECT`** — Do **not** bundle AGPL `ultralytics` YOLO11. For smart auto-reframe and object detection, use **Apache-2.0** alternatives (`MediaPipe` Face/Pose Detector, `RT-DETRv2`, or `SAM 2.1`). |
| **Demucs (`facebookresearch/demucs`)** | **MIT** | Heavy (~300MB PyTorch) | **ARCHIVED / UNMAINTAINED** (Meta archived repo in 2023) | **LOW (License), HIGH (Bitrot/Maintenance)** | **`ISOLATE` & ABSTRACT** — Do not hardcode `demucs` as a direct dependency. Define an `AudioSeparationWorker` contract that can run ONNX stem separation or `DeepFilterNet3` without breaking when PyTorch versions advance. |
| **DeepFilterNet3 (`Rikorose/DeepFilterNet`)** | **MIT / Apache-2.0** (Dual) | Lightweight (~15MB, native Rust `tract` CLI & LADSPA plugin available!) | Stable, Rust-native execution | **LOW** | **`ISOLATE` / `ADOPT` (Worker)** — Ideal local speech denoising worker because its Rust CLI (`deep-filter`) runs fast on CPU without requiring a massive CUDA/PyTorch environment. |

---

## 4. AUDIT OF CANDIDATE TECHNOLOGIES (SECTION 5)

| Candidate Technology | License | Architectural Evaluation | Final Decision |
| :--- | :--- | :--- | :--- |
| **Motion Canvas (`motion-canvas`)** | **MIT** | Superior procedural 2D vector animation & scene sequencing architecture compared to Remotion, with 100% permissive MIT licensing (also the foundation of `revideo`). | **`ADAPT`** — Adopt its declarative scene graph, keyframe signal/tween curves, and audio-cue synchronization patterns inside our `MotionEngine` and `VideoDSL`. |
| **Remotion (`remotion-dev/remotion`)** | **Remotion License (Proprietary/Commercial Restrictions)** | Requires paid company licensing for teams >3 or commercial automated video generation platforms. Pulls in heavy Chromium bundle per render. | **`REJECT`** — Do not adopt Remotion. Our combination of `MotionEngine` (MIT) + `StickmanStageEngine` + native renderer achieves deterministic local rendering with zero licensing fees. |
| **OpenTimelineIO (`AcademySoftwareFoundation/OpenTimelineIO`)** | **Apache-2.0** | Industry-standard NLE interchange format (Pixar/ASWF). Supports Tracks, Clips, Gaps, Transitions, Markers, and `RationalTime`. | **`ADOPT` (As Interchange Adapter Only)** — Provide clean `.otio` import/export converters in `packages/core-schema`, while keeping `.vproj` as our richer authoritative project model (which also stores Video DSL, Character Rigs, Visual Index, and QA Reports). |
| **Blender (`blender.org`)** | **GPL-2.0+** (Application) / **Output is unrestricted** | Running Blender headlessly via CLI (`blender -b -P worker_script.py`) over a JSON + glTF/GLB contract is complete process isolation (no GPL linkage to our app). | **`DEFER` to Phase 6 (`ISOLATE` Contract Now)** — Define the extensible 3D Scene & Camera Adapter contract (`Scene3DWorkerContract`) in Phase 1, and defer full Blender execution to Phase 6. |
| **OpenToonz (`opentoonz/opentoonz`)** | **Modified BSD** | Monolithic C++/Qt desktop app (`toonz/`). Embedding it is brittle and heavy; its useful concept is Xsheet/exposure-sheet pose timing and skeleton bone pinning. | **`REFERENCE` Only (Reject Embedding)** — Implement exposure-sheet pose timing and reusable bone/anchor rigging directly in our native **Character & Stickman Library** (`packages/stage-engine`). |

---

## 5. OVERLAP RESOLUTION MATRIX (PREVENTING "14 SUBSYSTEMS" FRAGMENTATION)

To enforce **Non-Negotiable Rule #1** (*"Never let the 14 repositories become 14 independent subsystems"*), here is the strict single-owner resolution for every overlapping domain:

| Overlapping Domain | Competing Repos in `references/` | Single Authoritative Subsystem in Our App | What Happens to the Rest? |
| :--- | :--- | :--- | :--- |
| **Project & Timeline Data Model** | `Clypra`, `WeftCut`, `OpenCut`, `FableCut`, `artcraft`, `olive` | **`packages/core-schema` (Unified Project Model v2 + `.vproj`)** | All external repo timeline schemas are **rejected** as internal models. Only `OpenTimelineIO` is supported as an import/export adapter. |
| **2D Motion Graphics & Templates** | `WeftCut` (`Motifs`), `revideo`, `autobroll` (Remotion), `ShortGPT` | **`packages/motion-engine` + `packages/stage-engine` (Driven by Video DSL)** | Remotion (`autobroll`) and `ShortGPT` are **rejected**. `WeftCut` and `revideo` patterns are unified under one `SceneComposition` contract. |
| **Transitions & Shaders** | `gl-transitions`, `Clypra`, `olive` | **`packages/shader-library`** | Standardize on `gl-transitions` GLSL format + uniform parameter schema. |
| **AI Director & B-Roll Planning** | `agentic-video-editor`, `autobroll`, `MoneyPrinterTurbo`, `ShortGPT` | **Video DSL Compiler + Batch Production DAG (`packages/core-schema` & `services/ai-sidecar`)** | AI compiles prompts into **one `VideoDSL` specification**, which compiles into **validated `CommandGateway` commands**. |
| **Silence Cutting & Rough Cut** | `auto-editor`, `autobroll`, `whisperX` | **`SilenceDetectionWorker` + `TranscriptionWorker` Contracts** | Workers return time ranges (`RationalTimeRange[]`); only the `CommandGateway` executes `SplitClip` / `DeleteClip` on the timeline. |

