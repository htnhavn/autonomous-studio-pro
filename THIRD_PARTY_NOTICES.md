# 📜 THIRD-PARTY NOTICES & ASSET PROVENANCE (`THIRD_PARTY_NOTICES.md`)

This product (**Autonomous Studio Pro**) incorporates or adapts open-source software and shaders under permissive licenses. All GPL-3.0 (`olive-editor/olive`), AGPL-3.0 (`ultralytics` YOLO11), Proprietary/Commercial-restricted (`@remotion/*`), and Non-Commercial (`CC-BY-NC-4.0` large depth weights) components are **strictly excluded** from this application distribution.

---

## 1. BUNDLED & ADAPTED OPEN-SOURCE SOFTWARE

### 1.1 `gl-transitions` (MIT License)
- **Source:** https://github.com/gl-transitions/gl-transitions
- **Copyright:** Copyright (c) 2017-present gl-transitions contributors
- **License:** MIT License
- **Usage:** GLSL transition shader source strings in `packages/shader-library/src/gl-transitions-catalog.ts`.

### 1.2 `poseljacob/agentic-video-editor` (MIT License)
- **Source:** https://github.com/poseljacob/agentic-video-editor
- **Copyright:** Copyright (c) 2026 Jacob Posel
- **License:** MIT License
- **Usage:** Adapted deterministic edit plan, trim refinement, and 5D quality evaluation rubric in `services/ai-sidecar/pipelines/ave_director_bridge.py`.

### 1.3 `WeftCut/WeftCut` (MIT License) & `redotvideo/revideo` (MIT License)
- **Source:** https://github.com/WeftCut/WeftCut & https://github.com/midrender/revideo
- **Copyright:** Copyright (c) 2026 UncleChair (`WeftCut`); Copyright (c) 2022 motion-canvas (`revideo`)
- **License:** MIT License
- **Usage:** Procedural 2D motion template patterns and WebCodecs frame pool patterns.

### 1.4 `storytold/artcraft` (MIT OR Apache-2.0)
- **Source:** https://github.com/storytold/artcraft
- **Copyright:** Copyright (c) 2026 ArtCraft Team
- **License:** Dual licensed under MIT and Apache-2.0
- **Usage:** Integer rational time (`RationalTime`) arithmetic inspiration.

### 1.5 Core Runtime Libraries
- **React & React DOM (`^19.0.0`)**: MIT License — Copyright (c) Meta Platforms, Inc.
- **Zustand (`^5.0.0`)**: MIT License — Copyright (c) Paul Henschel.
- **Lucide Icons (`lucide-react`)**: ISC License — Copyright (c) Lucide Contributors.
- **Tailwind CSS**: MIT License — Copyright (c) Tailwind Labs, Inc.
- **Tokio / Axum / Serde (Rust)**: MIT / Apache-2.0 Licenses.
- **FastAPI / Pydantic / Uvicorn / Pillow (Python)**: MIT / BSD / HPND Licenses.

---

## 2. EXTERNAL PROCESS-ISOLATED TOOLS

- **FFmpeg**: Invoked strictly as an external OS subprocess (`ffmpeg`). Not statically or dynamically linked into application binaries.
- **Auto-Editor (`WyattBlue/auto-editor`)**: Released into the Public Domain (`Unlicense`).
- **WhisperX (`m-bain/whisperX`)**: BSD-2-Clause License (optional isolated transcription worker).
- **DeepFilterNet3 (`Rikorose/DeepFilterNet`)**: MIT OR Apache-2.0 License (optional isolated audio enhancement worker).
- **SAM 2.1 (`facebookresearch/sam2`)**: Apache-2.0 License (optional isolated segmentation worker).
- **Video-Depth-Anything (`Depth-Anything-V2-Small`)**: Apache-2.0 License (strictly restricted to `vits` Small checkpoint).

---

## 3. ASSET PROVENANCE & ATTRIBUTION STRATEGY

Every media asset imported or discovered by Autonomous Studio Pro is recorded in the **Unified Asset Registry (`packages/core-schema/src/asset-registry.ts`)** with:
1. `assetId` and `sha256Hash` content fingerprint.
2. `sourceKind` (`built-in-preasset`, `user-local`, `stock-pexels`, `stock-pixabay`, `stock-unsplash`, `stock-freesound`).
3. `license` (`licenseKind`, `commercialUseAllowed`, `attributionRequired`, `attributionText`, `creatorName`).
4. When exporting a `.vproj` package or publishing a video, the application automatically aggregates all required `attributionText` entries into the project's credits manifest.

