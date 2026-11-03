/**
 * @file command-gateway.ts
 * @description Single Authoritative Command Gateway for Autonomous Studio Pro.
 *
 * Enforces Non-Negotiable Rule #3:
 * All state changes (User manual edits, Live AI edits, Batch Production jobs, and Worker callbacks)
 * MUST pass through this typed Command Gateway.
 * Supports:
 *  - All 18 canonical commands + legacy compatibility
 *  - Validation before execution
 *  - Optimistic concurrency control (`expectedRevision`) & conflict detection
 *  - Atomic execution with Project revision increment
 *  - Full Undo AND Redo stacks
 *  - Audit history with origin metadata (`user`, `ai-live`, `batch-job`, `worker`)
 */

import { RationalTime, addTime, subTime, compareTime, fromSeconds } from './rational-time';
import { StudioProject, Track, Clip, ChoreographedStageScene } from './timeline';
import { AssetRegistryEntry } from './asset-registry';
import { REUSABLE_CHARACTER_ACTIONS, ReusableCharacterActionId } from './character-library';
import { VideoDSLSpecification, validateVideoDsl } from './video-dsl';
import { CameraRigPresetId } from '../../stage-engine/src/camera-choreography';

export type CommandOriginKind = 'user' | 'ai-live' | 'batch-job' | 'worker';

export interface CommandOriginMetadata {
  readonly kind: CommandOriginKind;
  readonly actorId: string;
  readonly displayName: string;
  readonly correlationJobId?: string;
  readonly reasoning?: string;
}

export type CanonicalGatewayCommand =
  | { readonly type: 'ImportMedia'; readonly asset: AssetRegistryEntry }
  | {
      readonly type: 'CreateSequence';
      readonly sequenceId: string;
      readonly name: string;
      readonly width: number;
      readonly height: number;
      readonly fps: 24 | 25 | 30 | 60;
    }
  | { readonly type: 'AddTrack'; readonly track: Track }
  | {
      readonly type: 'InsertClip';
      readonly trackId: string;
      readonly clip: Clip;
      readonly rippleShift?: boolean;
    }
  | {
      readonly type: 'MoveClip';
      readonly clipId: string;
      readonly targetTrackId: string;
      readonly newStartTime: RationalTime;
    }
  | {
      readonly type: 'TrimClip';
      readonly clipId: string;
      readonly newStartTime?: RationalTime;
      readonly newDuration?: RationalTime;
    }
  | {
      readonly type: 'SplitClip';
      readonly clipId: string;
      readonly splitTime: RationalTime;
    }
  | {
      readonly type: 'DeleteClip';
      readonly clipId: string;
      readonly rippleDeleteGap?: boolean;
    }
  | {
      readonly type: 'ApplyTransition';
      readonly clipId: string;
      readonly edge: 'in' | 'out';
      readonly transitionShaderId: string;
      readonly duration: RationalTime;
    }
  | {
      readonly type: 'ApplyEffect';
      readonly clipId: string;
      readonly shaderId: string;
      readonly name: string;
      readonly uniforms?: Record<string, number | readonly number[]>;
    }
  | {
      readonly type: 'SetKeyframe';
      readonly clipId: string;
      readonly property: 'positionX' | 'positionY' | 'scaleX' | 'scaleY' | 'rotationZ' | 'opacity';
      readonly timeOffset: RationalTime;
      readonly value: number;
    }
  | {
      readonly type: 'UpdateCharacterPose';
      readonly clipId: string;
      readonly actorId: string;
      readonly actionId: ReusableCharacterActionId;
      readonly expression?: 'neutral' | 'happy' | 'surprised' | 'angry- panic' | 'skeptical' | 'determined' | 'mind-blown';
      readonly speechText?: string;
    }
  | {
      readonly type: 'ApplyMotionPreset';
      readonly clipId: string;
      readonly presetId: string;
      readonly props?: Record<string, unknown>;
    }
  | {
      readonly type: 'UpdateSceneComposition';
      readonly clipId: string;
      readonly stageScene: ChoreographedStageScene;
    }
  | {
      readonly type: 'AdjustAudio';
      readonly clipId: string;
      readonly volumeDb?: number;
      readonly mute?: boolean;
      readonly aiDenoiseEnabled?: boolean;
    }
  | {
      readonly type: 'AdjustColor';
      readonly clipId: string;
      readonly exposure?: number;
      readonly contrast?: number;
      readonly saturation?: number;
      readonly temperature?: number;
    }
  | {
      readonly type: 'ReplaceAsset';
      readonly clipId: string;
      readonly newAssetId: string;
    }
  | {
      readonly type: 'RenderSequence';
      readonly outputFilePath: string;
      readonly encoder: string;
      readonly targetLufs: number;
    };

