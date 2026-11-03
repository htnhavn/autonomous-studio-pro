/**
 * @file ProgramMonitor.tsx
 * @description Program Monitor Canvas with Direct Screen Manipulation, Dynamic Captions (Hormozi style),
 * SAM 2.1 Text-Behind-Subject rendering, and Code-as-Motion overlay.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { MotionCodeRenderer } from './MotionCodeRenderer';
import { StickmanStageRenderer } from '../stage-studio/StickmanStageRenderer';
import { ShaderColorCompositor } from './ShaderColorCompositor';
import {
  toSeconds,
  toFrames,
  compareTime,
  rangeEndTime,
} from '../../../../../packages/core-schema/src/rational-time';
import {
  Maximize2,
  Tv,
  Smartphone,
  Square,
  Sparkles,
  Move,
  Layers,
} from 'lucide-react';

export const ProgramMonitor: React.FC = () => {
  const project = useStudioStore((s) => s.project);
  const playheadTime = useStudioStore((s) => s.playheadTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const currentSec = toSeconds(playheadTime);
  const currentFrame = toFrames(playheadTime, project.settings.fps);

  // Find active clips at current playhead time
  const activeClips = project.tracks.flatMap((track) =>
    track.clips
      .filter((clip) => {
        const start = clip.timelineRange.startTime;
        const end = rangeEndTime(clip.timelineRange);
        return compareTime(playheadTime, start) >= 0 && compareTime(playheadTime, end) < 0;
      })
      .map((clip) => ({ clip, track }))
  );

  // Active Dynamic Caption clip
  const activeCaption = activeClips.find(({ clip }) => clip.kind === 'caption')?.clip.captionData;
  // Active Motion Code clip
  const activeMotion = activeClips.find(({ clip }) => clip.kind === 'motion-code')?.clip.motionCode;
  // Active Video/Image B-Roll or A-Roll
  const activeVideoClip = activeClips.find(({ clip }) => clip.kind === 'video')?.clip;
  const activeVideoAsset = activeVideoClip?.assetId
    ? project.mediaPool[activeVideoClip.assetId]
    : undefined;
  // Active Stage Puppet / Stickman / Genre Kit Clip
  const activeStageClip = activeClips.find(
    ({ clip, track }) => clip.kind === 'stage-puppet' || track.kind === 'stage-puppet'
  )?.clip;

  // Synchronize native video element playback and current time to master playhead
  useEffect(() => {
    if (!videoElementRef.current || !activeVideoClip) return;
    const clipStartSec = activeVideoClip.timelineRange.startTime.value / activeVideoClip.timelineRange.startTime.rate;
    const sourceStartSec = activeVideoClip.sourceRange.startTime.value / activeVideoClip.sourceRange.startTime.rate;
    const currentTimelineSec = playheadTime.value / playheadTime.rate;
    const localSec = Math.max(0, currentTimelineSec - clipStartSec + sourceStartSec);

    const video = videoElementRef.current;
    if (Math.abs(video.currentTime - localSec) > 0.15) {
      video.currentTime = localSec;
    }
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [playheadTime.value, isPlaying, activeVideoClip]);

  let stageClipProgress = 0;
  let stageClipTimeSec = 0;
  if (activeStageClip) {
    const clipStartSec = toSeconds(activeStageClip.timelineRange.startTime);
    const clipDurSec = toSeconds(activeStageClip.timelineRange.duration);
    stageClipTimeSec = Math.max(0, currentSec - clipStartSec);
    stageClipProgress = clipDurSec > 0 ? Math.min(1, Math.max(0, stageClipTimeSec / clipDurSec)) : 0;
  }

  // Selected clip for direct canvas manipulation
  const selectedClip = activeClips.find(({ clip }) => selectedClipIds.includes(clip.id))?.clip;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedClip) return;
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedClip) return;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    // Dispatch transform keyframe / update
    dispatchCommand({
      commandId: `cmd_transform_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SET_KEYFRAME',
        clipId: selectedClip.id,
        propertyPath: 'transform.positionX',
        keyframe: {
          id: `kf_x_${Date.now()}`,
          timeOffset: { value: 0, rate: 60 },
          value: (selectedClip.transform.positionX.staticValue || 0) + dx,
          easing: 'linear',
          authorId: 'user',
        },
      },
    });

    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compute container dimensions based on selected aspect ratio
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] h-[92%]';
      case '1:1':
        return 'aspect-square h-[92%]';
      default:
        return 'aspect-video w-[92%]';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0e13] select-none text-zinc-300">
      {/* 1. Monitor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#141722] border-b border-[#272c3d] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">Program Monitor</span>
          <span className="text-[10px] text-zinc-500 uppercase font-mono">
            {project.settings.width}x{project.settings.height} • {project.settings.fps} FPS
          </span>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
          <button
            onClick={() => setAspectRatio('16:9')}
            className={`p-1 rounded flex items-center gap-1 text-[11px] ${
              aspectRatio === '16:9' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            title="16:9 Landscape (YouTube Standard)"
          >
            <Tv className="w-3 h-3" />
            <span>16:9</span>
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`p-1 rounded flex items-center gap-1 text-[11px] ${
              aspectRatio === '9:16' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            title="9:16 Portrait (TikTok / Shorts / Reels)"
          >
            <Smartphone className="w-3 h-3" />
            <span>9:16</span>
          </button>
          <button
            onClick={() => setAspectRatio('1:1')}
            className={`p-1 rounded flex items-center gap-1 text-[11px] ${
              aspectRatio === '1:1' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            title="1:1 Square (Instagram)"
          >
            <Square className="w-3 h-3" />
            <span>1:1</span>
          </button>
        </div>

        <button
          onClick={() => containerRef.current?.requestFullscreen?.()}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Fullscreen Monitor"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Monitor Canvas Display Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-black/80"
      >
        <div
          onMouseDown={handleMouseDown}
          className={`relative max-w-full max-h-full bg-black shadow-2xl border border-zinc-800 overflow-hidden flex items-center justify-center ${getAspectClass()}`}
        >
          {/* Real-time DaVinci Color Grading & GPU Shader / Transition Compositor */}
          <ShaderColorCompositor
            clip={activeStageClip || activeVideoClip || selectedClip}
            currentTimeSec={currentSec}
            className="absolute inset-0"
          >
            {/* Layer A: Stage Puppet (Stickman / 2.5D Camera Rig / Genre Scene) */}
            {activeStageClip?.stageScene ? (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <StickmanStageRenderer
                  stageScene={activeStageClip.stageScene}
                  currentTimeSec={stageClipTimeSec}
                  clipProgress0to1={stageClipProgress}
                />
              </div>
            ) : activeVideoClip ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {activeVideoAsset &&
                (activeVideoAsset.localFilePath.startsWith('blob:') ||
                  activeVideoAsset.localFilePath.startsWith('http')) ? (
                  activeVideoAsset.kind === 'video' ? (
                    <video
                      ref={videoElementRef}
                      src={activeVideoAsset.localFilePath}
                      playsInline
                      className="w-full h-full object-cover"
                      style={{
                        transform: `translate(${selectedClip?.transform.positionX.staticValue || 0}px, ${
                          selectedClip?.transform.positionY.staticValue || 0
                        }px) scale(${selectedClip?.transform.scaleX.staticValue || 1})`,
                      }}
                    />
                  ) : (
                    <img
                      src={activeVideoAsset.localFilePath}
                      alt={activeVideoClip.name}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `translate(${selectedClip?.transform.positionX.staticValue || 0}px, ${
                          selectedClip?.transform.positionY.staticValue || 0
                        }px) scale(${selectedClip?.transform.scaleX.staticValue || 1})`,
                      }}
                    />
                  )
                ) : (
                  <div
                    className="w-full h-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-blue-950/40 flex flex-col items-center justify-center text-center p-4 transition-transform"
                    style={{
                      transform: `translate(${selectedClip?.transform.positionX.staticValue || 0}px, ${
                        selectedClip?.transform.positionY.staticValue || 0
                      }px) scale(${selectedClip?.transform.scaleX.staticValue || 1})`,
                    }}
                  >
                    <div className="text-zinc-500 text-xs font-mono mb-2">[Video Stream Frame: {activeVideoClip.name}]</div>
                    {activeVideoClip.aiVfx.depthParallax3D?.enabled && (
                      <span className="text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> 3D Depth Parallax Active
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
                No Media at Current Playhead
              </div>
            )}

            {/* Layer B: Procedural Code-as-Motion Graphics */}
            {activeMotion && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <MotionCodeRenderer
                  motionCode={activeMotion}
                  currentFrame={currentFrame}
                  fps={project.settings.fps}
                  width={1920}
                  height={1080}
                />
              </div>
            )}
          </ShaderColorCompositor>

          {/* Layer C: Dynamic Word-Level Captions (CapCut / Hormozi Style) */}
          {activeCaption && (
            <div className="absolute bottom-12 inset-x-4 flex justify-center z-20 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-700/80 shadow-2xl flex flex-wrap gap-2 justify-center max-w-lg">
                {activeCaption.words.map((wordToken) => {
                  const wordStartSec = toSeconds(wordToken.startOffset);
                  const wordEndSec = toSeconds(wordToken.endOffset);
                  const isCurrent = currentSec >= wordStartSec && currentSec <= wordEndSec;

                  return (
                    <span
                      key={wordToken.id}
                      className={`font-black text-xl tracking-tight transition-all uppercase ${
                        isCurrent
                          ? 'scale-125 text-amber-400 drop-shadow-[0_0_12px_#f59e0b]'
                          : 'text-white/80'
                      }`}
                    >
                      {wordToken.word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Screen Manipulation Gizmo Overlay for Selected Clip */}
          {selectedClip && (
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-blue-500/60 z-30 flex items-center justify-center">
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                <Move className="w-3 h-3" /> Selected: {selectedClip.name}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

