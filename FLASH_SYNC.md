# 🔄 TRẠM ĐIỀU PHỐI SONG SONG: ARCHITECT (ARGON) ⟷ WORKER (FLASH)

```yaml
STATE: ARCHITECT_VERIFIED_ALL_PHASES_PASS
CURRENT_BATCH: BATCH_10_PHASE1_TO_PHASE6_VERIFIED
LAST_ARCHITECT_AUDIT: PHASE_0_TO_PHASE_6_ALL_TESTS_PASSED
LAST_FLASH_COMPLETED: BATCH_10_ALL_TASKS_DONE
```

---

## ⚠️ CHỈ ĐẠO TỪ THUYỀN TRƯỞNG (ARCHITECT ARGON) GỬI FLASH WORKER:

Architect đã hoàn thành **Phase 0 Ground-Truth Audit** (`ARCHITECTURE_AUDIT.md`, `REPOSITORY_AUDIT.md`, `LICENSE_RISK_REGISTER.md`, `DEPENDENCY_GRAPH.md`, `CURRENT_SYSTEM_MAP.md`) và đang trực tiếp xây dựng lõi TypeScript Phase 1 trong `packages/core-schema/src/` (`asset-registry.ts`, `character-library.ts`, `video-dsl.ts`, `command-gateway.ts`, `vproj-package.ts`, `batch-dag.ts`).

**ĐỂ KHÔNG XUNG ĐỘT FILE VỚI ARCHITECT**, Flash KHÔNG sửa các file trong `packages/core-schema/src/`. Hãy thực hiện ngay 3 nhiệm vụ độc lập dưới đây:

### Nhiệm vụ 1: Tạo Bộ Tài Liệu Đặc Tả Kiến Trúc Phase 1 & Quản Trị Dự Án
Hãy tạo đầy đủ các file đặc tả kỹ thuật chuẩn xác, súc tích (bám sát `ARCHITECTURE_AUDIT.md`, `REPOSITORY_AUDIT.md`, `DEPENDENCY_GRAPH.md`):
1. `ARCHITECTURE.md`: Kiến trúc tổng thể Modular Monolith + Isolated Workers, 2 chế độ thực thi AI (Mode A: Live AI Editing, Mode B: Batch Production DAG chạy offline không cần giữ AI active), và quy tắc bất khả xâm phạm (1 Unified Project Model, 1 Authoritative Timeline, 1 Command Gateway, 1 Rendering Abstraction).
2. `PROJECT_MODEL.md`: Đặc tả Unified Project Model v2 (`RationalTime` integer ticks, Sequences, Tracks, Clips, Gaps, Transitions, Effects, Keyframes, Characters/Rigs, Revisions).
3. `VIDEO_DSL_SPEC.md`: Đặc tả ngôn ngữ Video DSL v1.0 (`schemaVersion: "1.0.0"`, `scenes`, `shots`, `assetRequirements`, `characterActions`, `composition`, `subtitleTiming`) và cơ chế Prompt Blueprint.
4. `COMMAND_CONTRACTS.md`: Đặc tả 18 lệnh chuẩn của Command Gateway (`ImportMedia`, `CreateSequence`, `AddTrack`, `InsertClip`, `MoveClip`, `TrimClip`, `SplitClip`, `DeleteClip`, `ApplyTransition`, `ApplyEffect`, `SetKeyframe`, `UpdateCharacterPose`, `ApplyMotionPreset`, `UpdateSceneComposition`, `AdjustAudio`, `AdjustColor`, `ReplaceAsset`, `RenderSequence`) kèm `expectedRevision`, `Undo/Redo`, và `Origin` metadata.
5. `ASSET_REGISTRY_SPEC.md`: Đặc tả Asset Registry (Stable ID, SHA-256 hash, License/Attribution, Pre-assets, Stock providers, Deduplication).
6. `WORKER_CONTRACTS.md`: Đặc tả hợp đồng Worker cô lập (`Input`, `Output`, `Progress`, `Cancellation`, `Errors`, `Retry`, `ResourceLimits`) cho Media Probe, Transcription, Silence Cut, Native Render, và Future Blender 3D adapter.
7. `AI_EXECUTION_SPEC.md`: Đặc tả Mode A (Live AI Editing với Optimistic Concurrency) và Mode B (Batch Production DAG với trạng thái `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `NEEDS_REVIEW`, `CANCELLED` + Checkpoint/Partial Rebuild).
8. `PROJECT_PACKAGE_SPEC.md`: Đặc tả gói `.vproj` (SQLite + JSON manifests) và **API Ngữ Cảnh Chọn Lọc `ai_context.json`** gồm 7 hàm bắt buộc:
   - `get_project_summary()`
   - `get_scene(scene_id)`
   - `get_asset(asset_id)`
   - `get_timeline_range(start, end)`
   - `get_visual_index(scene_id)`
   - `get_dependency_graph(scene_id)`
   - `get_qa_issues()`
9. `IMPLEMENTATION_STATUS.md` & `CHANGELOG.md`: Bảng theo dõi trạng thái thực tế của từng module và lịch sử thay đổi kiến trúc.

### Nhiệm vụ 2: Nâng cấp `apps/desktop/src-tauri/src/ffmpeg_render.rs` từ Stub thành Bộ Biên Dịch FFmpeg Thật
- Cập nhật `apps/desktop/src-tauri/src/ffmpeg_render.rs` để:
  - Nhận danh sách `input_files: Vec<String>` trong `RenderExportConfig` (cập nhật cả struct `RenderExportConfig` trong `apps/desktop/src-tauri/src/lib.rs` thêm `pub input_files: Vec<String>` với `#[serde(default)]`).
  - Sinh đầy đủ các cờ `-i <path>` cho từng input file và chuỗi `-filter_complex` ghép nối/chuẩn hóa video + audio (`loudnorm=I=-14.0:TP=-1.5:LRA=11`) hợp lệ.

### Nhiệm vụ 3: Nâng cấp `services/ai-sidecar/pipelines/audio_studio.py` từ Mock Stub thành Phân Tích Audio Thực Tế
- Cập nhật `services/ai-sidecar/pipelines/audio_studio.py`:
  - Nếu `audio_path` là một file `.wav` có thật trên đĩa, dùng thư viện chuẩn `wave` + `audioop`/`struct` của Python để tính biên độ RMS theo từng cửa sổ 50ms và phát hiện chính xác các khoảng lặng thật (`detect_silences_for_rough_cut`) cũng như ước lượng nhịp năng lượng (`extract_musical_beat_grid`), chỉ fallback về dữ liệu mẫu khi file không tồn tại hoặc không phải WAV.

---

### 🔔 QUY TẮC KHI FLASH LÀM XONG:
1. Sửa dòng `STATE: WAITING_FOR_FLASH` ở đầu file `FLASH_SYNC.md` này thành:
   ```yaml
   STATE: FLASH_DONE_BATCH
   ```
2. Chạy lại `python3 scripts/watch_architect.py` ở chế độ chạy ngầm để chờ Architect nghiệm thu!
