/**
 * @file timeline.ts
 * @description Master Non-Linear Editing (NLE) Timeline & Project Schema.
 * Combines capabilities of Adobe Premiere Pro (Multi-Track NLE), DaVinci Resolve (Node Compositing & OCIO Color),
 * CapCut Pro (One-click Presets, Dynamic Word Captions, Text-Behind-Subject), and WeftCut/Remotion (Code-as-Motion).
 */

import { RationalTime, TimeRange } from './rational-time';
import { ChoreographedStageScene } from '../../stage-engine/src/genre-kits';

export type TrackKind =
  | 'video'             // Primary A-Roll, B-Roll, Image, or Screen Capture tracks
  | 'stage-puppet'      // Zero-AI / Hybrid Pre-built 2D Puppet, Stickman, Camera Rig & Genre Stage track
  | 'motion-code'       // Live React/TypeScript/Canvas/Three.js procedural components (WeftCut Motifs / Remotion)
  | 'caption'           // Word-level animated captions (WhisperX / Hormozi / CapCut Pro style)
  | 'effect-adjustment' // Adjustment layers applying GPU Shaders / LUTs / Transforms to tracks below
  | 'audio-voice'       // Dialogue / TTS Voiceover track (supports Auto-Ducking trigger)
  | 'audio-music'       // Background Music track (supports Librosa Beat-Sync markers & Auto-Ducking target)
  | 'audio-sfx';        // Foley & Sound Effects track (Whoosh, Hit, Riser, MMAudio generated SFX)

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'add'
  | 'glow';

export type EasingMode =
  | 'linear'
  | 'bezier'
  | 'spring'
  | 'hold'
  | 'ease-in-out-cubic'
  | 'ease-out-expo';

export interface BezierTangent {
  readonly dt: number; // Normalized time offset [0..1]
  readonly dv: number; // Value delta
}

export interface Keyframe<T = number> {
  readonly id: string;
  /** Offset relative to the start of the clip */
  readonly timeOffset: RationalTime;
  readonly value: T;
  readonly easing: EasingMode;
  readonly inTangent?: BezierTangent;
  readonly outTangent?: BezierTangent;
  readonly springConfig?: {
    readonly stiffness: number;
    readonly damping: number;
    readonly mass: number;
  };
  /** Who created or last modified this keyframe ('user' or agentId) */
  readonly authorId: string;
}

export interface AnimatableProperty<T = number> {
  readonly staticValue: T;
  readonly keyframes: readonly Keyframe<T>[];
}

export interface Transform3D {
  readonly positionX: AnimatableProperty<number>;
  readonly positionY: AnimatableProperty<number>;
  readonly positionZ: AnimatableProperty<number>;
  readonly scaleX: AnimatableProperty<number>;
  readonly scaleY: AnimatableProperty<number>;
  readonly rotationX: AnimatableProperty<number>;
  readonly rotationY: AnimatableProperty<number>;
  readonly rotationZ: AnimatableProperty<number>;
  readonly anchorX: AnimatableProperty<number>;
  readonly anchorY: AnimatableProperty<number>;
  readonly opacity: AnimatableProperty<number>;
}

/**
 * GPU Shader / Filter Effect (supports WGSL, GLSL, Shadertoy, and ISF formats)
 */
export interface ShaderEffectInstance {
  readonly id: string;
  readonly shaderId: string; // e.g., 'capcut.3d-zoom-pro', 'shadertoy.crt-vhs', 'isf.chromatic-aberration'
  readonly name: string;
  readonly enabled: boolean;
  readonly category: 'camera-motion' | 'glitch-retro' | 'light-glow' | 'blur-sharpen' | 'distortion' | 'stylize';
  readonly uniforms: Record<string, AnimatableProperty<number | readonly number[] | string>>;
}

/**
 * GPU Transition between two adjacent or overlapping clips (`gl-transitions` + CapCut Pro presets)
 */
export interface ClipTransition {
  readonly id: string;
  readonly transitionShaderId: string; // e.g., 'gl.directionalwipe', 'gl.swirl', 'capcut.whip-pan-blur', 'gl.luma-fade'
  readonly duration: RationalTime;
  readonly easing: EasingMode;
  readonly params: Record<string, number | readonly number[] | string>;
  /** Optional linked SFX automatically triggered at transition peak (e.g., 'sfx.whoosh-heavy-01') */
  readonly linkedSfxAssetId?: string;
}

