# 🎬 AUTONOMOUS STUDIO PRO — MASTER ARCHITECTURE & RESEARCH REPORT

> **Định vị sản phẩm:** Phần mềm Desktop Native cho **Windows PC** (Tauri v2 / Rust `wgpu` + React 19 / PixiJS v8 + Python AI Sidecar), hợp nhất sức mạnh của **Adobe Premiere Pro** (Multi-Track NLE) + **DaVinci Resolve** (Node VFX & Color Grading) + **CapCut Pro** (Kho Preset, Dynamic Captions, Text-Behind-Subject) + **Đoàn Làm Phim AI Tự Hành 100%** (Autonomous Multi-Agent từ Frame 0 tới khi tự Upload YouTube, hiển thị **Live Ghost Cursors** trực tiếp trên Timeline).

---

## 1. Bản Đồ Chọn Lọc Các Repo Mã Nguồn Mở & Phi Thương Mại (Curated Repo Matrix)

Chạy lệnh `.\scripts\clone-references.ps1` trên Windows để tải toàn bộ các repo tham khảo dưới đây về thư mục `references/`:

| Nhóm Chức Năng | Repo Nguồn Được Chọn Lọc | Thư Mục / Module Cần Lấy | Đóng Góp Vào Autonomous Studio Pro |
| :--- | :--- | :--- | :--- |
| **1. Lõi NLE & GPU Compositor (Vụ Freesource Adobe)** | • `storytold/artcraft` (`FilmCraft` & `EffectCraft`)<br>• `AIEraDev/Clypra`<br>• `OpenCut-app/OpenCut`<br>• `ter-9001/FreeCut` | • Toán học `RationalTime` số nguyên<br>• `wgpu` Linear-light Compositor<br>• Rust Local HTTP Frame Server (<10ms) | Chống trôi lệch tiếng/hình tuyệt đối; kéo scrub video 4K 60fps mượt trên Windows GPU (DirectX 12 / NVDEC / NVENC). |
| **2. Live AI Agent Timeline & Code-as-Motion** | • `WeftCut/WeftCut`<br>• `ronak-create/FableCut`<br>• `metiutek/editorvideo-ai`<br>• `midrender/revideo` & `remotion` | • `Dockview` Workspace Layout<br>• **Motifs Engine** (Code-as-Motion)<br>• Hệ thống 100+ MCP Tools + SSE/WS sync | Cho phép mọi AI Agent (Gemini, Claude, GPT, Local LLM) lái Timeline trực tiếp trước mắt người dùng và tự viết code tạo biểu đồ/motion graphics. |
| **3. Shaders, Chuyển Cảnh & Chỉnh Màu Điện Ảnh** | • `gl-transitions/gl-transitions`<br>• **Shadertoy / ISF Shaders**<br>• `olive-editor/olive` (OCIO Color) | • 100+ GLSL/WGSL Transitions<br>• Camera Shake, 3D Zoom, Glitch, VHS, Halftone<br>• Lift/Gamma/Gain, 3D LUT `.cube`, Color Match | Tạo ra chất lượng hình ảnh mãn nhãn cấp độ CapCut Pro + DaVinci Resolve hoàn toàn tự động hoặc chỉnh tay. |
| **4. AI Computer Vision VFX (Chạy trên GPU)** | • `facebookresearch/sam2` (**SAM 2.1**)<br>• `pq-yang/MatAnyone`<br>• `DepthAnything/Video-Depth-Anything`<br>• `hzwer/Practical-RIFE` & `YOLO11` | • Tách nền chủ thể chuẩn tới sợi tóc<br>• Bản đồ chiều sâu Z-Depth 3D<br>• Nội suy 60/120fps & Auto-Reframe 9:16 | Làm hiệu ứng **Chữ nằm sau lưng người (Text-Behind-Subject)** và biến ảnh tĩnh tải trên mạng thành **cảnh quay 3D Parallax chuyển động có chiều sâu**. |
| **5. Autonomous Web Asset Hunter (Săn Ảnh/B-Roll)** | • `andriidrok1/autobroll`<br>• `harry0703/MoneyPrinterTurbo`<br>• `Playwright` + `SearXNG` + `yt-dlp`<br>• `SigLIP` / VLM Judge + `Flux`/`Veo` | • Pexels, Pixabay, Unsplash, Wikimedia, Giphy<br>• Tự chụp bài báo + tô dạ quang câu trích dẫn<br>• Chấm điểm thẩm mỹ bằng VLM + AI Fallback | Tự đọc kịch bản -> lên mạng săn ảnh/video/bài báo -> lọc bỏ ảnh xấu/watermark -> bắn trực tiếp vào Timeline. |
| **6. Audio Studio, Phụ Đề Động & Beat-Sync** | • `m-bain/whisperX`<br>• `WyattBlue/auto-editor`<br>• `facebookresearch/demucs` & `DeepFilterNet3`<br>• `librosa` + `hkchengrex/MMAudio` + `F5-TTS` | • Timestamp từng từ (mili-giây)<br>• Cắt khoảng lặng & Tách tạp âm<br>• Bắt nhịp trống (Beat-Sync) & Sinh SFX Foley | Phụ đề nhảy kiểu Hormozi/CapCut, xóa chữ là tự cắt hình, tự động cắt cảnh khớp phách nhạc và trộn âm chuẩn `-14 LUFS`. |
| **7. VLM Critic Loop & YouTube Publisher** | • `poseljacob/agentic-video-editor`<br>• `YouTube Data API v3` | • Vòng lặp Giám khảo VLM tự chấm điểm & sửa lỗi<br>• AI Thumbnail Studio + SEO Chapters | Tự xem lại bản dựng, nếu điểm < 9/10 tự bắt các Agent sửa lại cho tới khi hoàn hảo rồi tự đăng lên YouTube. |

