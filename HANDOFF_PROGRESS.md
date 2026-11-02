# 📦 BÀN GIAO TIẾN TRÌNH & KIẾN TRÚC TOÀN DIỆN (`HANDOFF_PROGRESS.md`)

> **Tài liệu này đóng gói toàn bộ tiến trình, kiến trúc, danh sách module đã hoàn thiện (Giai đoạn 1 → 9), và hướng dẫn chạy tiếp ngay lập tức khi bạn chuyển sang máy mới (Windows PC hoặc Mac khác).**

---

## ✅ 1. TỔNG QUAN TIẾN ĐỘ: ĐÃ HOÀN TẤT 100% (GIAI ĐOẠN 1 → GIAI ĐOẠN 9)

Toàn bộ dự án **Autonomous Studio Pro (CapCut + DaVinci Resolve + Premiere Pro + 0-Token Stickman Engine + Live External Agent MCP Bridge)** đã được xây dựng, kiểm thử `tsc --noEmit` (**0 lỗi**) và build production `vite build` thành công.

### A. Lõi Schema, Thời Gian Hữu Tỷ & Giao Thức Agent (`packages/core-schema`)
- [`packages/core-schema/src/rational-time.ts`](packages/core-schema/src/rational-time.ts): Hệ thống `RationalTime` chính xác từng frame (`value / rate`), không bao giờ lệch khung hình khi cắt ghép.
- [`packages/core-schema/src/timeline.ts`](packages/core-schema/src/timeline.ts): Schema `StudioProject`, `Track`, `Clip`, `ColorGradeConfig` (DaVinci Lift/Gamma/Gain, Halation, Film Grain), `AiVfxConfig` (SAM 2.1 Rotoscoping, Depth 3D Parallax), `ChoreographedStageScene` (Sân khấu Người Que & Góc quay 2.5D), và 19 lệnh `TimelineCommand`.
- [`packages/core-schema/src/agent-protocol.ts`](packages/core-schema/src/agent-protocol.ts): Giao thức phát sóng **Live Ghost Cursor** (`AgentCursorState`), **Live Asset Flight** (`LiveAssetFlightEvent`), và **VLM Critic 5D Report** (`CriticEvaluationReport`).

### B. Hệ Thống Sân Khấu Người Que (0% Token AI), Góc Máy 2.5D & Mô Thức SOP (`packages/stage-engine` & `packages/mcp-bridge`)
- [`packages/stage-engine/src/puppet-rig.ts`](packages/stage-engine/src/puppet-rig.ts): Khung xương 2D (`StickmanSkeletonPose`) + **18 Move-Sets dựng sẵn** (Thuyết trình, Kinh tế học, Vũ trụ không trọng lực, Hiệp sĩ/Học giả Lore) kèm biểu cảm mặt, nhép miệng tự động, và đạo cụ cầm tay (`pointer-stick`, `money-printer-crank`, `glowing-sword`, `telescope`).
- [`packages/stage-engine/src/camera-choreography.ts`](packages/stage-engine/src/camera-choreography.ts): **12 Góc máy 2.5D Multi-Plane Parallax** (`slow-push-in-dramatic`, `crash-zoom-face-punch`, `whip-pan-to-chart-right`, `orbital-3d-parallax-float`, `dutch-tilt-crisis-shake`...).
- [`packages/stage-engine/src/genre-kits.ts`](packages/stage-engine/src/genre-kits.ts): **3 Bộ Genre Kits** (`economics-stickman`, `universe-cosmic`, `lore-chronicle`) + **Trình biên dịch kịch bản 0-Token (`compileDeterministicStageScript`)** biến văn bản thành các phân cảnh hoàn chỉnh trong `<5ms` mà không tốn 1 token AI nào!
- [`packages/mcp-bridge/src/ai-playbooks.ts`](packages/mcp-bridge/src/ai-playbooks.ts) & [`packages/mcp-bridge/src/tool-registry.ts`](packages/mcp-bridge/src/tool-registry.ts): **4 Mô thức quy trình sản xuất (SOP Playbooks)** & **4 Bậc Tự Chủ (`Tier 0` → `Tier 3`)** cùng 16 MCP Tools chuẩn hóa.

