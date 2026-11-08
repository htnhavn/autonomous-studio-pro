/**
 * @file reference-profiles.ts
 * @description Measured telemetry for the eight reference videos that the
 * `vox-documentary` and `pixel-retro-arcade` genre kits are derived from.
 *
 * Every number here comes from the reverse-engineering dossier
 * (`MASTER_VIDEO_REVERSE_ENGINEERING_DOSSIER.md`), not from guesswork:
 * ffprobe stream data, EBU R128 loudness, scene-cut detection and Whisper
 * transcripts. The compiler uses these profiles to pick a shot cadence that
 * matches the reference style instead of a single hard-coded words/sec rate.
 *
 * IMPORTANT distinction (the dossier blurs it): `averageShotSec` is the length
 * of a *cut*, not the length of a spoken sentence. Sentence duration still
 * follows speech rate; shot cadence only drives camera/transition decisions.
 */

export type ReferenceVideoId =
  | 'v1-claude-vfx'
  | 'v2-rig-cartoon'
  | 'v3-vox-saigon-flood'
  | 'v4-vox-opencode'
  | 'v5-pixel-medical'
  | 'v6-whatif-voxel'
  | 'v7-mograph-retention'
  | 'v8-huashu-art-motion';

export type ReferencePacingClass = 'fast' | 'moderate' | 'long-take';

export interface ReferenceVideoProfile {
  readonly id: ReferenceVideoId;
  readonly sourceFile: string;
  readonly labelVi: string;
  readonly genreHint:
    | 'economics-stickman'
    | 'universe-cosmic'
    | 'lore-chronicle'
    | 'vox-documentary'
    | 'pixel-retro-arcade';
  readonly durationSec: number;
  readonly aspectRatio: '16:9' | '9:16' | '1:1';
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fps: number;
  /** Integrated loudness measured with EBU R128 (ffmpeg loudnorm print). */
  readonly integratedLufs: number;
  readonly loudnessRangeLu: number;
  readonly shotCount: number;
  /** durationSec / shotCount — average cut length, NOT sentence length. */
  readonly averageShotSec: number;
  readonly pacingClass: ReferencePacingClass;
  readonly techStack: readonly string[];
  readonly signatureTechniques: readonly string[];
}

