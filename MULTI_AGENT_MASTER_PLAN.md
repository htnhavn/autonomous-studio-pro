# 🔥 KẾ HOẠCH TỔNG LỰC XÓA BỎ MOCK/STUB & HOÀN THIỆN SẢN PHẨM THẬT 100% (`MULTI_AGENT_MASTER_PLAN.md`)

> **NGUYÊN TẮC TỐI THƯỢNG (CẤM TỰ NGHIỆM THU TỰ KHEN):**
> 1. **CẤM GIẢ LẬP (`setInterval`, `setTimeout`, `asyncio.sleep`, dữ liệu gắn cứng):** Mọi nút bấm trên UI và mọi hàm trong Backend/Worker phải thực hiện xử lý dữ liệu thật, tạo file thật trên ổ cứng, và trả kết quả thật.
> 2. **BẮT BUỘC TẠO SẢN PHẨM THẬT (`real_product_ verification`):** Quá trình kiểm thử cuối cùng phải chạy 1 dự án sản xuất video thực tế từ đầu đến cuối và xuất ra thư mục sản phẩm thật `output_product/` gồm:
>    - File âm thanh `.wav` thật (có tiếng nói/giai điệu + khoảng lặng thật để cắt silence và bắt nhịp beat).
>    - Gói dự án `.vproj` thật trên đĩa + file `.otio` thật + ảnh storyboard contact sheet thật của từng cảnh.
>    - File video `.mp4` thành phẩm thật (nhiều cảnh, có nhân vật cử động theo đúng 12 action mới, có đồ thị biến thiên, có phụ đề chạy từng từ, có âm thanh đa luồng).

---

## 🛑 DANH SÁCH 6 HẠNG MỤC ĐANG LÀ MOCK / CHƯA NỐI THẬT PHẢI SỬA TRIỆT ĐỂ

Qua rà soát thực tế từng dòng code, đây là 6 điểm chưa hoàn thiện mà 4 Agent Flash phải xóa bỏ hoàn toàn:

1. **Lỗi 1 — `ExportPublishModal.tsx` (Dòng 78–93) đang chạy thanh tiến trình giả (`setInterval`):**
   - Hiện tại bấm "Export" chỉ đếm số giả từ 0% lên 100%, không hề tạo ra file video nào!
   - **Phải sửa thành:**
     - Gọi trực tiếp sang Sidecar HTTP API (`POST http://127.0.0.1:8765/api/render-mp4`) hoặc Tauri Rust IPC (`run_native_stage_mp4_render`) truyền toàn bộ kịch bản/timeline hiện tại để kết xuất file `.mp4` thật và trả về đường dẫn/link tải file `.mp4` thật.
     - Nếu chạy độc lập trên trình duyệt không bật Sidecar, phải dùng **HTML5 Canvas + WebAudio + `MediaRecorder` API** để quay trực tiếp các frame của `ProgramMonitor` theo thời gian thực và tải xuống file video `.webm`/`.mp4` thật!

2. **Lỗi 2 — `ProgramMonitor.tsx` (Dòng 208–220) chưa đồng bộ khung hình `<video>` theo Playhead & chưa phát âm thanh thật:**
   - Hiện tại thẻ `<video autoPlay loop muted>` chạy tự do, không ăn theo thanh thời gian `playheadTime` khi người dùng tua hoặc bấm Spacebar, và hoàn toàn không phát tiếng.
   - **Phải sửa thành:**
     - Gắn `ref` vào thẻ `<video>` và `<audio>`, mỗi khi `playheadTime` thay đổi hoặc đang `isPlaying`, phải tính chính xác `clipLocalTimeSec = currentSec - clipStartSec + sourceStartSec` và đồng bộ `videoEl.currentTime`.
     - Tích hợp bộ phát âm thanh WebAudio (`AudioContext`) để phát tiếng thật từ các clip trên `track-audio-voice`, `track-audio-music`, `track-audio-sfx` (kèm hiệu ứng giảm âm lượng nhạc nền `duckingAmountDb` thật khi có giọng đọc!).

3. **Lỗi 3 — `MediaPoolPanel.tsx` (Dòng 116 & 132–169) gán cứng thời lượng 4.0s và tìm kiếm B-Roll giả:**
   - Khi người dùng chọn file `.mp4` / `.wav` từ máy tính, code đang gán cứng `4.0 giây` thay vì đọc thời lượng (`duration`), chiều rộng (`videoWidth`), chiều cao (`videoHeight`) thật của file.
   - **Phải sửa thành:**
     - Dùng thẻ `<video>` / `<audio>` ẩn đọc sự kiện `loadedmetadata` để lấy đúng `duration`, `videoWidth`, `videoHeight` thật trước khi đưa vào `MediaPool` và `AssetRegistry` (kèm tính mã băm SHA-256 thật bằng `crypto.subtle.digest('SHA-256', arrayBuffer)`).
     - Ô tìm kiếm Web Hunter phải gọi `POST http://127.0.0.1:8765/api/hunt-broll` (hoặc kho dữ liệu đa chủ đề thực tế) và chèn đúng thời lượng, đúng thẻ ngữ nghĩa.

