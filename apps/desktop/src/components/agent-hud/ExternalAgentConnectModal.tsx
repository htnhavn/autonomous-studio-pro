/**
 * @file ExternalAgentConnectModal.tsx
 * @description External Agent Hub & MCP Connection Modal.
 * Connects VS Code, Antigravity, Claude Code, Cursor, and MCP clients to Autonomous Studio Pro.
 * Provides live telemetry, 1-click test simulation, copyable SOP prompts, and CLI cheatsheets.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { ActiveExternalAgentInfo } from '../../hooks/useSidecarSocket';
import { STUDIO_AI_PLAYBOOKS } from '../../../../../packages/mcp-bridge/src/ai-playbooks';
import {
  X,
  Bot,
  Zap,
  Terminal,
  Copy,
  Check,
  Radio,
  ExternalLink,
  Code2,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export interface ExternalAgentConnectModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly activeExternalAgent?: ActiveExternalAgentInfo | null;
}

export const ExternalAgentConnectModal: React.FC<ExternalAgentConnectModalProps> = ({
  isOpen,
  onClose,
  activeExternalAgent,
}) => {
  const updateAgentCursor = useStudioStore((s) => s.updateAgentCursor);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'playbooks' | 'cli'>('status');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      /* clipboard unavailable (e.g. headless / insecure context) */
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  /**
   * Fires a live test agent command directly into the timeline
   * (moves ghost cursor + compiles stage scene)
   */
  const handleRunTestAgent = () => {
    setIsTesting(true);
    const agentId = 'agent_vscode_external';
    const agentName = '🤖 VS Code / Antigravity Agent';

    // 1. Send Ghost Cursor
    updateAgentCursor({
      agentId,
      displayName: agentName,
      role: 'external-mcp',
      colorHex: '#06B6D4',
      provider: 'external-mcp',
      status: 'thinking',
      currentTimelineTime: { value: 0, rate: 60 },
      liveActionBubble: '⚡ [VS Code Agent] Đang kết nối trực tiếp qua MCP Bridge...',
      reasoningStream: 'Emulating external agent command dispatch from VS Code CLI.',
      updatedAtMs: Date.now(),
    });

    // 2. Dispatch stage compilation command after 700ms
    setTimeout(() => {
      dispatchCommand({
        commandId: `cmd_test_${Date.now()}`,
        actor: {
          kind: 'agent',
          id: agentId,
          role: 'external-mcp',
          displayName: agentName,
        },
        timestampMs: Date.now(),
        reasoning: 'External VS Code Agent compiled test stage scene.',
        command: {
          type: 'PROJECT_COMPILE_DETERMINISTIC_STAGE',
          scriptText:
            'Tại sao FED tăng lãi suất lại gây chấn động toàn cầu? Hãy nhìn vào biểu đồ cung cầu và dòng tiền khổng lồ đang dịch chuyển. Cơ hội lớn luôn xuất hiện sau khủng hoảng!',
          genreKit: 'economics-stickman',
          replaceExistingStageTrack: false,
        },
      });

      updateAgentCursor({
        agentId,
        displayName: agentName,
        role: 'external-mcp',
        colorHex: '#06B6D4',
        provider: 'external-mcp',
        status: 'idle',
        currentTimelineTime: { value: 240, rate: 60 },
        liveActionBubble: '✅ [VS Code Agent] Đã dựng thành công phân cảnh sân khấu thử nghiệm!',
        reasoningStream: 'Deterministic stage compiled with 0 AI tokens in 3ms.',
        updatedAtMs: Date.now(),
      });

      setIsTesting(false);
    }, 800);
  };

  const playbookPrompts = [
    {
      key: 'econ',
      title: '📈 Kinh Tế / Tài Chính Người Que',
      genre: 'economics-stickman',
      tag: '0 Token AI • Bảng Đen • Mưa Tiền • Nến Đỏ',
      prompt:
        'Hãy đọc file AGENTS.md và dùng scripts/studio_agent_cli.py để dựng cho tôi một video 60s chủ đề [Chủ đề kinh tế/tài chính của bạn] theo mô thức Kinh Tế Người Que (economics-stickman), chèn thêm 2 B-Roll và chỉnh màu DaVinci trực tiếp lên app!',
    },
    {
      key: 'cosmic',
      title: '🌌 Vũ Trụ & Khoa Học Kỳ Bí',
      genre: 'universe-cosmic',
      tag: '2.5D Parallax • Hố Đen • Phi Hành Gia',
      prompt:
        'Hãy đọc file AGENTS.md và dùng scripts/studio_agent_cli.py để dựng cho tôi một video 60s chủ đề [Chủ đề vũ trụ/khoa học của bạn] theo mô thức Vũ Trụ & Khoa Học (universe-cosmic), chèn góc máy 2.5D orbital-3d-parallax-float và widget so sánh kích thước!',
    },
    {
      key: 'lore',
      title: '📜 Deep Lore & Lịch Sử Hào Hùng',
      genre: 'lore-chronicle',
      tag: 'Bản Đồ Cổ • Sa Bàn • Kiếm Phát Sáng',
      prompt:
        'Hãy đọc file AGENTS.md và dùng scripts/studio_agent_cli.py để dựng cho tôi một video 60s chủ đề [Chủ đề lịch sử/lore của bạn] theo mô thức Deep Lore & Lịch Sử (lore-chronicle), vẽ đường hành quân trên bản đồ cổ và chỉnh màu điện ảnh cổ điển!',
    },
    {
      key: 'zero_token',
      title: '⚡ 0-Token Instant Compiler',
      genre: 'deterministic-fast',
      tag: 'Tốc Độ <50ms • Move-Set Có Sẵn • 0% Token',
      prompt:
        'Hãy đọc file AGENTS.md và chạy scripts/studio_agent_cli.py compile-stage --genre economics-stickman --script "[Nhập 4-8 câu kịch bản của bạn vào đây]" để dựng ngay toàn bộ video 0% token trong <50ms!',
    },
  ];

  const cliSnippets = [
    {
      key: 'cli_compile',
      label: 'Dựng ngay toàn bộ Video Sân Khấu (0 Token, <50ms)',
      cmd: `python3 scripts/studio_agent_cli.py compile-stage \\\n  --agent-name "🤖 VS Code Agent" \\\n  --genre "economics-stickman" \\\n  --script "Tại sao FED tăng lãi suất lại gây chấn động? Hãy nhìn vào dòng tiền khổng lồ đang rút khỏi thị trường!"`,
    },
    {
      key: 'cli_cursor',
      label: 'Điều khiển Live Ghost Cursor trên Timeline của Studio',
      cmd: `python3 scripts/studio_agent_cli.py cursor \\\n  --agent-name "🤖 VS Code Agent" \\\n  --time 4.5 \\\n  --status "cutting" \\\n  --bubble "🤖 VS Code Agent đang tinh chỉnh góc máy 2.5D & chèn B-Roll..."`,
    },
    {
      key: 'cli_broll',
      label: 'Phóng Asset B-Roll bay vào Timeline (Live Asset Flight)',
      cmd: `python3 scripts/studio_agent_cli.py insert-broll \\\n  --agent-name "🤖 VS Code Agent" \\\n  --query "Wall Street Market Crash" \\\n  --url "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80" \\\n  --start 3.5 \\\n  --duration 4.0 \\\n  --shader "capcut.3d-zoom-pro"`,
    },
    {
      key: 'cli_raw_cmd',
      label: 'Áp màu DaVinci & Shader GPU bằng Raw Timeline Command',
      cmd: `python3 scripts/studio_agent_cli.py command \\\n  --agent-name "🤖 VS Code Agent" \\\n  --time 2.0 \\\n  --bubble "🎨 VS Code Agent đang áp màu điện ảnh DaVinci..." \\\n  --json '{"type":"CLIP_SET_COLOR_GRADE","clipId":"clip_aroll_01","colorGrade":{"enabled":true,"exposure":{"staticValue":0.25,"keyframes":[]},"contrast":{"staticValue":1.2,"keyframes":[]}}}'`,
    },
  ];

  const isExternalActive =
    activeExternalAgent && Date.now() - (activeExternalAgent.lastSeenMs || 0) < 15000;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#121520] border border-[#272c3d] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#161a28] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-zinc-100">
                  External Agent Hub & MCP Bridge
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Dual Transport • 250ms
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Điều khiển trực tiếp Studio từ VS Code, Antigravity, Cursor, Claude Code qua MCP & CLI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isExternalActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isExternalActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span>{isExternalActive ? activeExternalAgent?.displayName : 'Bridge Ready'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-[#141724] px-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'status'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Khu Vực 1: Trạng Thái Kết Nối & Test</span>
          </button>
          <button
            onClick={() => setActiveTab('playbooks')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'playbooks'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Khu Vực 2: 4 Mô Thức Giao Việc (Prompt Mẫu)</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'cli'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Khu Vực 3: Sổ Tay Lệnh CLI (`studio_agent_cli.py`)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* TAB 1: Status & Test */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-zinc-200">
                      MCP Server (.vscode/mcp.json & .mcp.json)
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      ● ACTIVE — services/ai-sidecar/mcp_stdio_bridge.py
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Cung cấp 6 công cụ MCP native (`compile_stage`, `move_cursor`, `insert_broll`, `execute_command`...)
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40 shrink-0">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-zinc-200">
                      Live CLI Bridge (/live-agent-bridge.json)
                    </div>
                    <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                      ● LISTENING (350ms Polling Interval)
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Cho phép mọi script CLI cập nhật Ghost Cursor và Timeline tức thì không cần WebSocket.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Agent Info Banner */}
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-900/60 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-bold text-sm">
                    🤖
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                      <span>{activeExternalAgent?.displayName || 'Chưa có Agent bên ngoài gửi lệnh'}</span>
                      {isExternalActive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 border border-emerald-600">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Provider: {activeExternalAgent?.provider || 'None'} • ID: {activeExternalAgent?.agentId || 'none'}
                    </div>
                  </div>
                </div>

                {/* 1-Click Test Button */}
                <button
                  onClick={handleRunTestAgent}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isTesting ? 'Đang bắn lệnh thử...' : '⚡ Test Bắn Lệnh Từ VS Code Agent Ngay'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 text-xs space-y-2">
                <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Cách thức hoạt động giữa VS Code và Studio Desktop:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                  <li>Trong cửa sổ chat VS Code / Antigravity / Claude Code, bạn giao việc: <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded">"Ê Agent, làm cho tôi video về FED..."</code></li>
                  <li>Agent đọc hướng dẫn trong <code className="text-amber-300 bg-zinc-900 px-1 py-0.5 rounded">AGENTS.md</code> và tự động gọi <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">studio_agent_cli.py</code>.</li>
                  <li>Màn hình Studio của bạn sẽ lập tức thấy Con Trỏ Ghost Cursor xanh lục của Agent xuất hiện trên Timeline và dựng phim theo thời gian thực!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Playbook Prompts */}
          {activeTab === 'playbooks' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 mb-1">
                Bấm nút <strong>Copy</strong> dưới đây rồi dán thẳng vào khung chat của Agent trong VS Code / Cursor / Claude Code:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {playbookPrompts.map((item) => {
                  const isCopied = copiedKey === item.key;
                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="font-bold text-xs text-zinc-100">{item.title}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {item.genre}
                          </span>
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono mb-2">{item.tag}</div>
                        <p className="text-[11px] text-zinc-300 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800/80 italic leading-relaxed">
                          "{item.prompt}"
                        </p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(item.prompt, item.key)}
                        className={`mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Copy Prompt!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>📋 Copy Lệnh Giao Việc Cho Agent VS Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CLI Cheatsheet */}
          {activeTab === 'cli' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 mb-1">
                Các lệnh terminal được xây dựng sẵn trong <code className="text-cyan-300">scripts/studio_agent_cli.py</code> để bất kỳ Agent nào cũng có thể bắn lệnh vào Studio:
              </p>

              <div className="space-y-3">
                {cliSnippets.map((item) => {
                  const isCopied = copiedKey === item.key;
                  return (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">{item.label}</span>
                        <button
                          onClick={() => copyToClipboard(item.cmd, item.key)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                            isCopied
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <pre className="p-2.5 rounded-lg bg-[#0d0f17] border border-zinc-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed custom-scrollbar">
                        {item.cmd}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-[#161a28] shrink-0 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <span>Đọc chi tiết quy tắc kết nối Agent tại:</span>
            <code className="text-amber-300 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              AGENTS.md
            </code>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

