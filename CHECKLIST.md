# ✅ CHECKLIST TRIỂN KHAI & SỔ TAY GIAO VIỆC CHO FLASH (`CHECKLIST.md`)

> **Cách sử dụng hiệu quả nhất với Quota:**
> Kiến trúc lõi, Schema dữ liệu, Giao thức Live AI Ghost Cursor, MCP Tool Registry và Orchestrator đã được thiết kế và khóa chặt trong codebase.
> Khi bạn chuyển sang model **Flash** (hoặc gọi Subagent Flash), bạn chỉ cần copy từng **Prompt Giao Việc Cho Flash** dưới đây. Flash sẽ bám sát 100% vào các file interface có sẵn mà không bao giờ bị lệch kiến trúc!

---

## Giai Đoạn 1: Dựng Giao Diện Studio & Live AI Timeline (`apps/desktop`)

- [x] **[Hoàn tất bởi Architect]** Thiết kế `RationalTime`, `StudioProject` Schema, `TimelineCommandEnvelope`, `AgentCursorState` và `useStudioStore.ts`.
- [x] **Task 1.1: Khởi tạo Vite + React 19 + Tailwind v4 + Dockview Layout**
  - **File mục tiêu:** `apps/desktop/package.json`, `apps/desktop/src/App.tsx`, `apps/desktop/src/components/layout/StudioWorkspace.tsx`
- [x] **Task 1.2: Xây dựng Multi-Track Magnetic Timeline + Hiển thị Live Ghost Cursors**
  - **File mục tiêu:** `apps/desktop/src/components/timeline/MultiTrackTimeline.tsx`, `apps/desktop/src/components/timeline/AgentGhostCursorOverlay.tsx`
- [x] **Task 1.3: Xây dựng Program Monitor (WebGPU / PixiJS v8 + Direct Canvas Manipulation)**
  - **File mục tiêu:** `apps/desktop/src/components/monitor/ProgramMonitor.tsx`, `apps/desktop/src/components/monitor/MotionCodeRenderer.tsx`
- [x] **Task 1.4: Xây dựng Bảng Text-Based Editing & Bảng Chỉnh Màu DaVinci / Inspector**
  - **File mục tiêu:** `apps/desktop/src/components/inspector/ClipInspector.tsx`, `apps/desktop/src/components/color-node/ColorGradingPanel.tsx`, `apps/desktop/src/components/timeline/TranscriptEditorPanel.tsx`

---

## Giai Đoạn 2: Kho Vũ Khí Hiệu Ứng Shaders & Code-as-Motion (`packages/shader-library` & `packages/motion-engine`)

- [x] **Task 2.1: Nạp kho 100+ `gl-transitions` & CapCut/Shadertoy GPU Presets**
  - **File mục tiêu:** `packages/shader-library/src/transitions.ts`, `packages/shader-library/src/effects-wgsl.ts`
- [x] **Task 2.2: Xây dựng 8 Built-in Motion Graphics Templates (`Motifs` / `Remotion` Style)**
  - **File mục tiêu:** `packages/motion-engine/src/templates/index.tsx`

---

## Giai Đoạn 3: Python AI Sidecar — Săn Ảnh/Video, Audio, VFX & YouTube (`services/ai-sidecar`)

- [x] **[Hoàn tất bởi Architect]** Thiết kế `AutonomousFilmCrewOrchestrator` (`services/ai-sidecar/agents/director_crew.py`) phát sóng Ghost Cursor, Asset Flight và vòng lặp VLM Critic.
- [x] **Task 3.1: Xây dựng FastAPI + WebSocket + Embedded MCP Server**
  - **File mục tiêu:** `services/ai-sidecar/main.py`, `services/ai-sidecar/mcp_server.py`, `services/ai-sidecar/requirements.txt`
- [x] **Task 3.2: Xây dựng Autonomous Web & Stock Asset Hunter (`pipelines/asset_hunter.py`)**
  - **File mục tiêu:** `services/ai-sidecar/pipelines/asset_hunter.py`
