/**
 * @file StudioWorkspace.tsx
 * @description Pro 5-Panel Desktop Workspace Layout (Premiere / DaVinci / CapCut hybrid).
 * Unifies Media Pool, Transcript Editor, Stage & Stickman Studio, Program Monitor, Color Grading,
 * Inspector, Multi-Track Timeline, Live AI HUD, 60fps Playback Engine, and 4K NVENC Export.
 */

import React, { useEffect, useState } from 'react';
import { MediaPoolPanel } from '../media-pool/MediaPoolPanel';
import { TranscriptEditorPanel } from '../timeline/TranscriptEditorPanel';
import { StagePlaybookPanel } from '../stage-studio/StagePlaybookPanel';
import { AutonomousProductionHubPanel } from '../production-hub/AutonomousProductionHubPanel';
import { EffectsPanel } from '../effects/EffectsPanel';
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
  NativeHardwareStatus,
  probeNativeHardwareCapabilities,
} from '../../utils/nativeDesktopBridge';
import {
  Cpu,
  FolderOpen,
  FileText,
  Sliders,
  Palette,
  Film,
  Sparkles,
  Share2,
  Volume2,
  Type,
  User,
  Wand2,
  Layers,
  Smile,
  LayoutGrid,
  Video,
} from 'lucide-react';

