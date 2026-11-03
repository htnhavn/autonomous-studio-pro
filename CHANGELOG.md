# 📝 PROJECT CHANGELOG (`CHANGELOG.md`)

All notable changes, architectural pivots, and milestone releases for **Autonomous Studio Pro** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-phase1] - 2026-11-03
### Added
- **Phase 0 Ground-Truth Codebase & Architecture Audit:**
  - `ARCHITECTURE_AUDIT.md`: Complete line-by-line classification of all 84 project files.
  - `REPOSITORY_AUDIT.md`: In-depth analysis of 14 reference repositories in `references/`.
  - `LICENSE_RISK_REGISTER.md`: Strict legal boundary ensuring zero GPL viral contamination of commercial core.
  - `DEPENDENCY_GRAPH.md`: Comprehensive package and process dependency topology.
  - `CURRENT_SYSTEM_MAP.md`: High-level system map of verified and planned capabilities.
- **Phase 1 Architecture Specifications (Nine Authoritative Standards):**
  - `ARCHITECTURE.md`: Modular Monolith + Isolated Workers, Dual Execution Modes (Mode A: Live AI, Mode B: Batch DAG), and the 4 Inviolable Invariants.
  - `PROJECT_MODEL.md`: Unified Project Model v2 with RationalTime integer ticks, sequences, gaps, and DaVinci color grading.
  - `VIDEO_DSL_SPEC.md`: Declarative Video DSL v1.0 schema with Prompt Blueprints for 0-token and low-token video generation.
  - `COMMAND_CONTRACTS.md`: 18 standard commands for the Command Gateway with optimistic concurrency control and atomic undo/redo.
  - `ASSET_REGISTRY_SPEC.md`: Content-addressable SHA-256 storage, license tracking, and proxy/waveform pipelines.
  - `WORKER_CONTRACTS.md`: Out-of-process worker protocol for Media Probe, Audio Analysis, Transcription, and Native Render.
  - `AI_EXECUTION_SPEC.md`: Mode A interactive pair-editing and Mode B batch DAG state machine with partial rebuilds.
  - `PROJECT_PACKAGE_SPEC.md`: Machine-readable `.vproj` package layout and the 7-method Selective AI Context API (`ai_context.json`).
  - `IMPLEMENTATION_STATUS.md`: Authoritative implementation matrix across all subsystems.
- **Real Worker Logic Implementations:**
  - `apps/desktop/src-tauri/src/ffmpeg_render.rs`: Upgraded from stub to real FFmpeg multi-input `-i` and `-filter_complex` builder with `-14.0 LUFS` loudness normalization and unit test coverage.
  - `services/ai-sidecar/pipelines/audio_studio.py`: Upgraded from static mock arrays to real Python standard `wave` + `struct` windowed RMS silence detection and musical energy onset beat tracking.

---

## [1.5.0] - 2026-11-02
### Added
- **Dual-Transport External Agent Bridge:**
  - `scripts/studio_agent_cli.py`: Universal command-line tool allowing VS Code, Cursor, and Claude Code to drive the Studio timeline.
  - `services/ai-sidecar/mcp_stdio_bridge.py`: Native stdio JSON-RPC 2.0 MCP server.
  - `apps/desktop/src/components/agent-hud/ExternalAgentConnectModal.tsx`: Visual hub for monitoring external agent telemetry, testing 1-click commands, and copying SOP prompts.
  - `apps/desktop/src/hooks/useSidecarSocket.ts`: Dual polling (350ms `/live-agent-bridge.json` + WebSocket `8765`).
- **60fps Playback Engine:**
  - `apps/desktop/src/hooks/usePlaybackEngine.ts`: Hardware-accelerated `requestAnimationFrame` clock with global spacebar play/pause.
- **Hardware Export Modal:**
  - `apps/desktop/src/components/export/ExportPublishModal.tsx`: 4K NVIDIA NVENC / ProRes export selector, CTR thumbnail variants, and automated YouTube chapter generator.

---

## [1.0.0] - 2026-11-02
### Added
- **0-Token 2D Stickman Stage Studio:**
  - `packages/stage-engine/src/puppet-rig.ts`: 18 skeletal move-sets with 2D bone kinematics.
  - `packages/stage-engine/src/camera-choreography.ts`: 12 2.5D multi-plane camera choreography rigs.
  - `packages/stage-engine/src/genre-kits.ts`: 3 Genre Kits (Economics, Universe, Deep Lore) with 0-token deterministic script compiler.
  - `apps/desktop/src/components/stage-studio/StickmanStageRenderer.tsx`: Real-time SVG skeletal renderer with hand props, expressions, and atmospheric particles.
- **Pro NLE Interactive Timeline:**
  - `apps/desktop/src/components/timeline/MultiTrackTimeline.tsx`: Mouse drag scrubbing, clip move (`CLIP_MOVE`), edge trim (`CLIP_TRIM`), split (`S`), delete, and live ghost cursor overlay.
- **DaVinci Resolve Color Compositor:**
  - `apps/desktop/src/components/monitor/ShaderColorCompositor.tsx`: Real-time Lift/Gamma/Gain, exposure, contrast, temperature, tint, halation bloom, and 35mm grain simulation.
- **Headless Native MP4 Renderer:**
  - `scripts/native_stage_renderer.py`: Standalone Python + FFmpeg script producing real 1280x720 H.264 video files in <2 seconds without launching the browser.

---

## [0.1.0] - 2026-11-01
### Added
- Initial project scaffolding with Vite, React 19, Tailwind CSS v4, and Dockview multi-panel workspace.
- Basic Zustand state store and in-memory timeline model.

