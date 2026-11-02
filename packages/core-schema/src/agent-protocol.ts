/**
 * @file agent-protocol.ts
 * @description Universal Live AI Editing Protocol, Ghost Cursor Telemetry, Asset Flight Animation Events,
 * Deterministic Command Bus, and Multimodal VLM Self-Correction Loop Contracts.
 */

import { RationalTime, TimeRange } from './rational-time';
import { ChoreographedStageScene, VideoGenreKitId } from '../../stage-engine/src/genre-kits';
import { ProductionAutonomyTier } from '../../mcp-bridge/src/ai-playbooks';
import {
  AIVisualEffectsConfig,
  ClipTransition,
  ColorGradeConfig,
  DynamicCaptionPayload,
  Keyframe,
  MediaAsset,
  MotionCodePayload,
  ShaderEffectInstance,
  TimelineClip,
  TrackKind,
  YouTubePublishPackage,
} from './timeline';

export type AgentRole =
  | 'director'          // 🎬 Master Showrunner: Script, Storyboard, Pacing, Hook & Edit Decision List (EDL)
  | 'rough-cut'         // ✂️ Dialogue & Pacing Editor: WhisperX, Auto-Editor silence cut, take selection
  | 'asset-hunter'      // 🔍 Web & Stock Harvester: Pexels, Pixabay, Unsplash, News Highlighter, yt-dlp, Flux/Veo
  | 'vfx-motion'        // ✨ Visual & Motion Artist: SAM 2 Rotoscope, Depth 3D Parallax, Motifs/Remotion Code, Shaders
  | 'sound-designer'    // 🎧 Audio Engineer: F5-TTS/ElevenLabs, Demucs, Librosa Beat-Sync, MMAudio SFX, -14 LUFS
  | 'vlm-critic'        // 🧐 Multimodal QA Reviewer: Watches rendered preview, scores pacing/visuals, triggers self-fix
  | 'youtube-publisher' // 🚀 YouTube Studio Agent: AI Thumbnail Studio, SEO Title/Desc/Chapters, YouTube API v3 upload
  | 'external-mcp';     // 🔌 Any external MCP Agent (Claude Code, Gemini CLI, Codex, OpenClaw, Custom Agent)

export type AIProviderKind =
  | 'google-gemini'     // Gemini 2.5 / 3 / 4 Pro, Flash, Omni Flash
  | 'anthropic-claude'  // Claude Opus / Sonnet / Claude Code MCP
  | 'openai-gpt'        // GPT-4o / o3 / Codex
  | 'openrouter'        // Any OpenRouter model
  | 'local-ollama-vllm' // Local Qwen2.5-VL, DeepSeek, Llama via Ollama/vLLM
  | 'local-gpu-sidecar' // Local CUDA/ONNX models (WhisperX, SAM 2.1, Video-Depth-Anything, F5-TTS, MMAudio)
  | 'external-mcp';     // External MCP Agent (VS Code / Antigravity / Claude Code / Cursor)

/**
 * Real-time Ghost Cursor displayed directly on the Timeline & Program Monitor Canvas
 * so the user watches AI agents edit live in real time!
 */
export interface AgentCursorState {
  readonly agentId: string;
  readonly role: AgentRole;
  readonly displayName: string;
  readonly colorHex: string; // Distinct badge color per agent on the timeline
  readonly provider: AIProviderKind;
  readonly status: 'idle' | 'thinking' | 'searching-web' | 'cutting' | 'rendering-vfx' | 'reviewing';
  /** Current timeline playhead time where this agent is operating */
  readonly currentTimelineTime: RationalTime;
  /** Target track ID the agent is hovering/modifying */
  readonly targetTrackId?: string;
  /** Target clip ID the agent is modifying */
  readonly targetClipId?: string;
  /** Optional normalized (0..1) coordinates on the Program Monitor Canvas */
  readonly monitorCanvasPoint?: { readonly x: number; readonly y: number };
  /** Short live action bubble shown next to the ghost cursor (e.g., "✂️ Cắt khoảng lặng 1.4s", "🔍 Đang tải B-Roll Pexels...") */
  readonly liveActionBubble: string;
  /** Detailed chain-of-thought reasoning streamed to the Live Agent Console */
  readonly reasoningStream?: string;
  readonly updatedAtMs: number;
}

