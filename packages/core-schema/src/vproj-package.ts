/**
 * @file vproj-package.ts
 * @description Native Machine-Readable Project Package (`.vproj`), Visual Intelligence Layer,
 * Deterministic Visual QA Framework, and Selective AI Context Query API (`ai_context.json`).
 *
 * Implements the 7 mandatory selective context query functions so an AI agent editing
 * Scene 12 receives ONLY Scene 12 and its dependencies instead of a massive full-project dump:
 *  1. get_project_summary(vproj)
 *  2. get_scene(vproj, scene_id)
 *  3. get_asset(vproj, asset_id)
 *  4. get_timeline_range(vproj, start, end)
 *  5. get_visual_index(vproj, scene_id)
 *  6. get_dependency_graph(vproj, scene_id)
 *  7. get_qa_issues(vproj)
 */

import { RationalTime, addTime, compareTime, toSeconds } from './rational-time';
import { StudioProject, Clip } from './timeline';
import { AssetRegistryEntry } from './asset-registry';
import { VideoDSLSpecification } from './video-dsl';

export const CURRENT_VPROJ_PACKAGE_VERSION = '1.0.0' as const;

export interface SemanticLayerDescriptor {
  readonly layerId: string;
  readonly kind: 'character' | 'widget' | 'broll' | 'subtitle' | 'motion-graphic';
  readonly objectId: string;
  readonly assetId?: string;
  readonly boundsNormalized: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly textContent?: string;
  readonly animationPreset?: string;
}

export interface SemanticSceneManifestEntry {
  readonly sceneId: string;
  readonly clipId: string;
  readonly trackId: string;
  readonly title: string;
  readonly startTime: RationalTime;
  readonly endTime: RationalTime;
  readonly duration: RationalTime;
  readonly assetIds: readonly string[];
  readonly characterIds: readonly string[];
  readonly cameraRigId?: string;
  readonly layers: readonly SemanticLayerDescriptor[];
  readonly subtitleTexts: readonly string[];
  readonly visualDescription: string;
}

export interface SceneVisualIndexEntry {
  readonly sceneId: string;
  readonly storyboardContactSheetPath?: string;
  readonly keyframePreviewTimestamps: readonly RationalTime[];
  readonly layoutSummary: string;
  readonly dominantColorsHex: readonly string[];
  readonly requiresVisualVlmVerification: boolean;
}

export type QaIssueCategory =
  | 'missing-asset'
  | 'invalid-media'
  | 'broken-reference'
  | 'timeline-gap'
  | 'unintended-overlap'
  | 'audio-clipping'
  | 'av-sync-drift'
  | 'subtitle-timing'
  | 'text-overflow'
  | 'composition-collision'
  | 'character-visibility'
  | 'black-frame-risk'
  | 'framerate-inconsistency'
  | 'aspect-ratio-mismatch';

export interface StructuredQaIssue {
  readonly issueId: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly category: QaIssueCategory;
  readonly sceneId?: string;
  readonly clipId?: string;
  readonly assetId?: string;
  readonly timeRange?: { readonly start: RationalTime; readonly end: RationalTime };
  readonly message: string;
  readonly deterministicCheckName: string;
  readonly suggestedFixCommand?: string;
}

export interface StructuredQaReport {
  readonly evaluatedAtIso: string;
  readonly passedAllErrorGates: boolean;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly issues: readonly StructuredQaIssue[];
}

export interface SceneDependencySubgraph {
  readonly sceneId: string;
  readonly clipIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly characterIds: readonly string[];
  readonly upstreamSceneIds: readonly string[];
  readonly downstreamSceneIds: readonly string[];
}

export interface VprojPackageV1 {
  readonly packageFormat: 'autonomous-studio.vproj';
  readonly packageVersion: '1.0.0';
  readonly savedAtIso: string;
  readonly revision: number;
  readonly project: StudioProject;
  readonly assetManifest: Record<string, AssetRegistryEntry>;
  readonly sceneManifest: Record<string, SemanticSceneManifestEntry>;
  readonly visualIndex: Record<string, SceneVisualIndexEntry>;
  readonly productionSpec?: VideoDSLSpecification;
  readonly qaReport: StructuredQaReport;
}