/**
 * DaVinci Resolve-style Color Grading & OpenColorIO configuration per clip or adjustment layer
 */
export interface ColorGradeConfig {
  readonly enabled: boolean;
  readonly exposure: AnimatableProperty<number>;
  readonly contrast: AnimatableProperty<number>;
  readonly saturation: AnimatableProperty<number>;
  readonly temperature: AnimatableProperty<number>;
  readonly tint: AnimatableProperty<number>;
  readonly lift: readonly [number, number, number, number];  // [R, G, B, Master] Shadows
  readonly gamma: readonly [number, number, number, number]; // [R, G, B, Master] Midtones
  readonly gain: readonly [number, number, number, number];  // [R, G, B, Master] Highlights
  readonly lut3dAssetId?: string;                            // Path/ID to .cube 3D LUT file
  readonly lutIntensity: AnimatableProperty<number>;
  readonly filmGrainIntensity: AnimatableProperty<number>;
  readonly halationIntensity: AnimatableProperty<number>;
  /** Whether AI Auto Color-Match normalized this clip to the reference hero shot */
  readonly aiColorMatchedToClipId?: string;
}

/**
 * AI Computer Vision VFX attachments (SAM 2.1 Rotoscoping, Depth-Anything 3D Parallax, Inpainting, RIFE)
 */
export interface AIVisualEffectsConfig {
  /** SAM 2.1 + MatAnyone Subject Segmentation (enables Text-Behind-Subject & custom background replacement) */
  readonly rotoscopeMask?: {
    readonly enabled: boolean;
    readonly model: 'sam2.1-hiera-large' | 'matanyone-v1' | 'birefnet-hr';
    readonly maskVideoCachePath?: string;
    readonly featherPx: number;
    readonly invertMask: boolean;
    /** Track ordering layer: allows placing text/motion tracks between foreground subject and background! */
    readonly renderForegroundAboveTrackOrder?: number;
  };
  /** Video-Depth-Anything 3D Camera Parallax (turns static scraped web photos into cinematic 3D moving shots!) */
  readonly depthParallax3D?: {
    readonly enabled: boolean;
    readonly depthMapCachePath?: string;
    readonly cameraOrbitX: AnimatableProperty<number>;
    readonly cameraOrbitY: AnimatableProperty<number>;
    readonly cameraDollyZ: AnimatableProperty<number>;
    readonly dofFocusDistance: AnimatableProperty<number>;
    readonly dofApertureBokeh: AnimatableProperty<number>;
  };
  /** YOLO11 / MediaPipe Smart Subject Tracking (Auto-Reframe 16:9 <-> 9:16) */
  readonly smartAutoReframe?: {
    readonly enabled: boolean;
    readonly targetSubject: 'face' | 'speaker' | 'salient-object';
    readonly smoothingFactor: number;
  };
  /** RIFE v4 Optical Flow Frame Interpolation for buttery-smooth slow-motion */
  readonly opticalFlowSlowMo?: {
    readonly enabled: boolean;
    readonly targetMultiplier: 2 | 4 | 8;
    readonly interpolatedCachePath?: string;
  };
}

/**
 * Code-as-Motion Payload (WeftCut Motifs / Remotion / Revideo live component)
 * Allows AI agents to write custom TypeScript/React/Canvas/Shader motion graphics on the fly!
 */
export interface MotionCodePayload {
  readonly engine: 'motifs-ts' | 'remotion-react' | 'canvas-2d' | 'three-3d';
  readonly templateId?:
    | 'news-article-highlighter'
    | 'kinetic-typography-burst'
    | 'animated-bar-chart'
    | 'animated-line-chart'
    | 'map-flyover-3d'
    | 'callout-pointer-box'
    | 'social-proof-tweet-card'
    | 'chapter-title-cinematic'
    | 'custom-agent-code';
  /** Live source code written or parameterized by the AI VFX/Motion Agent */
  readonly sourceCode: string;
  /** Structured props passed into the component so human users can tweak text/colors in the Inspector UI! */
  readonly propsSchema: Record<string, {
    readonly type: 'string' | 'number' | 'color' | 'boolean' | 'asset-id';
    readonly label: string;
    readonly value: unknown;
  }>;
}