4. **Lỗi 4 — `useStudioStore.ts` bị tách làm 2 hệ thống lệnh (`dispatchCommand` cũ và `dispatchGatewayCommand` mới):**
   - Khi `AutonomousProductionHubPanel` biên dịch `VideoDSLSpecification v1.0.0` qua `compileAndExecuteVideoDsl`, nó mới chỉ tạo clip trên `track-stage-1`, chưa tự động sinh các token phụ đề từng chữ (`WordTimestampToken`) trên `track-caption-1` (khiến tab `Text-Based Editing` không có chữ của kịch bản mới), và chưa tạo clip âm thanh trên `track-audio-voice`.
   - **Phải sửa thành:**
     - Hợp nhất để khi biên dịch `VideoDSL v1.0` hoặc chạy `PROJECT_COMPILE_DETERMINISTIC_STAGE`, hệ thống tự động tạo đầy đủ:
       1. Các clip sân khấu trên `track-stage-1` (với đúng `actionId` từ 12 hành động chuẩn).
       2. Các clip phụ đề từng từ (`WordTimestampToken` khớp chính xác với thời gian từng cảnh) trên `track-caption-1` để tab `TranscriptEditorPanel` sửa/xóa chữ cắt video được ngay!
       3. Các marker nhịp beat (`beatGrid.markers`) khớp với từng điểm chuyển cảnh.

5. **Lỗi 5 — `services/ai-sidecar/` (`main.py`, `director_graph.py`, `vlm_critic.py`, `broll_hunter.py`) vẫn còn code giả lập (`asyncio.sleep`):**
   - `director_graph.py` đang dùng `asyncio.sleep(0.6)` bắn dữ liệu mẫu; `vlm_critic.py` trả về điểm `94/100` cứng; `main.py` thiếu các REST API thực tế cho UI gọi.
   - **Phải sửa thành:**
     - Trong `services/ai-sidecar/main.py`: Mở đầy đủ các endpoint REST thật (có CORS cho `http://localhost:5173`):
       - `POST /api/compile-dsl`: Nhận prompt/script $\rightarrow$ trả về `VideoDSLSpecification v1.0.0` đầy đủ.
       - `POST /api/render-mp4`: Nhận cấu hình dự án/scenes $\rightarrow$ gọi `native_stage_renderer.py` kết xuất ra file `.mp4` thật và trả về file/URL.
       - `POST /api/audio-analyze`: Nhận đường dẫn file `.wav` $\rightarrow$ chạy `AudioStudioPipeline` trả về danh sách khoảng lặng RMS thật, nhịp BPM thật và phụ đề từng từ khớp với văn bản kịch bản.
       - `POST /api/vlm-critic`: Chạy kiểm tra chất lượng khung hình/bố cục thật (kiểm tra đè chữ, thiếu asset, khoảng trống đen, độ tương phản màu) và trả về báo cáo QA thật.
     - Trong `vlm_critic.py` & `director_graph.py`: Xóa bỏ dữ liệu gắn cứng, tính toán trực tiếp từ dữ liệu dự án và khung hình thực tế.

6. **Lỗi 6 — `batch-dag.ts` & `native_stage_renderer.py` chưa tạo gói sản phẩm thực tế đầy đủ khi chạy Batch DAG:**
   - Cần có một trình thực thi Batch DAG thực tế (`scripts/build_real_product_e2e.py`) chạy toàn bộ quy trình từ kịch bản $\rightarrow$ `VideoDSL v1.0` $\rightarrow$ tạo file giọng đọc/nhạc nền `.wav` thật $\rightarrow$ phân tích RMS/Beat thật $\rightarrow$ vẽ ảnh Storyboard Contact Sheet thật cho từng cảnh $\rightarrow$ đóng gói `.vproj` + `.otio` thật $\rightarrow$ kết xuất file video `.mp4` đa cảnh thật!

---

## 👥 PHÂN CÔNG ĐỘC QUYỀN CHO 4 AGENT FLASH (CHẠY SONG SONG KHÔNG ĐỤNG FILE)

