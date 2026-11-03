/**
 * @file character-library.ts
 * @description Reusable 2D / Stickman Character Library & Composable Rig Contracts,
 * plus Extensible Future 3D Scene & Camera Adapter Contracts (Phase 6 Ready).
 *
 * Enforces Rule #2: We do NOT create a separate hard-coded character renderer for every animation.
 * Instead, characters, rigs, static poses, facial expressions, and action clips are defined
 * as composable data contracts evaluated deterministically at any time `t`.
 */

import { RationalTime } from './rational-time';

export type ReusableCharacterActionId =
  | 'walking'
  | 'running'
  | 'sitting'
  | 'standing'
  | 'talking'
  | 'explaining'
  | 'pointing'
  | 'thinking'
  | 'reacting'
  | 'falling'
  | 'working'
  | 'holding-object';

export type CharacterExpressionId =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'shocked-panic'
  | 'focused-analytical'
  | 'skeptical'
  | 'determined'
  | 'mind-blown';

export type typeCharacterExpressionId = CharacterExpressionId;

export interface BodyAnchorPoint {
  readonly anchorId: 'head-top' | 'eyes' | 'mouth' | 'neck' | 'left-hand' | 'right-hand' | 'hip-root' | 'left-foot' | 'right-foot';
  readonly localOffsetX: number;
  readonly localOffsetY: number;
}

export interface JointAngleMap {
  readonly headTiltDeg: number;
  readonly torsoLeanDeg: number;
  readonly leftUpperArmDeg: number;
  readonly leftForearmDeg: number;
  readonly rightUpperArmDeg: number;
  readonly rightForearmDeg: number;
  readonly leftThighDeg: number;
  readonly leftShinDeg: number;
  readonly rightThighDeg: number;
  readonly rightShinDeg: number;
  readonly rootOffsetY: number;
}

export interface PoseDefinition {
  readonly poseId: string;
  readonly name: string;
  readonly baseJoints: JointAngleMap;
  readonly defaultExpression: typeCharacterExpressionId;
  readonly tags: readonly string[];
}

export interface ActionAnimationClip {
  readonly actionId: ReusableCharacterActionId;
  readonly name: string;
  readonly legacyMoveSetAlias: string;
  readonly loopDurationSec: number;
  readonly defaultExpression: typeCharacterExpressionId;
  readonly keyframes: readonly {
    readonly progress0to1: number;
    readonly jointDeltas: Partial<JointAngleMap>;
  }[];
}

export interface CharacterStyleVariant {
  readonly variantId: string;
  readonly name: string;
  readonly strokeColorHex: string;
  readonly fillColorHex: string;
  readonly lineWidthPx: number;
  readonly accessoryKind: 'none' | 'red-tie' | 'space-helmet' | 'wizard-hood' | 'knight-helm' | 'glasses';
}

export interface CharacterDefinition {
  readonly characterId: string;
  readonly name: string;
  readonly assetId: string;
  readonly rigType: 'stickman-2d-skeletal' | 'vector-2d-layered';
  readonly anchors: readonly BodyAnchorPoint[];
  readonly styleVariants: readonly CharacterStyleVariant[];
  readonly defaultVariantId: string;
  readonly supportedActions: readonly ReusableCharacterActionId[];
  readonly tags: readonly string[];
}

/**
 * Canonical library of all 12 required reusable character actions.
 * Maps cleanly to both the new composable rig evaluator and the existing 18 stage Move-Sets.
 */