/**
 * Visual event triggered when the Asset Hunter Agent finds an image, news screenshot, or video online
 * and drops it onto the timeline — drives a smooth flying-thumbnail animation in the UI!
 */
export interface LiveAssetFlightEvent {
  readonly eventId: string;
  readonly agentId: string;
  readonly asset: MediaAsset;
  readonly targetTrackId: string;
  readonly targetStartTime: RationalTime;
  readonly searchQueryUsed: string;
  readonly vlmMatchScore: number; // e.g., 9.4 / 10
  readonly timestampMs: number;
}

/**
 * Deterministic Timeline Command Envelope.
 * Every edit action (whether clicked by the user or invoked via MCP by an AI Agent)
 * is dispatched as a TimelineCommand so we get:
 * 1. <16ms reactive UI updates
 * 2. Live Ghost Cursor telemetry
 * 3. Per-Agent selective Undo/Redo
 * 4. Respect for User-Locked tracks/clips (`lockedByUser`)
 */
export interface TimelineCommandEnvelope {
  readonly commandId: string;
  readonly actor: {
    readonly kind: 'user' | 'agent';
    readonly id: string;
    readonly role?: AgentRole;
    readonly displayName: string;
  };
  readonly timestampMs: number;
  readonly reasoning?: string;
  readonly command: TimelineCommand;
}

export type TimelineCommand =
  | {
      readonly type: 'TRACK_ADD';
      readonly trackKind: TrackKind;
      readonly name: string;
      readonly insertAtOrder?: number;
    }
  | {
      readonly type: 'CLIP_INSERT';
      readonly trackId: string;
      readonly clip: TimelineClip;
      readonly rippleShiftSubsequentClips: boolean;
    }
  | {
      readonly type: 'CLIP_SPLIT';
      readonly clipId: string;
      readonly splitAtTimelineTime: RationalTime;
    }
  | {
      readonly type: 'CLIP_TRIM';
      readonly clipId: string;
      readonly newTimelineRange: TimeRange;
      readonly newSourceRange: TimeRange;
      readonly ripple: boolean;
    }
  | {
      readonly type: 'CLIP_DELETE';
      readonly clipId: string;
      readonly rippleGapClose: boolean;
    }
  | {
      readonly type: 'CLIP_MOVE';
      readonly clipId: string;
      readonly targetTrackId: string;
      readonly newStartTime: RationalTime;
    }
  | {
      readonly type: 'CLIP_SET_LOCK';
      readonly clipId: string;
      readonly lockedByUser: boolean;
    }
  | {
      readonly type: 'CLIP_SET_KEYFRAME';
      readonly clipId: string;
      readonly propertyPath: string; // e.g., 'transform.scaleX', 'colorGrade.exposure'
      readonly keyframe: Keyframe<number>;
    }
  | {
      readonly type: 'CLIP_APPLY_SHADER';
      readonly clipId: string;
      readonly shader: ShaderEffectInstance;
    }
  | {
      readonly type: 'CLIP_SET_TRANSITION';
      readonly clipId: string;
      readonly edge: 'in' | 'out';
      readonly transition: ClipTransition;
    }
  | {
      readonly type: 'CLIP_SET_COLOR_GRADE';
      readonly clipId: string;
      readonly colorGrade: Partial<ColorGradeConfig>;
    }
  | {
      readonly type: 'CLIP_SET_AI_VFX';
      readonly clipId: string;
      readonly aiVfx: Partial<AIVisualEffectsConfig>;
    }
  | {
      readonly type: 'CLIP_INJECT_MOTION_CODE';
      readonly trackId: string;
      readonly timelineRange: TimeRange;
      readonly name: string;
      readonly motionCode: MotionCodePayload;
    }
  | {
      readonly type: 'CAPTION_GENERATE_TRACK';
      readonly trackId: string;
      readonly captionClips: readonly {
        readonly timelineRange: TimeRange;
        readonly payload: DynamicCaptionPayload;
      }[];
    }
  | {
      readonly type: 'BEAT_GRID_SYNC_CUTS';
      readonly bpm: number;
      readonly targetTrackIds: readonly string[];
      readonly snapToleranceFrames: number;
    }
  | {
      readonly type: 'MEDIA_POOL_REGISTER_ASSET';
      readonly asset: MediaAsset;
    }
  | {
      readonly type: 'YOUTUBE_UPDATE_PACKAGE';
      readonly pkg: Partial<YouTubePublishPackage>;
    }
  | {
      readonly type: 'CLIP_SET_STAGE_SCENE';
      readonly clipId: string;
      readonly stageScene: ChoreographedStageScene;
    }
  | {
      readonly type: 'PROJECT_COMPILE_DETERMINISTIC_STAGE';
      readonly scriptText: string;
      readonly genreKit: VideoGenreKitId;
      readonly replaceExistingStageTrack: boolean;
    }
  | {
      readonly type: 'TRACK_UPDATE_STATE';
      readonly trackId: string;
      readonly lockedByUser?: boolean;
      readonly muted?: boolean;
      readonly solo?: boolean;
      readonly visible?: boolean;
    };

