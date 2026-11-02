/**
 * @file gl-transitions-catalog.ts
 * @description Real GLSL Transition Shaders extracted directly from references/gl-transitions.
 * Provides 25 hardware-accelerated transitions ready for WebGPU/WebGL canvases.
 */

export interface RealGlTransitionDefinition {
  readonly id: string;
  readonly name: string;
  readonly fileName: string;
  readonly defaultDurationSec: number;
  readonly glsl: string;
}

export const REAL_GL_TRANSITIONS_CATALOG: readonly RealGlTransitionDefinition[] = [
  {
    "id": "gl.circleopen",
    "name": "CircleOpen",
    "fileName": "CircleOpen.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: A soft-edged circle opens from the center to reveal the incoming image\n// Tags: circle, iris, wipe\n// @param Softness of the circle's edge\nuniform float smoothness; // = 0.3\n// @param Open the circle; false closes it instead\nuniform bool opening; // = true\n\nconst vec2 center = vec2(0.5, 0.5);\nconst float SQRT_2 = 1.414213562373;\n\nvec4 transition (vec2 uv) {\n  float x = opening ? progress : 1.-progress;\n  float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, uv) - x*(1.+smoothness));\n  return mix(getFromColor(uv), getToColor(uv), opening ? 1.-m : m);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.crosszoom",
    "name": "CrossZoom",
    "fileName": "CrossZoom.glsl",
    "glsl": "// License: MIT\n// Author: rectalogic\n// Description: A crossfade through a strong zoom blur\n// Tags: zoom, blur, blend\n// ported by gre from https://gist.github.com/rectalogic/b86b90161503a0023231\n\n// Converted from https://github.com/rectalogic/rendermix-basic-effects/blob/master/assets/com/rendermix/CrossZoom/CrossZoom.frag\n// Which is based on https://github.com/evanw/glfx.js/blob/master/src/filters/blur/zoomblur.js\n// With additional easing functions from https://github.com/rectalogic/rendermix-basic-effects/blob/master/assets/com/rendermix/Easing/Easing.glsllib\n\n// @range(0, 1) Blur strength\nuniform float strength; // = 0.4\n\nconst float PI = 3.141592653589793;\n\nfloat Linear_ease(in float begin, in float change, in float duration, in float time) {\n    return change * time / duration + begin;\n}\n\nfloat Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {\n    if (time == 0.0)\n        return begin;\n    else if (time == duration)\n        return begin + change;\n    time = time / (duration / 2.0);\n    if (time < 1.0)\n        return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;\n    return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;\n}\n\nfloat Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {\n    return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;\n}\n\nfloat rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n\nvec4 crossFade(in vec2 uv, in float dissolve) {\n    return mix(getFromColor(uv), getToColor(uv), dissolve);\n}\n\nvec4 transition(vec2 uv) {\n    vec2 texCoord = uv.xy / vec2(1.0).xy;\n\n    // Linear interpolate center across center half of the image\n    vec2 center = vec2(Linear_ease(0.25, 0.5, 1.0, progress), 0.5);\n    float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);\n\n    // Mirrored sinusoidal loop. 0->strength then strength->0\n    float strength = Sinusoidal_easeInOut(0.0, strength, 0.5, progress);\n\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n    vec2 toCenter = center - texCoord;\n\n    /* randomize the lookup values to hide the fixed number of samples */\n    float offset = rand(uv);\n\n    for (float t = 0.0; t <= 40.0; t++) {\n        float percent = (t + offset) / 40.0;\n        float weight = 4.0 * (percent - percent * percent);\n        color += crossFade(texCoord + toCenter * percent * strength, dissolve) * weight;\n        total += weight;\n    }\n    return color / total;\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.bookflip",
    "name": "BookFlip",
    "fileName": "BookFlip.glsl",
    "glsl": "// Author: hong\n// License: MIT\n// Description: The outgoing image turns like a book page from right to left, revealing the incoming one\n// Tags: page, flip, 3d\n\n// Avoids dividing by zero when the page is edge-on (progress = 0.5).\nfloat nonZero(float x) {\n  return abs(x) < 1e-4 ? (x < 0.0 ? -1e-4 : 1e-4) : x;\n}\n\nvec2 skewRight(vec2 p) {\n  float skewX = (p.x - progress)/nonZero(0.5 - progress) * 0.5;\n  float skewY =  (p.y - 0.5)/(0.5 + progress * (p.x - 0.5) / 0.5)* 0.5  + 0.5;\n  return vec2(skewX, skewY);\n}\n\nvec2 skewLeft(vec2 p) {\n  float skewX = (p.x - 0.5)/nonZero(progress - 0.5) * 0.5 + 0.5;\n  float skewY = (p.y - 0.5) / (0.5 + (1.0 - progress ) * (0.5 - p.x) / 0.5) * 0.5  + 0.5;\n  return vec2(skewX, skewY);\n}\n\nvec4 addShade() {\n  float shadeVal  =  max(0.7, abs(progress - 0.5) * 2.0);\n  return vec4(vec3(shadeVal ), 1.0);\n}\n\nvec4 transition (vec2 p) {\n  float pr = step(1.0 - progress, p.x);\n\n  if (p.x < 0.5) {\n    return mix(getFromColor(p), getToColor(skewLeft(p)) * addShade(), pr);\n  } else {\n    return mix(getFromColor(skewRight(p)) * addShade(), getToColor(p),   pr);\n  }\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.bounce",
    "name": "Bounce",
    "fileName": "Bounce.glsl",
    "glsl": "// Author: Adrian Purser\n// License: MIT\n// Description: The outgoing image drops out of the frame with a few bounces, revealing the incoming one\n// Tags: bounce, slide, vertical, shadow\n\n// @color Color of the shadow cast on the incoming image\nuniform vec4 shadow_colour; // = vec4(0.,0.,0.,.6)\n// @range(0.01, 0.5) Height of the shadow, relative to the image height\nuniform float shadow_height; // = 0.075\n// @range(1, 10, 1) Number of bounces before settling\nuniform float bounces; // = 3.0\n\nconst float PI = 3.14159265358;\n\nvec4 transition (vec2 uv) {\n  float time = progress;\n  float stime = sin(time * PI / 2.);\n  float phase = time * PI * bounces;\n  float y = (abs(cos(phase))) * (1.0 - stime);\n  float d = uv.y - y;\n  vec4 to = getToColor(uv);\n  return mix(\n    mix(\n      to,\n      vec4(shadow_colour.rgb, 1.0), // shadow_colour.a is in the amount: the shadow darkens, it does not make the image transparent\n      step(d, shadow_height) * (1. - mix(\n        ((d / shadow_height) * shadow_colour.a) + (1.0 - shadow_colour.a),\n        1.0,\n        smoothstep(0.95, 1., progress) // fade-out the shadow at the end\n      )) * to.a // cast on the incoming image, not on its transparent areas\n    ),\n    getFromColor(vec2(uv.x, uv.y + (1.0 - y))),\n    step(d, 0.0)\n  );\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.burnthrough",
    "name": "BurnThrough",
    "fileName": "BurnThrough.glsl",
    "glsl": "// Author: liubailin2020@gmail.com\n// License: MIT\n// Description: The outgoing image burns away in noisy, glowing patches\n// Tags: burn, fire, noise\n\n// @color Color of the burning edges\nuniform vec3 burnColor; // = vec3(1.0, 0.5, 0.0)\n\nfloat random (in vec2 st) {\n    return fract(sin(dot(st.xy,\n                         vec2(12.9898,78.233)))*\n        43758.5453123);\n}\n\n// Based on Morgan McGuire @morgan3d\n// https://www.shadertoy.com/view/4dS3Wd\nfloat noise (in vec2 st) {\n    vec2 i = floor(st);\n    vec2 f = fract(st);\n\n    float a = random(i);\n    float b = random(i + vec2(1.0, 0.0));\n    float c = random(i + vec2(0.0, 1.0));\n    float d = random(i + vec2(1.0, 1.0));\n\n    vec2 u = f * f * (3.0 - 2.0 * f);\n\n    return mix(a, b, u.x) +\n            (c - a)* u.y * (1.0 - u.x) +\n            (d - b) * u.x * u.y;\n}\n\n#define OCTAVES 4\nfloat fbm (in vec2 st) {\n    float value = 0.0;\n    float amplitude = .5;\n    for (int i = 0; i < OCTAVES; i++) {\n        value += amplitude * noise(st);\n        st *= 2.;\n        amplitude *= .5;\n    }\n    return value;\n}\n\nvec4 transition (vec2 uv) {\n    if (progress <= 0.0) return getFromColor(uv);\n    if (progress >= 1.0) return getToColor(uv);\n    vec4 from = getFromColor(uv);\n    vec4 to = getToColor(uv);\n    float n = fbm(uv * 4.);\n    float l = smoothstep(progress, progress + 0.05, n);\n    float edge = (1.0 - l) * l * 5.0;\n    return mix(to, from, l) + vec4(burnColor, 0.0) * edge;\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.butterflywavescrawler",
    "name": "ButterflyWaveScrawler",
    "fileName": "ButterflyWaveScrawler.glsl",
    "glsl": "// Author: mandubian\n// License: MIT\n// Description: Wavy, color-separated ripples scramble the outgoing image into the incoming one\n// Tags: wave, distort, chromatic\nuniform float amplitude; // = 1.0\nuniform float waves; // = 30.0\nuniform float colorSeparation; // = 0.3\nconst float PI = 3.14159265358979323846264;\nfloat compute(vec2 p, float progress, vec2 center) {\nvec2 o = p*sin(progress * amplitude)-center;\n// horizontal vector\nvec2 h = vec2(1., 0.);\n// butterfly polar function (don't ask me why this one :))\nfloat theta = acos(dot(o, h)) * waves;\nfloat s = sin((2.*theta - PI) / 24.);\nfloat s2 = s * s;\nreturn (exp(cos(theta)) - 2.*cos(4.*theta) + s2 * s2 * s) / 10.;\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  vec2 p = uv;\n  float inv = 1. - progress;\n  float disp = compute(p, progress, vec2(0.5, 0.5));\n  vec4 texTo = getToColor(p + inv*disp);\n  vec4 fromCenter = getFromColor(p + progress*disp);\n  vec4 texFrom = vec4(\n    getFromColor(p + progress*disp*(1.0 - colorSeparation)).r,\n    fromCenter.g,\n    getFromColor(p + progress*disp*(1.0 + colorSeparation)).b,\n    fromCenter.a);\n  return texTo*progress + texFrom*inv;\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.chessboard",
    "name": "Chessboard",
    "fileName": "Chessboard.glsl",
    "glsl": "// Author: lql\n// License: MIT\n// Description: A chessboard pattern of squares reveals the incoming image\n// Tags: grid, squares, pattern\n\n// @param Number of squares per row\nuniform float grid_num; // = 10.0\n\nvec4 transition(vec2 uv) {\n    vec2 st = uv * grid_num;\n    vec2 idx = floor(st);\n    vec2 grid = fract(st);\n\n    vec4 a = getFromColor(uv);\n    vec4 b = getToColor(uv);\n\n    float checker = mod(idx.x + idx.y, 2.0);\n    float mixFactor;\n\n    if (progress <= 0.5) {\n        mixFactor = (checker > 0.5) ? step(grid.x, progress * 2.0) : 0.0;\n    } else {\n        mixFactor = (checker < 0.5) ? step(grid.x, (progress - 0.5) * 2.0) : 1.0;\n    }\n\n    return mix(a, b, mixFactor);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.circleiris",
    "name": "CircleIris",
    "fileName": "CircleIris.glsl",
    "glsl": "// Author: Fernando Kuteken\n// License: MIT\n// Description: The outgoing image closes into a circle over a background color, then the incoming one opens from it\n// Tags: circle, iris, shape\n\n// @param Center of the circle\nuniform vec2 center; // = vec2(0.5, 0.5)\n// @color Background color\nuniform vec4 backColor; // = vec4(0.1, 0.1, 0.1, 1.0)\n\nvec4 transition (vec2 uv) {\n  \n  float distance = length(uv - center);\n  float radius = sqrt(8.0) * abs(progress - 0.5);\n  \n  if (distance > radius) {\n    return backColor;\n  }\n  else {\n    if (progress < 0.5) return getFromColor(uv);\n    else return getToColor(uv);\n  }\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.clockwipe",
    "name": "ClockWipe",
    "fileName": "ClockWipe.glsl",
    "glsl": "// Author: Fernando Kuteken\n// License: MIT\n// Description: A wipe that sweeps around the center from a starting angle\n// Tags: wipe, radial, clock\n\n#define PI 3.141592653589\n\n// @range(0, 360) Angle where the wipe starts, in degrees\nuniform float startingAngle; // = 90\n\nvec4 transition (vec2 uv) {\n  \n  float offset = startingAngle * PI / 180.0;\n  float angle = atan(uv.y - 0.5, uv.x - 0.5) + offset;\n  float normalizedAngle = (angle + PI) / (2.0 * PI);\n  \n  normalizedAngle = normalizedAngle - floor(normalizedAngle);\n\n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    step(normalizedAngle, progress)\n    );\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.colordistance",
    "name": "ColorDistance",
    "fileName": "ColorDistance.glsl",
    "glsl": "// License: MIT\n// Author: P-Seebauer\n// Description: Pixels switch to the incoming image in order of how close their colors are\n// Tags: blend, color\n// ported by gre from https://gist.github.com/P-Seebauer/2a5fa2f77c883dd661f9\n\nuniform float power; // = 5.0\n\nvec4 transition(vec2 p) {\n  vec4 fTex = getFromColor(p);\n  vec4 tTex = getToColor(p);\n  float m = step(distance(fTex, tTex), progress);\n  return mix(\n    mix(fTex, tTex, m),\n    tTex,\n    pow(progress, power)\n  );\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.colorphase",
    "name": "ColorPhase",
    "fileName": "ColorPhase.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: A crossfade in which each color channel changes at a different time\n// Tags: fade, color\n\n// Usage: fromStep and toStep must be in [0.0, 1.0] range \n// and all(fromStep) must be < all(toStep)\n\n// @range(0, 1) When each channel (r, g, b, a) starts changing\nuniform vec4 fromStep; // = vec4(0.0, 0.2, 0.4, 0.0)\n// @range(0, 1) When each channel (r, g, b, a) finishes changing\nuniform vec4 toStep; // = vec4(0.6, 0.8, 1.0, 1.0)\n\nvec4 transition (vec2 uv) {\n  vec4 a = getFromColor(uv);\n  vec4 b = getToColor(uv);\n  return mix(a, b, smoothstep(fromStep, toStep, vec4(progress)));\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.crosswarp",
    "name": "CrossWarp",
    "fileName": "CrossWarp.glsl",
    "glsl": "// Author: Eke P\u00e9ter <peterekepeter@gmail.com>\n// License: MIT\n// Description: The outgoing image zooms in while the incoming one zooms out into place, sweeping from right to left\n// Tags: warp, zoom, horizontal\nvec4 transition(vec2 p) {\n  float x = progress;\n  x=smoothstep(.0,1.0,(x*2.0+p.x-1.0));\n  return mix(getFromColor((p-.5)*(1.-x)+.5), getToColor((p-.5)*x+.5), x);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.crosshatch",
    "name": "Crosshatch",
    "fileName": "Crosshatch.glsl",
    "glsl": "// License: MIT\n// Author: pthrasher\n// Description: The incoming image appears through a crosshatch of lines spreading from the center\n// Tags: pattern, lines, noise\n// adapted by gre from https://gist.github.com/pthrasher/04fd9a7de4012cbb03f6\n\n// @param Point the lines spread from\nuniform vec2 center; // = vec2(0.5)\nuniform float threshold; // = 3.0\nuniform float fadeEdge; // = 0.1\n\nfloat rand(vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 transition(vec2 p) {\n  float dist = distance(center, p) / threshold;\n  float r = progress - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x)));\n  return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist, r), 1.0, smoothstep(1.0-fadeEdge, 1.0, progress)), smoothstep(0.0, fadeEdge, progress)));    \n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.cube",
    "name": "Cube",
    "fileName": "Cube.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: The two images are faces of a rotating 3D cube, with a floor reflection\n// Tags: 3d, cube, rotate, reflection\n// @range(0, 1) Amount of perspective\nuniform float persp; // = 0.7\nuniform float unzoom; // = 0.3\n// @range(0, 1) Strength of the reflection\nuniform float reflection; // = 0.4\nuniform float floating; // = 3.0\n\nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -floating/100.);\n}\n\nbool inBounds (vec2 p) {\n  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));\n}\n\nvec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {\n  vec4 c = vec4(0.0); // where no image is drawn: transparent\n  pfr = project(pfr);\n  // FIXME avoid branching might help perf!\n  if (inBounds(pfr)) {\n    c += mix(vec4(0.0), getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));\n  }\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(vec4(0.0), getToColor(pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n\n// p : the position\n// persp : the perspective in [ 0, 1 ]\n// center : the xcenter in [0, 1] \\ 0.5 excluded\nvec2 xskew (vec2 p, float persp, float center) {\n  float x = mix(p.x, 1.0-p.x, center);\n  return (\n    (\n      vec2( x, (p.y - 0.5*(1.0-persp) * x) / (1.0+(persp-1.0)*x) )\n      - vec2(0.5-distance(center, 0.5), 0.0)\n    )\n    * vec2(0.5 / distance(center, 0.5) * (center<0.5 ? 1.0 : -1.0), 1.0)\n    + vec2(center<0.5 ? 0.0 : 1.0, 0.0)\n  );\n}\n\nvec4 transition(vec2 op) {\n  float uz = unzoom * 2.0*(0.5-distance(0.5, progress));\n  vec2 p = -uz*0.5+(1.0+uz) * op;\n  vec2 fromP = xskew(\n    (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0),\n    1.0-mix(progress, 0.0, persp),\n    0.0\n  );\n  vec2 toP = xskew(\n    p / vec2(progress, 1.0),\n    mix(pow(progress, 2.0), 1.0, persp),\n    1.0\n  );\n  // FIXME avoid branching might help perf!\n  if (inBounds(fromP)) {\n    return getFromColor(fromP);\n  }\n  else if (inBounds(toP)) {\n    return getToColor(toP);\n  }\n  return bgColor(op, fromP, toP);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.curtains",
    "name": "Curtains",
    "fileName": "Curtains.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: The outgoing image parts in the middle like stage curtains, gathering into shaded folds as it is pulled to the sides\n// Tags: split, horizontal, fold, 3d\n\n// @range(1, 16, 1) Number of folds in each curtain (fewer in a portrait image)\nuniform float folds; // = 7.0\n// @range(0, 1) Depth of the shading on the folds\nuniform float shading; // = 0.7\n// @range(0, 0.4) Width of each curtain once gathered, relative to the image width\nuniform float bunch; // = 0.12\n// @range(0, 1) How much the bottom of the curtains lags behind the top\nuniform float sway; // = 0.4\n\nconst float PI = 3.141592653589793;\n\nvec4 transition (vec2 uv) {\n  // the bottom of the fabric follows the top with a little delay\n  float lag = sway * (1.0 - uv.y);\n  float p = progress * (1.0 - lag * (1.0 - progress));\n  float open = mix(p, p * p * (3.0 - 2.0 * p), 0.75);\n  // each curtain hangs from its outer edge, gathers to the bunch width, then leaves the frame\n  float edge = -bunch * open * open;\n  float w = mix(0.5, bunch, open);\n  float x = min(uv.x, 1.0 - uv.x) - edge; // distance to the outer edge of the curtain\n  if (x >= w) {\n    // soft shadow of the curtain on the stage, fading as the curtain leaves the frame\n    vec4 to = getToColor(uv);\n    float shadow = 0.4 * exp((w - x) * 25.0) * clamp((edge + w) * 20.0, 0.0, 1.0);\n    return vec4(to.rgb * (1.0 - shadow * open), to.a);\n  }\n  float t = x / w;\n  // pleats: the fabric bunches up where cos(a) > 0 and is stretched elsewhere\n  float n = max(1.0, floor(folds * min(ratio, 1.0) + 0.5)); // folds keep their size in portrait\n  float a = 2.0 * PI * n * t;\n  float f = 1.0 - (1.0 - open) * (1.0 - open) * (1.0 - open); // the folds form early\n  float gather = 0.92 * f;\n  float s = 0.5 * (t + gather * sin(a) / (2.0 * PI * n)); // position in the fabric\n  vec4 c = getFromColor(vec2(uv.x < 0.5 ? s : 1.0 - s, uv.y));\n  // light comes from the front, a bit from the middle of the stage\n  float slope = 3.0 * gather * cos(a) * (uv.x < 0.5 ? 1.0 : -1.0);\n  float diffuse = (1.0 + 0.5 * slope) / sqrt(1.25 * (1.0 + slope * slope));\n  float crease = 0.5 + 0.5 * sin(a); // the back of each pleat is in the dark\n  float light = mix(1.0, diffuse * (1.0 - 0.6 * crease * crease), shading * f);\n  return vec4(c.rgb * light, c.a);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.doorway",
    "name": "Doorway",
    "fileName": "Doorway.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: The outgoing image opens like double doors as the incoming one comes forward, with a floor reflection\n// Tags: doors, 3d, reflection\n// @param Strength of the reflection\nuniform float reflection; // = 0.4\n// @param Amount of perspective\nuniform float perspective; // = 0.4\nuniform float depth; // = 3\n\nconst vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\n\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\n\nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);\n}\n\nvec4 bgColor (vec2 p, vec2 pto) {\n  vec4 c = black;\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(black, getToColor(pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n\n\nvec4 transition (vec2 p) {\n  vec2 pfr = vec2(-1.), pto = vec2(-1.);\n  float middleSlit = 2.0 * abs(p.x-0.5) - progress;\n  if (middleSlit > 0.0) {\n    pfr = p + (p.x > 0.5 ? -1.0 : 1.0) * vec2(0.5*progress, 0.0);\n    float d = 1.0/(1.0+perspective*progress*(1.0-middleSlit));\n    pfr.y -= d/2.;\n    pfr.y *= d;\n    pfr.y += d/2.;\n  }\n  float size = mix(1.0, depth, 1.-progress);\n  pto = (p + vec2(-0.5, -0.5)) * vec2(size, size) + vec2(0.5, 0.5);\n  if (inBounds(pfr)) {\n    return getFromColor(pfr);\n  }\n  else if (inBounds(pto)) {\n    return getToColor(pto);\n  }\n  else {\n    return bgColor(p, pto);\n  }\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.dreamy",
    "name": "Dreamy",
    "fileName": "Dreamy.glsl",
    "glsl": "// Author: mikolalysenko\n// License: MIT\n// Description: A crossfade with a gentle wavy distortion\n// Tags: wave, blend\n\nvec2 offset(float progress, float x, float theta) {\n  float phase = progress*progress + progress + theta;\n  float shifty = 0.03*progress*cos(10.0*(progress+x));\n  return vec2(0, shifty);\n}\nvec4 transition(vec2 p) {\n  return mix(getFromColor(p + offset(progress, p.x, 0.0)), getToColor(p + offset(1.0-progress, p.x, 3.14)), progress);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.fadecolor",
    "name": "FadeColor",
    "fileName": "FadeColor.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: A fade through a solid color, black by default\n// Tags: fade, color\n// @color Color to fade through\nuniform vec4 color; // = vec4(0.0, 0.0, 0.0, 1.0)\n// @range(0, 1) How long the color shows in the middle\nuniform float colorPhase; // = 0.4 ; // if 0.0, there is no black phase, if 0.9, the black phase is very important\nvec4 transition (vec2 uv) {\n  return mix(\n    mix(color, getFromColor(uv), smoothstep(1.0-colorPhase, 0.0, progress)),\n    mix(color, getToColor(uv), smoothstep(    colorPhase, 1.0, progress)),\n    progress);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.glitchdisplace",
    "name": "GlitchDisplace",
    "fileName": "GlitchDisplace.glsl",
    "glsl": "// Author: Matt DesLauriers\n// License: MIT\n// Description: Blocks of the image are displaced in a glitch that flashes into the incoming image\n// Tags: glitch, displace\n\nfloat random(vec2 co)\n{\n    float a = 12.9898;\n    float b = 78.233;\n    float c = 43758.5453;\n    float dt= dot(co.xy ,vec2(a,b));\n    float sn= mod(dt,3.14);\n    return fract(sin(sn) * c);\n}\nfloat voronoi( in vec2 x ) {\n    vec2 p = floor( x );\n    vec2 f = fract( x );\n    float res = 8.0;\n    for( float j=-1.; j<=1.; j++ )\n    for( float i=-1.; i<=1.; i++ ) {\n        vec2  b = vec2( i, j );\n        vec2  r = b - f + random( p + b );\n        float d = dot( r, r );\n        res = min( res, d );\n    }\n    return sqrt( res );\n}\n\nvec2 displace(vec4 tex, vec2 texCoord, float dotDepth, float textureDepth, float strength) {\n    float b = voronoi(.003 * texCoord + 2.0);\n    float g = voronoi(0.2 * texCoord);\n    float r = voronoi(texCoord - 1.0);\n    vec4 dt = tex * 1.0;\n    vec4 dis = dt * dotDepth + 1.0 - tex * textureDepth;\n\n    dis.x = dis.x - 1.0 + textureDepth*dotDepth;\n    dis.y = dis.y - 1.0 + textureDepth*dotDepth;\n    dis.x *= strength;\n    dis.y *= strength;\n    vec2 res_uv = texCoord ;\n    res_uv.x = res_uv.x + dis.x - 0.0;\n    res_uv.y = res_uv.y + dis.y;\n    return res_uv;\n}\n\nfloat ease1(float t) {\n  return t == 0.0 || t == 1.0\n    ? t\n    : t < 0.5\n      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)\n      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;\n}\nfloat ease2(float t) {\n  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);\n}\n\n\n\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy;\n  vec4 color1 = getFromColor(p);\n  vec4 color2 = getToColor(p);\n  vec2 disp = displace(color1, p, 0.33, 0.7, 1.0-ease1(progress));\n  vec2 disp2 = displace(color2, p, 0.33, 0.5, ease2(progress));\n  vec4 dColor1 = getToColor(disp);\n  vec4 dColor2 = getFromColor(disp2);\n  float val = ease1(progress);\n  vec3 gray = vec3(dot(min(dColor2, dColor1).rgb, vec3(0.299, 0.587, 0.114)));\n  dColor2 = vec4(gray * 2.0, dColor2.a);\n  color1 = mix(color1, dColor2, smoothstep(0.0, 0.5, progress));\n  color2 = mix(color2, dColor1, smoothstep(1.0, 0.5, progress));\n  return mix(color1, color2, val);\n  //gl_FragColor = mix(gl_FragColor, dColor, smoothstep(0.0, 0.5, progress));\n\n   //gl_FragColor = mix(texture2D(from, p), texture2D(to, p), progress);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.kaleidoscope",
    "name": "KaleidoScope",
    "fileName": "KaleidoScope.glsl",
    "glsl": "// Author: nwoeanhinnogaehr\n// License: MIT\n// Description: A crossfade through a spinning kaleidoscope\n// Tags: kaleidoscope, distort, blend\n\nuniform float speed; // = 1.0\nuniform float angle; // = 1.0\nuniform float power; // = 1.5\n\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy;\n  vec2 q = p;\n  float t = pow(progress, power)*speed;\n  p = p -0.5;\n  for (int i = 0; i < 7; i++) {\n    p = vec2(sin(t)*p.x + cos(t)*p.y, sin(t)*p.y - cos(t)*p.x);\n    t += angle;\n    p = abs(mod(p, 2.0) - 1.0);\n  }\n  abs(mod(p, 1.0));\n  return mix(\n    mix(getFromColor(q), getToColor(q), progress),\n    mix(getFromColor(p), getToColor(p), progress), 1.0 - 2.0*abs(progress - 0.5));\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.lumawipe",
    "name": "LumaWipe",
    "fileName": "LumaWipe.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: A wipe that follows the brightness of a grayscale mask (the luma texture)\n// Tags: wipe, luma, mask\n\nuniform sampler2D luma;\n\nvec4 transition(vec2 uv) {\n  return mix(\n    getToColor(uv),\n    getFromColor(uv),\n    step(progress, texture2D(luma, uv).r)\n  );\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.morph",
    "name": "Morph",
    "fileName": "Morph.glsl",
    "glsl": "// Author: paniq\n// License: MIT\n// Description: A crossfade in which each image is displaced by the other's colors, like a morph\n// Tags: morph, distort, blend\n// @param Strength of the displacement\nuniform float strength; // = 0.1\n\nvec4 transition(vec2 p) {\n  vec4 ca = getFromColor(p);\n  vec4 cb = getToColor(p);\n  \n  vec2 oa = (((ca.rg+ca.b)*0.5)*2.0-1.0);\n  vec2 ob = (((cb.rg+cb.b)*0.5)*2.0-1.0);\n  vec2 oc = mix(oa,ob,0.5)*strength;\n  \n  float w0 = progress;\n  float w1 = 1.0-w0;\n  return mix(getFromColor(p+oc*w0), getToColor(p-oc*w1), progress);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.pixelize",
    "name": "Pixelize",
    "fileName": "Pixelize.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: Both images pixelate, crossfade, then sharpen again\n// Tags: pixelate, blend\n// forked from https://gist.github.com/benraziel/c528607361d90a072e98\n\n// minimum number of squares (when the effect is at its higher level)\n// @param Number of squares at the strongest pixelation\nuniform ivec2 squaresMin; // = ivec2(20)\n// zero disable the stepping\n// @param Number of pixelation steps; 0 for a continuous effect\nuniform int steps; // = 50\n\nvec4 transition(vec2 uv) {\n  float d = min(progress, 1.0 - progress);\n  float dist = steps>0 ? ceil(d * float(steps)) / float(steps) : d;\n  vec2 squareSize = 2.0 * dist / vec2(squaresMin);\n  vec2 p = dist>0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;\n  return mix(getFromColor(p), getToColor(p), progress);\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.ripple",
    "name": "Ripple",
    "fileName": "Ripple.glsl",
    "glsl": "// Author: gre\n// License: MIT\n// Description: Ripples spread from the center while crossfading\n// Tags: ripple, wave, blend\n// @param Frequency of the ripples\nuniform float amplitude; // = 100.0\n// @param Speed of the ripples\nuniform float speed; // = 50.0\n\nvec4 transition (vec2 uv) {\n  vec2 dir = uv - vec2(.5);\n  float dist = length(dir);\n  vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + .5) / 30. * progress;\n  return mix(\n    getFromColor(uv + offset),\n    getToColor(uv),\n    smoothstep(0.2, 1.0, progress)\n  );\n}",
    "defaultDurationSec": 0.5
  },
  {
    "id": "gl.swirl",
    "name": "Swirl",
    "fileName": "Swirl.glsl",
    "glsl": "// License: MIT\n// Author: Sergey Kosarevsky\n// Description: Both images swirl around the center while crossfading\n// Tags: swirl, rotate, blend\n// ( http://www.linderdaum.com )\n// ported by gre from https://gist.github.com/corporateshark/cacfedb8cca0f5ce3f7c\n\nvec4 transition(vec2 UV)\n{\n\tfloat Radius = 1.0;\n\n\tfloat T = progress;\n\n\tUV -= vec2( 0.5, 0.5 );\n\n\tfloat Dist = length(UV);\n\n\tif ( Dist < Radius )\n\t{\n\t\tfloat Percent = (Radius - Dist) / Radius;\n\t\tfloat A = ( T <= 0.5 ) ? mix( 0.0, 1.0, T/0.5 ) : mix( 1.0, 0.0, (T-0.5)/0.5 );\n\t\tfloat Theta = Percent * Percent * A * 8.0 * 3.14159;\n\t\tfloat S = sin( Theta );\n\t\tfloat C = cos( Theta );\n\t\tUV = vec2( dot(UV, vec2(C, -S)), dot(UV, vec2(S, C)) );\n\t}\n\tUV += vec2( 0.5, 0.5 );\n\n\tvec4 C0 = getFromColor(UV);\n\tvec4 C1 = getToColor(UV);\n\n\treturn mix( C0, C1, T );\n}",
    "defaultDurationSec": 0.5
  }
];