export const REUSABLE_CHARACTER_ACTIONS: Record<ReusableCharacterActionId, ActionAnimationClip> = {
  standing: {
    actionId: 'standing',
    name: 'Standing Idle Breathe',
    legacyMoveSetAlias: 'idle-breathe',
    loopDurationSec: 2.0,
    defaultExpression: 'neutral',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rootOffsetY: 0, torsoLeanDeg: 0 } },
      { progress0to1: 0.5, jointDeltas: { rootOffsetY: -3, torsoLeanDeg: 1 } },
      { progress0to1: 1.0, jointDeltas: { rootOffsetY: 0, torsoLeanDeg: 0 } },
    ],
  },
  walking: {
    actionId: 'walking',
    name: 'Walking Across Stage',
    legacyMoveSetAlias: 'walk-stage-left-to-right',
    loopDurationSec: 1.0,
    defaultExpression: 'neutral',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { leftThighDeg: 25, rightThighDeg: -25, leftUpperArmDeg: -20, rightUpperArmDeg: 20 } },
      { progress0to1: 0.5, jointDeltas: { leftThighDeg: -25, rightThighDeg: 25, leftUpperArmDeg: 20, rightUpperArmDeg: -20, rootOffsetY: -4 } },
      { progress0to1: 1.0, jointDeltas: { leftThighDeg: 25, rightThighDeg: -25, leftUpperArmDeg: -20, rightUpperArmDeg: 20 } },
    ],
  },
  running: {
    actionId: 'running',
    name: 'Fast Running Sprint',
    legacyMoveSetAlias: 'walk-stage-left-to-right',
    loopDurationSec: 0.55,
    defaultExpression: 'determined',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { torsoLeanDeg: 14, leftThighDeg: 45, rightThighDeg: -45, leftShinDeg: 35, rightShinDeg: 10 } },
      { progress0to1: 0.5, jointDeltas: { torsoLeanDeg: 14, leftThighDeg: -45, rightThighDeg: 45, leftShinDeg: 10, rightShinDeg: 35, rootOffsetY: -8 } },
      { progress0to1: 1.0, jointDeltas: { torsoLeanDeg: 14, leftThighDeg: 45, rightThighDeg: -45, leftShinDeg: 35, rightShinDeg: 10 } },
    ],
  },
  sitting: {
    actionId: 'sitting',
    name: 'Sitting at Desk / Terminal',
    legacyMoveSetAlias: 'idle-breathe',
    loopDurationSec: 2.5,
    defaultExpression: 'focused-analytical',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rootOffsetY: 28, leftThighDeg: 85, rightThighDeg: 85, leftShinDeg: -85, rightShinDeg: -85 } },
      { progress0to1: 1.0, jointDeltas: { rootOffsetY: 28, leftThighDeg: 85, rightThighDeg: 85, leftShinDeg: -85, rightShinDeg: -85 } },
    ],
  },
  talking: {
    actionId: 'talking',
    name: 'Talking with Casual Hand Gestures',
    legacyMoveSetAlias: 'talk-casual-gesture',
    loopDurationSec: 1.4,
    defaultExpression: 'happy',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { leftForearmDeg: -35, rightForearmDeg: 30 } },
      { progress0to1: 0.5, jointDeltas: { leftForearmDeg: -65, rightForearmDeg: 55, headTiltDeg: 4 } },
      { progress0to1: 1.0, jointDeltas: { leftForearmDeg: -35, rightForearmDeg: 30 } },
    ],
  },
  explaining: {
    actionId: 'explaining',
    name: 'Explaining with Open Arms',
    legacyMoveSetAlias: 'talk-excited-wide-arms',
    loopDurationSec: 1.6,
    defaultExpression: 'focused-analytical',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { leftUpperArmDeg: -55, rightUpperArmDeg: 55, leftForearmDeg: -25, rightForearmDeg: 25 } },
      { progress0to1: 0.5, jointDeltas: { leftUpperArmDeg: -80, rightUpperArmDeg: 80, leftForearmDeg: -40, rightForearmDeg: 40 } },
      { progress0to1: 1.0, jointDeltas: { leftUpperArmDeg: -55, rightUpperArmDeg: 55, leftForearmDeg: -25, rightForearmDeg: 25 } },
    ],
  },
  pointing: {
    actionId: 'pointing',
    name: 'Pointing at Chart / Visual Target',
    legacyMoveSetAlias: 'point-chart-upper-right',
    loopDurationSec: 1.5,
    defaultExpression: 'focused-analytical',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rightUpperArmDeg: -55, rightForearmDeg: -20, headTiltDeg: 6 } },
      { progress0to1: 0.5, jointDeltas: { rightUpperArmDeg: -68, rightForearmDeg: -28, headTiltDeg: 8 } },
      { progress0to1: 1.0, jointDeltas: { rightUpperArmDeg: -55, rightForearmDeg: -20, headTiltDeg: 6 } },
    ],
  },
  thinking: {
    actionId: 'thinking',
    name: 'Thinking / Scratching Chin',
    legacyMoveSetAlias: 'think-chin-scratch',
    loopDurationSec: 2.0,
    defaultExpression: 'skeptical',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rightUpperArmDeg: -30, rightForearmDeg: -110, headTiltDeg: -10 } },
      { progress0to1: 0.5, jointDeltas: { rightUpperArmDeg: -34, rightForearmDeg: -118, headTiltDeg: -14 } },
      { progress0to1: 1.0, jointDeltas: { rightUpperArmDeg: -30, rightForearmDeg: -110, headTiltDeg: -10 } },
    ],
  },
  reacting: {
    actionId: 'reacting',
    name: 'Shock / Celebration Reaction',
    legacyMoveSetAlias: 'econ-celebrate-stonks',
    loopDurationSec: 1.0,
    defaultExpression: 'surprised',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { leftUpperArmDeg: -135, rightUpperArmDeg: 135, rootOffsetY: 0 } },
      { progress0to1: 0.5, jointDeltas: { leftUpperArmDeg: -155, rightUpperArmDeg: 155, rootOffsetY: -14 } },
      { progress0to1: 1.0, jointDeltas: { leftUpperArmDeg: -135, rightUpperArmDeg: 135, rootOffsetY: 0 } },
    ],
  },
  falling: {
    actionId: 'falling',
    name: 'Falling / Crisis Drop',
    legacyMoveSetAlias: 'econ-panic-head-grab',
    loopDurationSec: 1.2,
    defaultExpression: 'shocked-panic',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { torsoLeanDeg: -15, leftUpperArmDeg: -110, rightUpperArmDeg: 110, rootOffsetY: 0 } },
      { progress0to1: 0.5, jointDeltas: { torsoLeanDeg: -35, leftUpperArmDeg: -140, rightUpperArmDeg: 140, rootOffsetY: 20 } },
      { progress0to1: 1.0, jointDeltas: { torsoLeanDeg: -15, leftUpperArmDeg: -110, rightUpperArmDeg: 110, rootOffsetY: 0 } },
    ],
  },
  working: {
    actionId: 'working',
    name: 'Working / Operating Machine',
    legacyMoveSetAlias: 'econ-crank-money-printer',
    loopDurationSec: 1.0,
    defaultExpression: 'determined',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rightUpperArmDeg: -40, rightForearmDeg: -45, torsoLeanDeg: 8 } },
      { progress0to1: 0.5, jointDeltas: { rightUpperArmDeg: -75, rightForearmDeg: -90, torsoLeanDeg: 12 } },
      { progress0to1: 1.0, jointDeltas: { rightUpperArmDeg: -40, rightForearmDeg: -45, torsoLeanDeg: 8 } },
    ],
  },
  'holding-object': {
    actionId: 'holding-object',
    name: 'Holding Prop / Scale / Sword',
    legacyMoveSetAlias: 'econ-balance-scale-hold',
    loopDurationSec: 1.8,
    defaultExpression: 'determined',
    keyframes: [
      { progress0to1: 0.0, jointDeltas: { rightUpperArmDeg: -70, rightForearmDeg: -15, leftUpperArmDeg: 45 } },
      { progress0to1: 0.5, jointDeltas: { rightUpperArmDeg: -76, rightForearmDeg: -20, leftUpperArmDeg: 50 } },
      { progress0to1: 1.0, jointDeltas: { rightUpperArmDeg: -70, rightForearmDeg: -15, leftUpperArmDeg: 45 } },
    ],
  },
};

