/**
 * @file video-dsl.ts
 * @description Versioned, Machine-Readable Video DSL / Production Specification (v1.0.0).
 *
 * Enforces Non-Negotiable Rule #2:
 * AI must NEVER generate free-form code per scene or emit hundreds of low-level mutations.
 * Instead, AI generates a structured `VideoDSLSpecification`, which is deterministically
 * validated and compiled into `CommandGateway` operations.
 */

import { RationalTime, fromSeconds } from './rational-time';
import { AssetCategory } from './asset-registry';
import { ReusableCharacterActionId, typeCharacterExpressionId } from './character-library';
import { CameraRigPresetId } from '../../stage-engine/src/camera-choreography';

export const CURRENT_VIDEO_DSL_SCHEMA_VERSION = '1.0.0' as const;

export interface VideoDSLProjectBrief {
  readonly title: string;
  readonly logline: string;
  readonly targetAudience: string;
  readonly genreKit: 'economics-stickman' | 'universe-cosmic' | 'lore-chronicle' | 'hybrid-documentary';
  readonly toneKeywords: readonly string[];
}

export interface VideoDSLFormatSpec {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fps: 24 | 25 | 30 | 60;
  readonly targetDuration: RationalTime;
  readonly aspectRatio: '16:9' | '9:16' | '1:1';
}

export interface VideoDSLAssetRequirement {
  readonly requirementId: string;
  readonly category: AssetCategory;
  readonly preferredAssetId?: string;
  readonly searchKeywords: readonly string[];
  readonly fallbackPreAssetId: string;
  readonly requiredForSceneIds: readonly string[];
}

export interface VideoDSLCharacterDirection {
  readonly characterId: string;
  readonly styleVariantId?: string;
  readonly actionId: ReusableCharacterActionId;
  readonly expressionId: typeCharacterExpressionId;
  readonly stagePositionNormalized: { readonly x: number; readonly y: number; readonly scale: number };
  readonly heldProp?: 'none' | 'pointer-stick' | 'money-printer-crank' | 'balance-scale' | 'telescope' | 'glowing-sword' | 'ancient-scroll';
  readonly dialogueBubbleText?: string;
}

export interface VideoDSLMotionAndWidgetLayer {
  readonly layerId: string;
  readonly layerKind: 'motion-template' | 'stage-widget' | 'typography-callout' | 'broll-media';
  readonly presetOrWidgetId:
    | 'econ.supply-demand-curve'
    | 'econ.stock-candlestick-crash'
    | 'econ.inflation-money-stack'
    | 'cosmic.scale-comparison-spheres'
    | 'lore.animated-map-march-line'
    | 'lore.boss-item-stat-card'
    | 'kinetic-headline-pop'
    | 'vox-news-highlighter'
    | 'glassmorphic-lower-third'
    | 'animated-kpi-counter';
  readonly assetRefId?: string;
  readonly headlineText?: string;
  readonly subtext?: string;
  readonly primaryColorHex?: string;
}

export interface VideoDSLSubtitleCue {
  readonly cueId: string;
  readonly text: string;
  readonly startOffset: RationalTime;
  readonly duration: RationalTime;
  readonly emphasizedWords?: readonly string[];
}

export interface VideoDSLSceneSpec {
  readonly sceneId: string;
  readonly sceneIndex: number;
  readonly title: string;
  readonly narrativeRole: 'hook' | 'problem' | 'explanation' | 'climax' | 'conclusion-cta';
  readonly startTime: RationalTime;
  readonly duration: RationalTime;
  readonly narrationScript: string;
  readonly backgroundAssetId: string;
  readonly cameraRigId: CameraRigPresetId;
  readonly characters: readonly VideoDSLCharacterDirection[];
  readonly compositionLayers: readonly VideoDSLMotionAndWidgetLayer[];
  readonly transitionInShaderId?: string;
  readonly transitionDuration?: RationalTime;
  readonly subtitles: readonly VideoDSLSubtitleCue[];
}

export interface VideoDSLValidationRequirements {
  readonly forbidTimelineGaps: boolean;
  readonly requireAllAssetsResolved: boolean;
  readonly maxSubtitleCharsPerLine: number;
  readonly targetLoudnessLufs: number;
}

export interface VideoDSLSpecification {
  readonly schemaVersion: '1.0.0';
  readonly specId: string;
  readonly createdAtIso: string;
  readonly brief: VideoDSLProjectBrief;
  readonly format: VideoDSLFormatSpec;
  readonly assetRequirements: readonly VideoDSLAssetRequirement[];
  readonly scenes: readonly VideoDSLSceneSpec[];
  readonly validationRequirements: VideoDSLValidationRequirements;
}

export interface VideoDSLValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Deterministically validates a `VideoDSLSpecification` before any command or worker executes.
 */
