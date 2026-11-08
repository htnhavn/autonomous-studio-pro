/**
 * @file director-brief.ts
 * @description The structured prompt contract between an AI director (DeepSeek,
 * Claude, GPT, Antigravity...) and the Autonomous Studio render engine.
 *
 * The AI does what only an AI can do: research, write, choose shots, pick
 * effects, set pacing, grade direction and supervise. The app does the
 * deterministic work: bone-accurate rigs, frame-accurate captions, compositing,
 * color math, audio ducking and encoding.
 *
 * A brief is plain JSON so any agent can emit it, and so the Python render
 * engine (`scripts/studio_render_engine.py`) can consume the exact same file.
 */

import type { VideoGenreKitId } from './genre-kits';
import type { CameraRigPresetId } from './camera-choreography';
import type {
  CharacterArchetypeId,
  ExpressionId,
  HeldPropId,
  MoveSetId,
} from './puppet-rig';

export const DIRECTOR_BRIEF_SCHEMA_VERSION = '2.0.0' as const;

export type CaptionStylePresetId =
  | 'hormozi-punch'
  | 'ali-abdaal-minimal'
  | 'capcut-neon-glow'
  | 'cinematic-serif-sub'
  | 'karaoke-word-fill'
  | 'glassmorphism-pill';

export interface DirectorBriefMeta {
  readonly title: string;
  readonly topic: string;
  readonly logline?: string;
  readonly genreKit: VideoGenreKitId;
  readonly language: string;
  readonly toneKeywords: readonly string[];
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fps: number;
  readonly targetDurationSec: number;
}

export interface ElevenLabsVoicePlan {
  readonly provider: 'elevenlabs';
  /** Environment variable that holds the key. Never inline a real key. */
  readonly apiKeyEnvVar: string;
  readonly voiceId: string;
  readonly modelId: string;
  readonly stability: number;
  readonly similarityBoost: number;
  readonly style: number;
  readonly speed: number;
  readonly outputFormat: string;
}

export interface DirectorAudioPlan {
  readonly voice: ElevenLabsVoicePlan | null;
  readonly music: {
    readonly sourcePath?: string;
    readonly searchQuery?: string;
    readonly bpm?: number;
    readonly gainDb: number;
    /** Negative dB applied to music while the voice is speaking. */
    readonly duckAmountDb: number;
  } | null;
  readonly loudnessTargetLufs: number;
  readonly truePeakDb: number;
}

export interface DirectorColorGradePlan {
  readonly enabled: boolean;
  readonly exposure: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly temperature: number;
  readonly tint: number;
  readonly filmGrainIntensity: number;
  readonly halationIntensity: number;
}

export type SceneAssetKind = 'image' | 'video' | 'none';
export type SceneAssetMotion =
  | 'ken-burns-in'
  | 'ken-burns-out'
  | 'pan-left'
  | 'pan-right'
  | 'static';

export interface DirectorSceneAsset {
  readonly kind: SceneAssetKind;
  readonly path?: string;
  readonly url?: string;
  readonly searchQuery?: string;
  readonly fit: 'cover' | 'contain';
  readonly motion: SceneAssetMotion;
  readonly opacity: number;
  /** Where the asset sits. Full-frame B-roll vs a picture-in-picture card. */
  readonly layout: 'full' | 'card-left' | 'card-right' | 'background';
}

export interface DirectorSceneEffectCue {
  /** Effect id from the Claude VFX catalog (see shader-library/claude-effects.ts). */
  readonly effectId: string;
  /** Normalized scene progress [0..1] at which the effect peaks. */
  readonly atProgress: number;
  readonly durationSec?: number;
  readonly intensity?: number;
  readonly params?: Readonly<Record<string, number | string>>;
}

export interface DirectorSceneActor {
  readonly archetype: CharacterArchetypeId;
  readonly moveSet: MoveSetId;
  readonly expression: ExpressionId;
  readonly prop: HeldPropId;
  readonly costumeId?: string;
  readonly stageX: number;
  readonly stageY: number;
  readonly scale: number;
  readonly flipHorizontal: boolean;
  readonly speechBubbleText?: string;
}

export interface DirectorSceneWidget {
  readonly kind: string;
  readonly title: string;
  readonly primaryValueLabel: string;
  readonly secondaryValueLabel?: string;
  readonly stageX: number;
  readonly stageY: number;
  readonly scale: number;
  readonly accentColorHex: string;
}

