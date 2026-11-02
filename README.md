# 🎬 Autonomous Studio Pro (`v2.0 NVENC`)

**Autonomous Studio Pro** là trình biên tập video AI tự hành thế hệ mới dành cho **Windows PC** (hỗ trợ đa nền tảng macOS/Linux), kết hợp sức mạnh của **CapCut + DaVinci Resolve + Adobe Premiere Pro** cùng **Hệ thống Sân Khấu Người Que 0-Token (Deterministic Stickman & 2.5D Camera Engine)** và **Cầu Nối Điều Khiển Trực Tiếp Từ VS Code / MCP (`<250ms`)**.

👉 **Đọc tài liệu bàn giao đầy đủ tại:** [`HANDOFF_PROGRESS.md`](HANDOFF_PROGRESS.md)
👉 **Đọc sổ tay điều khiển dành cho Agent ngoài tại:** [`AGENTS.md`](AGENTS.md)
👉 **Đọc kiến trúc tổng thể tại:** [`MASTER_PLAN.md`](MASTER_PLAN.md) & [`CHECKLIST.md`](CHECKLIST.md)

---

## ⚡ Khởi Chạy Nhanh (Quick Start)

### 1. Trên Windows PC (PowerShell 1-Click)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-studio-windows.ps1
```

### 2. Chạy Giao Diện Studio (Windows / macOS / Linux)
```bash
cd apps/desktop
npm install
npm run dev
```

### 3. Kết Xuất Thử Video `.mp4` Bằng Engine Người Que 0-Token (Không Cần Token AI)
```bash
python3 scripts/studio_agent_cli.py render-video \
  --agent-name "⚡ Flash Worker Agent" \
  --genre "economics-stickman" \
  --duration 3.0 \
  --script "FED hạ lãi suất khẩn cấp! Dòng tiền thông minh bùng nổ trên biểu đồ!" \
  --output "exports/flash_stickman_demo_3s.mp4"
```
