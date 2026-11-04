/**
 * @file StudioWorkspace.tsx
 * @description Native-feeling Desktop Workstation Workspace Layout (CapCut Pro / DaVinci hybrid).
 * Features:
 *   - Frameless native window chrome with macOS traffic lights & custom draggable titlebar
 *   - Bi-directional draggable splitters (horizontal left/right, vertical timeline)
 *   - Independent 4px sleek scrollbars (.capcut-scroll) for library & inspector
 *   - Workspace Layout Presets (Editing, Color, Audio) with persistence in localStorage
 *   - Collapsible Bottom-Right AI Director HUD Drawer keeping timeline spacious & clean
 *   - 60fps Playback Engine, Live External Agent WebSocket Hub & NVENC Export
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ResizableSplitter } from './ResizableSplitter';
import { MediaPoolPanel } from '../media-pool/MediaPoolPanel';
import { TranscriptEditorPanel } from '../timeline/TranscriptEditorPanel';
import { StagePlaybookPanel } from '../stage-studio/StagePlaybookPanel';
import { AutonomousProductionHubPanel } from '../production-hub/AutonomousProductionHubPanel';
import { StockMediaPanel } from '../stock/StockMediaPanel';
import { EffectsPanel } from '../effects/EffectsPanel';
import { ProgramMonitor } from '../monitor/ProgramMonitor';
import { ClipInspector } from '../inspector/ClipInspector';
import { ColorGradingPanel } from '../color-node/ColorGradingPanel';
import { MultiTrackTimeline } from '../timeline/MultiTrackTimeline';
import { StackedCardsAssetDeck } from '../timeline/StackedCardsAssetDeck';
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
  Sliders,
  Palette,
  Film,
  Sparkles,
  Share2,
  Volume2,
  Type,
  User,
  Wand2,
  Smile,
  LayoutGrid,
  Video,
  ChevronUp,
  ChevronDown,
  Bot,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface LayoutPreset {
  left: number;
  right: number;
  timeline: number;
}

const DEFAULT_LAYOUTS: Record<'Editing' | 'Color' | 'Audio', LayoutPreset> = {
  Editing: { left: 420, right: 360, timeline: 320 },
  Color: { left: 300, right: 480, timeline: 240 },
  Audio: { left: 320, right: 300, timeline: 440 },
};

const STORAGE_KEY = 'capcut_pro_layout_config_v2';

export const StudioWorkspace: React.FC = () => {
  const [leftTab, setLeftTab] = useState<
    | 'media-pool'
    | 'stock-media'
    | 'audio'
    | 'transcript'
    | 'transitions'
    | 'effects'
    | 'filters'
    | 'stickers'
    | 'templates'
    | 'stage'
    | 'ai-hub'
  >('effects');
  const [rightTab, setRightTab] = useState<'inspector' | 'color' | 'production-hub'>('inspector');
  const [layoutMode, setLayoutMode] = useState<'Editing' | 'Color' | 'Audio'>('Editing');
  const [projectName, setProjectName] = useState<string>('Untitled');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAgentConnectModalOpen, setIsAgentConnectModalOpen] = useState<boolean>(false);
  const [isAiHudOpen, setIsAiHudOpen] = useState<boolean>(false);
  const [hwStatus, setHwStatus] = useState<NativeHardwareStatus | null>(null);

  // Responsive Resizable Dimensions
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).left || DEFAULT_LAYOUTS.Editing.left;
    } catch {
      // ignore
    }
    return DEFAULT_LAYOUTS.Editing.left;
  });

  const [rightWidth, setRightWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).right || DEFAULT_LAYOUTS.Editing.right;
    } catch {
      // ignore
    }
    return DEFAULT_LAYOUTS.Editing.right;
  });

  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).timeline || DEFAULT_LAYOUTS.Editing.timeline;
    } catch {
      // ignore
    }
    return DEFAULT_LAYOUTS.Editing.timeline;
  });

  const project = useStudioStore((s) => s.project);
  const gatewayRevision = useStudioStore((s) => s.gatewayState.revision);
  const autonomousMode = useStudioStore((s) => s.autonomousMode);

  // Save layout state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ left: leftWidth, right: rightWidth, timeline: timelineHeight })
      );
    } catch {
      // ignore
    }
  }, [leftWidth, rightWidth, timelineHeight]);

  useEffect(() => {
    probeNativeHardwareCapabilities().then(setHwStatus);
  }, []);

  // 1. Hook 60fps Playback Engine (Spacebar Play/Pause, rAF clock)
  usePlaybackEngine();

  // 2. Hook Bi-directional Live Sidecar WebSocket & Simulation
  const { isConnected, activeExternalAgent, triggerAutonomousJob } = useSidecarSocket();

  // Preset switch handler
  const handleSelectPreset = useCallback((mode: 'Editing' | 'Color' | 'Audio') => {
    setLayoutMode(mode);
    const target = DEFAULT_LAYOUTS[mode];
    setLeftWidth(target.left);
    setRightWidth(target.right);
    setTimelineHeight(target.timeline);

    if (mode === 'Color') {
      setRightTab('color');
    } else if (mode === 'Audio') {
      setLeftTab('audio');
    } else {
      setRightTab('inspector');
    }
  }, []);

  const handleResetLayout = useCallback(() => {
    handleSelectPreset(layoutMode);
  }, [handleSelectPreset, layoutMode]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090b10] text-zinc-100 overflow-hidden font-sans select-none">
      {/* 0. CapCut Desktop Master Native Titlebar Toolbar */}
      <header className="h-10 bg-[#12141c] border-b border-[#1e2230] flex items-center justify-between pl-20 pr-3 shrink-0 text-xs window-drag-region">
        {/* Left Section: Project Identity & Presets */}
        <div className="flex items-center gap-3 no-drag-region">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#00e5cc] flex items-center justify-center shadow-md shadow-[#00e5cc]/30">
              <Film className="w-3 h-3 text-black stroke-[2.5]" />
            </div>
            <span className="font-black tracking-wider text-[11px] bg-gradient-to-r from-[#00e5cc] via-cyan-200 to-white bg-clip-text text-transparent">
              CAPCUT PRO
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-zinc-800" />

          {/* Project Title (Editable) */}
          <div className="flex items-center gap-2 bg-[#181c28] px-2 py-0.5 rounded border border-[#272d40]">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-zinc-100 font-semibold focus:outline-none w-24 text-[11px] hover:border-b hover:border-cyan-400"
              title="Click to rename project"
            />
            <span className="text-[10px] text-zinc-400 font-mono">
              {project.settings.width}x{project.settings.height} • {project.settings.fps}fps
            </span>
          </div>

          {/* Layout Workspace Preset Selector */}
          <div className="flex items-center gap-1 bg-[#181c28] px-2 py-0.5 rounded border border-[#272d40] text-[11px] text-zinc-300">
            <span className="text-zinc-500 font-medium">Layout:</span>
            <select
              value={layoutMode}
              onChange={(e) => handleSelectPreset(e.target.value as any)}
              className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Editing" className="bg-[#181c28] text-zinc-200">Editing (Default)</option>
              <option value="Color" className="bg-[#181c28] text-zinc-200">Color Grading</option>
              <option value="Audio" className="bg-[#181c28] text-zinc-200">Audio Focus</option>
            </select>
            <button
              onClick={handleResetLayout}
              className="ml-1 p-0.5 text-zinc-500 hover:text-cyan-400 transition"
              title="Reset layout pane sizes to preset defaults"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: Live Native Engine & Hardware Acceleration Status */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-mono bg-[#141722] px-2.5 py-0.5 rounded border border-[#222738] flex items-center gap-1.5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5cc]" />
            <span>{hwStatus?.backendApi || 'Metal / AVFoundation 60fps'}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Rev #{gatewayRevision}</span>
          </span>
        </div>

        {/* Right Header: AI Status, External Agent Connect & Prominent Export Button */}
        <div className="flex items-center gap-2 no-drag-region">
          {/* Sidecar Status Badge */}
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
                isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isConnected ? 'Sidecar 8765' : 'Offline'}</span>
          </div>

          {/* External Agent Hub Trigger */}
          <button
            onClick={() => setIsAgentConnectModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181c28] hover:bg-[#202636] text-zinc-200 hover:text-white font-medium text-[11px] border border-[#2b334a] hover:border-cyan-500/60 transition-all shadow-sm"
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

          {/* CapCut User Profile */}
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181c28] hover:bg-[#202636] text-zinc-300 hover:text-white font-medium text-[11px] border border-[#2b334a] transition-all"
            title="Account / Workspace Profile"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px]">
              <User className="w-2.5 h-2.5 text-zinc-300" />
            </div>
            <span>Pro User</span>
          </button>

          {/* Prominent Teal/Cyan Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-md bg-[#00e5cc] hover:bg-[#00cbb5] active:bg-[#00b3a0] text-black font-black text-xs shadow-md shadow-[#00e5cc]/20 transition-all transform active:scale-95"
            title="Export Video / Publish (NVENC 4K / AVFoundation)"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Top Main Workspace: [Left Library] [Splitter] [Center Monitor] [Splitter] [Right Inspector] */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-[#090b10]">
        {/* Panel 1: CapCut Left Feature Hub */}
        <div
          style={{ width: `${leftWidth}px` }}
          className="flex flex-col bg-[#12141c] shrink-0 min-w-[260px] max-w-[700px] overflow-hidden"
        >
          {/* CapCut Left Tab Switcher (Full 11 Tabs) */}
          <div className="flex items-center overflow-x-auto border-b border-[#1e2230] bg-[#141722] text-[11px] px-1 scrollbar-none shrink-0">
            <button
              onClick={() => setLeftTab('media-pool')}
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'stock-media'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Stock</span>
            </button>
            <button
              onClick={() => setLeftTab('audio')}
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-2 flex items-center gap-1 font-medium whitespace-nowrap transition-all ${
                leftTab === 'ai-hub'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] font-bold bg-[#12141c]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Hub</span>
            </button>
          </div>

          {/* Left Panel Body with independent sleek scrollbar */}
          <div className="flex-1 overflow-y-auto capcut-scroll min-h-0 bg-[#12141c]">
            {leftTab === 'effects' ||
            leftTab === 'transitions' ||
            leftTab === 'filters' ||
            leftTab === 'stickers' ||
            leftTab === 'templates' ? (
              <EffectsPanel />
            ) : leftTab === 'stock-media' ? (
              <StockMediaPanel />
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

        {/* Resizable Splitter 1: Between Left Library and Center Monitor */}
        <ResizableSplitter
          direction="horizontal"
          onResize={(delta) => {
            setLeftWidth((w) => Math.min(700, Math.max(260, w + delta)));
          }}
          onReset={() => setLeftWidth(DEFAULT_LAYOUTS[layoutMode].left)}
        />

        {/* Panel 2: Center Program Monitor (Player) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-[320px] bg-[#090b10]">
          <ProgramMonitor />
        </div>

        {/* Resizable Splitter 2: Between Center Monitor and Right Inspector */}
        <ResizableSplitter
          direction="horizontal"
          onResize={(delta) => {
            setRightWidth((w) => Math.min(650, Math.max(260, w - delta)));
          }}
          onReset={() => setRightWidth(DEFAULT_LAYOUTS[layoutMode].right)}
        />

        {/* Panel 4: Right Inspector / Color Wheels / Project Hub */}
        <div
          style={{ width: `${rightWidth}px` }}
          className="flex flex-col bg-[#12141c] shrink-0 min-w-[260px] max-w-[650px] overflow-hidden"
        >
          {/* Tab Switcher */}
          <div className="flex border-b border-[#1e2230] bg-[#141722] text-xs shrink-0">
            <button
              onClick={() => setRightTab('inspector')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
                rightTab === 'inspector'
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12141c] font-bold'
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
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12141c] font-bold'
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
                  ? 'border-b-2 border-[#00e5cc] text-[#00e5cc] bg-[#12141c] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>OTIO / Project</span>
            </button>
          </div>

          {/* Right Panel Body with independent sleek scrollbar */}
          <div className="flex-1 overflow-y-auto capcut-scroll min-h-0 bg-[#12141c]">
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

      {/* Resizable Splitter 3: Between Top Workspace and Bottom Timeline Area */}
      <ResizableSplitter
        direction="vertical"
        onResize={(delta) => {
          setTimelineHeight((h) => Math.min(650, Math.max(180, h - delta)));
        }}
        onReset={() => setTimelineHeight(DEFAULT_LAYOUTS[layoutMode].timeline)}
      />

      {/* Bottom Master Panel: Multi-Track Timeline (Panel 3) */}
      <div
        style={{ height: `${timelineHeight}px` }}
        className="shrink-0 flex flex-col bg-[#0f1118] border-t border-[#1e2230] min-h-[180px] overflow-hidden relative"
      >
        {/* Full-size Multi-Track Timeline */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MultiTrackTimeline />
        </div>

        {/* 50 Stacked Cards Filmstrip Carousel Asset Deck */}
        <StackedCardsAssetDeck />

        {/* Sleek Bottom Workstation Status Bar & AI Director Drawer Toggle */}
        <footer className="h-6 bg-[#0c0e14] border-t border-[#181b26] flex items-center justify-between px-3 shrink-0 text-[11px] text-zinc-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Project Ready</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-[10px] text-zinc-400">
              Tracks: {project.tracks.length} • Clips: {project.tracks.reduce((acc: number, t) => acc + t.clips.length, 0)}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-[10px] text-zinc-500 hidden md:inline">
              Drag edges to resize panes • Double-click splitter to reset
            </span>
          </div>

          {/* AI Director HUD Drawer Toggle Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiHudOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                isAiHudOpen
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,204,0.25)]'
                  : 'bg-[#161a26] hover:bg-[#1e2334] text-zinc-400 hover:text-cyan-300 border-[#272d40]'
              }`}
              title="Toggle AI Director Autonomous Prompt & Critic HUD"
            >
              <Bot className="w-3 h-3 text-[#00e5cc]" />
              <span className="font-semibold">AI Director HUD</span>
              {autonomousMode === 'running-autonomous' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
              {isAiHudOpen ? (
                <ChevronDown className="w-3 h-3 text-cyan-400" />
              ) : (
                <ChevronUp className="w-3 h-3 text-zinc-400" />
              )}
            </button>
          </div>
        </footer>

        {/* Collapsible AI Director HUD Drawer (Opens without squashing timeline full-time) */}
        {isAiHudOpen && (
          <div className="absolute bottom-6 left-0 right-0 h-44 bg-[#0d0f17]/98 backdrop-blur-md border-t border-[#00e5cc]/30 shadow-2xl z-30 flex flex-col animate-in slide-in-from-bottom duration-150">
            <div className="h-6 bg-[#141724] border-b border-[#22273b] px-3 flex items-center justify-between text-[10px] text-zinc-300">
              <span className="font-bold flex items-center gap-1.5 text-cyan-300 font-mono">
                <Bot className="w-3 h-3" />
                <span>AI DIRECTOR LIVE CONSOLE & VLM CRITIC TELEMETRY</span>
              </span>
              <button
                onClick={() => setIsAiHudOpen(false)}
                className="text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800 transition"
                title="Collapse HUD"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentHudConsole
                onTriggerAutonomousJob={triggerAutonomousJob}
                isSocketConnected={isConnected}
                onOpenExternalAgentModal={() => setIsAgentConnectModalOpen(true)}
                activeExternalAgent={activeExternalAgent}
              />
            </div>
          </div>
        )}
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
