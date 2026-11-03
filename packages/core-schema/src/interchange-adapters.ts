/**
 * @file interchange-adapters.ts
 * @description Clean Interchange & Worker Adapters for Additional Technologies (Section 5 Compliance):
 *   1. OpenTimelineIO (OTIO Schema v0.15) — Non-invasive timeline interchange for DaVinci Resolve,
 *      Adobe Premiere Pro, and Blender Video Sequence Editor (never replaces our Unified Project Model).
 *   2. Motion Canvas / Revideo Procedural 2D Scene Spec — Procedural vector motion graphics & voice-over sync.
 *   3. OpenToonz Digital Exposure Sheet (XDTS) — 2D character animation cel/pose exposure interchange.
 *   4. Blender 3D Isolated Worker Contract — Headless 3D scene composition, camera rig, and glTF 2.0 render job.
 */

import { RationalTime, addTime, compareTime, subtractTime, toSeconds } from './rational-time';
import { StudioProject, TimelineClip, TimelineTrack } from './timeline';
import { AssetRegistryEntry } from './asset-registry';
import { FutureScene3DCompositionSpec } from './character-library';
import { GatewayCommandEnvelope } from './command-gateway';

// ============================================================================
// 1. OPENTIMELINEIO (OTIO v0.15) INTERCHANGE ADAPTER
// ============================================================================

export interface OtioRationalTime {
  readonly OTIO_SCHEMA: 'RationalTime.1';
  readonly value: number;
  readonly rate: number;
}

export interface OtioTimeRange {
  readonly OTIO_SCHEMA: 'TimeRange.1';
  readonly start_time: OtioRationalTime;
  readonly duration: OtioRationalTime;
}

