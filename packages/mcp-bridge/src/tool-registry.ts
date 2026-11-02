/**
 * @file tool-registry.ts
 * @description Universal MCP (Model Context Protocol) & Agent Tool Registry for Autonomous Studio Pro.
 * Exposes structured tools across 8 domains so ANY AI Agent (Gemini, Claude Code, Codex, OpenClaw, Local LLM)
 * can inspect, edit, search web assets, generate motion code, apply GPU shaders, mix audio, and publish to YouTube
 * while broadcasting live Ghost Cursor movements to the UI.
 */

import { AgentRole } from '../../core-schema/src/agent-protocol';

export interface MCPToolSchema {
  readonly name: string;
  readonly domain:
    | 'timeline'
    | 'stage-puppeteer'
    | 'asset-hunter'
    | 'motion-code'
    | 'shaders-color'
    | 'ai-vfx'
    | 'audio-captions'
    | 'critic-qa'
    | 'youtube-publish';
  readonly primaryRole: AgentRole;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, {
      readonly type: string;
      readonly description: string;
      readonly enum?: readonly string[];
    }>;
    readonly required: readonly string[];
  };
  /** Whether calling this tool moves the Agent's Live Ghost Cursor on the timeline */
  readonly emitsGhostCursor: boolean;
}

/**
 * Core Registry of High-Impact Autonomous Video Editing Tools.
 * Flash / Workers can add additional granular helper tools following this exact contract.
 */