export interface GatewayCommandEnvelope {
  readonly commandId: string;
  readonly origin: CommandOriginMetadata;
  /** If provided, gateway rejects execution if current revision !== expectedRevision */
  readonly expectedRevision?: number;
  readonly timestampMs: number;
  readonly command: CanonicalGatewayCommand;
}

export interface GatewayAuditEntry {
  readonly commandId: string;
  readonly revisionBefore: number;
  readonly revisionAfter: number;
  readonly origin: CommandOriginMetadata;
  readonly commandType: CanonicalGatewayCommand['type'];
  readonly timestampMs: number;
}

export interface CommandGatewayState {
  readonly project: StudioProject;
  readonly revision: number;
  readonly assetRegistry: Record<string, AssetRegistryEntry>;
  readonly undoStack: readonly { readonly project: StudioProject; readonly revision: number; readonly origin: CommandOriginMetadata }[];
  readonly redoStack: readonly { readonly project: StudioProject; readonly revision: number; readonly origin: CommandOriginMetadata }[];
  readonly auditHistory: readonly GatewayAuditEntry[];
}

export interface CommandExecutionResult {
  readonly accepted: boolean;
  readonly conflictDetected: boolean;
  readonly validationErrors: readonly string[];
  readonly newRevision: number;
  readonly state: CommandGatewayState;
}

/**
 * Validates a `GatewayCommandEnvelope` against current `CommandGatewayState` before mutating anything.
 */
export function validateGatewayCommand(
  state: CommandGatewayState,
  envelope: GatewayCommandEnvelope
): { readonly valid: boolean; readonly conflict: boolean; readonly errors: string[] } {
  const errors: string[] = [];

  if (!envelope.commandId) {
    errors.push('Missing commandId.');
  }

  // Optimistic Concurrency Control: prevent AI/User concurrent edit overwrites
  if (
    typeof envelope.expectedRevision === 'number' &&
    envelope.expectedRevision !== state.revision
  ) {
    return {
      valid: false,
      conflict: true,
      errors: [
        `Revision conflict: command expected revision ${envelope.expectedRevision}, but project is at revision ${state.revision}.`,
      ],
    };
  }

  const cmd = envelope.command;
  const findClip = (clipId: string): Clip | undefined => {
    for (const t of state.project.tracks) {
      const c = t.clips.find((item) => item.id === clipId);
      if (c) return c;
    }
    return undefined;
  };

  switch (cmd.type) {
    case 'ImportMedia':
      if (!cmd.asset || !cmd.asset.assetId) {
        errors.push('ImportMedia requires a valid asset with assetId.');
      }
      break;

    case 'InsertClip': {
      const track = state.project.tracks.find((t) => t.id === cmd.trackId);
      if (!track) {
        errors.push(`Target track '${cmd.trackId}' does not exist.`);
      } else if (track.lockedByUser) {
        errors.push(`Target track '${cmd.trackId}' is locked.`);
      }
      if (!cmd.clip || cmd.clip.timelineRange.duration.value <= 0) {
        errors.push('InsertClip requires a clip with positive duration.');
      }
      break;
    }

    case 'MoveClip':
    case 'TrimClip':
    case 'SplitClip':
    case 'DeleteClip':
    case 'ApplyTransition':
    case 'ApplyEffect':
    case 'SetKeyframe':
    case 'UpdateCharacterPose':
    case 'ApplyMotionPreset':
    case 'UpdateSceneComposition':
    case 'AdjustAudio':
    case 'AdjustColor':
    case 'ReplaceAsset': {
      const targetClip = findClip(cmd.clipId);
      if (!targetClip) {
        errors.push(`Target clip '${cmd.clipId}' not found on any track.`);
      } else if (targetClip.lockedByUser && envelope.origin.kind !== 'user') {
        errors.push(`Clip '${cmd.clipId}' is locked by the user and cannot be modified by '${envelope.origin.kind}'.`);
      }
      break;
    }

    default:
      break;
  }

  return {
    valid: errors.length === 0,
    conflict: false,
    errors,
  };
}