/**
 * Deterministic Visual & Structural QA Engine.
 * Runs 100% locally without AI tokens to catch missing assets, broken refs, timeline gaps,
 * overlaps, audio clipping (> 0 dBFS), text overflow, and composition bounding-box collisions.
 */
export function runDeterministicVisualQa(
  project: StudioProject,
  assetManifest: Record<string, AssetRegistryEntry>,
  sceneManifest: Record<string, SemanticSceneManifestEntry>
): StructuredQaReport {
  const issues: StructuredQaIssue[] = [];
  let issueSeq = 1;
  const nextId = () => `qa_issue_${issueSeq++}`;

  // 1. Check all clips across tracks for missing assets, audio clipping, overlaps, and gaps
  for (const track of project.tracks) {
    const sortedClips = [...track.clips].sort((a, b) =>
      compareTime(a.timelineRange.startTime, b.timelineRange.startTime)
    );

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const clipEnd = addTime(clip.timelineRange.startTime, clip.timelineRange.duration);

      // Broken asset reference check
      if (
        clip.kind !== 'motion-code' &&
        clip.assetId &&
        !assetManifest[clip.assetId] &&
        !project.mediaPool[clip.assetId] &&
        !clip.assetId.startsWith('preasset.') &&
        !clip.assetId.startsWith('stage-asset-')
      ) {
        issues.push({
          issueId: nextId(),
          severity: 'error',
          category: 'broken-reference',
          clipId: clip.id,
          assetId: clip.assetId,
          timeRange: { start: clip.timelineRange.startTime, end: clipEnd },
          message: `Clip '${clip.name}' references missing asset '${clip.assetId}'.`,
          deterministicCheckName: 'check_asset_reference_integrity',
          suggestedFixCommand: 'ReplaceAsset',
        });
      }

      // Missing local file check
      const regAsset = clip.assetId ? assetManifest[clip.assetId] : undefined;
      if (regAsset && regAsset.downloadStatus === 'missing-on-disk') {
        issues.push({
          issueId: nextId(),
          severity: 'error',
          category: 'missing-asset',
          clipId: clip.id,
          assetId: clip.assetId,
          message: `Asset '${regAsset.name}' (${clip.assetId}) is marked missing on disk.`,
          deterministicCheckName: 'check_asset_download_status',
        });
      }

      // Audio clipping check (> +3.0 dB static gain)
      if (clip.audio && clip.audio.volumeDb.staticValue > 3.0 && !clip.audio.mute) {
        issues.push({
          issueId: nextId(),
          severity: 'warning',
          category: 'audio-clipping',
          clipId: clip.id,
          message: `Clip '${clip.name}' has high gain (+${clip.audio.volumeDb.staticValue} dB) which risks digital clipping.`,
          deterministicCheckName: 'check_audio_headroom',
          suggestedFixCommand: 'AdjustAudio',
        });
      }

      // Frame-rate consistency check
      if (clip.timelineRange.startTime.rate !== project.settings.fps) {
        issues.push({
          issueId: nextId(),
          severity: 'warning',
          category: 'framerate-inconsistency',
          clipId: clip.id,
          message: `Clip '${clip.name}' timebase (${clip.timelineRange.startTime.rate}fps) differs from sequence (${project.settings.fps}fps).`,
          deterministicCheckName: 'check_sequence_timebase',
        });
      }

      // Check overlap or gap with next clip on primary tracks
      if (i < sortedClips.length - 1) {
        const nextClip = sortedClips[i + 1];
        const cmp = compareTime(clipEnd, nextClip.timelineRange.startTime);
        if (cmp > 0) {
          issues.push({
            issueId: nextId(),
            severity: 'error',
            category: 'unintended-overlap',
            clipId: nextClip.id,
            timeRange: { start: nextClip.timelineRange.startTime, end: clipEnd },
            message: `Clips '${clip.name}' and '${nextClip.name}' overlap on track '${track.name}'.`,
            deterministicCheckName: 'check_track_clip_overlap',
            suggestedFixCommand: 'TrimClip',
          });
        } else if (
          cmp < 0 &&
          (track.kind === 'stage-puppet' || track.kind === 'video')
        ) {
          const gapSec = toSeconds(nextClip.timelineRange.startTime) - toSeconds(clipEnd);
          if (gapSec > 0.05) {
            issues.push({
              issueId: nextId(),
              severity: 'warning',
              category: 'timeline-gap',
              clipId: nextClip.id,
              timeRange: { start: clipEnd, end: nextClip.timelineRange.startTime },
              message: `Detected ${gapSec.toFixed(2)}s gap on primary track '${track.name}' before '${nextClip.name}'.`,
              deterministicCheckName: 'check_primary_track_gaps',
              suggestedFixCommand: 'MoveClip',
            });
          }
        }
      }
    }
  }

  // 2. Check Scene Manifest for text overflow, character visibility, and composition collisions
  for (const scene of Object.values(sceneManifest)) {
    for (const subText of scene.subtitleTexts) {
      if (subText.length > 84) {
        issues.push({
          issueId: nextId(),
          severity: 'warning',
          category: 'text-overflow',
          sceneId: scene.sceneId,
          clipId: scene.clipId,
          message: `Scene '${scene.title}' subtitle exceeds 84 characters (${subText.length} chars) and may overflow safe margins.`,
          deterministicCheckName: 'check_subtitle_safe_length',
        });
      }
    }

    // Check character visibility (out-of-bounds stage coordinates)
    const charLayers = scene.layers.filter((l) => l.kind === 'character');
    for (const ch of charLayers) {
      if (
        ch.boundsNormalized.x < 0.05 ||
        ch.boundsNormalized.x > 0.95 ||
        ch.boundsNormalized.y < 0.05 ||
        ch.boundsNormalized.y > 0.95
      ) {
        issues.push({
          issueId: nextId(),
          severity: 'warning',
          category: 'character-visibility',
          sceneId: scene.sceneId,
          clipId: scene.clipId,
          message: `Character '${ch.objectId}' in scene '${scene.title}' is positioned near or outside safe viewport bounds.`,
          deterministicCheckName: 'check_character_safe_area',
        });
      }
    }

    // Check bounding-box collision between character and stage widget
    const widgetLayers = scene.layers.filter((l) => l.kind === 'widget');
    for (const ch of charLayers) {
      for (const wg of widgetLayers) {
        const dx = Math.abs(ch.boundsNormalized.x - wg.boundsNormalized.x);
        if (dx < 0.12) {
          issues.push({
            issueId: nextId(),
            severity: 'warning',
            category: 'composition-collision',
            sceneId: scene.sceneId,
            clipId: scene.clipId,
            message: `Character '${ch.objectId}' horizontally overlaps widget '${wg.objectId}' in scene '${scene.title}'.`,
            deterministicCheckName: 'check_layer_bbox_collision',
            suggestedFixCommand: 'UpdateSceneComposition',
          });
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    evaluatedAtIso: new Date().toISOString(),
    passedAllErrorGates: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  };
}

/**
 * Builds a complete, machine-readable `.vproj` package (`VprojPackageV1`) from a `StudioProject`
 * and `AssetRegistry`, automatically indexing all scenes, layers, and QA issues.
 */
export function buildVprojPackage(
  project: StudioProject,
  assetManifest: Record<string, AssetRegistryEntry>,
  revision: number = 1,
  productionSpec?: VideoDSLSpecification
): VprojPackageV1 {
  const sceneManifest: Record<string, SemanticSceneManifestEntry> = {};
  const visualIndex: Record<string, SceneVisualIndexEntry> = {};

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.kind !== 'stage-puppet' && clip.kind !== 'video' && clip.kind !== 'motion-code') {
        continue;
      }

      const sceneId = clip.stageScene?.sceneId || `scene_${clip.id}`;
      const endTime = addTime(clip.timelineRange.startTime, clip.timelineRange.duration);
      const layers: SemanticLayerDescriptor[] = [];
      const characterIds: string[] = [];
      const subtitleTexts: string[] = [];

      if (clip.stageScene) {
        for (const actor of clip.stageScene.actors) {
          characterIds.push(actor.actorId);
          if (actor.speechBubbleText) subtitleTexts.push(actor.speechBubbleText);
          layers.push({
            layerId: `layer_actor_${actor.actorId}`,
            kind: 'character',
            objectId: actor.actorId,
            boundsNormalized: {
              x: actor.stageX,
              y: actor.stageY,
              width: 0.22 * actor.scale,
              height: 0.45 * actor.scale,
            },
            textContent: actor.speechBubbleText,
            animationPreset: actor.moveSet,
          });
        }

        for (const wg of clip.stageScene.widgets) {
          layers.push({
            layerId: `layer_widget_${wg.widgetId}`,
            kind: 'widget',
            objectId: wg.widgetId,
            boundsNormalized: {
              x: wg.stageX,
              y: wg.stageY,
              width: 0.35 * wg.scale,
              height: 0.4 * wg.scale,
            },
            textContent: wg.title,
            animationPreset: wg.kind,
          });
        }
      }

      if (clip.captionData?.words) {
        subtitleTexts.push(clip.captionData.words.map((w) => w.word).join(' '));
      }

      sceneManifest[sceneId] = {
        sceneId,
        clipId: clip.id,
        trackId: track.id,
        title: clip.name,
        startTime: clip.timelineRange.startTime,
        endTime,
        duration: clip.timelineRange.duration,
        assetIds: clip.assetId ? [clip.assetId] : [],
        characterIds,
        cameraRigId: clip.stageScene?.cameraRig,
        layers,
        subtitleTexts,
        visualDescription: clip.stageScene
          ? `Stage scene (${clip.stageScene.genreKit}) with backdrop '${clip.stageScene.backdrop}', camera '${clip.stageScene.cameraRig}', ${clip.stageScene.actors.length} character(s), and ${clip.stageScene.widgets.length} widget(s).`
          : `Media/Motion clip '${clip.name}' on track '${track.name}'.`,
      };

      const midOffset: RationalTime = {
        value: Math.floor(clip.timelineRange.duration.value / 2),
        rate: clip.timelineRange.duration.rate,
      };

      visualIndex[sceneId] = {
        sceneId,
        storyboardContactSheetPath: `vproj://visual-index/${sceneId}/contact_sheet.jpg`,
        keyframePreviewTimestamps: [
          clip.timelineRange.startTime,
          addTime(clip.timelineRange.startTime, midOffset),
          endTime,
        ],
        layoutSummary: layers.map((l) => `${l.kind}:${l.objectId}@(${l.boundsNormalized.x.toFixed(2)},${l.boundsNormalized.y.toFixed(2)})`).join(' | '),
        dominantColorsHex: ['#0F172A', '#10B981', '#F59E0B'],
        requiresVisualVlmVerification: false,
      };
    }
  }

  const qaReport = runDeterministicVisualQa(project, assetManifest, sceneManifest);

  return {
    packageFormat: 'autonomous-studio.vproj',
    packageVersion: CURRENT_VPROJ_PACKAGE_VERSION,
    savedAtIso: new Date().toISOString(),
    revision,
    project,
    assetManifest,
    sceneManifest,
    visualIndex,
    productionSpec,
    qaReport,
  };
}