- [x] **Task 3.3: Xây dựng Pipeline Audio, WhisperX, Auto-Editor & Beat-Sync (`pipelines/audio_studio.py`)**
  - **File mục tiêu:** `services/ai-sidecar/pipelines/audio_studio.py`
- [x] **Task 3.4: Xây dựng Pipeline AI Vision VFX (`pipelines/vision_vfx.py`)**
  - **File mục tiêu:** `services/ai-sidecar/pipelines/vision_vfx.py`
- [x] **Task 3.5: Xây dựng VLM Critic Loop & YouTube Auto-Publisher (`pipelines/youtube_publisher.py`)**
  - **File mục tiêu:** `services/ai-sidecar/pipelines/vlm_critic_pipeline.py`, `services/ai-sidecar/pipelines/youtube_publisher.py`

---

## Giai Đoạn 4: Lõi Rust Native Render & Đóng Gói Cài Đặt Windows PC (`apps/desktop/src-tauri`)

- [x] **[Hoàn tất bởi Architect]** Khởi tạo cấu trúc `apps/desktop/src-tauri/src/lib.rs`.
- [x] **Task 4.1: Xây dựng Local High-Speed Frame Server & FFmpeg NVENC Render Pipeline**
  - **File mục tiêu:** `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/src/media_server.rs`, `apps/desktop/src-tauri/src/ffmpeg_render.rs`

---

## Giai Đoạn 5: Sân Khấu Người Que (Stickman Puppet), Bộ Góc Máy 2.5D, Genre Kits & Mô Thức Quy Trình AI (`packages/stage-engine` & `apps/desktop/src/components/stage-studio`)

- [x] **[Hoàn tất bởi Architect]** Thiết kế bộ khung xương 2D & 18 Move Sets (`packages/stage-engine/src/puppet-rig.ts`), 12 Góc máy 2.5D (`packages/stage-engine/src/camera-choreography.ts`), 3 Genre Kits Kinh tế / Vũ trụ / Lore + Trình biên dịch kịch bản 0-Token (`packages/stage-engine/src/genre-kits.ts`), và 4 Mô thức quy trình SOP cho AI (`packages/mcp-bridge/src/ai-playbooks.ts`).
- [x] **Task 5.1: Xây dựng Trình Kết Xuất Sân Khấu & Khung Xương Người Que (`StickmanStageRenderer.tsx`)**
  - **File mục tiêu:** `apps/desktop/src/components/stage-studio/StickmanStageRenderer.tsx`, cập nhật `apps/desktop/src/components/monitor/ProgramMonitor.tsx`
  - **Prompt giao cho Flash:**
    > *"Hãy đọc `packages/stage-engine/src/puppet-rig.ts`, `camera-choreography.ts`, và `genre-kits.ts`. Xây dựng `apps/desktop/src/components/stage-studio/StickmanStageRenderer.tsx` nhận `stageScene: ChoreographedStageScene`, `currentTimeSec`, và `clipProgress0to1`. Component này phải: (1) Áp dụng góc quay 2.5D (`zoom`, `panX/Y`, `tilt3DXDeg/Y`, `vignetteStrength`, `spotlightCenter`) từ `evaluateCameraRigAtProgress`; (2) Vẽ nền Backdrop (Kinh tế bảng đen/Bloomberg, Vũ trụ tinh vân/hố đen, Lore bản đồ cổ) và hạt Atmosphere (mưa tiền đô-la, bụi sao, tàn lửa đuốc); (3) Vẽ nhân vật Người Que / Phi hành gia / Học giả Lore bằng SVG/Canvas theo đúng góc khớp xương (`evaluateMoveSetAtTime`) kèm biểu cảm mặt, miệng nhép, đạo cụ cầm tay (`pointer-stick`, `money-printer-crank`, `glowing-sword`, `telescope`) và bong bóng thoại; (4) Vẽ các Widget dựng sẵn (`econ.supply-demand-curve`, `cosmic.scale-comparison-spheres`, `lore.animated-map-march-line`...). Sau đó tích hợp `StickmanStageRenderer` vào `ProgramMonitor.tsx` khi có clip thuộc track `stage-puppet`."*