/**
 * Multimodal VLM Critic QA Review Report (Self-Correction Loop)
 * Inspired by `poseljacob/agentic-video-editor` Reviewer loop.
 */
export interface CriticIssue {
  readonly id: string;
  readonly severity: 'critical' | 'warning' | 'polish';
  readonly category:
    | 'dead-air-pacing'
    | 'caption-overlap-face'
    | 'broll-semantic-mismatch'
    | 'audio-clipping-or-ducking'
    | 'jarring-transition'
    | 'color-inconsistency'
    | 'visual-monotony-over-5s';
  readonly timeRange: TimeRange;
  readonly description: string;
  /** Suggested MCP tool / command to fix this issue automatically */
  readonly suggestedFixPrompt: string;
  readonly assignedToRole: AgentRole;
}

export interface CriticReviewReport {
  readonly iteration: number;
  readonly overallScore: number; // 0.0 to 10.0 (Autonomous loop passes when >= 9.0)
  readonly subScores: {
    readonly hookRetention: number;
    readonly pacingAndRhythm: number;
    readonly visualBrollQuality: number;
    readonly motionAndVfxPolish: number;
    readonly audioMixAndSfx: number;
  };
  readonly passedQualityGate: boolean;
  readonly issues: readonly CriticIssue[];
}

/**
 * End-to-End Autonomous Job Request (Frame 0 -> Final Frame -> YouTube)
 */
export interface AutonomousProductionJob {
  readonly jobId: string;
  readonly mode: 'full-autonomous' | 'copilot-assisted';
  /** Controls how much built-in deterministic stage/puppet vs heavy AI is used */
  readonly autonomyTier?: ProductionAutonomyTier;
  readonly genreKit?: VideoGenreKitId;
  readonly playbookId?: string;
  /** User can provide either a topic prompt, a script, or raw A-roll video/audio paths */
  readonly input: {
    readonly topicOrPrompt?: string;
    readonly rawScriptText?: string;
    readonly rawMediaPaths?: readonly string[];
    readonly referenceStyleUrl?: string; // e.g. Vox, Johnny Harris, Hormozi, Fireship, Cinematic Doc
  };
  readonly preferences: {
    readonly aspectRatio: '16:9' | '9:16' | '1:1';
    readonly targetDurationSeconds?: number;
    readonly pacingStyle: 'hyper-fast-shorts' | 'dynamic-youtube' | 'cinematic-documentary';
    readonly language: 'vi' | 'en' | 'auto';
    readonly enable3DParallaxOnImages: boolean;
    readonly enableTextBehindSubject: boolean;
    readonly enableCodeMotionGraphics: boolean;
    readonly autoUploadToYouTube: boolean;
    readonly qualityGateThreshold: number; // Default 9.0 / 10
  };
}