export const STUDIO_MCP_TOOLS: readonly MCPToolSchema[] = [
  // ============================================================================
  // 1. TIMELINE & NON-LINEAR EDITING TOOLS
  // ============================================================================
  {
    name: 'timeline.get_project_state',
    domain: 'timeline',
    primaryRole: 'director',
    description: 'Read the full OpenTimelineIO / project.json state including tracks, clips, beat markers, and user-locked regions.',
    inputSchema: {
      type: 'object',
      properties: {
        includeTranscriptWords: { type: 'boolean', description: 'Include word-level timestamps in response' },
      },
      required: [],
    },
    emitsGhostCursor: false,
  },
  {
    name: 'timeline.split_and_ripple_cut',
    domain: 'timeline',
    primaryRole: 'rough-cut',
    description: 'Split a clip at a frame-accurate timestamp or remove a range (e.g., dead air, retake, filler words) and ripple-close the gap.',
    inputSchema: {
      type: 'object',
      properties: {
        clipId: { type: 'string', description: 'Target clip ID on the timeline' },
        removeStartSec: { type: 'number', description: 'Start time in seconds to cut out' },
        removeEndSec: { type: 'number', description: 'End time in seconds to cut out' },
        rippleCloseGap: { type: 'boolean', description: 'Automatically shift subsequent clips left to close gap' },
        reasoning: { type: 'string', description: 'Why this cut improves pacing (shown in Live Agent HUD)' },
      },
      required: ['clipId', 'removeStartSec', 'removeEndSec', 'rippleCloseGap'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'timeline.insert_broll_clip',
    domain: 'timeline',
    primaryRole: 'asset-hunter',
    description: 'Place an image, stock video, or generated clip onto a B-Roll track synced to spoken dialogue timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: { type: 'string', description: 'MediaAsset ID in the Media Pool' },
        trackId: { type: 'string', description: 'Target video B-Roll track ID (e.g. V2, V3)' },
        startTimeSec: { type: 'number', description: 'Timeline start time in seconds' },
        durationSec: { type: 'number', description: 'Clip duration in seconds' },
        apply3DParallaxIfImage: { type: 'boolean', description: 'Automatically run Video-Depth-Anything 3D camera motion if asset is a static image' },
        transitionInShaderId: { type: 'string', description: 'Optional gl-transition or CapCut preset ID for entry' },
        reasoning: { type: 'string', description: 'Why this visual matches the spoken narrative' },
      },
      required: ['assetId', 'trackId', 'startTimeSec', 'durationSec'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 2. AUTONOMOUS WEB & STOCK ASSET HUNTER TOOLS
  // ============================================================================
  {
    name: 'hunter.search_and_score_media',
    domain: 'asset-hunter',
    primaryRole: 'asset-hunter',
    description: 'Autonomously search free stock video/photo APIs (Pexels, Pixabay, Unsplash, Wikimedia, Internet Archive, Giphy) + Web Images, score candidates with SigLIP/VLM for semantic & aesthetic fit, download the best match, and animate it into the Media Pool.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query optimized for visual search' },
        mediaType: { type: 'string', description: 'Desired media type', enum: ['video', 'image', 'gif', 'any'] },
        dialogueContext: { type: 'string', description: 'Spoken sentence this visual will illustrate (used by VLM judge)' },
        aspectRatio: { type: 'string', description: 'Target orientation', enum: ['16:9', '9:16', '1:1'] },
        fallbackToGenerativeAi: { type: 'boolean', description: 'If best web score < 7.5/10, generate custom image/video via Flux/Imagen/Veo' },
      },
      required: ['query', 'mediaType', 'dialogueContext'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'hunter.capture_news_article_highlight',
    domain: 'asset-hunter',
    primaryRole: 'asset-hunter',
    description: 'Search for a real news article or web page via SearXNG/Playwright, capture a high-DPI dark/light screenshot, locate the exact quote bounding box, and create a 3D Zoom + Highlighter Motion clip on the timeline (Vox / Johnny Harris style).',
    inputSchema: {
      type: 'object',
      properties: {
        searchQueryOrUrl: { type: 'string', description: 'News headline search query or direct article URL' },
        quoteToHighlight: { type: 'string', description: 'Exact phrase or headline to highlight with animated marker' },
        trackId: { type: 'string', description: 'Target track ID on timeline' },
        startTimeSec: { type: 'number', description: 'Timeline start time in seconds' },
        durationSec: { type: 'number', description: 'Duration on timeline in seconds' },
      },
      required: ['searchQueryOrUrl', 'quoteToHighlight', 'trackId', 'startTimeSec', 'durationSec'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 3. CODE-AS-MOTION ENGINE TOOLS (WEFTCUT MOTIFS / REMOTION / REVIDEO)
  // ============================================================================
  {
    name: 'motion.inject_procedural_graphic',
    domain: 'motion-code',
    primaryRole: 'vfx-motion',
    description: 'Generate or instantiate a live React/TypeScript/Canvas/Three.js motion graphics component directly onto a Motion Track (e.g., animated data chart, 3D map flyover, kinetic typography, callout pointer, comparison table).',
    inputSchema: {
      type: 'object',
      properties: {
        trackId: { type: 'string', description: 'Target motion-code track ID' },
        startTimeSec: { type: 'number', description: 'Timeline start time in seconds' },
        durationSec: { type: 'number', description: 'Duration in seconds' },
        templateId: {
          type: 'string',
          description: 'Built-in motion template or custom-agent-code',
          enum: [
            'news-article-highlighter',
            'kinetic-typography-burst',
            'animated-bar-chart',
            'animated-line-chart',
            'map-flyover-3d',
            'callout-pointer-box',
            'social-proof-tweet-card',
            'chapter-title-cinematic',
            'custom-agent-code',
          ],
        },
        sourceCode: { type: 'string', description: 'TypeScript/React component code receiving { frame, fps, width, height, props }' },
        propsJson: { type: 'string', description: 'JSON string of configurable props exposed in the Inspector UI' },
      },
      required: ['trackId', 'startTimeSec', 'durationSec', 'templateId', 'sourceCode'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 4. GPU SHADERS, TRANSITIONS & DAVINCI COLOR GRADING TOOLS
  // ============================================================================
  {
    name: 'vfx.apply_shader_and_transition',
    domain: 'shaders-color',
    primaryRole: 'vfx-motion',
    description: 'Apply real-time GPU shaders (WGSL/GLSL/Shadertoy/CapCut presets like 3D Zoom, Camera Shake, Glow, VHS, Halftone) and gl-transitions with automatic linked Whoosh/Hit SFX.',
    inputSchema: {
      type: 'object',
      properties: {
        clipId: { type: 'string', description: 'Target clip ID' },
        shaderId: { type: 'string', description: 'Shader identifier from packages/shader-library' },
        transitionInId: { type: 'string', description: 'Optional gl-transition ID for clip entry' },
        transitionDurationSec: { type: 'number', description: 'Transition duration in seconds (default 0.4s)' },
        autoAttachWhooshSfx: { type: 'boolean', description: 'Automatically place synced Whoosh/Riser SFX on Audio SFX track' },
      },
      required: ['clipId'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'color.auto_match_and_grade',
    domain: 'shaders-color',
    primaryRole: 'vfx-motion',
    description: 'Normalize color temperature, exposure, Lift/Gamma/Gain across disparate B-Roll clips to match the hero A-Roll shot and apply a cinematic 3D LUT (.cube).',
    inputSchema: {
      type: 'object',
      properties: {
        referenceClipId: { type: 'string', description: 'Hero clip ID to match color characteristics against' },
        targetTrackIds: { type: 'string', description: 'Comma-separated track IDs to color-match' },
        cinematicLutName: { type: 'string', description: '3D LUT preset (e.g. Kodak-2383-TealOrange, Clean-Doc-Rec709, Moody-Cyberpunk)' },
        lutIntensity: { type: 'number', description: 'LUT blend intensity [0.0 .. 1.0]' },
      },
      required: ['targetTrackIds', 'cinematicLutName'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 5. AI COMPUTER VISION VFX TOOLS (SAM 2.1, DEPTH-ANYTHING 3D, AUTO-REFRAME)
  // ============================================================================
  {
    name: 'aivfx.rotoscope_text_behind_subject',
    domain: 'ai-vfx',
    primaryRole: 'vfx-motion',
    description: 'Run SAM 2.1 + MatAnyone on an A-Roll/B-Roll clip to isolate the foreground human/subject with hair-level alpha matting and place large cinematic title text or motion graphics behind their back.',
    inputSchema: {
      type: 'object',
      properties: {
        clipId: { type: 'string', description: 'Target video clip ID containing the subject' },
        headlineTextBehindSubject: { type: 'string', description: 'Large text to render behind the isolated foreground subject' },
        fontStyle: { type: 'string', description: 'Typography preset (e.g. Impact-Bold-White, Neon-Outline, Luxury-Serif)' },
      },
      required: ['clipId', 'headlineTextBehindSubject'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'aivfx.convert_image_to_3d_parallax',
    domain: 'ai-vfx',
    primaryRole: 'vfx-motion',
    description: 'Run Video-Depth-Anything on a static 2D image clip to generate a dense Z-depth map and animate a 3D virtual camera (dolly + orbit + shallow depth-of-field bokeh) so static web photos look like cinematic footage.',
    inputSchema: {
      type: 'object',
      properties: {
        clipId: { type: 'string', description: 'Target image clip ID on timeline' },
        cameraMovePreset: {
          type: 'string',
          description: '3D camera trajectory preset',
          enum: ['slow-push-in-dof', 'dramatic-pull-back', 'orbital-parallax-left', 'orbital-parallax-right', 'vertigo-dolly-zoom'],
        },
        bokehStrength: { type: 'number', description: 'Depth-of-field blur strength [0.0 .. 1.0]' },
      },
      required: ['clipId', 'cameraMovePreset'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 6. AUDIO STUDIO, WHISPERX CAPTIONS & BEAT-SYNC TOOLS
  // ============================================================================
  {
    name: 'audio.transcribe_and_build_dynamic_captions',
    domain: 'audio-captions',
    primaryRole: 'sound-designer',
    description: 'Run WhisperX word-level forced alignment on spoken audio, remove silence/filler words via Auto-Editor, and generate a CapCut/Hormozi-style dynamic word-by-word animated caption track with keyword coloring & auto-emojis.',
    inputSchema: {
      type: 'object',
      properties: {
        voiceTrackId: { type: 'string', description: 'Source dialogue/voiceover track ID' },
        stylePresetId: {
          type: 'string',
          description: 'Caption animation preset',
          enum: ['hormozi-punch', 'ali-abdaal-minimal', 'capcut-neon-glow', 'cinematic-serif-sub', 'karaoke-word-fill', 'glassmorphism-pill'],
        },
        removeSilencesLongerThanSec: { type: 'number', description: 'Automatically ripple-cut dead air longer than threshold (e.g. 0.45s)' },
        avoidFaceOverlapWithVfx: { type: 'boolean', description: 'Automatically shift caption Y-position or place behind subject when face is low' },
      },
      required: ['voiceTrackId', 'stylePresetId'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'audio.master_mix_beat_sync_and_sfx',
    domain: 'audio-captions',
    primaryRole: 'sound-designer',
    description: 'Clean dialogue with Demucs v4 + DeepFilterNet3, detect music beats with Librosa to snap visual cuts to downbeats, generate contextual Foley/SFX via MMAudio/Freesound, apply Auto-Ducking (-14dB under voice), and normalize master output to -14.0 LUFS.',
    inputSchema: {
      type: 'object',
      properties: {
        musicAssetId: { type: 'string', description: 'Background music MediaAsset ID' },
        snapVisualCutsToBeats: { type: 'boolean', description: 'Align nearby B-roll cuts to detected musical downbeats' },
        autoGenerateFoleySfx: { type: 'boolean', description: 'Add contextual Whoosh, Pop, Typing, Riser, Impact SFX on visual transitions and text reveals' },
        targetLufs: { type: 'number', description: 'Integrated loudness target (default -14.0 for YouTube)' },
      },
      required: ['snapVisualCutsToBeats', 'autoGenerateFoleySfx'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 7. MULTIMODAL VLM CRITIC & SELF-CORRECTION LOOP TOOLS
  // ============================================================================
  {
    name: 'critic.inspect_rendered_preview',
    domain: 'critic-qa',
    primaryRole: 'vlm-critic',
    description: 'Render a fast proxy preview of a timeline range and run Multimodal VLM inspection (video frames + audio spectrogram + transcript) to score pacing, visual variety, caption placement, and audio balance. Returns structured CriticReviewReport for automatic self-correction.',
    inputSchema: {
      type: 'object',
      properties: {
        startTimeSec: { type: 'number', description: 'Start of inspection range in seconds' },
        endTimeSec: { type: 'number', description: 'End of inspection range in seconds' },
        qualityThreshold: { type: 'number', description: 'Minimum passing score out of 10 (default 9.0)' },
      },
      required: ['startTimeSec', 'endTimeSec'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 8. YOUTUBE STUDIO AUTO-PUBLISHER TOOLS
  // ============================================================================
  {
    name: 'youtube.generate_package_and_publish',
    domain: 'youtube-publish',
    primaryRole: 'youtube-publisher',
    description: 'Extract the highest-emotion hero frame, isolate subject via SAM 2.1, compose 3 high-CTR Thumbnail variants, generate SEO Title/Description/Tags & Auto-Chapters from the timeline, render final 4K NVENC master, and upload to YouTube via Data API v3.',
    inputSchema: {
      type: 'object',
      properties: {
        privacyStatus: { type: 'string', description: 'YouTube visibility', enum: ['private', 'unlisted', 'public', 'scheduled'] },
        scheduledPublishIso: { type: 'string', description: 'Optional ISO-8601 timestamp if scheduled' },
        renderCodec: { type: 'string', description: 'Hardware encoder', enum: ['h264_nvenc', 'hevc_nvenc', 'av1_nvenc', 'libx264'] },
      },
      required: ['privacyStatus', 'renderCodec'],
    },
    emitsGhostCursor: true,
  },

  // ============================================================================
  // 9. DETERMINISTIC STAGE, STICKMAN PUPPET & CAMERA CHOREOGRAPHY TOOLS (LOW-TOKEN / ZERO-AI)
  // ============================================================================
  {
    name: 'stage.compile_deterministic_draft',
    domain: 'stage-puppeteer',
    primaryRole: 'director',
    description: 'Zero-Token Instant Draft Compiler: Takes raw script text and a Genre Kit (economics-stickman, universe-cosmic, lore-chronicle) and deterministically populates the Stage Track with Stickman Move Sets, 2.5D Camera Rigs, Genre Widgets, and Transitions in <5ms.',
    inputSchema: {
      type: 'object',
      properties: {
        scriptText: { type: 'string', description: 'Full or partial script text to compile into stage scenes' },
        genreKit: {
          type: 'string',
          description: 'Genre Kit preset',
          enum: ['economics-stickman', 'universe-cosmic', 'lore-chronicle'],
        },
        replaceExistingStageTrack: { type: 'boolean', description: 'Replace existing stage clips on track S1' },
      },
      required: ['scriptText', 'genreKit'],
    },
    emitsGhostCursor: true,
  },
  {
    name: 'stage.compose_choreographed_scene',
    domain: 'stage-puppeteer',
    primaryRole: 'vfx-motion',
    description: 'Compose or update a single ChoreographedStageScene using pre-built Stickman/Character Rigs, Move Sets (panic-head-grab, money-printer-crank, float-zero-gravity, lore-sword-raise), Camera Rigs (dolly-push-cosmic, crash-zoom-actor-face, isometric-tactical-tilt), and Genre Widgets.',
    inputSchema: {
      type: 'object',
      properties: {
        trackId: { type: 'string', description: 'Target stage-puppet track ID (default track-stage-1)' },
        startTimeSec: { type: 'number', description: 'Start time in seconds' },
        durationSec: { type: 'number', description: 'Duration in seconds' },
        genreKit: { type: 'string', description: 'Genre Kit ID', enum: ['economics-stickman', 'universe-cosmic', 'lore-chronicle'] },
        backdrop: { type: 'string', description: 'Pre-built StageBackdropId' },
        cameraRig: { type: 'string', description: 'Pre-built CameraRigPresetId' },
        actorArchetype: { type: 'string', description: 'Character rig archetype (e.g. stickman-economist, astronaut-explorer, lore-chronicler-hooded)' },
        actorMoveSet: { type: 'string', description: 'Pre-built MoveSetId (e.g. point-at-chart-high, panic-head-grab, money-printer-crank)' },
        widgetKind: { type: 'string', description: 'Optional BuiltInStageWidgetKind (e.g. econ.supply-demand-curve, cosmic.scale-comparison-spheres, lore.animated-map-march-line)' },
        widgetTitle: { type: 'string', description: 'Label/title displayed on the built-in widget' },
      },
      required: ['startTimeSec', 'durationSec', 'genreKit', 'cameraRig', 'actorArchetype', 'actorMoveSet'],
    },
    emitsGhostCursor: true,
  },
];

export * from './ai-playbooks';


