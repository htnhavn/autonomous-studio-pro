/**
 * @file StudioWorkspace.tsx
 * @description Pro 5-Panel Desktop Workspace Layout (Premiere / DaVinci / CapCut hybrid).
 * Unifies Media Pool, Transcript Editor, Stage & Stickman Studio, Program Monitor, Color Grading,
 * Inspector, Multi-Track Timeline, Live AI HUD, 60fps Playback Engine, and 4K NVENC Export.
 */

import React, { useState } from 'react';
import { MediaPoolPanel } from '../media-pool/MediaPoolPanel';
import { TranscriptEditorPanel } from '../timeline/TranscriptEditorPanel';
import { StagePlaybookPanel } from '../stage-studio/StagePlaybookPanel';
import { ProgramMonitor } from '../monitor/ProgramMonitor';
import { ClipInspector } from '../inspector/ClipInspector';
import { ColorGradingPanel } from '../color-node/ColorGradingPanel';
import { MultiTrackTimeline } from '../timeline/MultiTrackTimeline';
import { AgentHudConsole } from '../agent-hud/AgentHudConsole';
import { ExportPublishModal } from '../export/ExportPublishModal';
import { ExternalAgentConnectModal } from '../agent-hud/ExternalAgentConnectModal';
import { usePlaybackEngine } from '../../hooks/usePlaybackEngine';
import { useSidecarSocket } from '../../hooks/useSidecarSocket';
import { useStudioStore } from '../../store/useStudioStore';
import {
  FolderOpen,
  FileText,
  Sliders,
  Palette,
  Film,
  Sparkles,
  Download,
  Share2,
  Tv,
} from 'lucide-react';

export const StudioWorkspace: React.FC = () => {
  const [leftTab, setLeftTab] = useState<'stage' | 'media-pool' | 'transcript'>('stage');
  const [rightTab, setRightTab] = useState<'inspector' | 'color'>('inspector');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAgentConnectModalOpen, setIsAgentConnectModalOpen] = useState<boolean>(false);

  const project = useStudioStore((s) => s.project);

  // 1. Hook 60fps Playback Engine (Spacebar Play/Pause, rAF clock)
  usePlaybackEngine();

  // 2. Hook Bi-directional Live Sidecar WebSocket & Simulation
  const { isConnected, activeExternalAgent, triggerAutonomousJob } = useSidecarSocket();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0f14] text-zinc-100 overflow-hidden font-sans">
      {/* 0. Master App Navigation & Header Toolbar */}
      <header className="h-10 bg-[#141722] border-b border-[#272c3d] flex items-center justify-between px-3 shrink-0 select-none text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
              <Film className="w-3 h-3 text-white" />
            </div>
            <span className="font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
              AUTONOMOUS STUDIO PRO
            </span>
            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              v2.0 NVENC
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-zinc-200 font-semibold">{project.name}</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({project.settings.width}x{project.settings.height} • {project.settings.fps}fps)
            </span>
          </div>
        </div>

        {/* Right Header: Sidecar Status & Export Button */}
        <div className="flex items-center gap-2">
          {/* Sidecar Connection Status Badge */}
          <div
            className={`px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-mono border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
            }`}
            title={isConnected ? 'Connected to Python AI Sidecar on 127.0.0.1:8765' : 'Local Live Simulation Fallback Active'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isConnected ? 'Sidecar 8765' : 'Sim Mode'}</span>
          </div>

          {/* External Agent Hub Trigger */}
          <button
            onClick={() => setIsAgentConnectModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-xs border border-zinc-700/80 hover:border-cyan-500/60 transition-all shadow-sm group"
            title="Kết Nối Trực Tiếp VS Code / Antigravity / Claude Code / Cursor Agent"
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
            <span>🔌 Kết Nối Agent Ngoài (VS Code / MCP)</span>
          </button>

          {/* Export / YouTube Publish Modal Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>🚀 Export / YouTube Publish</span>
          </button>
        </div>
      </header>

      {/* Top Main Workspace (Panels 1, 2, 4) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel: Stage & Stickman / Media Pool / Transcript */}
        <div className="w-80 flex flex-col border-r border-[#272c3d] bg-[#12151e] shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#272c3d] bg-[#161a26] text-xs">
            <button
              onClick={() => setLeftTab('stage')}
              className={`flex-1 py-2 flex items-center justify-center gap-1 font-medium transition-colors ${
                leftTab === 'stage'
                  ? 'border-b-2 border-yellow-500 text-yellow-400 bg-[#12151e]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Stage & Stickman</span>
            </button>
            <button
              onClick={() => setLeftTab('media-pool')}
              className={`flex-1 py-2 flex items-center justify-center gap-1 font-medium transition-colors ${
                leftTab === 'media-pool'
                  ? 'border-b-2 border-blue-500 text-blue-400 bg-[#12151e]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Media</span>
            </button>
            <button
              onClick={() => setLeftTab('transcript')}
              className={`flex-1 py-2 flex items-center justify-center gap-1 font-medium transition-colors ${
                leftTab === 'transcript'
                  ? 'border-b-2 border-emerald-500 text-emerald-400 bg-[#12151e]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === 'stage' ? (
              <StagePlaybookPanel />
            ) : leftTab === 'media-pool' ? (
              <MediaPoolPanel />
            ) : (
              <TranscriptEditorPanel />
            )}
          </div>
        </div>

        {/* Center Panel: Program Monitor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0c0e13]">
          <ProgramMonitor />
        </div>

        {/* Right Panel: Inspector / Color Grading */}
        <div className="w-84 flex flex-col border-l border-[#272c3d] bg-[#12151e] shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#272c3d] bg-[#161a26] text-xs">
            <button
              onClick={() => setRightTab('inspector')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
                rightTab === 'inspector'
                  ? 'border-b-2 border-blue-500 text-blue-400 bg-[#12151e]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
            <button
              onClick={() => setRightTab('color')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
                rightTab === 'color'
                  ? 'border-b-2 border-amber-500 text-amber-400 bg-[#12151e]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color Wheels</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'inspector' ? <ClipInspector /> : <ColorGradingPanel />}
          </div>
        </div>
      </div>

      {/* Bottom Panel: Multi-Track Timeline (Panel 3) */}
      <div className="h-72 shrink-0 border-t border-[#272c3d]">
        <MultiTrackTimeline />
      </div>

      {/* Bottom Console: Live AI Agent HUD (Panel 5) */}
      <div className="h-32 shrink-0">
        <AgentHudConsole
          onTriggerAutonomousJob={triggerAutonomousJob}
          isSocketConnected={isConnected}
          onOpenExternalAgentModal={() => setIsAgentConnectModalOpen(true)}
          activeExternalAgent={activeExternalAgent}
        />
      </div>

      {/* 4K NVENC Hardware Export & YouTube Publish Modal */}
      <ExportPublishModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* External Agent Hub & MCP Connection Modal */}
      <ExternalAgentConnectModal
        isOpen={isAgentConnectModalOpen}
        onClose={() => setIsAgentConnectModalOpen(false)}
        activeExternalAgent={activeExternalAgent}
      />
    </div>
  );
};