/**
 * Word-level timestamped token from WhisperX for CapCut/Hormozi-style dynamic captions & Text-Based Editing
 */
export interface WordTimestampToken {
  readonly id: string;
  readonly word: string;
  readonly startOffset: RationalTime;
  readonly endOffset: RationalTime;
  readonly confidence: number;
  readonly speakerId?: string;
  /** Highlight or emphasis flags set by AI Caption Agent */
  readonly isKeywordEmphasized?: boolean;
  readonly emphasisColorHex?: string;
  readonly autoEmoji?: string;
  readonly linkedPopSfxId?: string;
}

export interface DynamicCaptionPayload {
  readonly stylePresetId:
    | 'hormozi-punch'
    | 'ali-abdaal-minimal'
    | 'capcut-neon-glow'
    | 'cinematic-serif-sub'
    | 'karaoke-word-fill'
    | 'glassmorphism-pill';
  readonly fontFamily: string;
  readonly fontSizePx: number;
  readonly primaryColorHex: string;
  readonly activeWordColorHex: string;
  readonly strokeColorHex: string;
  readonly strokeWidthPx: number;
  readonly maxWordsPerLine: number;
  readonly placeBehindSubjectIfMasked: boolean;
  readonly words: readonly WordTimestampToken[];
}

/**
 * Audio Processing Chain per audio/video clip
 */
export interface AudioProcessingConfig {
  readonly volumeDb: AnimatableProperty<number>;
  readonly pan: AnimatableProperty<number>; // [-1.0 Left .. 0.0 Center .. +1.0 Right]
  readonly mute: boolean;
  readonly fadeInDuration: RationalTime;
  readonly fadeOutDuration: RationalTime;
  /** AI Audio Enhancement (Demucs v4 + DeepFilterNet3) */
  readonly aiDenoiseEnabled: boolean;
  readonly aiVocalIsolationEnabled: boolean;
  /** Auto-Ducking role: 'trigger' (Voice lowers music) or 'target' (Music ducks when voice speaks) */
  readonly duckingRole: 'none' | 'voice-trigger' | 'music-target';
  readonly duckingAmountDb: number; // e.g., -14 dB
}

/**
 * Base Clip on any Track in the Timeline
 */
export interface TimelineClip {
  readonly id: string;
  readonly name: string;
  readonly trackId: string;
  readonly kind: TrackKind;
  /** Reference to MediaAsset in MediaPool (optional for procedural motion-code or adjustment clips) */
  readonly assetId?: string;
  /** Position and duration on the master timeline */
  readonly timelineRange: TimeRange;
  /** Trim in/out range inside the source media file */
  readonly sourceRange: TimeRange;
  /** Playback speed multiplier (e.g., 1.0 = normal, 2.0 = 2x fast) */
  readonly speedMultiplier: number;
  readonly blendMode: BlendMode;
  readonly enabled: boolean;
  /** Lock flag: if locked by User, AI Agents are strictly forbidden from modifying or moving this clip! */
  readonly lockedByUser: boolean;
  readonly transform: Transform3D;
  readonly shaders: readonly ShaderEffectInstance[];
  readonly transitionIn?: ClipTransition;
  readonly transitionOut?: ClipTransition;
  readonly colorGrade: ColorGradeConfig;
  readonly aiVfx: AIVisualEffectsConfig;
  readonly audio: AudioProcessingConfig;
  readonly motionCode?: MotionCodePayload;
  readonly captionData?: DynamicCaptionPayload;
  /** Pre-built Deterministic Stage, Stickman Puppet Move-Set, 2.5D Camera Rig & Genre Widget scene */
  readonly stageScene?: ChoreographedStageScene;
  /** Metadata tracking which AI Agent placed/edited this clip and why */
  readonly agentProvenance?: {
    readonly agentId: string;
    readonly agentRole: string;
    readonly reasoning: string;
    readonly aestheticScore?: number; // 0..10 score from VLM Critic / SigLIP
    readonly sourceUrl?: string;      // If scraped from Pexels, Pixabay, Unsplash, News, YouTube
  };
}

/**
 * Beat/Onset Marker extracted by Librosa / Essentia for Beat-Sync Automated Cutting
 */