| Mã Agent | Phạm Vi File Độc Quyền | Nhiệm Vụ Bắt Buộc Hoàn Thành |
| :--- | :--- | :--- |
| **AGENT 1 (`Flash-Core-Gateway`)** | `packages/core-schema/src/**`<br>`packages/stage-engine/src/**`<br>`apps/desktop/src/store/useStudioStore.ts` | 1. Sửa `compileVideoDslToGatewayCommands` trong `command-gateway.ts` để khi biên dịch `VideoDSL v1.0`, nó sinh đồng bộ cả **Stage Clips (`track-stage-1`)** LẪN **Word-level Caption Clips (`track-caption-1`)** từ `subtitleTiming` của từng cảnh.<br>2. Bổ sung `importOtioDocumentToGatewayCommands` trong `interchange-adapters.ts` để đọc ngược file `.otio` thành lệnh `InsertClip`.<br>3. Đảm bảo mọi thao tác trong `useStudioStore.ts` đồng bộ hoàn toàn giữa `project` và `gatewayState`. |
| **AGENT 2 (`Flash-Commercial-UI`)** | `apps/desktop/src/components/**`<br>`apps/desktop/src/hooks/**`<br>`apps/desktop/src/utils/**` | 1. **`ExportPublishModal.tsx`**: Xóa bỏ `setInterval` giả! Thêm chức năng kết xuất video thật: gọi `POST http://127.0.0.1:8765/api/render-mp4` (hoặc Tauri IPC `run_native_stage_mp4_render`) VÀ tích hợp trình ghi `MediaRecorder` quay trực tiếp Canvas để tải file `.webm`/`.mp4` thật về máy.<br>2. **`ProgramMonitor.tsx`**: Đồng bộ `currentTime` của thẻ `<video>` theo đúng `playheadTime`, hỗ trợ nút Fullscreen thật (`requestFullscreen`), và tạo synthesizer/WebAudio phát âm thanh phản hồi khi Preview.<br>3. **`MediaPoolPanel.tsx`**: Đọc `duration`, `videoWidth`, `videoHeight` thật từ file người dùng import + tính mã băm SHA-256 thật bằng WebCrypto API.<br>4. **`StagePlaybookPanel.tsx`**: Hiển thị và cho phép chọn trực tiếp cả 12 hành động chuẩn (`standing`, `walking`, `running`, `sitting`, `talking`, `explaining`, `pointing`, `thinking`, `reacting`, `falling`, `working`, `holding-object`). |
| **AGENT 3 (`Flash-Native-Rust`)** | `apps/desktop/src-tauri/**` | 1. Hoàn thiện `apps/desktop/src-tauri/src/lib.rs`, `main.rs`, `ffmpeg_render.rs`, `media_server.rs` để biên dịch sạch 100% với `cargo test --lib` và `cargo check`.<br>2. Bổ sung hàm kiểm tra header MP4 (`verify_mp4_ftyp_moov_atoms`) trong `ffmpeg_render.rs` để kiểm chứng file `.mp4` xuất ra là video thật, không phải file rỗng. |
| **AGENT 4 (`Flash-Sidecar-RealProduct`)** | `services/ai-sidecar/**`<br>`scripts/**`<br>`tests/**`<br>`TEST_REPORT.md` | 1. Nâng cấp `services/ai-sidecar/main.py`, `director_graph.py`, `vlm_critic.py`, `audio_studio.py`, `broll_hunter.py`: xóa mọi mock cố định, mở các endpoint REST thật (`/api/compile-dsl`, `/api/render-mp4`, `/api/audio-analyze`, `/api/vlm-critic`).<br>2. Viết và chạy kịch bản tạo sản phẩm thật **`scripts/build_real_product_e2e.py`** sinh ra bộ sản phẩm hoàn chỉnh trong thư mục `output_product/` gồm:<br>   - `output_product/voiceover_and_beats.wav` (file WAV PCM 16kHz thật có tiếng + khoảng lặng + nhịp beat)<br>   - `output_product/macro_crisis_2026.vproj.json` (gói `.vproj` thật chứa `ai_context.json` và báo cáo QA thật)<br>   - `output_product/macro_crisis_2026.otio` (file OpenTimelineIO thật)<br>   - `output_product/storyboard_contact_sheet.bmp` (ảnh storyboard thật vẽ từ các cảnh)<br>   - `output_product/macro_crisis_2026_master.mp4` (video MP4 H.264 + AAC 60fps thật dài 9 giây, 3 phân cảnh Kinh tế/Vũ trụ/Lore)<br>3. Mở rộng `tests/run_acceptance_suite.ts` để kiểm tra luôn sự tồn tại và tính hợp lệ của các file sản phẩm thật trong `output_product/`! |

---

## ✅ TIÊU CHUẨN NGHIỆM THU CUỐI CÙNG (KHÔNG ĐƯỢC BÁO CÁO XONG NẾU THIẾU BẤT KỲ ĐIỀU KIỆN NÀO)

Chỉ khi cả 4 lệnh kiểm chứng thực tế dưới đây chạy thành công 100% (`exit code 0`) thì dự án mới được công nhận hoàn tất:

```bash
export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$HOME/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# 1. Tạo Sản Phẩm Thật End-to-End (WAV + .vproj + .otio + Storyboard + Video MP4 9 giây 3 cảnh):
python3 scripts/build_real_product_e2e.py
ls -lh output_product/

# 2. Chạy Bộ Kiểm Thử Nghiệm Thu Tự Động (T01..T04, WF1..WF5 + Kiểm tra file sản phẩm thật):
./apps/desktop/node_modules/.bin/esbuild tests/run_acceptance_suite.ts --bundle --platform=node --outfile=/tmp/run_acceptance_suite.cjs
node -e "const { runAllArchitectureTests } = require('/tmp/run_acceptance_suite.cjs'); const res = runAllArchitectureTests(); if (res.failed > 0) process.exit(1);"

# 3. Kiểm tra Build Giao Diện Thương Mại (TypeScript + Vite Production Bundle):
(cd apps/desktop && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build)

# 4. Kiểm tra Nhân Rust Tauri v2 Native Desktop App:
(cd apps/desktop/src-tauri && cargo test --lib && cargo check)
```