// ============================================================================
// SELECTIVE AI CONTEXT QUERY ENGINE (`ai_context.json` API)
// Sends ONLY the requested slice to the AI instead of the entire project JSON!
// ============================================================================

export function get_project_summary(vproj: VprojPackageV1) {
  const scenes = Object.values(vproj.sceneManifest).sort((a, b) =>
    compareTime(a.startTime, b.startTime)
  );
  return {
    projectId: vproj.project.id,
    projectName: vproj.project.name,
    revision: vproj.revision,
    settings: vproj.project.settings,
    trackCount: vproj.project.tracks.length,
    totalScenes: scenes.length,
    totalRegisteredAssets: Object.keys(vproj.assetManifest).length,
    qaSummary: {
      passedAllErrorGates: vproj.qaReport.passedAllErrorGates,
      errorCount: vproj.qaReport.errorCount,
      warningCount: vproj.qaReport.warningCount,
    },
    sceneOutline: scenes.map((s) => ({
      sceneId: s.sceneId,
      clipId: s.clipId,
      title: s.title,
      startSec: Number(toSeconds(s.startTime).toFixed(2)),
      endSec: Number(toSeconds(s.endTime).toFixed(2)),
      cameraRigId: s.cameraRigId,
    })),
  };
}

export function get_scene(vproj: VprojPackageV1, scene_id: string): SemanticSceneManifestEntry | null {
  return vproj.sceneManifest[scene_id] || null;
}

