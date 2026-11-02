/**
 * @file AgentHudConsole.tsx
 * @description Live AI Agent HUD & Master Autonomous Prompt Console.
 * Shows active film crew members, live telemetry, and the VLM Critic Self-Correction score.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { STUDIO_AI_PLAYBOOKS, ProductionAutonomyTier } from '../../../../../packages/mcp-bridge/src/ai-playbooks';
import { ActiveExternalAgentInfo } from '../../hooks/useSidecarSocket';
import {
  Bot,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Youtube,
  Send,
  Zap,
  Sliders,
} from 'lucide-react';

export interface AgentHudConsoleProps {
  readonly onTriggerAutonomousJob?: (payload: Record<string, any>) => void;
  readonly isSocketConnected?: boolean;
  readonly onOpenExternalAgentModal?: () => void;
  readonly activeExternalAgent?: ActiveExternalAgentInfo | null;
}

export const AgentHudConsole: React.FC<AgentHudConsoleProps> = ({
  onTriggerAutonomousJob,
  isSocketConnected,
  onOpenExternalAgentModal,
  activeExternalAgent,
}) => {
  const autonomousMode = useStudioStore((s) => s.autonomousMode);
  const setAutonomousMode = useStudioStore((s) => s.setAutonomousMode);
  const agentCursors = useStudioStore((s) => s.agentCursors);
  const latestCriticReport = useStudioStore((s) => s.latestCriticReport);
  const undoAgent = useStudioStore((s) => s.undoAgent);

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('playbook.economics-stickman-master');
  const [activeTier, setActiveTier] = useState<ProductionAutonomyTier>('tier-1-eco-puppeteer');

  const [promptText, setPromptText] = useState<string>(
    'Tạo video 60s phân tích đột phá AI 2026, phong cách Vox / Johnny Harris, săn bài báo thật + highlight, hiệu ứng 3D Parallax và tự xuất bản YouTube.'
  );

  const handleStartAutonomous = () => {
    setAutonomousMode('running-autonomous');
    if (onTriggerAutonomousJob) {
      onTriggerAutonomousJob({
        autonomyTier: activeTier,
        playbookId: selectedPlaybookId,
        input: {
          topicOrPrompt: promptText,
          scriptText: promptText,
        },
      });
    }
  };

  const handlePauseTakeover = () => {
    setAutonomousMode(autonomousMode === 'paused-by-user' ? 'running-autonomous' : 'paused-by-user');
  };

  const crew = [
    { id: 'agent_director_01', name: '🎬 Director', role: 'director', color: '#F59E0B' },
    { id: 'agent_roughcut_01', name: '✂️ Rough-Cut', role: 'rough-cut', color: '#10B981' },
    { id: 'agent_hunter_01', name: '🔍 Asset Hunter', role: 'asset-hunter', color: '#3B82F6' },
    { id: 'agent_vfx_01', name: '✨ VFX Artist', role: 'vfx-motion', color: '#EC4899' },
    { id: 'agent_sound_01', name: '🎧 Sound Studio', role: 'sound-designer', color: '#8B5CF6' },
    { id: 'agent_critic_01', name: '🧐 VLM Critic', role: 'vlm-critic', color: '#EF4444' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#10131b] border-t border-[#272c3d] p-3 text-xs text-zinc-300">
      {/* 1. Header with Autonomous Mode Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-zinc-100">Autonomous AI Crew HUD</span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${
              autonomousMode === 'running-autonomous'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                : autonomousMode === 'paused-by-user'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {autonomousMode}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
              isSocketConnected
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
            title={isSocketConnected ? 'Connected to Python AI Sidecar (8765)' : 'Local Live Simulation Fallback Active'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {isSocketConnected ? 'Live Sidecar WS' : 'Local Sim'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Playbook & Autonomy Tier Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[11px]">
            <span className="text-zinc-500 font-medium">SOP:</span>
            <select
              value={selectedPlaybookId}
              onChange={(e) => setSelectedPlaybookId(e.target.value)}
              className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {STUDIO_AI_PLAYBOOKS.map((pb) => (
                <option key={pb.id} value={pb.id} className="bg-zinc-900 text-zinc-200">
                  {pb.nameVi}
                </option>
              ))}
            </select>
            <span className="text-zinc-600">|</span>
            <select
              value={activeTier}
              onChange={(e) => setActiveTier(e.target.value as ProductionAutonomyTier)}
              className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="tier-0-zero-ai" className="bg-zinc-900 text-zinc-200">⚡ 0% Token AI</option>
              <option value="tier-1-eco-puppeteer" className="bg-zinc-900 text-zinc-200">🎭 Siêu Tiết Kiệm (~90%)</option>
              <option value="tier-2-hybrid-pro" className="bg-zinc-900 text-zinc-200">⚖️ Hybrid Chuẩn</option>
              <option value="tier-3-full-ai-max" className="bg-zinc-900 text-zinc-200">🔥 Full AI Max</option>
            </select>
          </div>

          {onOpenExternalAgentModal && (
            <button
              onClick={onOpenExternalAgentModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-700/80 hover:border-cyan-500/60 text-xs font-semibold transition-all shadow-sm group"
              title="Mở bảng điều khiển kết nối MCP / VS Code / Cursor Agent"
            >
              <span className="relative flex h-2 w-2">
                {activeExternalAgent && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    activeExternalAgent ? 'bg-cyan-400' : 'bg-zinc-500'
                  }`}
                />
              </span>
              <span>🔌 Agent Ngoài</span>
            </button>
          )}

          {autonomousMode === 'idle' ? (
            <button
              onClick={handleStartAutonomous}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start 100% Autonomous Studio</span>
            </button>
          ) : (
            <button
              onClick={handlePauseTakeover}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow"
            >
              {autonomousMode === 'paused-by-user' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{autonomousMode === 'paused-by-user' ? 'Resume AI' : 'Pause & Take Over'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Film Crew Roster Tiles */}
      <div className="grid grid-cols-6 gap-2 mb-3 shrink-0">
        {crew.map((member) => {
          const liveState = agentCursors[member.id];
          const isWorking = liveState && liveState.status !== 'idle';

          return (
            <div
              key={member.id}
              className="bg-zinc-950/70 border rounded-lg p-2 flex flex-col justify-between transition-all"
              style={{
                borderColor: isWorking ? member.color : '#272c3d',
                boxShadow: isWorking ? `0 0 10px ${member.color}22` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[11px] truncate" style={{ color: member.color }}>
                  {member.name}
                </span>
                {isWorking && (
                  <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: member.color }} />
                )}
              </div>
              <p className="text-[10px] text-zinc-400 truncate">
                {liveState?.liveActionBubble || 'Standing by'}
              </p>
              <button
                onClick={() => undoAgent(member.id)}
                className="mt-1 text-[9px] text-zinc-500 hover:text-red-400 flex items-center gap-0.5 justify-end"
                title={`Undo all changes made by ${member.name}`}
              >
                <RotateCcw className="w-2.5 h-2.5" /> Undo
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Prompt Input Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Direct the AI Crew: 'Replace B-roll at 00:15 with 3D Parallax chart, make hook faster...'"
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleStartAutonomous}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch</span>
        </button>
      </div>
    </div>
  );
};