- [x] **Task 5.2: Xây dựng Bảng Điều Khiển Sân Khấu, Move-Set & Mô Thức Quy Trình (`StagePlaybookPanel.tsx`)**
  - **File mục tiêu:** `apps/desktop/src/components/stage-studio/StagePlaybookPanel.tsx`, cập nhật `apps/desktop/src/components/layout/StudioWorkspace.tsx` và `apps/desktop/src/components/agent-hud/AgentHudConsole.tsx`
  - **Prompt giao cho Flash:**
    > *"Đọc `packages/stage-engine/src/index.ts` và `packages/mcp-bridge/src/ai-playbooks.ts`. Xây dựng `apps/desktop/src/components/stage-studio/StagePlaybookPanel.tsx` và thêm tab `'Stage & Stickman'` vào `StudioWorkspace.tsx`. Panel này cho phép người dùng: (1) Chọn 1 trong 3 Genre Kit (`📈 Kinh tế Người que`, `🌌 Vũ trụ & Khoa học`, `📜 Deep Lore & Lịch sử`); (2) Chọn Mức độ dùng AI (`⚡ 0% Token AI - Tự động bằng Move-Set có sẵn`, `🎭 Siêu Tiết Kiệm Token - AI chỉ đạo diễn sân khấu`, `⚖️ Hybrid Chuẩn`, `🔥 100% Full AI Điện Ảnh`); (3) Nhập kịch bản và bấm nút **'⚡ Dựng Ngay Toàn Bộ Video Bằng Move-Set Có Sẵn (0 Token)'** để bắn lệnh `PROJECT_COMPILE_DETERMINISTIC_STAGE` trong `useStudioStore.ts`; (4) Chỉnh trực tiếp `moveSet`, `cameraRig`, `backdrop`, `widget` của clip `stage-puppet` đang chọn trên Timeline."*
- [x] **Task 5.3: Nâng cấp Python AI Sidecar hỗ trợ Mô Thức Quy Trình (`STUDIO_AI_PLAYBOOKS`) & Stage MCP Tools**
  - **File mục tiêu:** `services/ai-sidecar/agents/director_crew.py`, `services/ai-sidecar/mcp_server.py`
  - **Prompt giao cho Flash:**
    > *"Cập nhật `services/ai-sidecar/mcp_server.py` và `services/ai-sidecar/agents/director_crew.py` để triển khai 2 MCP tools mới (`stage.compile_deterministic_draft` và `stage.compose_choreographed_scene`) và hỗ trợ chọn `autonomyTier` (`tier-0-zero-ai`, `tier-1-eco-puppeteer`, `tier-2-hybrid-pro`, `tier-3-full-ai-max`) cùng `playbookId` để AI ưu tiên dùng Move-Set/Camera Rig/Genre Kit có sẵn trước khi gọi các tác vụ AI nặng."*

---

## Giai Đoạn 6: Cấy Thuật Toán & Shader Thật Từ `references/` Vào App (`packages/` & `apps/desktop` & `services/ai-sidecar`)

- [x] **Task 6.1: Nạp Toàn Bộ Kho Shader `.glsl` Thật Từ `references/gl-transitions` & Motifs Từ `references/WeftCut`**
  - **File mục tiêu:** `packages/shader-library/src/gl-transitions-catalog.ts`, `apps/desktop/src/components/monitor/WebCodecsDecoderPool.ts`
  - **Prompt giao cho Flash:**
    > *"Hãy đọc các file chuyển cảnh thật trong `references/gl-transitions/transitions/*.glsl` và cấu trúc render/WebCodecs trong `references/WeftCut/` + `references/FableCut/`. Tạo `packages/shader-library/src/gl-transitions-catalog.ts` nạp thêm 25 chuyển cảnh `.glsl` thực tế từ `references/gl-transitions/transitions/` và xây dựng `apps/desktop/src/components/monitor/WebCodecsDecoderPool.ts` quản lý bộ giải mã video phần cứng học từ `WeftCut`."*
