/**
 * @file useStudioStore.ts
 * @description Central Reactive State Store & Deterministic Command Engine for Autonomous Studio Pro.
 * Unifies Manual Pro Editing (Premiere/DaVinci/CapCut UX) and Live Multi-Agent Autonomous Editing (Ghost Cursors,
 * Live Asset Flight animations, Per-Agent Undo/Redo, and User Lock Protection).
 */

import {
  addTime,
  AgentCursorState,
  compareTime,
  createRationalTime,
  CriticReviewReport,
  fromSeconds,
  LiveAssetFlightEvent,
  rangeEndTime,
  RationalTime,
  StudioProject,
  subtractTime,
  TimelineClip,
  TimelineCommandEnvelope,
  TimelineTrack,
} from '../../../../packages/core-schema/src';
import { compileScriptToDeterministicStageScenes } from '../../../../packages/stage-engine/src/genre-kits';

export interface StudioStoreState {
  project: StudioProject;
  playheadTime: RationalTime;
  isPlaying: boolean;
  selectedClipIds: string[];
  selectedTrackId: string | null;

  /** Live Autonomous Mode state */
  autonomousMode: 'idle' | 'running-autonomous' | 'paused-by-user' | 'critic-self-correcting';
  /** Active Ghost Cursors for every AI Agent currently working on the timeline */
  agentCursors: Record<string, AgentCursorState>;
  /** Active flying asset cards (Web/Stock Hunter -> Media Pool -> Timeline track animation) */
  activeAssetFlights: LiveAssetFlightEvent[];
  /** Latest Multimodal VLM Critic QA Review Report */
  latestCriticReport: CriticReviewReport | null;

  /** Full command history supporting both standard Undo/Redo and Per-Agent selective revert */
  commandHistory: {
    envelope: TimelineCommandEnvelope;
    previousProjectSnapshot: StudioProject;
  }[];
  redoStack: TimelineCommandEnvelope[];
}

/**
 * Create a clean default project ready for 60fps 1080p/4K production
 */
export function createDefaultStudioProject(name: string = 'Untitled Autonomous Project'): StudioProject {
  const now = new Date().toISOString();
  const defaultTracks: TimelineTrack[] = [
    {
      id: 'track-caption-1',
      name: 'C1 • Dynamic Captions (Hormozi/CapCut)',
      kind: 'caption',
      order: 50,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 54,
      clips: [],
    },
    {
      id: 'track-motion-1',
      name: 'M1 • Code-as-Motion (Motifs / Remotion)',
      kind: 'motion-code',
      order: 40,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 64,
      clips: [],
    },
    {
      id: 'track-stage-1',
      name: 'S1 • Stage & Stickman Puppet (Move-Set / Zero-AI)',
      kind: 'stage-puppet',
      order: 35,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 76,
      clips: [],
    },
    {
      id: 'track-video-broll',
      name: 'V2 • AI B-Roll & 3D Depth Parallax',
      kind: 'video',
      order: 30,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 76,
      clips: [],
    },
    {
      id: 'track-video-aroll',
      name: 'V1 • Primary A-Roll / Story Spine',
      kind: 'video',
      order: 20,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 84,
      clips: [],
    },
    {
      id: 'track-audio-voice',
      name: 'A1 • Dialogue / TTS Voiceover (Ducking Trigger)',
      kind: 'audio-voice',
      order: 10,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 64,
      clips: [],
    },
    {
      id: 'track-audio-sfx',
      name: 'A2 • Foley & Whoosh/Hit SFX (MMAudio)',
      kind: 'audio-sfx',
      order: 5,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 54,
      clips: [],
    },
    {
      id: 'track-audio-music',
      name: 'A3 • Beat-Synced BGM (Auto-Ducked -14dB)',
      kind: 'audio-music',
      order: 1,
      muted: false,
      solo: false,
      lockedByUser: false,
      visible: true,
      heightPx: 60,
      clips: [],
    },
  ];

  return {
    schemaVersion: '1.0.0',
    id: `proj_${Date.now()}`,
    name,
    createdAtIso: now,
    updatedAtIso: now,
    settings: {
      width: 1920,
      height: 1080,
      fps: 60,
      sampleRateHz: 48000,
      targetLoudnessLufs: -14.0,
      colorSpace: 'Rec.709',
    },
    mediaPool: {},
    tracks: defaultTracks,
    beatGrid: {
      bpm: 120,
      snapToBeats: true,
      markers: [],
    },
    youtubePackage: {
      status: 'draft',
      selectedTitle: '',
      titleAlternatives: [],
      descriptionSeo: '',
      tags: [],
      categoryId: '22',
      privacyStatus: 'unlisted',
      autoChapters: [],
      thumbnailVariants: [],
    },
  };
}