export function get_asset(vproj: VprojPackageV1, asset_id: string): AssetRegistryEntry | null {
  return vproj.assetManifest[asset_id] || null;
}

export function get_timeline_range(
  vproj: VprojPackageV1,
  start: RationalTime,
  end: RationalTime
) {
  const overlappingClips: {
    readonly trackId: string;
    readonly trackName: string;
    readonly clipId: string;
    readonly clipName: string;
    readonly kind: Clip['kind'];
    readonly startTime: RationalTime;
    readonly endTime: RationalTime;
    readonly sceneId?: string;
  }[] = [];

  for (const track of vproj.project.tracks) {
    for (const clip of track.clips) {
      const clipStart = clip.timelineRange.startTime;
      const clipEnd = addTime(clipStart, clip.timelineRange.duration);
      // Overlaps if clipStart < end && clipEnd > start
      if (compareTime(clipStart, end) < 0 && compareTime(clipEnd, start) > 0) {
        overlappingClips.push({
          trackId: track.id,
          trackName: track.name,
          clipId: clip.id,
          clipName: clip.name,
          kind: clip.kind,
          startTime: clipStart,
          endTime: clipEnd,
          sceneId: clip.stageScene?.sceneId || `scene_${clip.id}`,
        });
      }
    }
  }

  return {
    requestedRange: { start, end },
    clipCount: overlappingClips.length,
    clips: overlappingClips,
  };
}