/**
 * Atomically executes a validated command through the Command Gateway, incrementing `revision`,
 * recording `auditHistory`, pushing to `undoStack`, and clearing `redoStack`.
 */
export function executeGatewayCommand(
  state: CommandGatewayState,
  envelope: GatewayCommandEnvelope
): CommandExecutionResult {
  const check = validateGatewayCommand(state, envelope);
  if (!check.valid) {
    return {
      accepted: false,
      conflictDetected: check.conflict,
      validationErrors: check.errors,
      newRevision: state.revision,
      state,
    };
  }

  const cmd = envelope.command;
  let nextProject: StudioProject = state.project;
  let nextAssetRegistry = state.assetRegistry;

  const updateClipAcrossTracks = (clipId: string, updater: (clip: Clip) => Clip): StudioProject => ({
    ...nextProject,
    updatedAtIso: new Date().toISOString(),
    tracks: nextProject.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.id === clipId ? updater(c) : c)),
    })),
  });

  switch (cmd.type) {
    case 'ImportMedia': {
      nextAssetRegistry = {
        ...nextAssetRegistry,
        [cmd.asset.assetId]: cmd.asset,
      };
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        mediaPool: {
          ...nextProject.mediaPool,
          [cmd.asset.assetId]: {
            id: cmd.asset.assetId,
            name: cmd.asset.name,
            kind:
              cmd.asset.category === 'video'
                ? 'video'
                : cmd.asset.category === 'image'
                ? 'image'
                : 'audio',
            localFilePath: cmd.asset.localFilePath,
            duration: cmd.asset.duration,
            semanticTags: cmd.asset.semanticTags,
            origin: {
              provider: 'local-disk',
              sourceUrl: cmd.asset.originalUrl,
            },
          },
        },
      };
      break;
    }

    case 'CreateSequence': {
      nextProject = {
        ...nextProject,
        name: cmd.name,
        updatedAtIso: new Date().toISOString(),
        settings: {
          ...nextProject.settings,
          width: cmd.width,
          height: cmd.height,
          fps: cmd.fps,
        },
      };
      break;
    }

    case 'AddTrack': {
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        tracks: [...nextProject.tracks, cmd.track],
      };
      break;
    }

    case 'InsertClip': {
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        tracks: nextProject.tracks.map((t) =>
          t.id === cmd.trackId ? { ...t, clips: [...t.clips, cmd.clip] } : t
        ),
      };
      break;
    }

    case 'MoveClip': {
      let movedClip: Clip | null = null;
      const strippedTracks = nextProject.tracks.map((t) => {
        const found = t.clips.find((c) => c.id === cmd.clipId);
        if (found) movedClip = found;
        return { ...t, clips: t.clips.filter((c) => c.id !== cmd.clipId) };
      });
      if (movedClip) {
        const updatedClip: Clip = {
          ...(movedClip as Clip),
          trackId: cmd.targetTrackId,
          timelineRange: {
            ...(movedClip as Clip).timelineRange,
            startTime: cmd.newStartTime,
          },
        };
        nextProject = {
          ...nextProject,
          updatedAtIso: new Date().toISOString(),
          tracks: strippedTracks.map((t) =>
            t.id === cmd.targetTrackId ? { ...t, clips: [...t.clips, updatedClip] } : t
          ),
        };
      }
      break;
    }

    case 'TrimClip': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        timelineRange: {
          startTime: cmd.newStartTime ?? c.timelineRange.startTime,
          duration: cmd.newDuration ?? c.timelineRange.duration,
        },
      }));
      break;
    }

    case 'SplitClip': {
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        tracks: nextProject.tracks.map((t) => {
          const idx = t.clips.findIndex((c) => c.id === cmd.clipId);
          if (idx === -1) return t;
          const orig = t.clips[idx];
          const firstDur = subTime(cmd.splitTime, orig.timelineRange.startTime);
          const secondDur = subTime(orig.timelineRange.duration, firstDur);
          if (firstDur.value <= 0 || secondDur.value <= 0) return t;

          const leftClip: Clip = {
            ...orig,
            timelineRange: { startTime: orig.timelineRange.startTime, duration: firstDur },
            sourceRange: { startTime: orig.sourceRange.startTime, duration: firstDur },
          };
          const rightClip: Clip = {
            ...orig,
            id: `${orig.id}_split_${state.revision + 1}`,
            timelineRange: { startTime: cmd.splitTime, duration: secondDur },
            sourceRange: {
              startTime: addTime(orig.sourceRange.startTime, firstDur),
              duration: secondDur,
            },
          };
          const nextClips = [...t.clips];
          nextClips.splice(idx, 1, leftClip, rightClip);
          return { ...t, clips: nextClips };
        }),
      };
      break;
    }

    case 'DeleteClip': {
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        tracks: nextProject.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== cmd.clipId),
        })),
      };
      break;
    }

    case 'ApplyTransition': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        ...(cmd.edge === 'in'
          ? {
              transitionIn: {
                id: `tr_in_${state.revision + 1}`,
                transitionShaderId: cmd.transitionShaderId,
                duration: cmd.duration,
                easing: 'ease-in-out-cubic',
                params: {},
              },
            }
          : {
              transitionOut: {
                id: `tr_out_${state.revision + 1}`,
                transitionShaderId: cmd.transitionShaderId,
                duration: cmd.duration,
                easing: 'ease-in-out-cubic',
                params: {},
              },
            }),
      }));
      break;
    }

    case 'ApplyEffect': {
      const uniformMap: Record<string, { readonly staticValue: number | readonly number[] | string; readonly keyframes: readonly [] }> = {};
      if (cmd.uniforms) {
        for (const [k, v] of Object.entries(cmd.uniforms)) {
          uniformMap[k] = { staticValue: v, keyframes: [] };
        }
      }
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        shaders: [
          ...c.shaders,
          {
            id: `fx_${state.revision + 1}`,
            shaderId: cmd.shaderId,
            name: cmd.name,
            enabled: true,
            category: 'stylize',
            uniforms: uniformMap,
          },
        ],
      }));
      break;
    }

    case 'SetKeyframe': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => {
        const prop = c.transform[cmd.property];
        return {
          ...c,
          transform: {
            ...c.transform,
            [cmd.property]: {
              ...prop,
              keyframes: [
                ...prop.keyframes,
                {
                  id: `kf_${state.revision + 1}`,
                  timeOffset: cmd.timeOffset,
                  value: cmd.value,
                  easing: 'bezier',
                  authorId: envelope.origin.actorId,
                },
              ],
            },
          },
        };
      });
      break;
    }

    case 'UpdateCharacterPose': {
      const actionDef = REUSABLE_CHARACTER_ACTIONS[cmd.actionId] || REUSABLE_CHARACTER_ACTIONS.standing;
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => {
        if (!c.stageScene) return c;
        return {
          ...c,
          stageScene: {
            ...c.stageScene,
            actors: c.stageScene.actors.map((a) =>
              a.actorId === cmd.actorId
                ? {
                    ...a,
                    moveSet: actionDef.legacyMoveSetAlias as any,
                    expression: (cmd.expression as any) ?? a.expression,
                    speechBubbleText: cmd.speechText ?? a.speechBubbleText,
                  }
                : a
            ),
          },
        };
      });
      break;
    }

    case 'ApplyMotionPreset': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        motionCode: {
          engine: 'motifs-ts',
          templateId: cmd.presetId as any,
          sourceCode: c.motionCode?.sourceCode || '',
          propsSchema: c.motionCode?.propsSchema || {},
        },
      }));
      break;
    }

    case 'UpdateSceneComposition': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        stageScene: cmd.stageScene,
      }));
      break;
    }

    case 'AdjustAudio': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        audio: {
          ...c.audio,
          volumeDb:
            typeof cmd.volumeDb === 'number'
              ? { ...c.audio.volumeDb, staticValue: cmd.volumeDb }
              : c.audio.volumeDb,
          mute: cmd.mute ?? c.audio.mute,
          aiDenoiseEnabled: cmd.aiDenoiseEnabled ?? c.audio.aiDenoiseEnabled,
        },
      }));
      break;
    }

    case 'AdjustColor': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        colorGrade: {
          ...c.colorGrade,
          enabled: true,
          exposure:
            typeof cmd.exposure === 'number'
              ? { ...c.colorGrade.exposure, staticValue: cmd.exposure }
              : c.colorGrade.exposure,
          contrast:
            typeof cmd.contrast === 'number'
              ? { ...c.colorGrade.contrast, staticValue: cmd.contrast }
              : c.colorGrade.contrast,
          saturation:
            typeof cmd.saturation === 'number'
              ? { ...c.colorGrade.saturation, staticValue: cmd.saturation }
              : c.colorGrade.saturation,
          temperature:
            typeof cmd.temperature === 'number'
              ? { ...c.colorGrade.temperature, staticValue: cmd.temperature }
              : c.colorGrade.temperature,
        },
      }));
      break;
    }

    case 'ReplaceAsset': {
      nextProject = updateClipAcrossTracks(cmd.clipId, (c) => ({
        ...c,
        assetId: cmd.newAssetId,
      }));
      break;
    }

    case 'RenderSequence': {
      nextProject = {
        ...nextProject,
        updatedAtIso: new Date().toISOString(),
        settings: {
          ...nextProject.settings,
          targetLoudnessLufs: cmd.targetLufs,
        },
      };
      break;
    }
  }

  const nextRevision = state.revision + 1;
  const auditEntry: GatewayAuditEntry = {
    commandId: envelope.commandId,
    revisionBefore: state.revision,
    revisionAfter: nextRevision,
    origin: envelope.origin,
    commandType: cmd.type,
    timestampMs: envelope.timestampMs,
  };

  const nextState: CommandGatewayState = {
    project: nextProject,
    revision: nextRevision,
    assetRegistry: nextAssetRegistry,
    undoStack: [
      ...state.undoStack,
      { project: state.project, revision: state.revision, origin: envelope.origin },
    ],
    redoStack: [],
    auditHistory: [...state.auditHistory, auditEntry],
  };

  return {
    accepted: true,
    conflictDetected: false,
    validationErrors: [],
    newRevision: nextRevision,
    state: nextState,
  };
}