export function validateVideoDsl(spec: unknown): VideoDSLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Specification must be a non-null JSON object.'], warnings: [] };
  }

  const s = spec as Partial<VideoDSLSpecification>;

  if (s.schemaVersion !== CURRENT_VIDEO_DSL_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion '${String(s.schemaVersion)}'. Expected '${CURRENT_VIDEO_DSL_SCHEMA_VERSION}'.`);
  }

  if (!s.specId || typeof s.specId !== 'string') {
    errors.push('Missing or invalid specId.');
  }

  if (!s.brief || !s.brief.title) {
    errors.push('Missing project brief.title.');
  }

  if (!s.format || typeof s.format.widthPx !== 'number' || typeof s.format.heightPx !== 'number' || !s.format.fps) {
    errors.push('Missing or invalid format specification (widthPx, heightPx, fps).');
  }

  if (!Array.isArray(s.scenes) || s.scenes.length === 0) {
    errors.push('VideoDSLSpecification must contain at least one scene in scenes[].');
  } else {
    const seenSceneIds = new Set<string>();
    let expectedStartSec = 0;

    for (let i = 0; i < s.scenes.length; i++) {
      const sc = s.scenes[i];
      if (!sc.sceneId) {
        errors.push(`Scene at index ${i} is missing sceneId.`);
      } else if (seenSceneIds.has(sc.sceneId)) {
        errors.push(`Duplicate sceneId '${sc.sceneId}' detected.`);
      } else {
        seenSceneIds.add(sc.sceneId);
      }

      if (!sc.duration || sc.duration.rate <= 0 || sc.duration.value <= 0) {
        errors.push(`Scene '${sc.sceneId || i}' has invalid duration RationalTime.`);
      }

      if (!sc.startTime || sc.startTime.rate <= 0 || sc.startTime.value < 0) {
        errors.push(`Scene '${sc.sceneId || i}' has invalid startTime RationalTime.`);
      } else if (sc.duration && sc.duration.rate > 0) {
        const startSec = sc.startTime.value / sc.startTime.rate;
        const durSec = sc.duration.value / sc.duration.rate;
        if (Math.abs(startSec - expectedStartSec) > 0.05 && s.validationRequirements?.forbidTimelineGaps !== false) {
          warnings.push(
            `Scene '${sc.sceneId}' starts at ${startSec.toFixed(2)}s instead of contiguous ${expectedStartSec.toFixed(2)}s.`
          );
        }
        expectedStartSec = startSec + durSec;
      }

      if (!sc.backgroundAssetId) {
        errors.push(`Scene '${sc.sceneId || i}' is missing backgroundAssetId.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Migrates older or loosely-structured draft JSON into a strict v1.0.0 `VideoDSLSpecification`.
 */
export function migrateToVideoDslV1(rawInput: Record<string, any>): VideoDSLSpecification {
  const fps: 24 | 25 | 30 | 60 = rawInput.format?.fps || 60;
  const genreKit = rawInput.brief?.genreKit || rawInput.genreKit || 'economics-stickman';

  const defaultBg =
    genreKit === 'universe-cosmic'
      ? 'preasset.bg.cosmic-deep-nebula'
      : genreKit === 'lore-chronicle'
      ? 'preasset.bg.lore-parchment-map'
      : 'preasset.bg.econ-chalkboard-grid';

  const defaultChar =
    genreKit === 'universe-cosmic'
      ? 'char.stickman-astronaut'
      : genreKit === 'lore-chronicle'
      ? 'char.stickman-lore-scholar'
      : 'char.stickman-economist';

  // If rawInput only has scriptText, deterministically split sentences into scenes
  let scenes: VideoDSLSceneSpec[] = Array.isArray(rawInput.scenes) ? rawInput.scenes : [];
  if (scenes.length === 0 && typeof rawInput.scriptText === 'string') {
    const sentences = rawInput.scriptText
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    let cursorSec = 0;
    scenes = sentences.map((sentence: string, idx: number): VideoDSLSceneSpec => {
      const words = sentence.split(/\s+/).filter(Boolean);
      const durSec = Math.max(2.5, Math.min(6.0, words.length * 0.38));
      const startTime = fromSeconds(cursorSec, fps);
      const duration = fromSeconds(durSec, fps);
      cursorSec += durSec;

      return {
        sceneId: `scene_${idx + 1}`,
        sceneIndex: idx,
        title: `Scene ${idx + 1}`,
        narrativeRole: idx === 0 ? 'hook' : idx === sentences.length - 1 ? 'conclusion-cta' : 'explanation',
        startTime,
        duration,
        narrationScript: sentence,
        backgroundAssetId: defaultBg,
        cameraRigId: idx % 2 === 0 ? 'dolly-push-cosmic' : 'multiplane-parallax-drift',
        characters: [
          {
            characterId: defaultChar,
            actionId: idx === 0 ? 'pointing' : idx % 2 === 1 ? 'explaining' : 'reacting',
            expressionId: idx === 0 ? 'focused-analytical' : 'surprised',
            stagePositionNormalized: { x: 0.28, y: 0.65, scale: 1.0 },
            heldProp: 'pointer-stick',
            dialogueBubbleText: sentence.slice(0, 48),
          },
        ],
        compositionLayers: [
          {
            layerId: `layer_widget_${idx + 1}`,
            layerKind: 'stage-widget',
            presetOrWidgetId:
              genreKit === 'universe-cosmic'
                ? 'cosmic.scale-comparison-spheres'
                : genreKit === 'lore-chronicle'
                ? 'lore.animated-map-march-line'
                : 'econ.supply-demand-curve',
            headlineText: `Beat ${idx + 1}`,
          },
        ],
        transitionInShaderId: idx > 0 ? 'gl.directionalwipe' : undefined,
        transitionDuration: idx > 0 ? fromSeconds(0.5, fps) : undefined,
        subtitles: [
          {
            cueId: `sub_${idx + 1}`,
            text: sentence,
            startOffset: { value: 0, rate: fps },
            duration,
          },
        ],
      };
    });
  }

  const totalSec = scenes.reduce(
    (acc, sc) => acc + (sc.duration.rate > 0 ? sc.duration.value / sc.duration.rate : 0),
    0
  );

  return {
    schemaVersion: CURRENT_VIDEO_DSL_SCHEMA_VERSION,
    specId: rawInput.specId || `dsl_spec_${Date.now()}`,
    createdAtIso: rawInput.createdAtIso || new Date().toISOString(),
    brief: {
      title: rawInput.brief?.title || rawInput.title || 'Autonomous Studio Production',
      logline: rawInput.brief?.logline || 'Compiled via Deterministic Video DSL v1.0',
      targetAudience: rawInput.brief?.targetAudience || 'General',
      genreKit,
      toneKeywords: rawInput.brief?.toneKeywords || ['analytical', 'engaging'],
    },
    format: {
      widthPx: rawInput.format?.widthPx || 1920,
      heightPx: rawInput.format?.heightPx || 1080,
      fps,
      targetDuration: fromSeconds(Math.max(3.0, totalSec), fps),
      aspectRatio: rawInput.format?.aspectRatio || '16:9',
    },
    assetRequirements: rawInput.assetRequirements || [
      {
        requirementId: 'req_bg_default',
        category: 'stage-backdrop',
        preferredAssetId: defaultBg,
        searchKeywords: [genreKit, 'background'],
        fallbackPreAssetId: defaultBg,
        requiredForSceneIds: scenes.map((s) => s.sceneId),
      },
    ],
    scenes,
    validationRequirements: rawInput.validationRequirements || {
      forbidTimelineGaps: true,
      requireAllAssetsResolved: true,
      maxSubtitleCharsPerLine: 48,
      targetLoudnessLufs: -14.0,
    },
  };
}

/**
 * Structured Prompt Blueprint that users can copy into ANY external AI (ChatGPT, Claude, Gemini)
 * so the external AI returns a 100% deterministic `VideoDSLSpecification` JSON document.
 */
export function buildExternalAiPromptBlueprint(topicOrBrief: string, genreKit: string = 'economics-stickman'): string {
  return [
    `You are a Senior Video Production Architect generating a deterministic VideoDSLSpecification (v1.0.0) JSON for Autonomous Studio Pro.`,
    `Do NOT write procedural code or low-level timeline edits. Return ONLY a valid JSON object matching schemaVersion "1.0.0".`,
    `Topic / Creative Brief: "${topicOrBrief}"`,
    `Target Genre Kit: "${genreKit}"`,
    `Available Built-in Pre-Asset IDs:`,
    `  - Characters: "char.stickman-economist", "char.stickman-astronaut", "char.stickman-lore-scholar"`,
    `  - Reusable Actions: "standing", "walking", "running", "sitting", "talking", "explaining", "pointing", "thinking", "reacting", "falling", "working", "holding-object"`,
    `  - Backdrops: "preasset.bg.econ-chalkboard-grid", "preasset.bg.cosmic-deep-nebula", "preasset.bg.lore-parchment-map"`,
    `  - Stage Widgets: "econ.supply-demand-curve", "econ.stock-candlestick-crash", "econ.inflation-money-stack", "cosmic.scale-comparison-spheres", "lore.animated-map-march-line", "lore.boss-item-stat-card"`,
    `  - 2.5D Camera Rigs: "static-stage-wide", "slow-push-in-dramatic", "whip-pan-to-chart-right", "split-focus-actor-and-chart", "orbital-3d-parallax-float"`,
  ].join('\n');
}