export const BUILT_IN_CHARACTER_LIBRARY: readonly CharacterDefinition[] = [
  {
    characterId: 'char.stickman-economist',
    name: 'Economist Stickman',
    assetId: 'preasset.char.stickman-economist',
    rigType: 'stickman-2d-skeletal',
    anchors: [
      { anchorId: 'head-top', localOffsetX: 0, localOffsetY: -165 },
      { anchorId: 'eyes', localOffsetX: 0, localOffsetY: -135 },
      { anchorId: 'mouth', localOffsetX: 0, localOffsetY: -115 },
      { anchorId: 'neck', localOffsetX: 0, localOffsetY: -85 },
      { anchorId: 'right-hand', localOffsetX: 85, localOffsetY: -45 },
      { anchorId: 'left-hand', localOffsetX: -85, localOffsetY: -45 },
      { anchorId: 'hip-root', localOffsetX: 0, localOffsetY: 40 },
    ],
    styleVariants: [
      {
        variantId: 'red-tie-classic',
        name: 'Wall Street Red Tie',
        strokeColorHex: '#F8FAFC',
        fillColorHex: '#1E293B',
        lineWidthPx: 6,
        accessoryKind: 'red-tie',
      },
    ],
    defaultVariantId: 'red-tie-classic',
    supportedActions: Object.keys(REUSABLE_CHARACTER_ACTIONS) as ReusableCharacterActionId[],
    tags: ['economics', 'finance', 'business', 'stickman'],
  },
  {
    characterId: 'char.stickman-astronaut',
    name: 'Cosmic Explorer Stickman',
    assetId: 'preasset.char.stickman-astronaut',
    rigType: 'stickman-2d-skeletal',
    anchors: [
      { anchorId: 'head-top', localOffsetX: 0, localOffsetY: -165 },
      { anchorId: 'right-hand', localOffsetX: 85, localOffsetY: -45 },
      { anchorId: 'hip-root', localOffsetX: 0, localOffsetY: 40 },
    ],
    styleVariants: [
      {
        variantId: 'eva-white-suit',
        name: 'EVA Visor Helmet',
        strokeColorHex: '#38BDF8',
        fillColorHex: '#0F172A',
        lineWidthPx: 6,
        accessoryKind: 'space-helmet',
      },
    ],
    defaultVariantId: 'eva-white-suit',
    supportedActions: Object.keys(REUSABLE_CHARACTER_ACTIONS) as ReusableCharacterActionId[],
    tags: ['space', 'cosmic', 'science', 'astronaut', 'stickman'],
  },
  {
    characterId: 'char.stickman-lore-scholar',
    name: 'Chronicle Scholar & Knight',
    assetId: 'preasset.char.stickman-lore-scholar',
    rigType: 'stickman-2d-skeletal',
    anchors: [
      { anchorId: 'head-top', localOffsetX: 0, localOffsetY: -165 },
      { anchorId: 'right-hand', localOffsetX: 85, localOffsetY: -45 },
      { anchorId: 'hip-root', localOffsetX: 0, localOffsetY: 40 },
    ],
    styleVariants: [
      {
        variantId: 'gold-chronicler',
        name: 'Order of the Chronicle',
        strokeColorHex: '#FDE68A',
        fillColorHex: '#292524',
        lineWidthPx: 6,
        accessoryKind: 'knight-helm',
      },
    ],
    defaultVariantId: 'gold-chronicler',
    supportedActions: Object.keys(REUSABLE_CHARACTER_ACTIONS) as ReusableCharacterActionId[],
    tags: ['lore', 'history', 'medieval', 'fantasy', 'stickman'],
  },
];

