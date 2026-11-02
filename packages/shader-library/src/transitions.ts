/**
 * @file transitions.ts
 * @description Master GPU Transitions Library (100+ gl-transitions + CapCut Pro whip-pans & 3D zooms).
 * Formatted for WebGPU / wgpu / PixiJS v8 shader pipelines with integer-time interpolation.
 */

export * from './gl-transitions-catalog';

export interface GPUTransitionDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: 'whip-pan' | 'zoom-warp' | 'glitch-split' | 'luma-matte' | '3d-cube' | 'retro-dissolve';
  readonly defaultDurationSec: number;
  readonly author: string;
  readonly defaultLinkedSfxId?: string;
  readonly glslCode: string;
  readonly wgslCode?: string;
}

export const GPU_TRANSITIONS_LIBRARY: readonly GPUTransitionDefinition[] = [
  // 1. CapCut Pro Whip Pan with Motion Blur
  {
    id: 'capcut.whip-pan-blur',
    name: 'Whip Pan Motion Blur (CapCut Pro)',
    category: 'whip-pan',
    defaultDurationSec: 0.35,
    author: 'AutonomousStudio',
    defaultLinkedSfxId: 'sfx.whoosh-heavy-01',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float x = progress;
        float ease = x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
        vec2 dir = vec2(1.0, 0.0);
        vec4 c1 = vec4(0.0);
        vec4 c2 = vec4(0.0);
        float blurSamples = 16.0;
        float blurStrength = sin(progress * 3.14159) * 0.08;
        
        for (float i = 0.0; i < blurSamples; i++) {
          float offset = (i / blurSamples - 0.5) * blurStrength;
          c1 += getFromColor(uv + dir * (ease + offset));
          c2 += getToColor(uv + dir * (ease - 1.0 + offset));
        }
        c1 /= blurSamples;
        c2 /= blurSamples;
        return mix(c1, c2, step(0.5, progress));
      }
    `,
  },

  // 2. Cross Zoom Lens Warp
  {
    id: 'gl.cross-zoom',
    name: 'Cross Zoom In-Out',
    category: 'zoom-warp',
    defaultDurationSec: 0.4,
    author: 'gl-transitions',
    defaultLinkedSfxId: 'sfx.whoosh-soft',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float strength = 0.4;
        vec2 center = vec2(0.5, 0.5);
        if (progress < 0.5) {
          float zoom = 1.0 + progress * 2.0 * strength;
          return getFromColor((uv - center) / zoom + center);
        } else {
          float zoom = 1.0 + (1.0 - progress) * 2.0 * strength;
          return getToColor((uv - center) / zoom + center);
        }
      }
    `,
  },

  // 3. Directional Linear Wipe
  {
    id: 'gl.directionalwipe',
    name: 'Directional Angled Wipe',
    category: 'luma-matte',
    defaultDurationSec: 0.45,
    author: 'gl-transitions',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        vec2 direction = vec2(1.0, -0.5);
        float smoothness = 0.1;
        vec2 v = normalize(direction);
        v /= (abs(v.x) + abs(v.y));
        float d = v.x * (uv.x - 0.5) + v.y * (uv.y - 0.5);
        float m = smoothstep(-0.5 - smoothness, -0.5 + smoothness, d - (progress * (1.0 + smoothness * 2.0) - smoothness));
        return mix(getFromColor(uv), getToColor(uv), m);
      }
    `,
  },

  // 4. Luma Fade / Film Burn Dissolve
  {
    id: 'gl.luma-fade',
    name: 'Luma Film Burn Matte',
    category: 'luma-matte',
    defaultDurationSec: 0.5,
    author: 'gl-transitions',
    defaultLinkedSfxId: 'sfx.film-burn-flash',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        vec4 f = getFromColor(uv);
        vec4 t = getToColor(uv);
        float luma = dot(f.rgb, vec3(0.299, 0.587, 0.114));
        float threshold = progress * 1.2 - 0.1;
        float mask = smoothstep(threshold - 0.1, threshold + 0.1, luma);
        return mix(t, f, mask);
      }
    `,
  },

  // 5. RGB Split Glitch Displace
  {
    id: 'gl.glitch-displace',
    name: 'RGB Chromatic Glitch Displace',
    category: 'glitch-split',
    defaultDurationSec: 0.3,
    author: 'gl-transitions',
    defaultLinkedSfxId: 'sfx.glitch-hit-01',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float strength = sin(progress * 3.14159) * 0.05;
        vec2 offsetR = vec2(strength, 0.0);
        vec2 offsetB = vec2(-strength, 0.0);
        vec4 colFrom = vec4(
          getFromColor(uv + offsetR).r,
          getFromColor(uv).g,
          getFromColor(uv + offsetB).b,
          1.0
        );
        vec4 colTo = vec4(
          getToColor(uv + offsetR).r,
          getToColor(uv).g,
          getToColor(uv + offsetB).b,
          1.0
        );
        return mix(colFrom, colTo, progress);
      }
    `,
  },

  // 6. 3D Swirl Vortex
  {
    id: 'gl.swirl',
    name: '3D Swirl Spiral',
    category: 'zoom-warp',
    defaultDurationSec: 0.5,
    author: 'gl-transitions',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float radius = 1.0;
        float angle = progress * 10.0;
        vec2 center = vec2(0.5);
        vec2 d = uv - center;
        float dist = length(d);
        if (dist < radius) {
          float percent = (radius - dist) / radius;
          float theta = percent * percent * angle;
          float s = sin(theta);
          float c = cos(theta);
          uv = vec2(dot(d, vec2(c, -s)), dot(d, vec2(s, c))) + center;
        }
        return mix(getFromColor(uv), getToColor(uv), progress);
      }
    `,
  },

  // 7. 3D Cube Rotation
  {
    id: 'gl.cube-rotate',
    name: '3D Cube Spatial Rotate',
    category: '3d-cube',
    defaultDurationSec: 0.6,
    author: 'gl-transitions',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float persp = 0.7;
        float uz = unzoom * 2.0 * (0.5 - abs(0.5 - progress));
        vec2 p = -persp * 2.0 * (1.0 - progress) * vec2(uv.x - 0.5, uv.y - 0.5);
        if (progress < 0.5) {
          return getFromColor(mix(uv, p, progress * 2.0));
        } else {
          return getToColor(mix(p, uv, (progress - 0.5) * 2.0));
        }
      }
    `,
  },

  // 8. 8-Bit Pixel Dissolve
  {
    id: 'gl.pixelize',
    name: '8-Bit Retro Pixel Dissolve',
    category: 'retro-dissolve',
    defaultDurationSec: 0.4,
    author: 'gl-transitions',
    glslCode: `
      vec4 transition(vec2 uv, float progress) {
        float dist = abs(progress - 0.5) * 2.0;
        float squaresMin = 20.0;
        float steps = 50.0;
        float d = min(progress, 1.0 - progress);
        float distSquare = steps > 0.0 ? ceil(d * float(steps)) / float(steps) : d;
        float squareSize = 2.0 * distSquare / vec2(1920.0, 1080.0).x;
        vec2 p = squareSize > 0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;
        return mix(getFromColor(p), getToColor(p), progress);
      }
    `,
  },
];