export const REFERENCE_VIDEO_PROFILES: readonly ReferenceVideoProfile[] = [
  {
    id: 'v1-claude-vfx',
    sourceFile: 'snaptik.vn_7698412619572481281.mp4',
    labelVi: '20 hiệu ứng Claude trên talking-head dọc',
    genreHint: 'economics-stickman',
    durationSec: 59.5,
    aspectRatio: '9:16',
    widthPx: 576,
    heightPx: 1024,
    fps: 30,
    integratedLufs: -14.6,
    loudnessRangeLu: 5.3,
    shotCount: 13,
    averageShotSec: 4.25,
    pacingClass: 'moderate',
    techStack: ['React', 'HTML5 Canvas', 'Web Animations', 'WebGL', 'Remotion'],
    signatureTechniques: [
      'keyword-triggered VFX within 120ms (4 frames)',
      'cubic-bezier(0.18, 0.89, 0.32, 1.28) overshoot easing',
      '20 shot-level effects (snap zoom, headline storm, liquid glass, halation...)',
    ],
  },
  {
    id: 'v2-rig-cartoon',
    sourceFile: 'snaptik.vn_7703073488432647430.mp4',
    labelVi: 'Cartoon người que $0 bằng RIG.TSX',
    genreHint: 'economics-stickman',
    durationSec: 849.4,
    aspectRatio: '16:9',
    widthPx: 1024,
    heightPx: 576,
    fps: 30,
    integratedLufs: -14.1,
    loudnessRangeLu: 1.7,
    shotCount: 79,
    averageShotSec: 10.62,
    pacingClass: 'moderate',
    techStack: ['OpenCode', 'GLM-5.3-Flash', 'RIG.TSX', 'Canvas 2D', 'ElevenLabs'],
    signatureTechniques: [
      'one vector skeleton + swappable costume palette (no AI image morphing)',
      'rim light edge glow to separate character from dark backdrop',
      'storyboard linter fixes framing/occlusion before render',
    ],
  },
  {
    id: 'v3-vox-saigon-flood',
    sourceFile: 'snaptik.vn_7703856930074266900.mp4',
    labelVi: 'Phóng sự dữ liệu Vox: cống ngăn triều Sài Gòn',
    genreHint: 'vox-documentary',
    durationSec: 302.6,
    aspectRatio: '16:9',
    widthPx: 1026,
    heightPx: 576,
    fps: 30,
    integratedLufs: -8.2,
    loudnessRangeLu: 1.4,
    shotCount: 96,
    averageShotSec: 3.12,
    pacingClass: 'fast',
    techStack: ['QGIS satellite imagery', '2D hydraulic schematics', 'After Effects', 'EBU R128 mastering'],
    signatureTechniques: [
      'desaturated satellite map with neon river vector trace',
      '2D/3D hydraulic cross-section with tide height marker',
      'telemetry rack screens + HUD timestamp counters',
      'aggressive -8.2 LUFS master (loudness-war style; normalize for delivery)',
    ],
  },
  {
    id: 'v4-vox-opencode',
    sourceFile: 'snaptik.vn_7704062566275845383.mp4',
    labelVi: 'Vox explainer tự động bằng OpenCode + GLM',
    genreHint: 'vox-documentary',
    durationSec: 590.0,
    aspectRatio: '16:9',
    widthPx: 1024,
    heightPx: 576,
    fps: 30,
    integratedLufs: -16.3,
    loudnessRangeLu: 2.8,
    shotCount: 80,
    averageShotSec: 7.28,
    pacingClass: 'moderate',
    techStack: ['OpenCode CLI', 'GLM-5.3-Flash', 'Markdown storyboards', 'Remotion'],
    signatureTechniques: [
      'split-screen editor + content card moving in sync',
      'terminal UI as a visual prop',
      'auto asset scrape + auto ducking -16dB',
    ],
  },
  {
    id: 'v5-pixel-medical',
    sourceFile: 'v10044g50000db3idevog65njnsditag.MP4',
    labelVi: 'Pixel-art 8-bit giải thích y học',
    genreHint: 'pixel-retro-arcade',
    durationSec: 58.5,
    aspectRatio: '9:16',
    widthPx: 576,
    heightPx: 1024,
    fps: 30,
    integratedLufs: -20.5,
    loudnessRangeLu: 8.6,
    shotCount: 2,
    averageShotSec: 19.49,
    pacingClass: 'long-take',
    techStack: ['Pixel Art Canvas', 'Chiptune', 'Retro HP bar', 'Windows 95 dialogs'],
    signatureTechniques: [
      'game HUD: HP/energy bar drains with the narration',
      'Windows 95 warning dialog as a punchline',
      'A/B research card with confidence bars',
      'long single-take gameplay shot with internal motion',
    ],
  },
  {
    id: 'v6-whatif-voxel',
    sourceFile: 'v12044gd0000dbh42kvog65qe75sqvig.MP4',
    labelVi: 'What-if 3D voxel + AI critic tự sửa frame',
    genreHint: 'vox-documentary',
    durationSec: 67.1,
    aspectRatio: '9:16',
    widthPx: 576,
    heightPx: 1024,
    fps: 30,
    integratedLufs: -14.6,
    loudnessRangeLu: 2.5,
    shotCount: 17,
    averageShotSec: 3.73,
    pacingClass: 'fast',
    techStack: ['Three.js', 'WebGL voxel world', 'Vision LLM critic', 'Edge-TTS'],
    signatureTechniques: [
      'premise check before scripting (avoid duplicate topics)',
      'fact sourcing per claim',
      'probe frame -> vision critic -> fix camera/occlusion -> re-render',
      'laptop render: ~3,312 frames in ~18 minutes',
    ],
  },
  {
    id: 'v7-mograph-retention',
    sourceFile: 'v26044gc0000db198b7og65i49tfv2g0.MP4',
    labelVi: 'Motion graphics 3D giữ chân người xem',
    genreHint: 'universe-cosmic',
    durationSec: 1135.8,
    aspectRatio: '16:9',
    widthPx: 1024,
    heightPx: 576,
    fps: 30,
    integratedLufs: -13.1,
    loudnessRangeLu: 2.5,
    shotCount: 56,
    averageShotSec: 19.93,
    pacingClass: 'long-take',
    techStack: ['Blender', 'Cinema 4D', 'After Effects Optical Flares'],
    signatureTechniques: [
      'continuous 3D camera drift — the frame is never static',
      'rim-lit floating artifacts (hourglass, orb, sword)',
      'abstract numbers given physical form in space',
    ],
  },
  {
    id: 'v8-huashu-art-motion',
    sourceFile: 'v292ffg50001db3hua7og65t2ql6ggug.MP4',
    labelVi: 'huashu-art-motion: hoạt hình bằng code thuần',
    genreHint: 'pixel-retro-arcade',
    durationSec: 48.7,
    aspectRatio: '9:16',
    widthPx: 576,
    heightPx: 1024,
    fps: 30,
    integratedLufs: -17.8,
    loudnessRangeLu: 7.5,
    shotCount: 1,
    averageShotSec: 48.7,
    pacingClass: 'long-take',
    techStack: ['JavaScript', 'Canvas 2D', 'procedural brushes', 'Mario-style game loop'],
    signatureTechniques: [
      'every brushstroke and jump computed by math (no AE)',
      'parabolic jump: y = y0 + v*t - 0.5*g*t^2',
      '36 art styles / 9 explainer grammars',
    ],
  },
];

export function getReferenceProfile(id: ReferenceVideoId): ReferenceVideoProfile {
  const found = REFERENCE_VIDEO_PROFILES.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Unknown reference video profile: ${id}`);
  }
  return found;
}

/**
 * Shot cadence recommendation for a genre kit. Used by the deterministic
 * compiler to decide how often to change camera/backdrop, not how long a
 * sentence lasts.
 */
export function recommendedShotCadenceSec(genreHint: ReferenceVideoProfile['genreHint']): number {
  const matching = REFERENCE_VIDEO_PROFILES.filter((p) => p.genreHint === genreHint);
  if (matching.length === 0) {
    return 4.25;
  }
  const total = matching.reduce((sum, p) => sum + p.averageShotSec, 0);
  return Number((total / matching.length).toFixed(2));
}

/**
 * Delivery loudness target. Reference masters range from -20.5 to -8.2 LUFS;
 * we deliberately do not copy the extremes (platforms normalize them back and
 * the dynamics collapse). These are safe, broadcast-ish targets.
 */
export const DELIVERY_LOUDNESS_LUFS: Readonly<Record<string, number>> = {
  'economics-stickman': -14.0,
  'universe-cosmic': -14.0,
  'lore-chronicle': -14.0,
  'vox-documentary': -12.5,
  'pixel-retro-arcade': -16.0,
};