export const StudioWorkspace: React.FC = () => {
  const [leftTab, setLeftTab] = useState<
    'media-pool' | 'stock-media' | 'audio' | 'transcript' | 'transitions' | 'effects' | 'filters' | 'stickers' | 'templates' | 'stage' | 'ai-hub'
  >('effects');
  const [rightTab, setRightTab] = useState<'inspector' | 'color' | 'production-hub'>('inspector');
  const [layoutMode, setLayoutMode] = useState<'Editing' | 'Color' | 'Audio'>('Editing');
  const [projectName, setProjectName] = useState<string>('Untitled');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAgentConnectModalOpen, setIsAgentConnectModalOpen] = useState<boolean>(false);
  const [hwStatus, setHwStatus] = useState<NativeHardwareStatus | null>(null);

  const project = useStudioStore((s) => s.project);
  const gatewayRevision = useStudioStore((s) => s.gatewayState.revision);

  useEffect(() => {
    probeNativeHardwareCapabilities().then(setHwStatus);
  }, []);

  // 1. Hook 60fps Playback Engine (Spacebar Play/Pause, rAF clock)
  usePlaybackEngine();

  // 2. Hook Bi-directional Live Sidecar WebSocket & Simulation
  const { isConnected, activeExternalAgent, triggerAutonomousJob } = useSidecarSocket();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0e14] text-zinc-100 overflow-hidden font-sans">
      {/* 0. CapCut Desktop Master App Navigation & Header Toolbar */}
      <header className="h-11 bg-[#12141c] border-b border-[#242838] flex items-center justify-between px-3 shrink-0 select-none text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#00e5cc] flex items-center justify-center shadow-md">
              <Film className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            </div>
            <span className="font-extrabold tracking-wider bg-gradient-to-r from-[#00e5cc] via-cyan-200 to-white bg-clip-text text-transparent">
              CAPCUT PRO STUDIO
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Project Title (Editable) */}
          <div className="flex items-center gap-2 bg-[#181c28] px-2.5 py-1 rounded border border-[#282f44]">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-zinc-100 font-semibold focus:outline-none w-28 text-xs hover:border-b hover:border-cyan-400"
              title="Click to rename project"
            />
            <span className="text-[10px] text-zinc-500 font-mono">
              {project.settings.width}x{project.settings.height} • {project.settings.fps}fps
            </span>
          </div>

          {/* Layout Dropdown Selector */}
          <div className="flex items-center gap-1 bg-[#181c28] px-2 py-1 rounded border border-[#282f44] text-[11px] text-zinc-300">
            <span className="text-zinc-500">Layout:</span>
            <select
              value={layoutMode}
              onChange={(e) => {
                const mode = e.target.value as any;
                setLayoutMode(mode);
                if (mode === 'Color') setRightTab('color');
                else if (mode === 'Audio') setLeftTab('audio');
                else setRightTab('inspector');
              }}
              className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Editing" className="bg-[#181c28] text-zinc-200">Editing (Default)</option>
              <option value="Color" className="bg-[#181c28] text-zinc-200">Color Grading</option>
              <option value="Audio" className="bg-[#181c28] text-zinc-200">Audio Studio</option>
            </select>
          </div>
        </div>

        {/* Center: Live Engine & Hardware Badge */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-mono bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
            ⚡ {hwStatus?.backendApi || 'Metal / AVFoundation 60fps'} • Rev #{gatewayRevision}
          </span>
        </div>

        {/* Right Header: Sidecar Status & External Agent & Prominent Cyan Export */}
        <div className="flex items-center gap-2.5">
          {/* Sidecar Connection Status Badge */}
          <div
            className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 text-[10px] font-mono border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
            }`}
            title={isConnected ? 'Connected to Python AI Sidecar on 127.0.0.1:8765' : 'Deterministic Loop Active'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isConnected ? 'Sidecar 8765' : 'Deterministic Loop'}</span>
          </div>

          {/* External Agent Hub Trigger */}
          <button
            onClick={() => setIsAgentConnectModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181c28] hover:bg-[#202636] text-zinc-200 hover:text-white font-medium text-xs border border-[#2b334a] hover:border-cyan-500/60 transition-all shadow-sm"
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
            <span>🔌 Agent Ngoài</span>
          </button>

          {/* CapCut User Sign-in / Profile */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181c28] hover:bg-[#202636] text-zinc-300 hover:text-white font-medium text-xs border border-[#2b334a] transition-all"
            title="CapCut Account / Sign In"
          >
            <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[10px]">
              <User className="w-3 h-3 text-zinc-300" />
            </div>
            <span>Sign In</span>
          </button>

          {/* CapCut Prominent Teal/Cyan Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#00e5cc] hover:bg-[#00cbb5] active:bg-[#00b3a0] text-black font-extrabold text-xs shadow-md shadow-[#00e5cc]/20 transition-all transform active:scale-95"
            title="Export Video / Publish (NVENC 4K / AVFoundation)"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Top Main Workspace (Panels 1, 2, 4) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel: CapCut Desktop Left Navigation & Feature Panels */}
        <div className="w-[430px] flex flex-col border-r border-[#242838] bg-[#12141c] shrink-0">
          {/* CapCut Left Tab Switcher (Full 9 Tabs + Studio Extensions) */}
          <div className="flex items-center overflow-x-auto border-b border-[#242838] bg-[#141722] text-[11px] px-1 scrollbar-none">
            <button
              onClick={() => setLeftTab('media-pool')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'media-pool'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Media</span>
            </button>
            <button
              onClick={() => setLeftTab('stock-media')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'stock-media'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Stock Media</span>
            </button>
            <button
              onClick={() => setLeftTab('audio')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'audio'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
            <button
              onClick={() => setLeftTab('transcript')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'transcript'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              onClick={() => setLeftTab('transitions')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'transitions'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Transitions</span>
            </button>
            <button
              onClick={() => setLeftTab('effects')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'effects'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Effects</span>
            </button>
            <button
              onClick={() => setLeftTab('filters')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'filters'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => setLeftTab('stickers')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'stickers'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>
            <button
              onClick={() => setLeftTab('templates')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'templates'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setLeftTab('stage')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'stage'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Stage 2.5D</span>
            </button>
            <button
              onClick={() => setLeftTab('ai-hub')}
              className={`px-2.5 py-2.5 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'ai-hub'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Director</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === 'effects' || leftTab === 'transitions' || leftTab === 'filters' || leftTab === 'stickers' || leftTab === 'templates' ? (
              <EffectsPanel />
            ) : leftTab === 'ai-hub' ? (
              <AutonomousProductionHubPanel />
            ) : leftTab === 'stage' ? (
              <StagePlaybookPanel />
            ) : leftTab === 'transcript' ? (
              <TranscriptEditorPanel />
            ) : (
              <MediaPoolPanel />
            )}
          </div>
        </div>

        {/* Center Panel: Program Monitor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0c0e13]">
          <ProgramMonitor />
        </div>

        {/* Right Panel: Inspector / Color Grading / AI Context Hub */}
        <div className="w-84 flex flex-col border-l border-[#272c3d] bg-[#12151e] shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#272c3d] bg-[#161a26] text-xs">
            <button
              onClick={() => setRightTab('inspector')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
                rightTab === 'inspector'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12151e] font-semibold'
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
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12151e] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color Wheels</span>
            </button>
            <button
              onClick={() => setRightTab('production-hub')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
                rightTab === 'production-hub'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12151e] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>.vproj / OTIO</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'inspector' ? (
              <ClipInspector />
            ) : rightTab === 'color' ? (
              <ColorGradingPanel />
            ) : (
              <AutonomousProductionHubPanel />
            )}
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