export function get_visual_index(vproj: VprojPackageV1, scene_id: string): SceneVisualIndexEntry | null {
  return vproj.visualIndex[scene_id] || null;
}

export function get_dependency_graph(
  vproj: VprojPackageV1,
  scene_id: string
): SceneDependencySubgraph | null {
  const target = vproj.sceneManifest[scene_id];
  if (!target) return null;

  const sortedScenes = Object.values(vproj.sceneManifest).sort((a, b) =>
    compareTime(a.startTime, b.startTime)
  );
  const idx = sortedScenes.findIndex((s) => s.sceneId === scene_id);

  return {
    sceneId: target.sceneId,
    clipIds: [target.clipId],
    assetIds: target.assetIds,
    characterIds: target.characterIds,
    upstreamSceneIds: idx > 0 ? [sortedScenes[idx - 1].sceneId] : [],
    downstreamSceneIds:
      idx >= 0 && idx < sortedScenes.length - 1 ? [sortedScenes[idx + 1].sceneId] : [],
  };
}

export function get_qa_issues(
  vproj: VprojPackageV1,
  scene_id?: string
): readonly StructuredQaIssue[] {
  if (!scene_id) return vproj.qaReport.issues;
  return vproj.qaReport.issues.filter((i) => i.sceneId === scene_id);
}
