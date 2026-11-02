/**
 * @file MultiTrackTimeline.tsx
 * @description Professional Multi-Track Magnetic Timeline (Premiere Pro precision + CapCut ease).
 * Features:
 *   1. Track Lock, Mute, Visibility controls driven by TRACK_UPDATE_STATE.
 *   2. Ruler Drag Scrubbing with mouse drag.
 *   3. Interactive Clip Drag Move (CLIP_MOVE) and Left/Right Trim Handles (CLIP_TRIM).
 *   4. Keyboard shortcuts: Delete/Backspace (Delete), S/C (Split), Ctrl+Z/Cmd+Z (Undo/Redo).
 *   5. Stage-Puppet distinct amber track styling and live Ghost Cursor overlay.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { AgentGhostCursorOverlay } from './AgentGhostCursorOverlay';
import {
  toSeconds,
  toSMPTETimecode,
  fromSeconds,
  compareTime,
} from '../../../../../packages/core-schema/src/rational-time';
import { TimelineClip, TimelineTrack } from '../../../../../packages/core-schema/src/timeline';
import {
  Play,
  Pause,
  Scissors,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Trash2,
  Undo2,
  Redo2,
  Magnet,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DragState {
  type: 'move' | 'trim-start' | 'trim-end';
  clip: TimelineClip;
  trackId: string;
  initialClientX: number;
  initialStartSec: number;
  initialDurSec: number;
}

export const MultiTrackTimeline: React.FC = () => {
  const project = useStudioStore((s) => s.project);
  const playheadTime = useStudioStore((s) => s.playheadTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const togglePlay = useStudioStore((s) => s.togglePlay);
  const setPlayheadTime = useStudioStore((s) => s.setPlayheadTime);
  const selectedClipIds = useStudioStore((s) => s.selectedClipIds);
  const selectClip = useStudioStore((s) => s.selectClip);
  const clearSelection = useStudioStore((s) => s.clearSelection);
  const dispatchCommand = useStudioStore((s) => s.dispatchCommand);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);

  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(60); // Zoom level
  const [timelineScrollLeft, setTimelineScrollLeft] = useState<number>(0);
  const [isRulerDragging, setIsRulerDragging] = useState<boolean>(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const playheadSec = toSeconds(playheadTime);
  const displayFps = project.settings.fps;

  // 1. Ruler Scrubbing Logic
  const scrubAtEvent = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left + timelineScrollLeft;
      const clickedSec = Math.max(0, clickX / pixelsPerSecond);
      setPlayheadTime(fromSeconds(clickedSec, displayFps));
    },
    [pixelsPerSecond, timelineScrollLeft, displayFps, setPlayheadTime]
  );

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsRulerDragging(true);
    scrubAtEvent(e.clientX);
  };

  useEffect(() => {
    if (!isRulerDragging) return;

    const onMouseMove = (e: MouseEvent) => scrubAtEvent(e.clientX);
    const onMouseUp = () => setIsRulerDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isRulerDragging, scrubAtEvent]);

  // 2. Interactive Clip Move & Trim Dragging
  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.initialClientX;
      const deltaSec = deltaPx / pixelsPerSecond;

      if (dragState.type === 'move') {
        const newStartSec = Math.max(0, dragState.initialStartSec + deltaSec);
        dispatchCommand({
          commandId: `cmd_move_${Date.now()}`,
          actor: { kind: 'user', id: 'user_local', displayName: 'User' },
          timestampMs: Date.now(),
          command: {
            type: 'CLIP_MOVE',
            clipId: dragState.clip.id,
            targetTrackId: dragState.trackId,
            newStartTime: fromSeconds(newStartSec, displayFps),
          },
        });
      } else if (dragState.type === 'trim-start') {
        const newStartSec = Math.max(0, dragState.initialStartSec + deltaSec);
        const newDurSec = Math.max(0.2, dragState.initialDurSec - deltaSec);
        dispatchCommand({
          commandId: `cmd_trim_${Date.now()}`,
          actor: { kind: 'user', id: 'user_local', displayName: 'User' },
          timestampMs: Date.now(),
          command: {
            type: 'CLIP_TRIM',
            clipId: dragState.clip.id,
            newTimelineRange: {
              startTime: fromSeconds(newStartSec, displayFps),
              duration: fromSeconds(newDurSec, displayFps),
            },
            newSourceRange: {
              startTime: fromSeconds(newStartSec, displayFps),
              duration: fromSeconds(newDurSec, displayFps),
            },
            ripple: false,
          },
        });
      } else if (dragState.type === 'trim-end') {
        const newDurSec = Math.max(0.2, dragState.initialDurSec + deltaSec);
        dispatchCommand({
          commandId: `cmd_trim_${Date.now()}`,
          actor: { kind: 'user', id: 'user_local', displayName: 'User' },
          timestampMs: Date.now(),
          command: {
            type: 'CLIP_TRIM',
            clipId: dragState.clip.id,
            newTimelineRange: {
              startTime: dragState.clip.timelineRange.startTime,
              duration: fromSeconds(newDurSec, displayFps),
            },
            newSourceRange: {
              startTime: dragState.clip.sourceRange.startTime,
              duration: fromSeconds(newDurSec, displayFps),
            },
            ripple: false,
          },
        });
      }
    };

    const onMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, pixelsPerSecond, displayFps, dispatchCommand]);

  // 3. Professional Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Delete / Backspace: Delete selected clip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // S or C: Split clip at playhead
      if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'c') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          handleSplitAtPlayhead();
        }
      }

      // Ctrl+Z / Cmd+Z: Undo / Redo
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, playheadTime, undo, redo]);

  // Split selected clip at playhead
  const handleSplitAtPlayhead = () => {
    if (selectedClipIds.length === 0) return;
    const targetClipId = selectedClipIds[0];

    dispatchCommand({
      commandId: `cmd_split_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_SPLIT',
        clipId: targetClipId,
        splitAtTimelineTime: playheadTime,
      },
    });
  };

  // Delete selected clip
  const handleDeleteSelected = () => {
    if (selectedClipIds.length === 0) return;
    const targetClipId = selectedClipIds[0];

    dispatchCommand({
      commandId: `cmd_del_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'CLIP_DELETE',
        clipId: targetClipId,
        rippleGapClose: true,
      },
    });
    clearSelection();
  };

  // Update Track State (Lock / Mute / Visible)
  const handleUpdateTrackState = (
    trackId: string,
    updates: { lockedByUser?: boolean; muted?: boolean; visible?: boolean }
  ) => {
    dispatchCommand({
      commandId: `cmd_track_state_${Date.now()}`,
      actor: { kind: 'user', id: 'user_local', displayName: 'User' },
      timestampMs: Date.now(),
      command: {
        type: 'TRACK_UPDATE_STATE',
        trackId,
        ...updates,
      },
    });
  };

  const getTrackColor = (kind: TimelineTrack['kind']) => {
    switch (kind) {
      case 'stage-puppet':
        return 'border-yellow-500/50 bg-yellow-950/30 text-yellow-300';
      case 'caption':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-300';
      case 'motion-code':
        return 'border-pink-500/40 bg-pink-950/20 text-pink-300';
      case 'video':
        return 'border-blue-500/40 bg-blue-950/20 text-blue-300';
      case 'audio-voice':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';
      case 'audio-sfx':
        return 'border-purple-500/40 bg-purple-950/20 text-purple-300';
      case 'audio-music':
        return 'border-indigo-500/40 bg-indigo-950/20 text-indigo-300';
      default:
        return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    }
  };

  const totalDurationSec = 60;
  const totalWidthPx = Math.max(2000, totalDurationSec * pixelsPerSecond);

  return (
    <div className="flex flex-col h-full bg-[#10131b] border-t border-[#272c3d] select-none text-zinc-300">
      {/* 1. Timeline Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161a26] border-b border-[#272c3d] text-xs">
        {/* Playback Controls & SMPTE Timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="font-mono text-sm tracking-wider font-semibold text-blue-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
            {toSMPTETimecode(playheadTime, displayFps)}
          </div>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Edit Tools */}
          <button
            onClick={handleSplitAtPlayhead}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f2434] hover:bg-[#282e44] disabled:opacity-40 text-zinc-200 border border-[#2e364e]"
            title="Split Clip at Playhead (S or C)"
          >
            <Scissors className="w-3.5 h-3.5 text-blue-400" />
            <span>Split (S)</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedClipIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f2434] hover:bg-red-950/40 hover:text-red-300 disabled:opacity-40 text-zinc-300 border border-[#2e364e]"
            title="Ripple Delete Selected Clip (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          <button
            onClick={() => undo()}
            className="p-1.5 rounded hover:bg-[#282e44] text-zinc-300"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => redo()}
            className="p-1.5 rounded hover:bg-[#282e44] text-zinc-300"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Beat Magnet */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            <Magnet className="w-3.5 h-3.5 text-amber-400" />
            <span>Beat-Sync: {project.beatGrid.bpm} BPM</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Zoom:</span>
            <input
              type="range"
              min={20}
              max={180}
              value={pixelsPerSecond}
              onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
              className="w-20 accent-blue-500 h-1 bg-zinc-700 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Main Timeline Workspace: Left Track Headers + Right Scrollable Tracks */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Track Headers (Fixed) */}
        <div className="w-64 bg-[#141722] border-r border-[#272c3d] flex flex-col shrink-0 z-20">
          {/* Header Spacer matching Ruler */}
          <div className="h-7 border-b border-[#272c3d] flex items-center px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            Tracks
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 overflow-y-hidden">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between px-3 border-b border-[#222738] bg-[#141722] hover:bg-[#191d2b] transition-colors"
                style={{ height: track.heightPx }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-medium text-zinc-200 truncate">{track.name}</span>
                </div>

                <div className="flex items-center gap-1 text-zinc-400">
                  <button
                    onClick={() =>
                      handleUpdateTrackState(track.id, { lockedByUser: !track.lockedByUser })
                    }
                    className={`p-1 rounded hover:bg-zinc-800 ${
                      track.lockedByUser ? 'text-amber-400' : ''
                    }`}
                    title={track.lockedByUser ? 'Unlock Track' : 'Lock Track (AI Cannot Edit)'}
                  >
                    {track.lockedByUser ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleUpdateTrackState(track.id, { muted: !track.muted })}
                    className="p-1 rounded hover:bg-zinc-800"
                    title={track.muted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.muted ? (
                      <VolumeX className="w-3 h-3 text-red-400" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleUpdateTrackState(track.id, { visible: !track.visible })}
                    className="p-1 rounded hover:bg-zinc-800"
                    title={track.visible ? 'Hide Track' : 'Show Track'}
                  >
                    {track.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={timelineBodyRef}
          onScroll={(e) => setTimelineScrollLeft(e.currentTarget.scrollLeft)}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0d0f14]"
        >
          <div style={{ width: totalWidthPx }} className="h-full relative">
            {/* Timecode Ruler with Scrub Dragging */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              className="h-7 border-b border-[#272c3d] bg-[#12151e] sticky top-0 z-10 cursor-pointer relative"
              title="Click or drag to scrub playhead"
            >
              {Array.from({ length: totalDurationSec + 1 }).map((_, sec) => (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 border-l border-[#272c3d] pl-1 text-[9px] font-mono text-zinc-500 pointer-events-none"
                  style={{ left: sec * pixelsPerSecond }}
                >
                  {sec % 5 === 0 ? `${sec}s` : ''}
                </div>
              ))}
            </div>

            {/* Red Playhead Laser Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none shadow-[0_0_8px_#ef4444]"
              style={{
                left: playheadSec * pixelsPerSecond,
              }}
            >
              <div className="w-3 h-3 bg-red-500 rotate-45 -translate-x-[5px] -translate-y-1.5 shadow" />
            </div>

            {/* Ghost Cursor Overlay (Live AI Editing Visualizer) */}
            <AgentGhostCursorOverlay
              pixelsPerSecond={pixelsPerSecond}
              timelineScrollLeft={0}
              timelineHeight={600}
            />

            {/* Track Lanes with Clips */}
            <div>
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`relative border-b border-[#1c2130] bg-[#0f1118]/60 hover:bg-[#121520]/80 transition-colors ${
                    !track.visible ? 'opacity-30' : ''
                  }`}
                  style={{ height: track.heightPx }}
                  onClick={() => clearSelection()}
                >
                  {/* Clip Items */}
                  {track.clips.map((clip) => {
                    const startSec = toSeconds(clip.timelineRange.startTime);
                    const durSec = toSeconds(clip.timelineRange.duration);
                    const isSelected = selectedClipIds.includes(clip.id);

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          selectClip(clip.id, e.shiftKey);
                          // Start move drag
                          setDragState({
                            type: 'move',
                            clip,
                            trackId: track.id,
                            initialClientX: e.clientX,
                            initialStartSec: startSec,
                            initialDurSec: durSec,
                          });
                        }}
                        className={`group absolute top-1 bottom-1 rounded border px-2 py-1 flex items-center justify-between cursor-move text-xs shadow-md transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-400 border-white z-20 brightness-110'
                            : getTrackColor(track.kind)
                        }`}
                        style={{
                          left: startSec * pixelsPerSecond,
                          width: Math.max(30, durSec * pixelsPerSecond),
                        }}
                      >
                        {/* Left Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            selectClip(clip.id, false);
                            setDragState({
                              type: 'trim-start',
                              clip,
                              trackId: track.id,
                              initialClientX: e.clientX,
                              initialStartSec: startSec,
                              initialDurSec: durSec,
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-l transition-colors z-30"
                          title="Drag to trim start (CLIP_TRIM)"
                        />

                        {/* Clip Content */}
                        <div className="flex items-center gap-1.5 truncate pointer-events-none px-1">
                          {clip.agentProvenance && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: '#3b82f6' }}
                              title={`Placed by AI Agent: ${clip.agentProvenance.agentRole}`}
                            />
                          )}
                          <span className="truncate font-medium">{clip.name}</span>
                        </div>

                        {/* Clip Actions / Lock Badge */}
                        <div className="flex items-center gap-1 shrink-0 ml-1 pointer-events-auto">
                          {clip.shaders.length > 0 && (
                            <span className="text-[10px] bg-purple-950 px-1 py-0.5 rounded text-purple-300 font-mono">
                              FX
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatchCommand({
                                commandId: `cmd_lock_${Date.now()}`,
                                actor: { kind: 'user', id: 'user_local', displayName: 'User' },
                                timestampMs: Date.now(),
                                command: {
                                  type: 'CLIP_SET_LOCK',
                                  clipId: clip.id,
                                  lockedByUser: !clip.lockedByUser,
                                },
                              });
                            }}
                            className={`p-0.5 rounded hover:bg-black/30 ${
                              clip.lockedByUser
                                ? 'text-amber-400'
                                : 'text-zinc-400 opacity-40 hover:opacity-100'
                            }`}
                            title={clip.lockedByUser ? 'Clip locked by user' : 'Lock clip'}
                          >
                            {clip.lockedByUser ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            selectClip(clip.id, false);
                            setDragState({
                              type: 'trim-end',
                              clip,
                              trackId: track.id,
                              initialClientX: e.clientX,
                              initialStartSec: startSec,
                              initialDurSec: durSec,
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-r transition-colors z-30"
                          title="Drag to trim end (CLIP_TRIM)"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