export interface DirectorScene {
  readonly id: string;
  readonly narration: string;
  readonly onScreenText?: string;
  /** Optional explicit duration. If omitted, derived from narration length. */
  readonly durationSec?: number;
  readonly asset: DirectorSceneAsset;
  readonly backdrop: string;
  readonly atmosphere: string;
  readonly cameraRig: CameraRigPresetId;
  readonly actors: readonly DirectorSceneActor[];
  readonly widgets: readonly DirectorSceneWidget[];
  readonly effects: readonly DirectorSceneEffectCue[];
  readonly transitionIn: {
    readonly type: 'cut' | 'crossfade' | 'whip' | 'zoom' | 'flash';
    readonly durationSec: number;
  };
  readonly transitionOut: {
    readonly type: 'cut' | 'crossfade' | 'whip' | 'zoom' | 'flash';
    readonly durationSec: number;
  };
  readonly captionStyleId: CaptionStylePresetId;
}

export interface DirectorQaPlan {
  readonly probeFramesPerScene: number;
  readonly checks: readonly (
    | 'framing'
    | 'occlusion'
    | 'caption-contrast'
    | 'vfx-intensity'
    | 'pacing'
  )[];
  readonly minScore: number;
  readonly autoFix: boolean;
}

export interface DirectorBrief {
  readonly schemaVersion: typeof DIRECTOR_BRIEF_SCHEMA_VERSION;
  readonly meta: DirectorBriefMeta;
  readonly audio: DirectorAudioPlan;
  readonly colorGrade: DirectorColorGradePlan;
  readonly scenes: readonly DirectorScene[];
  readonly qa: DirectorQaPlan;
  /** Free-form notes from the AI director, echoed into the render report. */
  readonly directorNotes?: readonly string[];
}

export interface CompiledBriefWord {
  readonly word: string;
  readonly startSec: number;
  readonly endSec: number;
  readonly isKeyword: boolean;
}

export interface CompiledBriefScene extends DirectorScene {
  readonly startSec: number;
  readonly durationSec: number;
  readonly words: readonly CompiledBriefWord[];
}

export interface CompiledDirectorBrief {
  readonly meta: DirectorBriefMeta;
  readonly audio: DirectorAudioPlan;
  readonly colorGrade: DirectorColorGradePlan;
  readonly qa: DirectorQaPlan;
  readonly scenes: readonly CompiledBriefScene[];
  readonly totalDurationSec: number;
  readonly estimatedWordCount: number;
  readonly averageShotSec: number;
}

const DEFAULT_WORDS_PER_SECOND: Readonly<Record<string, number>> = {
  'economics-stickman': 2.8,
  'universe-cosmic': 2.8,
  'lore-chronicle': 2.8,
  'vox-documentary': 3.3,
  'pixel-retro-arcade': 3.4,
};

const EMPHASIS_HINTS = [
  'không', 'chỉ', 'nhưng', 'vì', 'sụp', 'khủng hoảng', 'triều', 'ngập',
  'nguy hiểm', 'bí mật', 'sự thật', 'miễn phí', 'zero', 'never', 'only',
  'crash', 'collapse', 'free', 'why', 'how',
];

function isKeywordWord(raw: string): boolean {
  const w = raw.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (!w) return false;
  if (w.length >= 9) return true;
  return EMPHASIS_HINTS.some((hint) => w.includes(hint));
}

/**
 * Distribute word timings across a scene. Real productions use WhisperX
 * alignment; before audio exists we use a length-weighted approximation so
 * captions still land on the right beat instead of a flat per-word split.
 */
export function buildWordTimings(
  narration: string,
  startSec: number,
  durationSec: number
): readonly CompiledBriefWord[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  // Weight longer words slightly higher so the karaoke highlight tracks speech.
  const weights = words.map((w) => 0.6 + Math.min(2.4, w.length / 5));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cursor = startSec;
  return words.map((word, idx) => {
    const span = (weights[idx] / totalWeight) * durationSec;
    const start = cursor;
    const end = idx === words.length - 1 ? startSec + durationSec : cursor + span;
    cursor = end;
    return { word, startSec: start, endSec: end, isKeyword: isKeywordWord(word) };
  });
}

