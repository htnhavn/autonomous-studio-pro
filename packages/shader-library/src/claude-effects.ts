/**
 * @file claude-effects.ts
 * @description The "20 Claude Video Effects" catalog reverse-engineered from
 * reference video V1 (`snaptik.vn_7698412619572481281.mp4`).
 *
 * These are shot-level effects, not transitions: each one is triggered inside a
 * scene (usually on a spoken keyword) and peaks within 120 ms / 4 frames with a
 * spring overshoot easing. Editorial entries (speed ramp, lower third, B-roll)
 * map to TimelineCommands instead of a shader.
 */

export type ClaudeEffectKind = 'shader' | 'overlay' | 'editorial' | 'camera';

export type ClaudeEffectCategory =
  | 'zoom'
  | 'text'
  | 'light'
  | 'glitch'
  | 'grade'
  | 'layout'
  | 'audio';

export interface ClaudeEffectDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameVi: string;
  readonly kind: ClaudeEffectKind;
  readonly category: ClaudeEffectCategory;
  /** Time to reach full intensity after the trigger. Reference: 120ms (4f@30). */
  readonly triggerWindowMs: number;
  /** CSS-style easing curve used by the reference implementation. */
  readonly easing: string;
  readonly defaultDurationSec: number;
  /** [0..1] — how hard the effect hits by default. */
  readonly defaultIntensity: number;
  readonly descriptionVi: string;
  readonly defaultParams: Readonly<Record<string, number | string>>;
  /** Optional TimelineCommand type when the effect is editorial. */
  readonly timelineCommandType?: string;
  readonly glslSource?: string;
}

const SPRING = 'cubic-bezier(0.18, 0.89, 0.32, 1.28)';