### C. Kho Vũ Khí Shaders WebGL/WGSL & Code-as-Motion (`packages/shader-library` & `packages/motion-engine`)
- [`packages/shader-library/src/transitions.ts`](packages/shader-library/src/transitions.ts) & [`packages/shader-library/src/gl-transitions-catalog.ts`](packages/shader-library/src/gl-transitions-catalog.ts): Kho chuyển cảnh GLSL trích xuất thật từ `references/gl-transitions` + hiệu ứng CapCut Pro (`capcut.3d-zoom-pro`, `davinci.halation-film-glow`, `shadertoy.crt-retro`).
- [`packages/motion-engine/src/templates/index.tsx`](packages/motion-engine/src/templates/index.tsx): 8 mẫu đồ họa chuyển động procedural (Kinetic Typography, News Highlighter, Lower Thirds, KPI Counter, YouTube CTA...).

### D. Ứng Dụng Desktop Studio Pro (`apps/desktop`)
- **State Store & Hooks:**
  - [`apps/desktop/src/store/useStudioStore.ts`](apps/desktop/src/store/useStudioStore.ts): Zustand Store xử lý toàn bộ 19 `TimelineCommand`, Undo theo từng Agent (`undoAgent`), và quản lý `agentCursors` + `assetFlights`.
  - [`apps/desktop/src/hooks/usePlaybackEngine.ts`](apps/desktop/src/hooks/usePlaybackEngine.ts): Đồng hồ `requestAnimationFrame` 60fps thực tế (hỗ trợ phím `Space` Play/Pause).
  - [`apps/desktop/src/hooks/useSidecarSocket.ts`](apps/desktop/src/hooks/useSidecarSocket.ts): Kết nối **Cầu Nối Kép (Dual-Transport)**: vừa kết nối WebSocket `ws://127.0.0.1:8765/ws/studio`, vừa lắng nghe trực tiếp `/live-agent-bridge.json` (350ms) để Agent từ VS Code/Cursor điều khiển giao diện tức thì.
- **5 Bảng Giao Diện Chuyên Sâu:**
  - [`apps/desktop/src/components/layout/StudioWorkspace.tsx`](apps/desktop/src/components/layout/StudioWorkspace.tsx): Giao diện 5-Panel chuyên nghiệp.
  - [`apps/desktop/src/components/stage-studio/StickmanStageRenderer.tsx`](apps/desktop/src/components/stage-studio/StickmanStageRenderer.tsx) & [`StagePlaybookPanel.tsx`](apps/desktop/src/components/stage-studio/StagePlaybookPanel.tsx): Kết xuất trực tiếp Sân khấu Người Que + Góc máy 2.5D + Biểu đồ Kinh tế/Vũ trụ/Lore trên Program Monitor.
  - [`apps/desktop/src/components/monitor/ProgramMonitor.tsx`](apps/desktop/src/components/monitor/ProgramMonitor.tsx) & [`ShaderColorCompositor.tsx`](apps/desktop/src/components/monitor/ShaderColorCompositor.tsx): Kết xuất màu DaVinci, Shader GPU và phát `<video>`/`<img>` thật.
  - [`apps/desktop/src/components/timeline/MultiTrackTimeline.tsx`](apps/desktop/src/components/timeline/MultiTrackTimeline.tsx) & [`AgentGhostCursorOverlay.tsx`](apps/desktop/src/components/timeline/AgentGhostCursorOverlay.tsx): Kéo thả clip (`CLIP_MOVE`), cắt/kéo dài 2 đầu clip (`CLIP_TRIM`), phím tắt `S` cắt đôi clip, `Delete` xóa clip, `Ctrl+Z` Undo, kèm lớp phủ **Con Trỏ AI (Live Ghost Cursors)** bay lượn.
  - [`apps/desktop/src/components/agent-hud/ExternalAgentConnectModal.tsx`](apps/desktop/src/components/agent-hud/ExternalAgentConnectModal.tsx) & [`AgentHudConsole.tsx`](apps/desktop/src/components/agent-hud/AgentHudConsole.tsx): Bảng điều khiển đoàn làm phim 6 AI Agents + Cửa sổ kết nối Agent bên ngoài (VS Code / Cursor / Claude Code).
  - [`apps/desktop/src/components/export/ExportPublishModal.tsx`](apps/desktop/src/components/export/ExportPublishModal.tsx): Xuất video 4K 60fps NVIDIA NVENC + Đăng thẳng lên YouTube.