/**
 * Evaluates a character's composite joint angles by blending a base `PoseDefinition`
 * with an `ActionAnimationClip` at normalized time `progress0to1` (0..1).
 */
export function evaluateComposableCharacterRig(
  basePose: Partial<JointAngleMap> | undefined,
  actionId: ReusableCharacterActionId,
  progress0to1: number
): JointAngleMap {
  const base: JointAngleMap = {
    headTiltDeg: basePose?.headTiltDeg ?? 0,
    torsoLeanDeg: basePose?.torsoLeanDeg ?? 0,
    leftUpperArmDeg: basePose?.leftUpperArmDeg ?? -25,
    leftForearmDeg: basePose?.leftForearmDeg ?? -15,
    rightUpperArmDeg: basePose?.rightUpperArmDeg ?? 25,
    rightForearmDeg: basePose?.rightForearmDeg ?? 15,
    leftThighDeg: basePose?.leftThighDeg ?? -12,
    leftShinDeg: basePose?.leftShinDeg ?? 0,
    rightThighDeg: basePose?.rightThighDeg ?? 12,
    rightShinDeg: basePose?.rightShinDeg ?? 0,
    rootOffsetY: basePose?.rootOffsetY ?? 0,
  };

  const clip = REUSABLE_CHARACTER_ACTIONS[actionId] || REUSABLE_CHARACTER_ACTIONS.standing;
  const p = Math.max(0, Math.min(1, progress0to1));
  const kfList = clip.keyframes;
  if (kfList.length === 0) return base;

  let prev = kfList[0];
  let next = kfList[kfList.length - 1];
  for (let i = 0; i < kfList.length - 1; i++) {
    if (p >= kfList[i].progress0to1 && p <= kfList[i + 1].progress0to1) {
      prev = kfList[i];
      next = kfList[i + 1];
      break;
    }
  }

  const span = next.progress0to1 - prev.progress0to1;
  const alpha = span > 0.0001 ? (p - prev.progress0to1) / span : 0;

  const lerp = (k: keyof JointAngleMap): number => {
    const d0 = prev.jointDeltas[k] ?? 0;
    const d1 = next.jointDeltas[k] ?? 0;
    return base[k] + d0 + (d1 - d0) * alpha;
  };

  return {
    headTiltDeg: lerp('headTiltDeg'),
    torsoLeanDeg: lerp('torsoLeanDeg'),
    leftUpperArmDeg: lerp('leftUpperArmDeg'),
    leftForearmDeg: lerp('leftForearmDeg'),
    rightUpperArmDeg: lerp('rightUpperArmDeg'),
    rightForearmDeg: lerp('rightForearmDeg'),
    leftThighDeg: lerp('leftThighDeg'),
    leftShinDeg: lerp('leftShinDeg'),
    rightThighDeg: lerp('rightThighDeg'),
    rightShinDeg: lerp('rightShinDeg'),
    rootOffsetY: lerp('rootOffsetY'),
  };
}