/**
 * Pure, deterministic reducer that applies any TimelineCommandEnvelope (User or AI Agent)
 * to a StudioProject while strictly enforcing User Locks (`lockedByUser`).
 */
export function applyTimelineCommand(
  project: StudioProject,
  envelope: TimelineCommandEnvelope
): { nextProject: StudioProject; rejectedReason?: string } {
  const isAgent = envelope.actor.kind === 'agent';
  const cmd = envelope.command;

  // Helper to check if a track or clip is locked against AI modification
  const isClipLockedForActor = (clip: TimelineClip, track: TimelineTrack): boolean => {
    if (!isAgent) return false;
    return clip.lockedByUser || track.lockedByUser;
  };

  switch (cmd.type) {
    case 'MEDIA_POOL_REGISTER_ASSET': {
      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          mediaPool: {
            ...project.mediaPool,
            [cmd.asset.id]: cmd.asset,
          },
        },
      };
    }

    case 'TRACK_ADD': {
      const newTrack: TimelineTrack = {
        id: `track_${cmd.trackKind}_${Date.now()}`,
        name: cmd.name,
        kind: cmd.trackKind,
        order: cmd.insertAtOrder ?? project.tracks.length * 10 + 10,
        muted: false,
        solo: false,
        lockedByUser: false,
        visible: true,
        heightPx: 68,
        clips: [],
      };
      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          tracks: [...project.tracks, newTrack].sort((a, b) => b.order - a.order),
        },
      };
    }

    case 'CLIP_INSERT': {
      const targetTrack = project.tracks.find((t) => t.id === cmd.trackId);
      if (!targetTrack) {
        return { nextProject: project, rejectedReason: `Track ${cmd.trackId} not found.` };
      }
      if (isAgent && targetTrack.lockedByUser) {
        return {
          nextProject: project,
          rejectedReason: `Track "${targetTrack.name}" is locked by the user. AI Agent cannot insert clips here.`,
        };
      }

      const updatedTracks = project.tracks.map((track) => {
        if (track.id !== cmd.trackId) return track;

        let nextClips = [...track.clips];
        if (cmd.rippleShiftSubsequentClips) {
          nextClips = nextClips.map((c) => {
            if (compareTime(c.timelineRange.startTime, cmd.clip.timelineRange.startTime) >= 0) {
              return {
                ...c,
                timelineRange: {
                  ...c.timelineRange,
                  startTime: addTime(c.timelineRange.startTime, cmd.clip.timelineRange.duration),
                },
              };
            }
            return c;
          });
        }
        nextClips.push(cmd.clip);
        nextClips.sort((a, b) => compareTime(a.timelineRange.startTime, b.timelineRange.startTime));
        return { ...track, clips: nextClips };
      });

      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          tracks: updatedTracks,
        },
      };
    }

    case 'CLIP_SPLIT': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === cmd.clipId);
        if (clipIdx === -1) return track;

        const targetClip = track.clips[clipIdx];
        if (isClipLockedForActor(targetClip, track)) {
          rejectedReason = `Clip "${targetClip.name}" is locked by user.`;
          return track;
        }

        const clipStart = targetClip.timelineRange.startTime;
        const clipEnd = rangeEndTime(targetClip.timelineRange);
        if (
          compareTime(cmd.splitAtTimelineTime, clipStart) <= 0 ||
          compareTime(cmd.splitAtTimelineTime, clipEnd) >= 0
        ) {
          rejectedReason = `Split time is outside clip boundaries.`;
          return track;
        }

        const leftDuration = subtractTime(cmd.splitAtTimelineTime, clipStart);
        const rightDuration = subtractTime(clipEnd, cmd.splitAtTimelineTime);

        const leftClip: TimelineClip = {
          ...targetClip,
          timelineRange: {
            startTime: clipStart,
            duration: leftDuration,
          },
          sourceRange: {
            startTime: targetClip.sourceRange.startTime,
            duration: leftDuration,
          },
          transitionOut: undefined,
        };

        const rightClip: TimelineClip = {
          ...targetClip,
          id: `${targetClip.id}_part2_${Date.now()}`,
          name: `${targetClip.name} (2)`,
          timelineRange: {
            startTime: cmd.splitAtTimelineTime,
            duration: rightDuration,
          },
          sourceRange: {
            startTime: addTime(targetClip.sourceRange.startTime, leftDuration),
            duration: rightDuration,
          },
          transitionIn: undefined,
        };

        const nextClips = [...track.clips];
        nextClips.splice(clipIdx, 1, leftClip, rightClip);
        return { ...track, clips: nextClips };
      });

      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          tracks: updatedTracks,
        },
      };
    }

    case 'CLIP_DELETE': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => {
        const targetClip = track.clips.find((c) => c.id === cmd.clipId);
        if (!targetClip) return track;
        if (isClipLockedForActor(targetClip, track)) {
          rejectedReason = `Clip "${targetClip.name}" is locked by user.`;
          return track;
        }

        const removedStart = targetClip.timelineRange.startTime;
        const removedDuration = targetClip.timelineRange.duration;

        let nextClips = track.clips.filter((c) => c.id !== cmd.clipId);
        if (cmd.rippleGapClose) {
          nextClips = nextClips.map((c) => {
            if (compareTime(c.timelineRange.startTime, removedStart) > 0 && !c.lockedByUser) {
              return {
                ...c,
                timelineRange: {
                  ...c.timelineRange,
                  startTime: subtractTime(c.timelineRange.startTime, removedDuration),
                },
              };
            }
            return c;
          });
        }
        return { ...track, clips: nextClips };
      });

      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          tracks: updatedTracks,
        },
      };
    }

    case 'CLIP_SET_LOCK': {
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) =>
          c.id === cmd.clipId ? { ...c, lockedByUser: cmd.lockedByUser } : c
        ),
      }));
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_SET_KEYFRAME': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          const [group, prop] = cmd.propertyPath.split('.');
          if (group === 'transform' && prop && prop in c.transform) {
            const k = prop as keyof typeof c.transform;
            const prevProp = c.transform[k];
            return {
              ...c,
              transform: {
                ...c.transform,
                [k]: {
                  staticValue: cmd.keyframe.value,
                  keyframes: [...prevProp.keyframes, cmd.keyframe],
                },
              },
            };
          }
          return c;
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_APPLY_SHADER': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return {
            ...c,
            shaders: [...c.shaders.filter((s) => s.id !== cmd.shader.id), cmd.shader],
          };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_SET_TRANSITION': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return cmd.edge === 'in'
            ? { ...c, transitionIn: cmd.transition }
            : { ...c, transitionOut: cmd.transition };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_SET_COLOR_GRADE': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return { ...c, colorGrade: { ...c.colorGrade, ...cmd.colorGrade } };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_SET_AI_VFX': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return { ...c, aiVfx: { ...c.aiVfx, ...cmd.aiVfx } };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'YOUTUBE_UPDATE_PACKAGE': {
      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          youtubePackage: {
            ...project.youtubePackage,
            ...cmd.pkg,
          },
        },
      };
    }

    case 'CLIP_SET_STAGE_SCENE': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return { ...c, stageScene: cmd.stageScene };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'PROJECT_COMPILE_DETERMINISTIC_STAGE': {
      const compiled = compileScriptToDeterministicStageScenes(cmd.scriptText, cmd.genreKit);
      const fps = project.settings.fps;

      const generatedStageClips: TimelineClip[] = compiled.scenes.map((sc, idx) => ({
        id: `clip_stage_${Date.now()}_${idx}`,
        name: `🎭 [${cmd.genreKit}] #${idx + 1}: ${sc.stageScene.actors[0]?.moveSet || 'scene'}`,
        trackId: 'track-stage-1',
        kind: 'stage-puppet',
        timelineRange: {
          startTime: fromSeconds(sc.startTimeSec, fps),
          duration: fromSeconds(sc.durationSec, fps),
        },
        sourceRange: {
          startTime: fromSeconds(0, fps),
          duration: fromSeconds(sc.durationSec, fps),
        },
        speedMultiplier: 1.0,
        blendMode: 'normal',
        enabled: true,
        lockedByUser: false,
        transform: {
          positionX: { staticValue: 0, keyframes: [] },
          positionY: { staticValue: 0, keyframes: [] },
          positionZ: { staticValue: 0, keyframes: [] },
          scaleX: { staticValue: 1, keyframes: [] },
          scaleY: { staticValue: 1, keyframes: [] },
          rotationX: { staticValue: 0, keyframes: [] },
          rotationY: { staticValue: 0, keyframes: [] },
          rotationZ: { staticValue: 0, keyframes: [] },
          anchorX: { staticValue: 0, keyframes: [] },
          anchorY: { staticValue: 0, keyframes: [] },
          opacity: { staticValue: 1, keyframes: [] },
        },
        shaders: [],
        colorGrade: {
          enabled: false,
          exposure: { staticValue: 0, keyframes: [] },
          contrast: { staticValue: 1, keyframes: [] },
          saturation: { staticValue: 1, keyframes: [] },
          temperature: { staticValue: 0, keyframes: [] },
          tint: { staticValue: 0, keyframes: [] },
          lift: [0, 0, 0, 0],
          gamma: [0, 0, 0, 0],
          gain: [0, 0, 0, 0],
          lutIntensity: { staticValue: 1, keyframes: [] },
          filmGrainIntensity: { staticValue: 0, keyframes: [] },
          halationIntensity: { staticValue: 0, keyframes: [] },
        },
        aiVfx: {},
        audio: {
          volumeDb: { staticValue: 0, keyframes: [] },
          pan: { staticValue: 0, keyframes: [] },
          mute: true,
          fadeInDuration: fromSeconds(0, fps),
          fadeOutDuration: fromSeconds(0, fps),
          aiDenoiseEnabled: false,
          aiVocalIsolationEnabled: false,
          duckingRole: 'none',
          duckingAmountDb: 0,
        },
        stageScene: sc.stageScene,
      }));

      const updatedTracks = project.tracks.map((track) => {
        if (track.id !== 'track-stage-1') return track;
        return {
          ...track,
          clips: cmd.replaceExistingStageTrack
            ? generatedStageClips
            : [...track.clips, ...generatedStageClips],
        };
      });

      return {
        nextProject: {
          ...project,
          updatedAtIso: new Date().toISOString(),
          tracks: updatedTracks,
        },
      };
    }

    case 'CLIP_MOVE': {
      let rejectedReason: string | undefined;
      let movedClip: TimelineClip | null = null;

      for (const track of project.tracks) {
        const found = track.clips.find((c) => c.id === cmd.clipId);
        if (found) {
          if (isClipLockedForActor(found, track)) {
            return { nextProject: project, rejectedReason: `Clip "${found.name}" is locked by user.` };
          }
          movedClip = {
            ...found,
            trackId: cmd.targetTrackId,
            timelineRange: {
              ...found.timelineRange,
              startTime: cmd.newStartTime,
            },
          };
          break;
        }
      }

      if (!movedClip) return { nextProject: project };

      const updatedTracks = project.tracks.map((track) => {
        const filtered = track.clips.filter((c) => c.id !== cmd.clipId);
        if (track.id === cmd.targetTrackId) {
          const nextClips = [...filtered, movedClip!];
          nextClips.sort((a, b) => compareTime(a.timelineRange.startTime, b.timelineRange.startTime));
          return { ...track, clips: nextClips };
        }
        return { ...track, clips: filtered };
      });

      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'CLIP_TRIM': {
      let rejectedReason: string | undefined;
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== cmd.clipId) return c;
          if (isClipLockedForActor(c, track)) {
            rejectedReason = `Clip "${c.name}" is locked by user.`;
            return c;
          }
          return {
            ...c,
            timelineRange: cmd.newTimelineRange,
            sourceRange: cmd.newSourceRange,
          };
        }),
      }));
      if (rejectedReason) return { nextProject: project, rejectedReason };
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    case 'TRACK_UPDATE_STATE': {
      const updatedTracks = project.tracks.map((track) => {
        if (track.id !== cmd.trackId) return track;
        return {
          ...track,
          lockedByUser: cmd.lockedByUser ?? track.lockedByUser,
          muted: cmd.muted ?? track.muted,
          solo: cmd.solo ?? track.solo,
          visible: cmd.visible ?? track.visible,
        };
      });
      return {
        nextProject: { ...project, updatedAtIso: new Date().toISOString(), tracks: updatedTracks },
      };
    }

    default:
      return { nextProject: project };
  }
}