/**
 * Undoes the most recent command and pushes the current state onto `redoStack`.
 */
export function undoGatewayCommand(state: CommandGatewayState): CommandGatewayState {
  if (state.undoStack.length === 0) return state;
  const prev = state.undoStack[state.undoStack.length - 1];
  return {
    ...state,
    project: prev.project,
    revision: state.revision + 1,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [
      ...state.redoStack,
      { project: state.project, revision: state.revision, origin: prev.origin },
    ],
  };
}

/**
 * Redoes the most recently undone command.
 */
export function redoGatewayCommand(state: CommandGatewayState): CommandGatewayState {
  if (state.redoStack.length === 0) return state;
  const next = state.redoStack[state.redoStack.length - 1];
  return {
    ...state,
    project: next.project,
    revision: state.revision + 1,
    undoStack: [
      ...state.undoStack,
      { project: state.project, revision: state.revision, origin: next.origin },
    ],
    redoStack: state.redoStack.slice(0, -1),
  };
}

/**
 * Deterministically compiles a validated `VideoDSLSpecification` into a sequence of
 * `GatewayCommandEnvelope` operations without requiring an active AI model.
 */
export function compileVideoDslToGatewayCommands(
  dsl: VideoDSLSpecification,
  actorId: string = 'dsl-compiler'
): readonly GatewayCommandEnvelope[] {
  const validation = validateVideoDsl(dsl);
  if (!validation.valid) {
    throw new Error(`Invalid VideoDSLSpecification: ${validation.errors.join('; ')}`);
  }

  const envelopes: GatewayCommandEnvelope[] = [];
  const origin: CommandOriginMetadata = {
    kind: 'batch-job',
    actorId,
    displayName: 'Deterministic Video DSL Compiler',
    correlationJobId: dsl.specId,
  };

  for (const scene of dsl.scenes) {
    const primaryChar = scene.characters[0];
    const actionDef = primaryChar
      ? REUSABLE_CHARACTER_ACTIONS[primaryChar.actionId] || REUSABLE_CHARACTER_ACTIONS.standing
      : REUSABLE_CHARACTER_ACTIONS.standing;

    const widgetLayer = scene.compositionLayers.find((l) => l.layerKind === 'stage-widget');

    const stageScene: ChoreographedStageScene = {
      sceneId: scene.sceneId,
      genreKit:
        dsl.brief.genreKit === 'hybrid-documentary' ? 'economics-stickman' : dsl.brief.genreKit,
      backdrop:
        dsl.brief.genreKit === 'universe-cosmic'
          ? 'cosmic.deep-space-nebula'
          : dsl.brief.genreKit === 'lore-chronicle'
          ? 'lore.ancient-parchment-map'
          : 'econ.chalkboard-grid-dark',
      atmosphere:
        dsl.brief.genreKit === 'universe-cosmic'
          ? 'particles.cosmic-starfield-warp'
          : dsl.brief.genreKit === 'lore-chronicle'
          ? 'particles.torch-fire-embers'
          : 'particles.falling-dollar-bills',
      cameraRig: (scene.cameraRigId || 'static-stage-wide') as CameraRigPresetId,
      actors: scene.characters.map((ch, idx) => ({
        actorId: ch.characterId || `actor_${idx}`,
        displayName: ch.characterId || `Actor ${idx + 1}`,
        archetype:
          ch.characterId === 'char.stickman-astronaut'
            ? ('cosmic-astronaut' as any)
            : ch.characterId === 'char.stickman-lore-scholar'
            ? ('lore-hooded-scholar' as any)
            : ('economist-suit-tie' as any),
        stageX: ch.stagePositionNormalized.x,
        stageY: ch.stagePositionNormalized.y,
        scale: ch.stagePositionNormalized.scale,
        flipHorizontal: false,
        enterAnimation: 'pop-spring',
        moveSet: (REUSABLE_CHARACTER_ACTIONS[ch.actionId] || actionDef).legacyMoveSetAlias as any,
        expression: 'determined' as any,
        prop: (ch.heldProp || 'pointer-stick') as any,
        speechBubbleText: ch.dialogueBubbleText || scene.narrationScript.slice(0, 48),
      })),
      widgets: widgetLayer
        ? [
            {
              widgetId: widgetLayer.layerId,
              kind: widgetLayer.presetOrWidgetId as any,
              stageX: 0.68,
              stageY: 0.45,
              scale: 1.0,
              title: widgetLayer.headlineText || scene.title,
              primaryValueLabel: '+24.8%',
              secondaryValueLabel: widgetLayer.subtext,
              accentColorHex: widgetLayer.primaryColorHex || '#10B981',
            },
          ]
        : [],
      headlineBanner: scene.title,
      transitionOutId: 'gl.directionalwipe',
      sfxTriggers: [],
    };

    const stageClip: Clip = {
      id: `clip_${scene.sceneId}`,
      name: `🎬 ${scene.title}`,
      trackId: 'track-stage-1',
      assetId: scene.backgroundAssetId,
      kind: 'stage-puppet',
      timelineRange: {
        startTime: scene.startTime,
        duration: scene.duration,
      },
      sourceRange: {
        startTime: { value: 0, rate: dsl.format.fps },
        duration: scene.duration,
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
        anchorX: { staticValue: 0.5, keyframes: [] },
        anchorY: { staticValue: 0.5, keyframes: [] },
        opacity: { staticValue: 1, keyframes: [] },
      },
      shaders: [],
      transitionIn: scene.transitionInShaderId
        ? {
            id: `tr_${scene.sceneId}`,
            transitionShaderId: scene.transitionInShaderId,
            duration: scene.transitionDuration || fromSeconds(0.5, dsl.format.fps),
            easing: 'ease-in-out-cubic',
            params: {},
          }
        : undefined,
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
        mute: false,
        fadeInDuration: { value: 0, rate: dsl.format.fps },
        fadeOutDuration: { value: 0, rate: dsl.format.fps },
        aiDenoiseEnabled: false,
        aiVocalIsolationEnabled: false,
        duckingRole: 'none',
        duckingAmountDb: 0,
      },
      stageScene,
    };

    envelopes.push({
      commandId: `cmd_insert_${scene.sceneId}`,
      origin,
      timestampMs: Date.now(),
      command: {
        type: 'InsertClip',
        trackId: 'track-stage-1',
        clip: stageClip,
      },
    });
  }

  return envelopes;
}
