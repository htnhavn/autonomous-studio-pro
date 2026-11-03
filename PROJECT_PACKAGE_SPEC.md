# 📁 PROJECT PACKAGE & CONTEXT API SPECIFICATION (`PROJECT_PACKAGE_SPEC.md`)

> **Document Version:** 2.0.0  
> **File Extension:** `.vproj` (Directory or Zip Container)  
> **Target Subsystems:** Project Storage, SQLite Index, Selective AI Context API  
> **Status:** Authoritative Specification  

---

## 1. THE CONTEXT EXPLOSION PROBLEM & SOLUTION

Modern non-linear video editing projects contain thousands of clips, keyframe splines, audio waveforms, and metadata tags. Serializing an entire project into a monolithic JSON file easily creates payloads exceeding 50 MB to 500 MB. 

Attempting to paste or inject this monolithic JSON into an LLM context window causes:
1. Catastrophic token consumption ($> 100{,}000$ tokens per prompt).
2. Context truncation and severe LLM hallucination ("needle-in-a-haystack" degradation).
3. Extreme latency and high API costs.

**The Solution:** The `.vproj` package format bifurcates storage into an on-disk **SQLite + JSON Package**, fronted by a **Selective AI Context API (`ai_context.json`)** that provides targeted slices on demand.

---

## 2. `.vproj` PACKAGE DIRECTORY STRUCTURE

A `.vproj` bundle is an uncompressed directory (or single-file zip archive during export/archive):

```
my_explainer_video.vproj/
├── manifest.json              # Package metadata, schema version, creation timestamp
├── project.json               # Canonical root AST document (sequences, tracks, metadata)
├── timeline.db                # SQLite database for sub-millisecond range indexing & keyframes
├── ai_context.json            # Cached high-level summary manifest for instant LLM ingestion
├── assets/
│   ├── masters/               # Content-addressable master media files (hashed by SHA-256)
│   ├── proxies/               # 720p ProRes / WebCodecs lightweight editing proxies
│   ├── thumbnails/            # 320x180 WebP visual index frame thumbnails
│   └── waveforms/             # Precomputed audio peak JSON files
└── cache/
    ├── dag_checkpoints/       # Intermediate task artifacts from Batch Production DAG
    └── rendered_chunks/       # Pre-rendered video chunks for fast timeline preview
```

---

## 3. SQLITE SPATIAL-TEMPORAL INDEX SCHEMA (`timeline.db`)

For sub-millisecond queries across hundreds of tracks and thousands of cuts, `timeline.db` indexes clips as 1D intervals:

```sql
CREATE TABLE sequences (
    sequence_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fps INTEGER NOT NULL,
    duration_ticks INTEGER NOT NULL
);

CREATE TABLE tracks (
    track_id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES sequences(sequence_id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_locked INTEGER DEFAULT 0
);

CREATE TABLE clips (
    clip_id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(track_id),
    asset_id TEXT,
    start_ticks INTEGER NOT NULL,
    duration_ticks INTEGER NOT NULL,
    end_ticks INTEGER GENERATED ALWAYS AS (start_ticks + duration_ticks) STORED,
    name TEXT NOT NULL,
    raw_clip_json TEXT NOT NULL
);

CREATE INDEX idx_clip_temporal_range ON clips(track_id, start_ticks, end_ticks);

CREATE TABLE keyframes (
    keyframe_id TEXT PRIMARY KEY,
    clip_id TEXT NOT NULL REFERENCES clips(clip_id),
    property_path TEXT NOT NULL,
    time_ticks INTEGER NOT NULL,
    value_json TEXT NOT NULL,
    interpolation TEXT NOT NULL
);

CREATE INDEX idx_keyframe_lookup ON keyframes(clip_id, property_path, time_ticks);
```

---

## 4. SELECTIVE AI CONTEXT API (`ai_context.json`)

External AI Agents (VS Code, Antigravity, Claude Code, Cursor) and MCP servers query timeline state strictly through the **Seven Mandatory Context API Functions**:

```mermaid
graph TD
    Agent["External AI Agent (MCP / CLI)"]
    API["Selective AI Context API\n(ai_context.json / timeline.db)"]

    Agent -->|1. get_project_summary()| API
    Agent -->|2. get_scene(scene_id)| API
    Agent -->|3. get_asset(asset_id)| API
    Agent -->|4. get_timeline_range(start, end)| API
    Agent -->|5. get_visual_index(scene_id)| API
    Agent -->|6. get_dependency_graph(scene_id)| API
    Agent -->|7. get_qa_issues()| API
```

### The 7 Mandatory Functions:

#### 1. `get_project_summary()`
- **Output:** Lightweight project overview (<500 tokens).
- **Contents:** Project name, active genre kit, total duration, sequence count, track roster, active autonomy tier, current project revision integer.

#### 2. `get_scene(scene_id)`
- **Output:** Complete AST for a single scene (<1,500 tokens).
- **Contents:** Narration text, shot breakdown, assigned character move-sets, camera rigs, and stage widgets.

#### 3. `get_asset(asset_id)`
- **Output:** Asset metadata record (<300 tokens).
- **Contents:** File paths (master, proxy, thumbnail), SHA-256 hash, duration, dimensions, semantic tags, license type, attribution requirements.

#### 4. `get_timeline_range(start_ticks, end_ticks)`
- **Output:** Temporal slice of clips intersecting the `[start, end]` window (<2,000 tokens).
- **Contents:** Exact clip positions, active transitions, and dialogue tokens overlapping the window. Replaces sending the entire 1-hour timeline to the LLM!

#### 5. `get_visual_index(scene_id)`
- **Output:** Visual summary of rendered frames for the scene.
- **Contents:** File paths to thumbnail keyframes, dominant color hex palettes, framing classifications (wide, close-up), and aesthetic ratings.

#### 6. `get_dependency_graph(scene_id)`
- **Output:** DAG dependency map.
- **Contents:** Lists which TTS audio chunks, B-roll downloads, and composite render tasks must be rebuilt if this scene is modified.

#### 7. `get_qa_issues()`
- **Output:** Structured report of automated QA linter warnings.
- **Contents:** Jump cuts, audio clipping, pacing anomalies (shots >7s without motion), missing B-roll licenses, or speech-to-caption desyncs.