export function compileDirectorBrief(brief: DirectorBrief): CompiledDirectorBrief {
  const wordsPerSecond = DEFAULT_WORDS_PER_SECOND[brief.meta.genreKit] ?? 2.8;
  let cursor = 0;
  let wordCount = 0;

  const scenes: CompiledBriefScene[] = brief.scenes.map((scene, idx) => {
    const narration = scene.narration.trim();
    const narrationWords = narration ? narration.split(/\s+/).filter(Boolean).length : 0;
    const derived = narrationWords > 0 ? narrationWords / wordsPerSecond : 3.0;
    const durationSec = Number(
      Math.max(1.2, Math.min(30, scene.durationSec ?? derived)).toFixed(2)
    );
    const startSec = Number(cursor.toFixed(2));
    cursor += durationSec;
    wordCount += narrationWords;

    const words = buildWordTimings(narration, startSec, durationSec);
    const fallbackSceneId = `scene_${idx + 1}`;
    return {
      ...scene,
      id: scene.id || fallbackSceneId,
      startSec,
      durationSec,
      words,
    };
  });

  const totalDurationSec = Number(cursor.toFixed(2));
  return {
    meta: brief.meta,
    audio: brief.audio,
    colorGrade: brief.colorGrade,
    qa: brief.qa,
    scenes,
    totalDurationSec,
    estimatedWordCount: wordCount,
    averageShotSec: scenes.length > 0 ? Number((totalDurationSec / scenes.length).toFixed(2)) : 0,
  };
}

export interface BriefValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface BriefValidationResult {
  readonly valid: boolean;
  readonly issues: readonly BriefValidationIssue[];
}

/**
 * Dependency-free validation. Returns actionable paths so an AI director can
 * repair its own brief instead of guessing why the render was rejected.
 */
export function validateDirectorBrief(input: unknown): BriefValidationResult {
  const issues: BriefValidationIssue[] = [];
  const push = (path: string, message: string, severity: 'error' | 'warning' = 'error') =>
    issues.push({ path, message, severity });

  if (!input || typeof input !== 'object') {
    push('$', 'Brief must be a JSON object.');
    return { valid: false, issues };
  }
  const brief = input as Partial<DirectorBrief>;

  if (brief.schemaVersion !== DIRECTOR_BRIEF_SCHEMA_VERSION) {
    push('schemaVersion', `Expected "${DIRECTOR_BRIEF_SCHEMA_VERSION}".`);
  }
  if (!brief.meta) {
    push('meta', 'Missing meta block.');
  } else {
    if (!brief.meta.title) push('meta.title', 'Title is required.');
    if (!brief.meta.genreKit) push('meta.genreKit', 'Genre kit is required.');
    if (!brief.meta.fps || brief.meta.fps < 24) push('meta.fps', 'fps must be >= 24.');
    if (!brief.meta.widthPx || !brief.meta.heightPx) push('meta', 'widthPx/heightPx are required.');
  }

  if (!Array.isArray(brief.scenes) || brief.scenes.length === 0) {
    push('scenes', 'At least one scene is required.');
  } else {
    brief.scenes.forEach((scene, idx) => {
      const p = `scenes[${idx}]`;
      if (!scene || typeof scene !== 'object') {
        push(p, 'Scene must be an object.');
        return;
      }
      if (!scene.narration || !scene.narration.trim()) {
        push(`${p}.narration`, 'Narration is required for captions and TTS.');
      }
      if (!scene.cameraRig) push(`${p}.cameraRig`, 'cameraRig is required.');
      if (!scene.backdrop) push(`${p}.backdrop`, 'backdrop is required.');
      if (!Array.isArray(scene.actors) || scene.actors.length === 0) {
        push(`${p}.actors`, 'At least one actor is required.');
      }
      if (!Array.isArray(scene.effects)) {
        push(`${p}.effects`, 'effects must be an array (use [] for none).');
      }
      if (!scene.captionStyleId) push(`${p}.captionStyleId`, 'captionStyleId is required.');
      if (scene.durationSec !== undefined && scene.durationSec < 1) {
        push(`${p}.durationSec`, 'Scene shorter than 1s will be clamped.', 'warning');
      }
    });
  }

  if (!brief.audio) {
    push('audio', 'Missing audio plan.', 'warning');
  } else if (brief.audio.voice && brief.audio.voice.provider === 'elevenlabs') {
    if (!brief.audio.voice.apiKeyEnvVar) {
      push('audio.voice.apiKeyEnvVar', 'Set an env var name for the ElevenLabs key.');
    }
    if (!brief.audio.voice.voiceId) {
      push('audio.voice.voiceId', 'voiceId is required for ElevenLabs.', 'warning');
    }
  }

  return { valid: issues.every((i) => i.severity !== 'error'), issues };
}