export interface BeatMarker {
  readonly id: string;
  readonly time: RationalTime;
  readonly strength: number; // [0.0 .. 1.0] Downbeat vs normal beat
  readonly isDownbeat: boolean;
  readonly label?: string;
}

export interface TimelineTrack {
  readonly id: string;
  readonly name: string;
  readonly kind: TrackKind;
  readonly order: number; // Higher order = rendered on top
  readonly muted: boolean;
  readonly solo: boolean;
  /** If locked, AI Agents cannot modify clips on this track */
  readonly lockedByUser: boolean;
  readonly visible: boolean;
  readonly heightPx: number;
  readonly clips: readonly TimelineClip[];
}

/**
 * Media Pool Asset (Local Footage, AI Scraped Image/B-Roll, Generated TTS/SFX, Article Screenshot)
 */
export interface MediaAsset {
  readonly id: string;
  readonly name: string;
  readonly kind: 'video' | 'audio' | 'image' | 'article-screenshot' | 'generated-ai' | 'lut-3d';
  readonly localFilePath: string;
  readonly proxyFilePath?: string;
  readonly thumbnailPath?: string;
  readonly waveformJsonPath?: string;
  readonly duration?: RationalTime;
  readonly width?: number;
  readonly height?: number;
  readonly fps?: number;
  /** Semantic tags & VLM description for instant AI B-Roll matching */
  readonly semanticTags: readonly string[];
  readonly vlmSummary?: string;
  readonly aestheticScore?: number;
  readonly origin: {
    readonly provider:
      | 'local-disk'
      | 'pexels'
      | 'pixabay'
      | 'unsplash'
      | 'wikimedia'
      | 'internet-archive'
      | 'giphy'
      | 'web-article-playwright'
      | 'yt-dlp-clipper'
      | 'ai-flux-imagen'
      | 'ai-wan-veo-video'
      | 'ai-tts-voice'
      | 'ai-mmaudio-sfx';
    readonly sourceUrl?: string;
    readonly searchQuery?: string;
    readonly license?: string;
  };
  /** Word-level transcript if this asset has spoken audio */
  readonly transcriptWords?: readonly WordTimestampToken[];
  /** Beat markers if this asset is music */
  readonly beatMarkers?: readonly BeatMarker[];
}

/**
 * Autonomous YouTube Publishing Package (Thumbnail + SEO Metadata + Chapters)
 */
export interface YouTubePublishPackage {
  readonly status: 'draft' | 'ready-to-upload' | 'uploading' | 'published';
  readonly selectedTitle: string;
  readonly titleAlternatives: readonly string[];
  readonly descriptionSeo: string;
  readonly tags: readonly string[];
  readonly categoryId: string;
  readonly privacyStatus: 'private' | 'unlisted' | 'public' | 'scheduled';
  readonly scheduledPublishIso?: string;
  readonly autoChapters: readonly {
    readonly timecode: string; // e.g., "00:00"
    readonly title: string;
  }[];
  readonly thumbnailVariants: readonly {
    readonly id: string;
    readonly imagePath: string;
    readonly headlineText: string;
    readonly predictedCtrScore: number;
  }[];
  readonly publishedVideoUrl?: string;
}

/**
 * Master Project Document (`project.json` - Single Source of Truth)
 */
export interface StudioProject {
  readonly schemaVersion: '1.0.0';
  readonly id: string;
  readonly name: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly settings: {
    readonly width: number;       // e.g., 1920, 3840, or 1080 (vertical)
    readonly height: number;      // e.g., 1080, 2160, or 1920 (vertical)
    readonly fps: number;         // e.g., 60, 30, 24
    readonly sampleRateHz: number;// e.g., 48000
    readonly targetLoudnessLufs: number; // Default -14.0 LUFS for YouTube
    readonly colorSpace: 'Rec.709' | 'Rec.2020-HLG' | 'ACEScg';
  };
  readonly mediaPool: Record<string, MediaAsset>;
  readonly tracks: readonly TimelineTrack[];
  readonly beatGrid: {
    readonly bpm?: number;
    readonly snapToBeats: boolean;
    readonly markers: readonly BeatMarker[];
  };
  readonly youtubePackage: YouTubePublishPackage;
}

export type Track = TimelineTrack;
export type Clip = TimelineClip;
export type { ChoreographedStageScene };