---

## 2. Cấu Trúc Monorepo Đã Được Định Hình Sẵn (Architectural Skeleton)

Toàn bộ các hợp đồng dữ liệu (Data Contracts), kiểu thời gian `RationalTime`, giao thức `Live Ghost Cursor`, `TimelineCommand`, bộ `MCP Tool Registry` và `Director Crew Orchestrator` đã được khóa chặt tại:

- [`packages/core-schema/src/rational-time.ts`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/packages/core-schema/src/rational-time.ts) — Toán học thời gian phân số nguyên chống trôi frame.
- [`packages/core-schema/src/timeline.ts`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/packages/core-schema/src/timeline.ts) — Schema chuẩn của toàn bộ Project, Multi-Track, Keyframe Bezier/Spring, Shader, Color Grade, AI VFX (`SAM 2.1`, `3D Depth Parallax`), Motion Code (`Motifs`/`Remotion`), Dynamic Captions (`WhisperX`) và gói xuất bản YouTube.
- [`packages/core-schema/src/agent-protocol.ts`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/packages/core-schema/src/agent-protocol.ts) — Giao thức `AgentCursorState` (Ghost Cursors), `LiveAssetFlightEvent` (hiệu ứng ảnh bay từ Web vào Timeline), `TimelineCommandEnvelope` (cơ chế thực thi lệnh đồng nhất + khóa bảo vệ `lockedByUser` + Undo riêng từng Agent), và `CriticReviewReport`.
- [`packages/mcp-bridge/src/tool-registry.ts`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/packages/mcp-bridge/src/tool-registry.ts) — Danh mục chuẩn hóa các MCP Tools trải rộng trên 8 phân hệ để cắm mọi AI Agent vào điều khiển.
- [`apps/desktop/src/store/useStudioStore.ts`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/apps/desktop/src/store/useStudioStore.ts) — Bộ máy thực thi lệnh (`applyTimelineCommand`) và Selective Agent Undo (`createSelectiveAgentUndo`).
- [`apps/desktop/src-tauri/src/lib.rs`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/apps/desktop/src-tauri/src/lib.rs) — Lõi Rust Native kết nối phần cứng Windows GPU (DirectX 12 / `wgpu` / NVENC / NVDEC).
- [`services/ai-sidecar/agents/director_crew.py`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/services/ai-sidecar/agents/director_crew.py) — Nhạc trưởng điều phối 6 Sub-Agents chạy tự hành từ Frame 0 tới YouTube kèm phát sóng Ghost Cursor thời gian thực.
- [`scripts/clone-references.ps1`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/scripts/clone-references.ps1) — Script PowerShell tự động tải 14 repo mã nguồn mở tham chiếu về máy Windows.

