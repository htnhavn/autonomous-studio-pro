# 🕸️ PHASE 0: SYSTEM DEPENDENCY GRAPH & MODULE BOUNDARIES (`DEPENDENCY_GRAPH.md`)

> **Audit Date:** 2026-11-03  
> **Architectural Rule:** Strict unidirectional dependency flow. No circular dependencies. No external reference repository may redefine `packages/core-schema`.

---

## 1. TARGET LAYERED DEPENDENCY GRAPH

```mermaid
flowchart TD
    subgraph L0["Layer 0: Authoritative Core Contracts (packages/core-schema)"]
        RT["rational-time.ts\n(Integer Frame/Tick Math)"]
        UPM["timeline.ts + project-model.ts\n(Unified Project Model v2)"]
        DSL["video-dsl.ts\n(Versioned Video DSL v1.0)"]
        CGW["command-gateway.ts\n(Typed Commands, Revision, Undo/Redo)"]
        AREG["asset-registry.ts\n(Asset IDs, SHA-256, License, Provenance)"]
        VPROJ["vproj-package.ts\n(.vproj + Selective ai_context.json API + Visual QA)"]
    end

    subgraph L1["Layer 1: Deterministic Domain Engines (Zero AI Dependencies)"]
        STAGE["packages/stage-engine\n(Reusable 2D Character Rigs, Poses, 2.5D Camera)"]
        MOTION["packages/motion-engine\n(Scene Composition, Vector/Text Presets, Keyframes)"]
        SHADER["packages/shader-library\n(GLSL Transitions & Color/Effect Shaders)"]
    end

    subgraph L2["Layer 2: Execution & Orchestration Layer"]
        LIVE_AI["Mode A: Live AI Editor\n(Selective Context -> Edit Plan -> CommandGateway)"]
        BATCH_DAG["Mode B: Batch Production Engine\n(Prompt -> Video DSL -> Job DAG -> Offline Execution)"]
        MCP["packages/mcp-bridge + studio_agent_cli.py\n(External Agent & MCP Adapter)"]
    end

    subgraph L3["Layer 3: Isolated Local Media & AI Workers (Process-Isolated)"]
        W_RENDER["Native Render Worker\n(FFmpeg / AVAssetWriter / NVENC)"]
        W_AUDIO["Audio & Transcription Worker\n(FFmpeg Probe, Silence Cut, WhisperX, DeepFilterNet3)"]
        W_ASSET["Asset Resolver & Cache Worker\n(Local Pre-Assets + Pexels/Unsplash/Pixabay)"]
        W_VFX["Optional Vision/3D Workers\n(SAM 2.1, Depth-Small, Future Blender 3D)"]
    end

    subgraph L4["Layer 4: Desktop Application UI (apps/desktop)"]
        STORE["useStudioStore.ts\n(Backed by CommandGateway & Unified Project Model)"]
        UI_WS["StudioWorkspace.tsx\n(Timeline, Monitor, Inspector, Color, Character/Stage, AI HUD)"]
    end

    UPM --> RT
    DSL --> RT
    DSL --> AREG
    CGW --> UPM
    CGW --> AREG
    VPROJ --> UPM
    VPROJ --> DSL
    VPROJ --> AREG

    STAGE --> L0
    MOTION --> L0
    SHADER --> L0

    LIVE_AI --> CGW
    LIVE_AI --> VPROJ
    BATCH_DAG --> DSL
    BATCH_DAG --> CGW
    BATCH_DAG --> VPROJ
    MCP --> CGW
    MCP --> DSL

    BATCH_DAG --> W_RENDER
    BATCH_DAG --> W_AUDIO
    BATCH_DAG --> W_ASSET
    BATCH_DAG --> W_VFX

    STORE --> L0
    STORE --> L1
    UI_WS --> STORE
    UI_WS --> L2
```

---

## 2. STRICT DEPENDENCY RULES ENFORCED

1. **`packages/core-schema` Has Zero External Runtime Dependencies**:
   - Pure TypeScript types, deterministic validators, integer `RationalTime` arithmetic, `CommandGateway` state machine, `VideoDSL` compiler, and `.vproj` selective context extractor (`ai_context.json`).
   - Can be imported by React UI, Node CLI tools, MCP servers, and test runners without pulling in DOM, WebGL, or AI SDKs.
2. **Domain Engines (`stage-engine`, `motion-engine`, `shader-library`) Depend Only on `core-schema`**:
   - They never call AI models or mutate the project store directly.
   - Given `(sceneSpec, frameTime)`, they are 100% deterministic pure functions.
3. **AI Agents & Workers Never Mutate State Directly**:
   - External AI (VS Code Agent, Claude, Gemini, Local LLM) and internal workers must either:
     - Emit a **Versioned `VideoDSL` Specification**, which the deterministic DSL Compiler translates into validated `CommandGateway` commands; OR
     - Submit typed **`CommandGateway` envelopes** (`expectedRevision`, `origin`, `command`) which are validated and applied atomically.
4. **Process Isolation for Heavy/Native Dependencies**:
   - `FFmpeg`, `WhisperX`, `DeepFilterNet3`, `SAM 2.1`, `Video-Depth-Anything-Small`, and future `Blender` run in isolated worker processes behind `WorkerTaskEnvelope` / `WorkerResultEnvelope` contracts. If any optional worker is not installed on the user's machine, the editor remains 100% functional.

