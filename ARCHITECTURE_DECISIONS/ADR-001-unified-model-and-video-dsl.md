# ADR-001: Single Unified Project Model, Versioned Video DSL, Command Gateway & Selective AI Context

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Principal Software Architect / Media Systems Lead

---

## 1. Context & Problem Statement

During initial prototyping, 14 open-source video/AI repositories (`artcraft`, `WeftCut`, `Clypra`, `OpenCut`, `FableCut`, `gl-transitions`, `revideo`, `agentic-video-editor`, `autobroll`, `MoneyPrinterTurbo`, `ShortGPT`, `whisperX`, `auto-editor`, `olive`) were cloned into `references/`.

Without strict architectural governance, three fatal failure modes arise:
1. **Subsystem Fragmentation**: Multiple repositories define incompatible timeline, clip, and renderer models.
2. **Brittle Free-Form AI Code Generation**: Allowing AI to write arbitrary code per scene or emit hundreds of unvalidated low-level mutations leads to broken renders and high token costs.
3. **Uncontrolled State Mutation & Token Bloat**: Allowing AI agents to mutate state without revision checking causes race conditions with user edits, while sending the entire project JSON on every prompt wastes 90%+ of context tokens.

---

## 2. Architectural Decisions

### Decision 1: One Unified Project Model & Authoritative Integer `RationalTime`
- `packages/core-schema` is the sole authoritative definition of `StudioProject`, `TimelineTrack`, `TimelineClip`, `AssetRegistryEntry`, and `.vproj` packages.
- All timeline positions and durations use integer rational ticks (`RationalTime { value, rate }`), never floating-point seconds.
- External timeline formats (`OpenTimelineIO`) are supported strictly via import/export adapters.

### Decision 2: Versioned Video DSL (`v1.0.0`) + Composable 2D Character & Scene Library
- AI agents generate a structured, schema-validated `VideoDSLSpecification` (`packages/core-schema/src/video-dsl.ts`), specifying scenes, asset requirements, reusable character actions (`standing`, `walking`, `running`, `sitting`, `talking`, `explaining`, `pointing`, `thinking`, `reacting`, `falling`, `working`, `holding-object`), 2.5D camera rigs, and stage widgets.
- The deterministic compiler (`compileVideoDslToGatewayCommands`) translates the DSL into validated timeline commands in `<5ms` with **0 AI tokens**.

### Decision 3: Single Authoritative Command Gateway with Optimistic Concurrency (`expectedRevision`)
- All mutations from User UI, Live AI Editing (Mode A), and Batch Production DAG (Mode B) pass through `executeGatewayCommand` (`packages/core-schema/src/command-gateway.ts`).
- Every command is validated against track/clip locks and `expectedRevision`. Concurrent edits that mismatch `revision` are rejected with `conflictDetected: true`.
- Full `undoStack` and `redoStack` with `origin` audit provenance are maintained.

### Decision 4: `.vproj` Package & Selective AI Context Query API (`ai_context.json`)
- Instead of sending a monolithic project dump to an AI model, `packages/core-schema/src/vproj-package.ts` exposes 7 selective query functions:
  - `get_project_summary(vproj)`
  - `get_scene(vproj, scene_id)`
  - `get_asset(vproj, asset_id)`
  - `get_timeline_range(vproj, start, end)`
  - `get_visual_index(vproj, scene_id)`
  - `get_dependency_graph(vproj, scene_id)`
  - `get_qa_issues(vproj, scene_id?)`
- When an AI edits Scene 12, it queries `get_scene(vproj, "scene_12")` and `get_dependency_graph(vproj, "scene_12")`, reducing token payload by >90%.

### Decision 5: Offline-Capable Batch Production DAG with Partial Scene Rebuild
- Mode B (`packages/core-schema/src/batch-dag.ts`) compiles a `VideoDSLSpecification` into a dependency graph (`BatchProductionJobPlan`) where deterministic nodes (`RESOLVE_ASSET`, `BUILD_SCENE`, `COMPILE_TIMELINE`, `RUN_VISUAL_QA`, `RENDER_FINAL_VIDEO`) execute locally even when `aiProviderConnected === false`.
- Modifying a single scene (`invalidateSceneInBatchDag`) invalidates only that scene's node and downstream timeline/QA/render nodes, keeping all other scenes cached (`COMPLETED`).

