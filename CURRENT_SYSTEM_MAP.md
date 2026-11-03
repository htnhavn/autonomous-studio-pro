# 🗺️ PHASE 0: CURRENT SYSTEM MAP & EXECUTION TRACE (`CURRENT_SYSTEM_MAP.md`)

> **Audit Date:** 2026-11-03  
> **Purpose:** Documents the exact current file layout, runtime data flows, and the minimal architectural bridge required to transition to Phase 1–5 without breaking working features.

---

## 1. CURRENT REPOSITORY DIRECTORY & EXECUTION MAP

```text
AI Video Editor/
├── packages/
│   ├── core-schema/src/
│   │   ├── rational-time.ts         [WORKING] Frame-accurate RationalTime (value/rate)
│   │   ├── timeline.ts              [WORKING] StudioProject, Track, Clip, TimelineCommand (v1)
│   │   ├── agent-protocol.ts        [WORKING] AgentCursorState, LiveAssetFlightEvent, CriticEvaluationReport
│   │   └── index.ts                 [WORKING] Re-exports core schema
│   ├── stage-engine/src/
│   │   ├── puppet-rig.ts            [WORKING] 2D Stickman skeleton & 18 Move-Sets
│   │   ├── camera-choreography.ts   [WORKING] 12 2.5D Camera rigs & interpolation
│   │   ├── genre-kits.ts            [WORKING] 3 Genre Kits + 0-Token text-to-stage compiler
│   │   └── index.ts                 [WORKING] Re-exports stage engine
│   ├── motion-engine/src/
│   │   └── templates/index.tsx      [WORKING] 8 Procedural React motion graphic templates
│   ├── shader-library/src/
│   │   ├── transitions.ts           [PARTIAL] Transition catalog metadata
│   │   ├── gl-transitions-catalog.ts[PARTIAL] 25 GLSL shaders from gl-transitions
│   │   └── effects-wgsl.ts          [UNUSED]  WGSL shader strings (not yet compiled in GPU pipeline)
│   └── mcp-bridge/src/
│       ├── ai-playbooks.ts          [WORKING] 4 SOP Playbooks & 4 Autonomy Tiers
│       └── tool-registry.ts         [DUPLICATED] MCP tool definitions (mirrored in Python)
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── store/useStudioStore.ts          [WORKING - NEEDS GATEWAY] Zustand store for timeline & AI state
│       │   ├── hooks/usePlaybackEngine.ts       [WORKING] 60fps rAF playhead clock
│       │   ├── hooks/useSidecarSocket.ts        [WORKING] WS (8765) + /live-agent-bridge.json (350ms poll)
│       │   └── components/
│       │       ├── layout/StudioWorkspace.tsx   [WORKING] 5-Panel NLE Workspace
│       │       ├── monitor/ProgramMonitor.tsx   [WORKING] Composite viewport (Video + Stage + Motion)
│       │       ├── monitor/ShaderColorCompositor.tsx [WORKING] Real-time CSS/SVG color & transition preview
│       │       ├── monitor/MotionCodeRenderer.tsx    [WORKING] Renders 8 motion templates
│       │       ├── monitor/WebCodecsDecoderPool.ts   [UNUSED]  Orphaned class, not imported
│       │       ├── stage-studio/StickmanStageRenderer.tsx [WORKING] 1,042-line SVG Stickman & 2.5D stage renderer
│       │       ├── stage-studio/StagePlaybookPanel.tsx    [WORKING] UI for Genre Kits & 0-Token compile
│       │       ├── timeline/MultiTrackTimeline.tsx        [WORKING] Interactive drag/trim/split/scrub timeline
│       │       ├── timeline/AgentGhostCursorOverlay.tsx   [WORKING] Renders live AI Ghost Cursors & Asset Flights
│       │       ├── timeline/TranscriptEditorPanel.tsx     [WORKING] Word-level transcript view
│       │       ├── media-pool/MediaPoolPanel.tsx          [WORKING] Local file import & stock search UI
│       │       ├── inspector/ClipInspector.tsx            [WORKING] Transform, speed, shader, transition inspector
│       │       ├── color-node/ColorGradingPanel.tsx       [WORKING] Lift/Gamma/Gain wheels & primaries
│       │       ├── agent-hud/AgentHudConsole.tsx          [WORKING] Bottom AI crew console
│       │       ├── agent-hud/ExternalAgentConnectModal.tsx[WORKING] External VS Code/MCP connection hub
│       │       └── export/ExportPublishModal.tsx          [WORKING UI] Export & YouTube publish modal
│       └── src-tauri/src/
│           ├── lib.rs                           [STUB] Hardware capability struct
│           ├── media_server.rs                  [BROKEN STUB] Returns 1x1 dummy JPEG
│           └── ffmpeg_render.rs                 [BROKEN STUB] Missing -i inputs & filter_complex
├── services/
│   └── ai-sidecar/
│       ├── main.py                  [WORKING] FastAPI + WS server on port 8765
│       ├── mcp_server.py            [WORKING] HTTP MCP endpoint
│       ├── mcp_stdio_bridge.py      [WORKING] JSON-RPC 2.0 stdio MCP server for VS Code/Claude/Cursor
│       ├── agents/director_crew.py  [PARTIAL] Orchestrates 6-agent simulation + ave_director_bridge
│       └── pipelines/
│           ├── ave_director_bridge.py [WORKING] Deterministic EditPlan, TrimRefiner, Reviewer, AutoBrollMatcher
│           ├── asset_hunter.py        [PARTIAL] Stock API search + mock fallback
│           ├── audio_studio.py        [STUB]    Hardcoded Vietnamese words & 124 BPM grid
│           ├── vision_vfx.py          [STUB]    Fake output paths
│           ├── vlm_critic_pipeline.py [DUPLICATED STUB] Hardcoded scores
│           └── youtube_publisher.py   [PARTIAL] Thumbnail & metadata generator + OAuth stub
└── scripts/
    ├── studio_agent_cli.py          [WORKING] External Agent CLI (compile-stage, cursor, insert-broll, command, render-video)
    ├── native_stage_renderer.py     [WORKING] 0-Token Python PIL + FFmpeg/AVAssetWriter MP4 renderer
    └── native_mp4_encoder.swift     [WORKING] macOS hardware H.264 MP4 encoder
```