### E. Python AI Sidecar, Rust Native Core & Trình Kết Xuất Video 0-Token Native (`services/ai-sidecar`, `apps/desktop/src-tauri`, `scripts/`)
- [`services/ai-sidecar/main.py`](services/ai-sidecar/main.py), [`mcp_server.py`](services/ai-sidecar/mcp_server.py), [`mcp_stdio_bridge.py`](services/ai-sidecar/mcp_stdio_bridge.py), [`agents/director_crew.py`](services/ai-sidecar/agents/director_crew.py), và 6 pipelines trong `services/ai-sidecar/pipelines/` (`ave_director_bridge.py`, `asset_hunter.py`, `audio_studio.py`, `vision_vfx.py`, `vlm_critic_pipeline.py`, `youtube_publisher.py`).
- [`scripts/studio_agent_cli.py`](scripts/studio_agent_cli.py) & [`scripts/native_stage_renderer.py`](scripts/native_stage_renderer.py): Cho phép bất kỳ Agent nào điều khiển Timeline hoặc **xuất thẳng file video `.mp4` bằng trình render 0-Token Native (`render-video`)**!

---

## 💻 2. HƯỚNG DẪN CHẠY TIẾP TRÊN MÁY MỚI (WINDOWS PC HOẶC MAC)

### Bước 1: Clone Repo về máy mới
```bash
git clone https://github.com/htnhavn/autonomous-studio-pro.git
cd autonomous-studio-pro
```

### Bước 2: Cài đặt & Chạy trên Windows PC (hoặc macOS)
- **Cách 1 — Chạy 1-Click trên Windows PC (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\start-studio-windows.ps1
  ```
  *(Muốn đóng gói ra file cài đặt `.exe` / `.msi` trên Windows, chạy `.\scripts\build-windows-installer.ps1`)*.

- **Cách 2 — Chạy thủ công (Windows / macOS / Linux):**
  ```bash
  cd apps/desktop
  npm install
  npm run dev
  ```
  Sau đó mở trình duyệt tại `http://localhost:1420` (hoặc chạy `npx tauri dev` để mở cửa sổ Desktop Native).

- **Khôi phục 14 Repo mã nguồn mở tham chiếu trong `references/` (Tùy chọn):**
  ```bash
  python3 scripts/clone_references.py
  ```

---

## 🤖 3. CÁCH RA LỆNH CHO AGENT TRONG VS CODE / ANTIGRAVITY / CURSOR LÀM VIDEO TỰ ĐỘNG

Khi mở thư mục này bằng **VS Code / Antigravity / Cursor / Claude Code** trên máy mới:
1. File [`.vscode/mcp.json`](.vscode/mcp.json), [`.mcp.json`](.mcp.json) và [`AGENTS.md`](AGENTS.md) đã được cấu hình sẵn.
2. Bạn chỉ cần gõ vào cửa sổ chat của Agent:
   > *"Đọc file AGENTS.md và dùng scripts/studio_agent_cli.py để dựng cho tôi một video về [Chủ đề của bạn] theo mô thức Kinh Tế Người Que (economics-stickman), chèn thêm B-Roll và kết xuất ra file MP4!"*
3. Hoặc chạy lệnh tạo thẳng file `.mp4` 0-Token từ Terminal:
   ```bash
   python3 scripts/studio_agent_cli.py render-video \
     --agent-name "⚡ Flash Worker Agent" \
     --genre "economics-stickman" \
     --duration 3.0 \
     --script "FED hạ lãi suất khẩn cấp! Dòng tiền thông minh bùng nổ trên biểu đồ!" \
     --output "exports/flash_stickman_demo_3s.mp4"
   ```

---

## 🔄 4. CÁCH BẬT LẠI CƠ CHẾ SONG SONG 2 AGENT (ARCHITECT ⟷ FLASH WORKER) TRÊN MÁY MỚI

Nếu trên máy mới bạn muốn mở 2 cửa sổ chat để **Agent 1 (Architect)** tự động chỉ đạo **Agent 2 (Flash Worker)** qua [`FLASH_SYNC.md`](FLASH_SYNC.md):
- Ở cửa sổ **Flash Worker**, bảo nó chạy: `python3 scripts/watch_architect.py`
- Ở cửa sổ **Architect**, bảo nó chạy: `python3 scripts/watch_flash_worker.py`
Hai tiến trình này sẽ tự động đánh thức nhau mỗi khi [`FLASH_SYNC.md`](FLASH_SYNC.md) thay đổi!
