# 🔄 TRẠM ĐIỀU PHỐI SONG SONG: ARCHITECT (ARGON) ⟷ MULTI-AGENT FLASH TEAM

```yaml
STATE: FLASH_DONE_BATCH
CURRENT_BATCH: BATCH_13_ZERO_MOCK_REAL_PRODUCT_AND_FULL_APP_COMPLETION
LAST_ARCHITECT_AUDIT: STRICT_ZERO_MOCK_AUDIT_PASSED
LAST_FLASH_COMPLETED: BATCH_13_ZERO_MOCK_REAL_PRODUCT_AND_FULL_APP_COMPLETION
LAST_FLASH_COMPLETED: BATCH_11_TAURI_NATIVE_SCAFFOLD_DONE
```

---

## 🚨 LỆNH NGHIÊM NGẶT TỪ ARCHITECT & USER: XÓA BỎ MỌI MOCK/STUB, TẠO SẢN PHẨM THẬT & HOÀN THIỆN TOÀN BỘ APP

Người dùng đã chỉ ra rất đúng: **Không chấp nhận bất kỳ tính năng nào chỉ dừng ở mức phân tích (schema/mock) hay thanh tiến trình giả (`setInterval`) rồi tự nghiệm thu tự khen!**

Architect đã rà soát lại toàn bộ từng dòng code trong dự án và liệt kê **6 hạng mục còn giả lập / chưa nối thật** trong [`MULTI_AGENT_MASTER_PLAN.md`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/MULTI_AGENT_MASTER_PLAN.md):
1. `ExportPublishModal.tsx` đang dùng `setInterval` giả lập tiến trình xuất video $\rightarrow$ **Phải sửa để xuất file video `.mp4`/`.webm` thật** (qua API `/api/render-mp4`, Tauri IPC `run_native_stage_mp4_render` và `MediaRecorder` quay Canvas thật).
2. `ProgramMonitor.tsx` thẻ `<video>` đang `autoPlay loop` tự do $\rightarrow$ **Phải đồng bộ `video.currentTime` chính xác theo `playheadTime` từng frame và phát âm thanh WebAudio thật**.
3. `MediaPoolPanel.tsx` đang gán cứng thời lượng 4.0s khi import file $\rightarrow$ **Phải đọc `duration`, `videoWidth`, `videoHeight` thật từ metadata của file và băm SHA-256 thật bằng WebCrypto**.
4. `compileVideoDslToGatewayCommands` trong `command-gateway.ts` mới chỉ tạo clip trên `track-stage-1` $\rightarrow$ **Phải tự động tạo cả clip phụ đề từng chữ (`WordTimestampToken`) trên `track-caption-1`** để `TranscriptEditorPanel` sửa/cắt chữ được ngay trên kịch bản mới, kèm hàm `importOtioDocumentToGatewayCommands` trong `interchange-adapters.ts`.
5. `services/ai-sidecar/` (`main.py`, `director_graph.py`, `vlm_critic.py`, `broll_hunter.py`) còn `asyncio.sleep` và dữ liệu gắn cứng $\rightarrow$ **Phải thay bằng xử lý dữ liệu thật và mở các REST endpoint thật (`/api/compile-dsl`, `/api/render-mp4`, `/api/audio-analyze`, `/api/vlm-critic`)**.
6. **BẮT BUỘC viết và chạy `scripts/build_real_product_e2e.py`** tạo ra thư mục sản phẩm thật `output_product/` trên ổ cứng gồm:
   - `output_product/voiceover_and_beats.wav` (file WAV 16kHz thật có tín hiệu âm thanh, khoảng lặng và nhịp beat thật, được kiểm chứng bằng `AudioStudioPipeline`)
   - `output_product/macro_crisis_2026.vproj.json` (gói `.vproj` thật + `ai_context.json` + QA report thật)
   - `output_product/macro_crisis_2026.otio` (file OpenTimelineIO thật)
   - `output_product/storyboard_contact_sheet.bmp` (ảnh Storyboard thật được vẽ pixel-by-pixel từ 3 phân cảnh)
   - `output_product/macro_crisis_2026_master.mp4` (file video MP4 H.264 + AAC 60fps thật dài 9.0 giây gồm 3 phân cảnh hoàn chỉnh, kiểm tra kích thước & MP4 atoms `ftyp`/`moov`/`mdat` hợp lệ).

### ⚡ YÊU CẦU CHO FLASH (HOẶC 4 AGENT FLASH CHẠY SONG SONG):
Hãy đọc kỹ [`MULTI_AGENT_MASTER_PLAN.md`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/MULTI_AGENT_MASTER_PLAN.md), chia việc cho 4 subagent (`AGENT 1: Flash-Core-Gateway`, `AGENT 2: Flash-Commercial-UI`, `AGENT 3: Flash-Native-Rust`, `AGENT 4: Flash-Sidecar-RealProduct`) hoặc thực thi tuần tự cả 4 mảng, chạy thật `python3 scripts/build_real_product_e2e.py`, chạy thật toàn bộ 4 cổng kiểm tra trong `MULTI_AGENT_MASTER_PLAN.md` và ghi bằng chứng file thật (dung lượng byte, mã SHA-256, thời lượng) vào `TEST_REPORT.md`!