- [x] **Task 6.2: Cấy Pipeline Director + Trim Refiner + Reviewer Thật Từ `references/agentic-video-editor` & `references/autobroll`**
  - **File mục tiêu:** `services/ai-sidecar/pipelines/ave_director_bridge.py`
  - **Prompt giao cho Flash:**
    > *"Hãy đọc code thật trong `references/agentic-video-editor/src/` và `references/autobroll/`. Viết `services/ai-sidecar/pipelines/ave_director_bridge.py` tích hợp logic `EditPlan`, `TrimRefiner`, `Reviewer` chấm điểm 5 chiều (adherence, pacing, visual quality, watchability, overall) và logic tự động khớp B-Roll theo transcript từ `autobroll` vào `AutonomousFilmCrewOrchestrator`."*

---

## Giai Đoạn 7: Kết Nối Live WebSocket 2 Chiều, Đồng Hồ Playback 60fps & Bộ Cài Windows PC (`.exe` / `.msi`)

- [x] **Task 7.1: Xây dựng Bộ Đồng Hồ Playback 60fps (`usePlaybackEngine.ts`) & Kết Nối WebSocket Live AI (`useSidecarSocket.ts`)**
  - **File mục tiêu:** `apps/desktop/src/hooks/usePlaybackEngine.ts`, `apps/desktop/src/hooks/useSidecarSocket.ts`, cập nhật `apps/desktop/src/components/layout/StudioWorkspace.tsx` và `apps/desktop/src/components/agent-hud/AgentHudConsole.tsx`
  - **Prompt giao cho Flash:**
    > *"Xây dựng 2 hook lõi cho Desktop App: (1) `apps/desktop/src/hooks/usePlaybackEngine.ts` dùng `requestAnimationFrame` chạy đồng hồ `playheadTime` chuẩn 60fps khi `isPlaying === true` (bấm phím `Space` hoặc nút Play trên Timeline để chạy/dừng video + hoạt hình người que `StickmanStageRenderer` + đồ họa `MotionCodeRenderer` mượt mà theo thời gian thực); (2) `apps/desktop/src/hooks/useSidecarSocket.ts` kết nối WebSocket tới `ws://127.0.0.1:8765/ws/studio`, tự động nhận các gói tin `AGENT_GHOST_CURSOR`, `TIMELINE_COMMAND`, `LIVE_ASSET_FLIGHT`, `CRITIC_REPORT` đẩy thẳng vào `useStudioStore`, đồng thời cung cấp hàm `triggerAutonomousJob()` gắn vào nút 'Start 100% Autonomous Studio' và 'Dispatch' trong `AgentHudConsole.tsx` (kèm chế độ Local Simulation Fallback mượt mà nếu chưa bật server Python)."*
- [x] **Task 7.2: Xây dựng Cửa Sổ Xuất Video 4K NVENC & YouTube Auto-Publish Modal (`ExportPublishModal.tsx`) + Script Đóng Gói Windows PC**
  - **File mục tiêu:** `apps/desktop/src/components/export/ExportPublishModal.tsx`, `scripts/start-studio-windows.ps1`, `scripts/build-windows-installer.ps1`

---

## Giai Đoạn 8: Hoàn Thiện Trình Edit Chuyên Sâu (Kéo Thả/Trim Clip, Nhập Video/Ảnh Local, WebGL Shader & Color Grade Compositor)

- [x] **Task 8.1: Xây dựng Bộ Kết Xuất Hiệu Ứng Shader, Chuyển Cảnh GLSL & Chỉnh Màu DaVinci Trực Tiếp (`ShaderColorCompositor.tsx`)**
  - **File mục tiêu:** `apps/desktop/src/components/monitor/ShaderColorCompositor.tsx`, cập nhật `apps/desktop/src/components/monitor/ProgramMonitor.tsx`
  - **Mô tả:** Tạo component `ShaderColorCompositor.tsx` bao bọc viewport trong `ProgramMonitor.tsx` để áp dụng trực tiếp theo thời gian thực: (1) Toàn bộ thông số chỉnh màu `ColorGradeConfig` (`exposure`, `contrast`, `saturation`, `temperature`, `tint`, `lift/gamma/gain`, `halationIntensity`, `filmGrainIntensity`) khi người dùng xoay vòng bánh xe màu ở `ColorGradingPanel.tsx`; (2) Các hiệu ứng Shader (`capcut.3d-zoom-pro`, `davinci.halation-film-glow`, `shadertoy.crt-retro`, `gl.glitchdisplace`...) từ `clip.shaders` và chuyển cảnh `clip.transitionIn`/`transitionOut`; (3) Hỗ trợ phát `<video>` / `<img>` thật khi clip có file từ máy tính (`blob:` hoặc `http` URL).