export const CLAUDE_EFFECTS_CATALOG: readonly ClaudeEffectDefinition[] = [
  {
    id: 'claude.split-zoom',
    name: 'Split Zoom',
    nameVi: 'Chia đôi màn hình & zoom nửa khung',
    kind: 'camera',
    category: 'zoom',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 1.2,
    defaultIntensity: 0.8,
    descriptionVi: 'Chia đôi khung hình, phóng 1.25x vào một nửa để so sánh hai ý.',
    defaultParams: { splitRatio: 0.5, zoom: 1.25, axis: 'x' },
  },
  {
    id: 'claude.glow-edge-rim-light',
    name: 'Glow Edge (Rim Light)',
    nameVi: 'Viền hào quang quanh chủ thể',
    kind: 'shader',
    category: 'light',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 2.0,
    defaultIntensity: 0.7,
    descriptionVi: 'Shader viền sáng vàng #FFD54F tách chủ thể khỏi nền tối.',
    defaultParams: { colorHex: '#FFD54F', blurPx: 6, threshold: 0.55 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float edge = 1.0 - smoothstep(0.0, 0.06, abs(uv.x - 0.5) * 2.0 - 0.92);
        return vec4(1.0, 0.84, 0.31, edge * intensity);
      }
    `,
  },
  {
    id: 'claude.glitch-scanline',
    name: 'Glitch Scanline',
    nameVi: 'Quét scanline CRT + jitter',
    kind: 'shader',
    category: 'glitch',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 0.8,
    defaultIntensity: 0.6,
    descriptionVi: '240 vạch quét ngang analog CRT kèm rung ngang 0.2px.',
    defaultParams: { lineCount: 240, jitter: 0.2, speed: 3.0 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float scan = sin(uv.y * 240.0 * 3.14159) * 0.5 + 0.5;
        float shift = sin(uv.y * 80.0) * 0.002 * intensity;
        return vec4(shift, scan, 0.0, intensity * 0.35);
      }
    `,
  },
  {
    id: 'claude.snap-zoom',
    name: 'Snap Zoom',
    nameVi: 'Phóng đột ngột vào mắt (1.38x)',
    kind: 'camera',
    category: 'zoom',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 0.45,
    defaultIntensity: 1.0,
    descriptionVi: 'Phóng 1.0x → 1.38x hướng tâm vào mắt trong 120ms.',
    defaultParams: { fromZoom: 1.0, toZoom: 1.38, centerX: 0.5, centerY: 0.42 },
  },
  {
    id: 'claude.kinetic-type-pop',
    name: 'Kinetic Type Pop',
    nameVi: 'Chữ nảy theo âm tiết',
    kind: 'overlay',
    category: 'text',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 0.6,
    defaultIntensity: 0.9,
    descriptionVi: 'Phụ đề/từ khóa nảy đàn hồi (overshoot 1.25) theo từng âm tiết.',
    defaultParams: { overshoot: 1.25, staggerMs: 40, scaleFrom: 0.6 },
  },
  {
    id: 'claude.headline-storm',
    name: 'Headline Storm',
    nameVi: 'Bão tiêu đề Breaking News',
    kind: 'overlay',
    category: 'text',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 1.6,
    defaultIntensity: 0.8,
    descriptionVi: '10 dải tin giật gân bay từ hai mép, nghiêng -15° đến +18°.',
    defaultParams: { count: 10, minAngleDeg: -15, maxAngleDeg: 18, speedPxPerSec: 900 },
  },
  {
    id: 'claude.light-sweep',
    name: 'Light Sweep',
    nameVi: 'Vệt sáng quét chéo 45°',
    kind: 'shader',
    category: 'light',
    triggerWindowMs: 120,
    easing: 'ease-out',
    defaultDurationSec: 1.0,
    defaultIntensity: 0.55,
    descriptionVi: 'Vệt sáng trắng 45° quét qua bề mặt text kim loại.',
    defaultParams: { angleDeg: 45, width: 0.18, speed: 1.4 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float band = smoothstep(0.0, 0.12, abs(fract(uv.x * 0.7 + uv.y * 0.7) - 0.5));
        return vec4(1.0, 1.0, 1.0, (1.0 - band) * intensity * 0.45);
      }
    `,
  },
  {
    id: 'claude.vignette-focus',
    name: 'Vignette Focus',
    nameVi: 'Bo tối 4 góc dồn chú ý',
    kind: 'shader',
    category: 'grade',
    triggerWindowMs: 120,
    easing: 'ease-in-out',
    defaultDurationSec: 2.0,
    defaultIntensity: 0.7,
    descriptionVi: 'Tối 70% bốn góc, giữ tâm sáng để dồn sự chú ý.',
    defaultParams: { darkness: 0.7, radius: 0.72, feather: 0.35 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float d = distance(uv, vec2(0.5));
        float v = smoothstep(0.35, 0.78, d) * intensity;
        return vec4(0.0, 0.0, 0.0, v);
      }
    `,
  },
  {
    id: 'claude.studio-reveal',
    name: 'Studio Reveal',
    nameVi: 'Bật softbox & biển ON AIR',
    kind: 'overlay',
    category: 'light',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 1.8,
    defaultIntensity: 0.9,
    descriptionVi: 'Hai softbox trồi lên, nền tối lại, biển neon ON AIR nhấp nháy.',
    defaultParams: { softboxCount: 2, neonColorHex: '#EF4444', flickerHz: 2.0 },
  },
  {
    id: 'claude.broll-overlay',
    name: 'B-Roll Overlay',
    nameVi: 'Phủ B-Roll lên track V2',
    kind: 'editorial',
    category: 'layout',
    triggerWindowMs: 120,
    easing: 'ease-out',
    defaultDurationSec: 3.0,
    defaultIntensity: 1.0,
    descriptionVi: 'Chèn clip minh họa lên track V2, bo góc, hạ âm lượng gốc.',
    defaultParams: { cornerRadiusPx: 24, opacity: 1.0, duckOriginalDb: -6 },
    timelineCommandType: 'CLIP_INSERT',
  },
  {
    id: 'claude.lower-third-card',
    name: 'Lower Third Card',
    nameVi: 'Thẻ thông tin góc dưới',
    kind: 'overlay',
    category: 'text',
    triggerWindowMs: 120,
    easing: 'ease-out',
    defaultDurationSec: 2.4,
    defaultIntensity: 0.85,
    descriptionVi: 'Thẻ tên/chức danh trượt ra góc dưới trái với thanh viền xanh.',
    defaultParams: { accentHex: '#38BDF8', slideFromPx: 80, holdSec: 2.0 },
  },
  {
    id: 'claude.flash-transition',
    name: 'Flash Transition',
    nameVi: 'Chớp trắng 2 frame',
    kind: 'shader',
    category: 'light',
    triggerWindowMs: 120,
    easing: 'ease-out',
    defaultDurationSec: 0.2,
    defaultIntensity: 1.0,
    descriptionVi: 'Chớp trắng 100% trong 60ms rồi suy giảm theo hàm mũ.',
    defaultParams: { peakWhite: 1.0, decayMs: 60 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        return vec4(1.0, 1.0, 1.0, intensity);
      }
    `,
  },
  {
    id: 'claude.color-isolation',
    name: 'Color Isolation',
    nameVi: 'Giữ một kênh màu, nền đen trắng',
    kind: 'shader',
    category: 'grade',
    triggerWindowMs: 120,
    easing: 'ease-in-out',
    defaultDurationSec: 2.5,
    defaultIntensity: 0.9,
    descriptionVi: 'Nền Rec.709 desaturate, chỉ giữ kênh đỏ của chủ thể.',
    defaultParams: { keepHueDeg: 0, hueToleranceDeg: 28, desaturate: 0.92 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float luma = dot(texture2D(u_texture, uv).rgb, vec3(0.299, 0.587, 0.114));
        return vec4(luma, luma, luma, intensity);
      }
    `,
  },
  {
    id: 'claude.liquid-glass',
    name: 'Liquid Glass',
    nameVi: 'Kính lỏng khúc xạ gợn sóng',
    kind: 'shader',
    category: 'glitch',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 1.4,
    defaultIntensity: 0.7,
    descriptionVi: 'Sóng sin khúc xạ quét ngang kèm quang sai RGB nhẹ.',
    defaultParams: { waveFreq: 20.0, waveSpeed: 5.0, refraction: 0.035, chroma: 0.004 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        vec2 offset = vec2(sin(uv.y * 20.0 + u_time * 5.0) * 0.03 * intensity, 0.0);
        vec4 c = texture2D(u_texture, uv + offset);
        return vec4(c.r, c.g, c.b, 1.0);
      }
    `,
  },
  {
    id: 'claude.film-grain-35mm',
    name: 'Film Grain 35mm',
    nameVi: 'Hạt phim 35mm',
    kind: 'shader',
    category: 'grade',
    triggerWindowMs: 120,
    easing: 'linear',
    defaultDurationSec: 3.0,
    defaultIntensity: 0.35,
    descriptionVi: 'Lớp hạt phim analog chuyển động ngẫu nhiên 30fps.',
    defaultParams: { grainSize: 1.2, seedPerFrame: 1 },
    glslSource: `
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec4 effect(vec2 uv, float intensity) {
        float n = hash(uv * 1000.0 + u_time) - 0.5;
        return vec4(vec3(n), intensity * 0.25);
      }
    `,
  },
  {
    id: 'claude.halation-glow',
    name: 'Halation Glow',
    nameVi: 'Quầng đỏ vùng cháy sáng',
    kind: 'shader',
    category: 'light',
    triggerWindowMs: 120,
    easing: 'ease-in-out',
    defaultDurationSec: 2.5,
    defaultIntensity: 0.5,
    descriptionVi: 'Quầng đỏ cam quanh vùng sáng > 0.82, phong cách DaVinci.',
    defaultParams: { threshold: 0.82, radiusPx: 18, tintHex: '#FF6B35' },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        vec3 c = texture2D(u_texture, uv).rgb;
        float hot = smoothstep(0.82, 1.0, max(c.r, max(c.g, c.b)));
        return vec4(1.0, 0.42, 0.21, hot * intensity * 0.5);
      }
    `,
  },
  {
    id: 'claude.rgb-split-chromatic',
    name: 'RGB Split Chromatic',
    nameVi: 'Tách kênh RGB 8px',
    kind: 'shader',
    category: 'glitch',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 0.9,
    defaultIntensity: 0.6,
    descriptionVi: 'Tách 3 kênh R-G-B cách nhau 8px theo góc 45°.',
    defaultParams: { offsetPx: 8, angleDeg: 45 },
    glslSource: `
      vec4 effect(vec2 uv, float intensity) {
        float d = 0.006 * intensity;
        return vec4(
          texture2D(u_texture, uv + vec2(d, d)).r,
          texture2D(u_texture, uv).g,
          texture2D(u_texture, uv - vec2(d, d)).b,
          1.0
        );
      }
    `,
  },
  {
    id: 'claude.sound-waveform-bar',
    name: 'Sound Waveform Bar',
    nameVi: '24 cột sóng âm thanh',
    kind: 'overlay',
    category: 'audio',
    triggerWindowMs: 120,
    easing: 'linear',
    defaultDurationSec: 2.0,
    defaultIntensity: 0.8,
    descriptionVi: '24 cột sóng nhảy theo biên độ giọng đọc.',
    defaultParams: { barCount: 24, barWidthPx: 6, colorHex: '#22D3EE', smoothing: 0.6 },
  },
  {
    id: 'claude.speed-ramp-motion',
    name: 'Speed Ramp Motion',
    nameVi: 'Tua nhanh 3.5x rồi phanh 0.3x',
    kind: 'editorial',
    category: 'zoom',
    triggerWindowMs: 120,
    easing: 'ease-in-out',
    defaultDurationSec: 2.0,
    defaultIntensity: 0.9,
    descriptionVi: 'Tua nhanh 3.5x rồi phanh gấp về 0.3x ở điểm mấu chốt.',
    defaultParams: { fastRate: 3.5, slowRate: 0.3, pivotProgress: 0.62 },
    timelineCommandType: 'CLIP_SET_SPEED',
  },
  {
    id: 'claude.outro-punch-badge',
    name: 'Outro Punch Badge',
    nameVi: 'Huy hiệu đập xuống + bụi rung',
    kind: 'overlay',
    category: 'text',
    triggerWindowMs: 120,
    easing: SPRING,
    defaultDurationSec: 0.8,
    defaultIntensity: 1.0,
    descriptionVi: 'Huy hiệu đập sầm từ trên cao, bụi và rung màn hình.',
    defaultParams: { dropFromPx: 220, dustParticles: 18, shakePx: 10 },
  },
];

export function getClaudeEffect(effectId: string): ClaudeEffectDefinition | undefined {
  return CLAUDE_EFFECTS_CATALOG.find((e) => e.id === effectId);
}

/** Effects an AI director can safely pick for a given genre without reading the whole catalog. */
export function listEffectIdsByCategory(category: ClaudeEffectCategory): readonly string[] {
  return CLAUDE_EFFECTS_CATALOG.filter((e) => e.category === category).map((e) => e.id);
}