export interface OtioItem {
  readonly OTIO_SCHEMA: 'Clip.1' | 'Gap.1' | 'Transition.1';
  readonly name: string;
  readonly source_range: OtioTimeRange;
  readonly media_reference?: {
    readonly OTIO_SCHEMA: 'ExternalReference.1' | 'MissingReference.1';
    readonly target_url?: string;
    readonly available_range?: OtioTimeRange;
    readonly metadata?: Record<string, unknown>;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface OtioTrack {
  readonly OTIO_SCHEMA: 'Track.1';
  readonly name: string;
  readonly kind: 'Video' | 'Audio';
  readonly children: OtioItem[];
  readonly metadata?: Record<string, unknown>;
}

export interface OtioTimelineDocument {
  readonly OTIO_SCHEMA: 'Timeline.1';
  readonly name: string;
  readonly global_start_time: OtioRationalTime;
  readonly tracks: {
    readonly OTIO_SCHEMA: 'Stack.1';
    readonly name: string;
    readonly children: OtioTrack[];
  };
  readonly metadata: {
    readonly generator: 'Autonomous Studio Pro';
    readonly projectId: string;
    readonly exportedAtIso: string;
  };
}

function toOtioTime(t: RationalTime): OtioRationalTime {
  return {
    OTIO_SCHEMA: 'RationalTime.1',
    value: t.value,
    rate: t.rate,
  };
}

/**
 * Exports our authoritative `StudioProject` into a standards-compliant OpenTimelineIO (`.otio`) JSON document
 * ready to be imported into DaVinci Resolve, Premiere Pro, Nuke Studio, or Blender VSE.
 */
export function exportProjectToOtioDocument(
  project: StudioProject,
  assetRegistry?: Record<string, AssetRegistryEntry>
): OtioTimelineDocument {
  const fps = project.settings.fps || 60;
  const otioTracks: OtioTrack[] = project.tracks.map((track: TimelineTrack) => {
    const isAudio = track.kind.startsWith('audio');
    const sortedClips = [...track.clips].sort((a, b) =>
      compareTime(a.timelineRange.startTime, b.timelineRange.startTime)
    );

    const children: OtioItem[] = [];
    let cursor: RationalTime = { value: 0, rate: fps };

    for (const clip of sortedClips) {
      // Insert explicit OTIO Gap.1 if there is space before this clip
      if (compareTime(clip.timelineRange.startTime, cursor) > 0) {
        const gapDur = subtractTime(clip.timelineRange.startTime, cursor);
        children.push({
          OTIO_SCHEMA: 'Gap.1',
          name: 'Gap',
          source_range: {
            OTIO_SCHEMA: 'TimeRange.1',
            start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: gapDur.rate },
            duration: toOtioTime(gapDur),
          },
        });
      }

      const assetEntry = clip.assetId && assetRegistry ? assetRegistry[clip.assetId] : undefined;
      const targetUrl =
        assetEntry?.localFilePath ||
        assetEntry?.originalUrl ||
        `vproj://assets/${clip.assetId || clip.id}`;

      children.push({
        OTIO_SCHEMA: 'Clip.1',
        name: clip.name,
        source_range: {
          OTIO_SCHEMA: 'TimeRange.1',
          start_time: toOtioTime(clip.sourceRange.startTime),
          duration: toOtioTime(clip.timelineRange.duration),
        },
        media_reference: {
          OTIO_SCHEMA: 'ExternalReference.1',
          target_url: targetUrl,
          available_range: {
            OTIO_SCHEMA: 'TimeRange.1',
            start_time: toOtioTime(clip.sourceRange.startTime),
            duration: toOtioTime(clip.sourceRange.duration),
          },
          metadata: {
            clipId: clip.id,
            clipKind: clip.kind,
            assetId: clip.assetId ?? null,
          },
        },
        metadata: {
          autonomousStudio: {
            clipId: clip.id,
            kind: clip.kind,
            stageSceneId: clip.stageScene?.sceneId ?? null,
            colorGradeEnabled: clip.colorGrade.enabled,
          },
        },
      });

      cursor = {
        value:
          Math.round((clip.timelineRange.startTime.value / clip.timelineRange.startTime.rate) * fps) +
          Math.round((clip.timelineRange.duration.value / clip.timelineRange.duration.rate) * fps),
        rate: fps,
      };
    }

    return {
      OTIO_SCHEMA: 'Track.1',
      name: track.name,
      kind: isAudio ? 'Audio' : 'Video',
      children,
      metadata: {
        trackId: track.id,
        studioKind: track.kind,
      },
    };
  });

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: project.name,
    global_start_time: {
      OTIO_SCHEMA: 'RationalTime.1',
      value: 0,
      rate: fps,
    },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'Master Sequence Stack',
      children: otioTracks,
    },
    metadata: {
      generator: 'Autonomous Studio Pro',
      projectId: project.id,
      exportedAtIso: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 2. MOTION CANVAS / REVIDEO PROCEDURAL 2D SCENE ADAPTER
// ============================================================================

export interface MotionCanvasProceduralSceneSpec {
  readonly schema: 'autonomous-studio.motion-canvas-adapter.v1';
  readonly projectName: string;
  readonly fps: number;
  readonly resolution: { readonly width: number; readonly height: number };
  readonly scenes: {
    readonly sceneId: string;
    readonly clipId: string;
    readonly durationFrames: number;
    readonly durationSeconds: number;
    readonly cameraRigPreset: string;
    readonly voiceOverMarkers: { readonly label: string; readonly timeSeconds: number }[];
    readonly vectorNodes: {
      readonly nodeId: string;
      readonly nodeType: 'StickmanRig2D' | 'SupplyDemandCurve' | 'CandlestickChart' | 'TypographyCallout';
      readonly positionNormalized: { readonly x: number; readonly y: number };
      readonly animationPreset: string;
    }[];
  }[];
}

/**
 * Compiles stage and motion tracks from `StudioProject` into a procedural Motion Canvas / Revideo specification.
 */
export function exportProjectToMotionCanvasSpec(
  project: StudioProject
): MotionCanvasProceduralSceneSpec {
  const fps = project.settings.fps || 60;
  const stageClips: TimelineClip[] = project.tracks
    .filter((t) => t.kind === 'stage-puppet' || t.kind === 'motion-code')
    .flatMap((t) => t.clips);

  return {
    schema: 'autonomous-studio.motion-canvas-adapter.v1',
    projectName: project.name,
    fps,
    resolution: {
      width: project.settings.width,
      height: project.settings.height,
    },
    scenes: stageClips.map((clip, idx) => {
      const durSec = toSeconds(clip.timelineRange.duration);
      const startSec = toSeconds(clip.timelineRange.startTime);
      const stage = clip.stageScene;
      const vectorNodes: MotionCanvasProceduralSceneSpec['scenes'][number]['vectorNodes'] = [];

      if (stage) {
        for (const actor of stage.actors) {
          vectorNodes.push({
            nodeId: actor.actorId,
            nodeType: 'StickmanRig2D',
            positionNormalized: { x: actor.stageX, y: actor.stageY },
            animationPreset: actor.moveSet,
          });
        }
        for (const widget of stage.widgets) {
          vectorNodes.push({
            nodeId: widget.widgetId,
            nodeType: widget.kind.includes('candlestick') ? 'CandlestickChart' : 'SupplyDemandCurve',
            positionNormalized: { x: widget.stageX, y: widget.stageY },
            animationPreset: widget.kind,
          });
        }
      } else {
        vectorNodes.push({
          nodeId: `node_motion_${idx + 1}`,
          nodeType: 'TypographyCallout',
          positionNormalized: { x: 0.5, y: 0.5 },
          animationPreset: clip.motionCode?.templateId || 'kinetic-title-pop',
        });
      }

      return {
        sceneId: stage?.sceneId || `mc_scene_${idx + 1}`,
        clipId: clip.id,
        durationFrames: Math.round(durSec * fps),
        durationSeconds: Number(durSec.toFixed(3)),
        cameraRigPreset: stage?.cameraRig || 'static-wide-establish',
        voiceOverMarkers: [
          {
            label: stage?.actors[0]?.speechBubbleText || clip.name,
            timeSeconds: Number(startSec.toFixed(3)),
          },
        ],
        vectorNodes,
      };
    }),
  };
}

// ============================================================================
// 3. OPENTOONZ DIGITAL EXPOSURE SHEET (XDTS) & BLENDER 3D WORKER CONTRACTS
// ============================================================================

export interface OpenToonzExposureSheetSpec {
  readonly header: { readonly format: 'OpenToonz-XDTS-Adapter'; readonly version: '1.0' };
  readonly fps: number;
  readonly totalFrames: number;
  readonly levels: {
    readonly levelName: string;
    readonly characterId: string;
    readonly exposures: { readonly frame: number; readonly actionPoseId: string; readonly mouthPhoneme: string }[];
  }[];
}

export function exportProjectToOpenToonzExposureSheet(
  project: StudioProject
): OpenToonzExposureSheetSpec {
  const fps = project.settings.fps || 60;
  const stageClips = project.tracks.filter((t) => t.kind === 'stage-puppet').flatMap((t) => t.clips);

  const exposures: { readonly frame: number; readonly actionPoseId: string; readonly mouthPhoneme: string }[] = [];
  let maxFrame = 60;

  for (const clip of stageClips) {
    const startFrame = Math.round(toSeconds(clip.timelineRange.startTime) * fps);
    const durFrames = Math.round(toSeconds(clip.timelineRange.duration) * fps);
    maxFrame = Math.max(maxFrame, startFrame + durFrames);
    const primaryActor = clip.stageScene?.actors[0];
    exposures.push({
      frame: startFrame,
      actionPoseId: primaryActor?.moveSet || 'explaining',
      mouthPhoneme: primaryActor?.speechBubbleText ? 'AI_TALK_OPEN' : 'REST_CLOSED',
    });
  }

  return {
    header: { format: 'OpenToonz-XDTS-Adapter', version: '1.0' },
    fps,
    totalFrames: maxFrame,
    levels: [
      {
        levelName: 'Stickman_Lead_Rig_Level',
        characterId: 'char.stickman-economist',
        exposures,
      },
    ],
  };
}

export interface IsolatedBlender3DWorkerJob {
  readonly workerContractVersion: '1.0.0';
  readonly workerKind: 'blender-headless-3d-renderer';
  readonly cliInvocationPreview: string;
  readonly compositionSpec: FutureScene3DCompositionSpec;
}

export function buildIsolatedBlender3DWorkerJob(
  sceneId: string = 'scene_3d_hero_01'
): IsolatedBlender3DWorkerJob {
  const compositionSpec: FutureScene3DCompositionSpec = {
    sceneId,
    engineAdapter: 'blender-headless-cli',
    objects: [
      {
        objectId: 'obj_trading_desk',
        gltfAssetId: 'asset.3d.trading-desk-stage',
        positionXYZ: [0, 0, 0],
        rotationEulerDeg: [0, 15, 0],
        scaleXYZ: [1, 1, 1],
      },
    ],
    lights: [
      {
        lightId: 'light_key_warm',
        kind: 'key-area',
        positionXYZ: [2.5, 3.0, 2.0],
        colorHex: '#FFF4E0',
        intensityWatts: 650,
      },
    ],
    cameraTrajectory: [
      {
        timeOffset: { value: 0, rate: 60 },
        positionXYZ: [0, 1.6, 5.2],
        lookAtXYZ: [0, 1.0, 0],
        focalLengthMm: 35,
        apertureFStop: 2.8,
      },
      {
        timeOffset: { value: 180, rate: 60 },
        positionXYZ: [0.8, 1.75, 3.4],
        lookAtXYZ: [0, 1.1, 0],
        focalLengthMm: 50,
        apertureFStop: 2.0,
      },
    ],
    outputDepthPass: true,
    samplesPerPixel: 64,
  };

  return {
    workerContractVersion: '1.0.0',
    workerKind: 'blender-headless-3d-renderer',
    cliInvocationPreview: `blender -b -P workers/blender_scene_adapter.py -- --scene-id "${sceneId}" --fps 60 --output "/tmp/${sceneId}_3d_pass.mp4"`,
    compositionSpec,
  };
}

/**
 * Imports an external OpenTimelineIO document (from Premiere Pro, DaVinci Resolve, or Blender VSE)
 * and translates it into atomic `InsertClip` commands for the Command Gateway.
 */
export function importOtioDocumentToGatewayCommands(
  otioDoc: OtioTimelineDocument
): GatewayCommandEnvelope[] {
  const envelopes: GatewayCommandEnvelope[] = [];
  const tracks = otioDoc.tracks?.children || [];

  for (const track of tracks) {
    const isAudio = track.kind === 'Audio';
    const targetTrackId =
      (track.metadata?.trackId as string) || (isAudio ? 'track-audio-1' : 'track-video-1');

    let cursor: RationalTime = { value: 0, rate: 60 };

    for (const child of track.children) {
      const childDur = {
        value: child.source_range.duration.value,
        rate: child.source_range.duration.rate,
      };

      if (child.OTIO_SCHEMA === 'Gap.1') {
        cursor = addTime(cursor, childDur);
        continue;
      }

      if (child.OTIO_SCHEMA === 'Clip.1') {
        const clipId =
          (child.metadata?.autonomousStudio as any)?.clipId ||
          `otio_clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const kind = (child.metadata?.autonomousStudio as any)?.kind || (isAudio ? 'audio-voice' : 'video');
        const assetId = (child.media_reference?.metadata?.assetId as string) || undefined;

        const clip: TimelineClip = {
          id: clipId,
          name: child.name || 'Imported OTIO Clip',
          trackId: targetTrackId,
          kind,
          assetId,
          timelineRange: {
            startTime: { value: cursor.value, rate: cursor.rate },
            duration: childDur,
          },
          sourceRange: {
            startTime: {
              value: child.source_range.start_time.value,
              rate: child.source_range.start_time.rate,
            },
            duration: childDur,
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
            fadeInDuration: { value: 0, rate: childDur.rate },
            fadeOutDuration: { value: 0, rate: childDur.rate },
            aiDenoiseEnabled: false,
            aiVocalIsolationEnabled: false,
            duckingRole: 'none',
            duckingAmountDb: 0,
          },
        };

        envelopes.push({
          commandId: `cmd_otio_import_${clipId}`,
          origin: {
            kind: 'user',
            actorId: 'otio_importer',
            displayName: 'OpenTimelineIO Importer',
          },
          timestampMs: Date.now(),
          command: {
            type: 'InsertClip',
            trackId: targetTrackId,
            clip,
          },
        });

        cursor = addTime(cursor, childDur);
      }
    }
  }

  return envelopes;
}