---

## 2. ACTUAL EXECUTION PATH TRACES

### Trace 1: User Manual Editing in Desktop UI
`MultiTrackTimeline.tsx` / `ClipInspector.tsx` / `ColorGradingPanel.tsx`  
$\rightarrow$ creates `TimelineCommandEnvelope` (`CLIP_MOVE`, `CLIP_TRIM`, `CLIP_SPLIT`, `CLIP_SET_COLOR_GRADE`)  
$\rightarrow$ `useStudioStore.dispatchCommand(envelope)`  
$\rightarrow$ mutates `project.tracks` in memory and appends previous `StudioProject` snapshot to `undoStack`.  
*Deficiency:* No `redoStack`, no `expectedRevision` check, no command validation, no `.vproj` persistence.

### Trace 2: External Agent (VS Code / Cursor / Claude Code) Live Editing
External Agent runs `python3 scripts/studio_agent_cli.py ...` or calls MCP tool via `services/ai-sidecar/mcp_stdio_bridge.py`  
$\rightarrow$ writes sequenced event (`seqId`) to `apps/desktop/public/live-agent-bridge.json`  
$\rightarrow$ `useSidecarSocket.ts` polls `/live-agent-bridge.json` every `350ms`  
$\rightarrow$ dispatches `updateAgentCursor` and `dispatchCommand` into `useStudioStore.ts`.  
*Deficiency:* Bypasses revision conflict checks; lacks selective context query API (`ai_context.json`) so external agents cannot inspect a specific scene (`get_scene(scene_id)`) without reading raw state.

### Trace 3: 0-Token Native Video Production (`render-video`)
`python3 scripts/studio_agent_cli.py render-video --genre economics-stickman --script "..." --output exports/out.mp4`  
$\rightarrow$ calls `render_stickman_stage_mp4()` in `scripts/native_stage_renderer.py`  
$\rightarrow$ draws 2.5D camera grid, particles, candlestick chart, 2D Stickman rig, HUD, and word-by-word subtitles into PNG frames  
$\rightarrow$ encodes H.264 `.mp4` via `ffmpeg` or `scripts/native_mp4_encoder_bin`.  
*Deficiency:* Currently takes a flat `--script` string rather than compiling and rendering a multi-scene **Versioned Video DSL (`.vproj`)** specification.

---

## 3. SMALLEST SET OF ARCHITECTURAL CHANGES TO REACH PHASE 1–4

Instead of rewriting working UI components, we will perform a **surgical, non-destructive upgrade** in `packages/core-schema`, `packages/stage-engine`, `apps/desktop/src/store/useStudioStore.ts`, and `scripts/`:

1. **Upgrade `packages/core-schema` (Phase 1 Foundation)**:
   - Add **`video-dsl.ts`**: Versioned, deterministic `VideoDSLSpecification` (`v1.0.0`) with JSON Schema validation and a deterministic compiler (`compileVideoDslToCommands(dsl, project)`) that converts a structured specification into validated `CommandGateway` commands.
   - Add **`command-gateway.ts`**: Authoritative `CommandGateway` with schema validation, `expectedRevision` optimistic concurrency control, conflict detection between User & AI, full `undo` + `redo` stacks, and audit log.
   - Add **`asset-registry.ts`**: Unified `AssetRegistry` with stable IDs, SHA-256 content hashes, license & attribution metadata, duplicate detection, and pre-asset catalog.
   - Add **`vproj-package.ts`**: `.vproj` project package serializer/deserializer + **Selective AI Context Query API (`ai_context.json`)** implementing `get_project_summary()`, `get_scene(scene_id)`, `get_asset(asset_id)`, `get_timeline_range(start, end)`, `get_visual_index(scene_id)`, `get_dependency_graph(scene_id)`, and `get_qa_issues()` + deterministic **Visual QA Engine**.
   - Add **`worker-contracts.ts` & `batch-dag.ts`**: Standardized `WorkerTaskContract` (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `NEEDS_REVIEW`, `CANCELLED`), checkpoint/resume state machine, and provider-neutral `AIProviderContract` + Future 3D `Scene3DAdapterContract`.
2. **Wire `useStudioStore.ts` & `studio_agent_cli.py` to the New Foundation (Phase 2–4)**:
   - Back `useStudioStore.ts` with `CommandGateway` (adding `redo()`, `saveVproj()`, `loadVproj()`, `compileVideoDsl()`, `queryAiContext()`, and `runVisualQa()`).
   - Upgrade `studio_agent_cli.py` with `context-query` (calling the 7 selective AI context methods), `compile-dsl` (compiling a structured Video DSL JSON file into the project and rendering `.mp4` offline without keeping an AI model active), and `qa-check`.
3. **Comprehensive Automated Test Suite (`tests/`)**:
   - Write and execute end-to-end automated tests verifying all 5 required workflows (Manual Editing + Undo/Redo + Save/Reopen, Live AI Editing + Conflict Detection, Native Video Production from Video DSL, Offline Batch Production DAG Resume, and Selective `.vproj` AI Context Queries).

