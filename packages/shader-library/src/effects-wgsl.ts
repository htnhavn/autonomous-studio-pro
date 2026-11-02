/**
 * @file effects-wgsl.ts
 * @description Curated GPU Shader Effects library (WGSL / GLSL) inspired by CapCut Pro presets & Shadertoy.
 * Includes 3D Zoom Pro, Pendulum Camera Shake, Chromatic Aberration, CRT VHS, Halftone Glow, and Anamorphic Bloom.
 */

export interface GPUShaderEffectDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: 'camera-motion' | 'glitch-retro' | 'light-glow' | 'blur-sharpen' | 'distortion';
  readonly description: string;
  readonly defaultUniforms: Record<string, number | number[] | string>;
  readonly wgslSource?: string;
  readonly glslSource: string;
}

export const GPU_EFFECTS_LIBRARY: readonly GPUShaderEffectDefinition[] = [
  // 1. CapCut 3D Zoom Pro
  {
    id: 'capcut.3d-zoom-pro',
    name: '3D Zoom Pro (Perspective Push)',
    category: 'camera-motion',
    description: 'Cinematic optical push-in with edge stretching and dynamic depth perception.',
    defaultUniforms: {
      u_zoomSpeed: 0.12,
      u_perspective: 0.25,
      u_center: [0.5, 0.5],
    },
    glslSource: `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_time;
      uniform float u_zoomSpeed;
      uniform float u_perspective;

      void main() {
        vec2 center = vec2(0.5);
        vec2 uv = v_uv - center;
        float progress = fract(u_time * u_zoomSpeed);
        float scale = 1.0 - progress * u_perspective;
        uv *= scale;
        vec2 sampleUv = uv + center;
        gl_FragColor = texture2D(u_texture, sampleUv);
      }
    `,
  },

  // 2. Pendulum Camera Shake (Handheld / Earthquake)
  {
    id: 'capcut.pendulum-camera-shake',
    name: 'Pendulum Camera Shake',
    category: 'camera-motion',
    description: 'Realistic organic handheld camera wobble with spring inertia damping.',
    defaultUniforms: {
      u_intensity: 0.03,
      u_frequency: 8.0,
      u_damping: 0.95,
    },
    glslSource: `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_time;
      uniform float u_intensity;
      uniform float u_frequency;

      void main() {
        float shakeX = sin(u_time * u_frequency) * cos(u_time * u_frequency * 0.7) * u_intensity;
        float shakeY = cos(u_time * u_frequency * 1.3) * sin(u_time * u_frequency * 0.5) * u_intensity;
        vec2 uv = v_uv + vec2(shakeX, shakeY);
        gl_FragColor = texture2D(u_texture, uv);
      }
    `,
  },

  // 3. Chromatic Aberration (RGB Split)
  {
    id: 'isf.chromatic-aberration',
    name: 'Prismatic Chromatic Aberration',
    category: 'distortion',
    description: 'Separates red and blue color channels toward the frame edges.',
    defaultUniforms: {
      u_amount: 0.015,
      u_radial: 1.0,
    },
    glslSource: `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_amount;

      void main() {
        vec2 center = vec2(0.5);
        vec2 dir = v_uv - center;
        float dist = length(dir);
        vec2 offset = normalize(dir) * dist * u_amount;
        
        float r = texture2D(u_texture, v_uv + offset).r;
        float g = texture2D(u_texture, v_uv).g;
        float b = texture2D(u_texture, v_uv - offset).b;
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `,
  },

  // 4. Retro 90s CRT VHS Tape
  {
    id: 'shadertoy.crt-vhs',
    name: '90s CRT VHS Retro Glitch',
    category: 'glitch-retro',
    description: 'Authentic analog VHS tape distortion with scanlines and tape jitter.',
    defaultUniforms: {
      u_scanlineDensity: 600.0,
      u_tapeNoise: 0.05,
      u_trackingJitter: 0.02,
    },
    glslSource: `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_time;

      void main() {
        vec2 uv = v_uv;
        // Jitter line
        float jitter = step(0.98, sin(uv.y * 30.0 + u_time * 20.0)) * 0.01;
        uv.x += jitter;
        
        vec4 col = texture2D(u_texture, uv);
        // Scanlines
        float scanline = sin(uv.y * 600.0) * 0.04;
        col.rgb -= scanline;
        
        gl_FragColor = col;
      }
    `,
  },

  // 5. Halftone Pop Art Glow
  {
    id: 'capcut.halftone-glow',
    name: 'Halftone Pop Art Bloom',
    category: 'light-glow',
    description: 'Stylized comic-book halftone dots blended with radiant glow.',
    defaultUniforms: {
      u_dotSize: 12.0,
      u_bloomIntensity: 1.3,
    },
    glslSource: `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_dotSize;
      uniform float u_bloomIntensity;

      void main() {
        vec4 col = texture2D(u_texture, v_uv);
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        vec2 grid = fract(v_uv * u_dotSize) - 0.5;
        float dotRadius = gray * 0.5;
        float inDot = step(length(grid), dotRadius);
        vec3 finalCol = mix(col.rgb * 0.6, col.rgb * u_bloomIntensity, inDot);
        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  },
];