// ============================================================================
// PHASE 6 EXTENSION CONTRACT: FUTURE 3D SCENE & BLENDER WORKER INTERFACE
// Designed now so 3D scenes plug into the Unified Project Model without rework.
// ============================================================================

export interface Scene3DCameraKeyframe {
  readonly timeOffset: RationalTime;
  readonly positionXYZ: readonly [number, number, number];
  readonly lookAtXYZ: readonly [number, number, number];
  readonly focalLengthMm: number;
  readonly apertureFStop: number;
}

export interface Scene3DLightSpec {
  readonly lightId: string;
  readonly kind: 'key-area' | 'rim-spot' | 'hdri-environment' | 'directional-sun';
  readonly positionXYZ: readonly [number, number, number];
  readonly colorHex: string;
  readonly intensityWatts: number;
}

export interface Scene3DObjectPlacement {
  readonly objectId: string;
  readonly gltfAssetId: string;
  readonly positionXYZ: readonly [number, number, number];
  readonly rotationEulerDeg: readonly [number, number, number];
  readonly scaleXYZ: readonly [number, number, number];
  readonly animationClipName?: string;
}

export interface FutureScene3DCompositionSpec {
  readonly sceneId: string;
  readonly engineAdapter: 'blender-headless-cli' | 'wgpu-realtime-pbr';
  readonly objects: readonly Scene3DObjectPlacement[];
  readonly lights: readonly Scene3DLightSpec[];
  readonly cameraTrajectory: readonly Scene3DCameraKeyframe[];
  readonly outputDepthPass: boolean;
  readonly samplesPerPixel: number;
}
