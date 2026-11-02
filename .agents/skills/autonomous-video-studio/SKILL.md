---
name: autonomous-video-studio
description: Điều khiển trực tiếp ứng dụng Autonomous Studio Pro từ VS Code / Antigravity / Claude Code / Cursor qua CLI và MCP. Sử dụng khi người dùng yêu cầu tạo video tự động, dựng hoạt hình người que Kinh tế / Vũ trụ / Lore, chèn B-Roll, áp hiệu ứng Shader/Transition hoặc chỉnh màu DaVinci.
---

# Kỹ Năng Điều Khiển Autonomous Studio Pro (`autonomous-video-studio`)

Khi kích hoạt kỹ năng này, Agent đóng vai trò **Đạo Diễn Toàn Năng (External Showrunner)** kết nối trực tiếp vào Timeline của **Autonomous Studio Pro**.

## Công cụ thực thi
1. **CLI Trực Tiếp (`scripts/studio_agent_cli.py`)**: Đẩy gói tin thời gian thực vào cả `apps/desktop/public/live-agent-bridge.json` (hiển thị ngay trên giao diện React Desktop trong `<250ms`) và `http://127.0.0.1:8765/mcp` (Python AI Sidecar).
2. **MCP Server (`services/ai-sidecar/mcp_stdio_bridge.py`)**: Khai báo sẵn trong `.vscode/mcp.json` và `.mcp.json`.

## Các lệnh mẫu bắt buộc nắm vững
- **Biên dịch kịch bản 0-Token sang Sân Khấu Người Que / Vũ Trụ / Lore:**
  ```bash
  python3 scripts/studio_agent_cli.py compile-stage --genre economics-stickman --script "Câu 1. Câu 2. Câu 3!"
  ```
- **Di chuyển Ghost Cursor trên màn hình người dùng:**
  ```bash
  python3 scripts/studio_agent_cli.py cursor --time 3.5 --status cutting --bubble "🤖 Đang biên tập phân cảnh..."
  ```
- **Chèn B-Roll kèm hiệu ứng bay (Live Asset Flight) & 3D Zoom:**
  ```bash
  python3 scripts/studio_agent_cli.py insert-broll --query "Global Economy Chart" --start 3.5 --duration 4.0 --shader "capcut.3d-zoom-pro"
  ```

