# 🎬 MÔ THỨC ĐIỀU KHIỂN AUTONOMOUS STUDIO PRO CHO AGENT BÊN NGOÀI (`AGENTS.md`)

> **Dành cho mọi AI Agent kết nối từ VS Code, Antigravity, Cursor, Claude Code hoặc MCP:**
> Khi người dùng yêu cầu bạn *"tạo video"*, *"dựng cảnh người que kinh tế / vũ trụ / lore"*, *"thêm B-Roll"*, *"chỉnh màu"*, hay *"biên tập timeline"*, bạn **KHÔNG CẦN** sửa code React thủ công. Hãy điều khiển trực tiếp ứng dụng **Autonomous Studio Pro** đang chạy thông qua **MCP Server (`autonomous-video-studio`)** hoặc công cụ CLI **[`scripts/studio_agent_cli.py`](file:///Users/will/Documents/Codes/AI%20Video%20Editor/scripts/studio_agent_cli.py)**!
> Mọi lệnh bạn chạy sẽ lập tức hiển thị **Con Trỏ AI (Live Ghost Cursor)** của bạn bay lượn trên màn hình Studio của người dùng trong `<250ms`!

---

## ⚡ 1. CÁC LỆNH ĐIỀU KHIỂN TRỰC TIẾP TỪ TERMINAL / VS CODE (`studio_agent_cli.py`)

### A. Dựng ngay toàn bộ Video bằng Bộ Sân Khấu & Move-Set có sẵn (0% Token AI, <50ms)
```bash
python3 scripts/studio_agent_cli.py compile-stage \
  --agent-name "🤖 VS Code Agent" \
  --genre "economics-stickman" \
  --script "Tại sao FED tăng lãi suất lại gây chấn động? Hãy nhìn vào biểu đồ cung cầu và dòng tiền khổng lồ đang rút khỏi thị trường. Nhưng cơ hội lớn luôn ẩn sau mỗi cuộc khủng hoảng!"
```
* `--genre` hỗ trợ 3 bộ kit:
  1. `economics-stickman`: 📈 **Kinh tế / Tài chính Người Que** (Bảng phấn đen, Bloomberg Terminal, Kho bạc FED, mưa tiền đô-la, đồ thị cung cầu, nến chứng khoán).
  2. `universe-cosmic`: 🌌 **Vũ trụ & Khoa học** (Tinh vân sâu, Chân trời sự kiện hố đen, Hệ mặt trời, Phi hành gia lơ lửng, So sánh kích thước hành tinh/hố đen).
  3. `lore-chronicle`: 📜 **Deep Lore & Lịch sử** (Bản đồ da dê cổ, Bàn sa bàn chiến thuật, Học giả/Hiệp sĩ cầm kiếm sáng, Đường hành quân trên bản đồ).

### B. Di chuyển Con Trỏ AI (Ghost Cursor) của bạn trên Timeline của App
```bash
python3 scripts/studio_agent_cli.py cursor \
  --agent-name "🤖 VS Code Agent" \
  --time 4.5 \
  --status "cutting" \
  --bubble "🤖 VS Code Agent đang tinh chỉnh góc máy 2.5D & chèn B-Roll..."
```

### C. Phóng học liệu B-Roll (Live Asset Flight) & Chèn thẳng vào Timeline
```bash
python3 scripts/studio_agent_cli.py insert-broll \
  --agent-name "🤖 VS Code Agent" \
  --query "Wall Street Stock Market Crash" \
  --url "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80" \
  --start 3.5 \
  --duration 4.0 \
  --shader "capcut.3d-zoom-pro"
```

### D. Tinh chỉnh Sân Khấu / Move-Set / Góc Quay 2.5D / Chỉnh màu DaVinci bằng Raw Command
```bash
python3 scripts/studio_agent_cli.py command \
  --agent-name "🤖 VS Code Agent" \
  --time 2.0 \
  --bubble "🎨 VS Code Agent đang áp màu điện ảnh DaVinci & hiệu ứng CRT..." \
  --json '{"type":"CLIP_SET_COLOR_GRADE","clipId":"clip-stage-intro-1","colorGrade":{"enabled":true,"exposure":{"staticValue":0.25,"keyframes":[]},"contrast":{"staticValue":1.2,"keyframes":[]},"temperature":{"staticValue":0.35,"keyframes":[]},"halationIntensity":{"staticValue":0.4,"keyframes":[]}}}'
```

### E. Chạy toàn bộ Multi-Agent Workflow từ Prompt JSON có cấu trúc (End-to-End)
```bash
python3 scripts/studio_agent_cli.py workflow-run \
  --agent-name "🤖 VS Code Agent" \
  --genre "economics-stickman" \
  --script "Tại sao FED tăng lãi suất lại gây chấn động toàn cầu? Hãy nhìn vào biểu đồ cung cầu và thanh khoản. Cơ hội luôn xuất hiện sau khủng hoảng!" \
  --duration 9.0
```
Tự động kích hoạt toàn bộ 4 module:
1. **Asset Hunter**: Tải media thật về `cache/assets/` & đăng ký vào Media Pool.
2. **Video & Shader**: Dựng sân khấu 2.5D, góc máy, Ken Burns, shader `capcut.3d-zoom-pro` và `capcut.rgb-stroke`.
3. **Audio Studio**: Lấy beat grid, cắt khoảng lặng WhisperX, áp Auto-Ducking (-14dB).
4. **Dynamic Caption**: Đặt phụ đề từng từ chuẩn phong cách Hormozi / CapCut.

### F. Nhận Visual & Audio Feedback từ App để AI kiểm tra trước khi bắn lệnh
```bash
python3 scripts/studio_agent_cli.py inspect-feedback
```
Trả về JSON cấu trúc gồm:
- Danh sách học liệu thật đã tải về (đường dẫn file, kích thước byte, định dạng).
- Các clip đang nằm trên các track timeline (vị trí giây, shader, màu sắc DaVinci).
- Tình trạng âm thanh (Auto-Ducking dB, nhịp BPM, khoảng lặng).
- Báo cáo VLM Critic QA (điểm bám sát kịch bản, visual quality, pacing).
- Từ đó AI đưa ra quyết định cắt gọt hoặc re-grade chính xác.

---

## 🎭 2. BỘ TỪ ĐIỂN MOVE-SETS, GÓC MÁY 2.5D & WIDGETS DỰNG SẴN CHO AGENT

1. **18 Cử Động Người Que (`moveSet`):**
   - Thuyết trình: `idle-breathe`, `talk-casual-gesture`, `talk-excited-wide-arms`, `point-chart-upper-right`, `point-chart-lower-right`, `think-chin-scratch`, `shrug-confused`, `walk-stage-left-to-right`
   - Kinh tế: `econ-panic-head-grab`, `econ-celebrate-stonks`, `econ-crank-money-printer`, `econ-balance-scale-hold`, `econ-carry-heavy-debt`
   - Vũ trụ: `cosmic-zero-g-float`, `cosmic-mind-blown-head`, `cosmic-look-telescope`
   - Lore / Lịch sử: `lore-read-ancient-scroll`, `lore-raise-glowing-sword`, `lore-kneel-oath`
2. **12 Góc Máy 2.5D (`cameraRig`):**
   - `static-stage-wide`, `slow-push-in-dramatic`, `slow-pull-out-reveal`, `crash-zoom-face-punch`, `whip-pan-left-to-right`, `whip-pan-to-chart-right`, `dutch-tilt-crisis-shake`, `orbital-3d-parallax-float`, `cosmic-infinite-zoom-out`, `map-flyover-top-down`, `spotlight-isolate-speaker`, `split-focus-actor-and-chart`
3. **6 Widget Sân Khấu (`widget.kind`):**
   - `econ.supply-demand-curve`, `econ.stock-candlestick-crash`, `econ.inflation-money-stack`, `cosmic.scale-comparison-spheres`, `lore.animated-map-march-line`, `lore.boss-item-stat-card`

---

## 📋 3. QUY TRÌNH CHUẨN 4 BƯỚC (SOP PLAYBOOK) KHI NGƯỜI DÙNG GIAO VIỆC TỪ VS CODE

Khi người dùng nói: *"Ê Agent, làm cho t một video về [Chủ đề]..."*:
1. **Bước 1 (Nhận Prompt JSON & Phân chia việc):** Chạy `python3 scripts/studio_agent_cli.py workflow-run` với kịch bản và `--genre` phù hợp. App lập tức phân chia công việc cho Asset Hunter, Video/Shader, Audio Studio, và Dynamic Caption.
2. **Bước 2 (Kiểm tra Feedback):** Chạy `python3 scripts/studio_agent_cli.py inspect-feedback` để AI nhìn thấy các file đã tải về, kiểm tra xem có đúng kịch bản yêu cầu không.
3. **Bước 3 (Tinh chỉnh DaVinci & Shader):** Chạy `python3 scripts/studio_agent_cli.py command` áp `CLIP_SET_COLOR_GRADE` hoặc `CLIP_APPLY_SHADER` nếu cần đẩy cảm xúc cao trào.
4. **Bước 4 (Báo cáo):** Đặt Ghost Cursor về trạng thái `idle` với `--bubble "✅ VS Code Agent đã dựng xong bản Master!"`.