/**
 * Selective Per-Agent Undo: Reverts all actions performed by a specific AI Agent ID
 * (or the last N actions of that agent) without losing manual edits made by the User!
 */
export function createSelectiveAgentUndo(
  currentProject: StudioProject,
  history: StudioStoreState['commandHistory'],
  targetAgentId: string
): StudioProject {
  const remainingEnvelopes = history
    .map((h) => h.envelope)
    .filter((env) => !(env.actor.kind === 'agent' && env.actor.id === targetAgentId));

  let rebuilt = history.length > 0 ? history[0].previousProjectSnapshot : currentProject;
  for (const env of remainingEnvelopes) {
    rebuilt = applyTimelineCommand(rebuilt, env).nextProject;
  }
  return rebuilt;
}

import { create } from 'zustand';

export const INITIAL_STUDIO_STORE_STATE: StudioStoreState = {
  project: createDefaultStudioProject(),
  playheadTime: createRationalTime(0, 60),
  isPlaying: false,
  selectedClipIds: [],
  selectedTrackId: null,
  autonomousMode: 'idle',
  agentCursors: {},
  activeAssetFlights: [],
  latestCriticReport: null,
  commandHistory: [],
  redoStack: [],
};

export interface StudioStoreActions {
  dispatchCommand: (envelope: TimelineCommandEnvelope) => { success: boolean; rejectedReason?: string };
  undo: () => boolean;
  redo: () => boolean;
  undoAgent: (agentId: string) => void;
  setPlayheadTime: (time: RationalTime) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  selectClip: (clipId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  selectTrack: (trackId: string | null) => void;
  setAutonomousMode: (mode: StudioStoreState['autonomousMode']) => void;
  updateAgentCursor: (cursor: AgentCursorState) => void;
  removeAgentCursor: (agentId: string) => void;
  addAssetFlight: (flight: LiveAssetFlightEvent) => void;
  removeAssetFlight: (eventId: string) => void;
  setLatestCriticReport: (report: CriticReviewReport | null) => void;
  loadProject: (project: StudioProject) => void;
}

export type StudioStore = StudioStoreState & StudioStoreActions;

export const useStudioStore = create<StudioStore>((set, get) => ({
  ...INITIAL_STUDIO_STORE_STATE,

  dispatchCommand: (envelope) => {
    const state = get();
    const previousProjectSnapshot = state.project;
    const { nextProject, rejectedReason } = applyTimelineCommand(previousProjectSnapshot, envelope);

    if (rejectedReason) {
      console.warn(`[StudioStore] Command rejected: ${rejectedReason}`, envelope);
      return { success: false, rejectedReason };
    }

    set({
      project: nextProject,
      commandHistory: [...state.commandHistory, { envelope, previousProjectSnapshot }],
      redoStack: [], // New command clears redo stack
    });

    return { success: true };
  },

  undo: () => {
    const { commandHistory, redoStack, project } = get();
    if (commandHistory.length === 0) return false;

    const lastEntry = commandHistory[commandHistory.length - 1];
    const newHistory = commandHistory.slice(0, -1);

    set({
      project: lastEntry.previousProjectSnapshot,
      commandHistory: newHistory,
      redoStack: [...redoStack, lastEntry.envelope],
    });

    return true;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return false;

    const nextEnvelope = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    const { success } = get().dispatchCommand(nextEnvelope);
    if (success) {
      set({ redoStack: newRedoStack });
      return true;
    }
    return false;
  },

  undoAgent: (agentId: string) => {
    const { project, commandHistory } = get();
    const reverted = createSelectiveAgentUndo(project, commandHistory, agentId);
    set({
      project: reverted,
      commandHistory: commandHistory.filter(
        (h) => !(h.envelope.actor.kind === 'agent' && h.envelope.actor.id === agentId)
      ),
    });
  },

  setPlayheadTime: (time) => set({ playheadTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  selectClip: (clipId, multiSelect = false) => {
    set((s) => ({
      selectedClipIds: multiSelect
        ? s.selectedClipIds.includes(clipId)
          ? s.selectedClipIds.filter((id) => id !== clipId)
          : [...s.selectedClipIds, clipId]
        : [clipId],
    }));
  },

  clearSelection: () => set({ selectedClipIds: [] }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),
  setAutonomousMode: (mode) => set({ autonomousMode: mode }),

  updateAgentCursor: (cursor) => {
    set((s) => ({
      agentCursors: {
        ...s.agentCursors,
        [cursor.agentId]: cursor,
      },
    }));
  },

  removeAgentCursor: (agentId) => {
    set((s) => {
      const nextCursors = { ...s.agentCursors };
      delete nextCursors[agentId];
      return { agentCursors: nextCursors };
    });
  },

  addAssetFlight: (flight) => {
    set((s) => ({
      activeAssetFlights: [...s.activeAssetFlights, flight],
    }));
  },

  removeAssetFlight: (eventId) => {
    set((s) => ({
      activeAssetFlights: s.activeAssetFlights.filter((f) => f.eventId !== eventId),
    }));
  },

  setLatestCriticReport: (report) => set({ latestCriticReport: report }),
  loadProject: (project) => set({ project, commandHistory: [], redoStack: [] }),
}));