- [x] **Task 8.2: Nâng cấp `MultiTrackTimeline.tsx` & `MediaPoolPanel.tsx` thành Trình Edit Chuyên Sâu Tương Tác 100%**
  - **File mục tiêu:** `apps/desktop/src/components/timeline/MultiTrackTimeline.tsx`, `apps/desktop/src/components/media-pool/MediaPoolPanel.tsx`

---

## Giai Đoạn 9: Trạm Kết Nối Agent Bên Ngoài Từ VS Code / Antigravity / Claude Code / Cursor (`AGENTS.md`, `studio_agent_cli.py`, `mcp_stdio_bridge.py` & `ExternalAgentConnectModal.tsx`)

- [x] **[Hoàn tất bởi Architect]** Thiết kế bộ điều khiển CLI đa năng (`scripts/studio_agent_cli.py`), chuẩn `stdio` MCP Server (`services/ai-sidecar/mcp_stdio_bridge.py`), cấu hình tự động nhận diện MCP cho VS Code & Claude (`.vscode/mcp.json`, `.mcp.json`), và Sổ tay Mô thức + Skill cho Agent ngoài (`AGENTS.md`, `.agents/skills/autonomous-video-studio/SKILL.md`).
- [x] **Task 9.1: Nâng cấp `useSidecarSocket.ts` lắng nghe Trực Tiếp Cầu Nối Agent VS Code (`/live-agent-bridge.json`)**
  - **File mục tiêu:** `apps/desktop/src/hooks/useSidecarSocket.ts`
  - **Mô tả:** Bổ sung bộ lắng nghe `/live-agent-bridge.json` (poll mỗi 350ms với `cache: 'no-store'`) bên cạnh WebSocket `8765`. Theo dõi `lastProcessedSeqIdRef`: mỗi khi Agent từ VS Code / Antigravity / Claude Code bắn lệnh qua `studio_agent_cli.py` hoặc `mcp_stdio_bridge.py` làm tăng `seqId`, lập tức phát toàn bộ `events` mới (`seqId > lastProcessedSeqIdRef.current`) vào `handleIncomingSidecarEvent` để Ghost Cursor bay lượn và Timeline tự động cắt ghép ngay trên màn hình! Trả về thêm `activeExternalAgent` từ hook.
- [x] **Task 9.2: Xây dựng Cửa Sổ Trạm Kết Nối Agent Ngoài & Bộ Prompt Mô Thức (`ExternalAgentConnectModal.tsx`)**
  - **File mục tiêu:** `apps/desktop/src/components/agent-hud/ExternalAgentConnectModal.tsx`, cập nhật `apps/desktop/src/components/layout/StudioWorkspace.tsx` và `apps/desktop/src/components/agent-hud/AgentHudConsole.tsx`
  - **Mô tả:** Tạo cửa sổ `ExternalAgentConnectModal.tsx` mở từ nút **'🔌 Kết Nối Agent Ngoài (VS Code / MCP)'** trên thanh Header của `StudioWorkspace.tsx`. Cho phép người dùng: (1) Xem trạng thái Agent ngoài đang kết nối (`activeExternalAgent`); (2) Chọn và bấm **'📋 Copy Prompt Giao Việc Cho Agent VS Code'** cho 4 Mô thức (Kinh tế Người que, Vũ trụ Khoa học, Deep Lore Lịch sử, 0-Token Instant Compiler); (3) Xem cấu hình `.vscode/mcp.json` & lệnh `studio_agent_cli.py`; (4) Bấm nút **'⚡ Test Bắn Lệnh Từ VS Code Agent Ngay'** để test ngay lập tức con trỏ `🤖 VS Code / Antigravity Agent` bay vào Timeline!




