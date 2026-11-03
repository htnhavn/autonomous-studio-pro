/**
 * @file puppet-rig.ts
 * @description Zero-Token Deterministic 2D Skeletal Stickman & Character Puppet Engine.
 * Provides procedural bone kinematics, audio-reactive lip-sync/head-bob, facial expressions,
 * held props, and 18+ ready-made Move Sets for Economics, Universe, and Lore videos.
 *
 * Can be controlled 100% manually by the user, driven by a Zero-AI keyword rule engine,
 * or orchestrated by an AI Agent using compact <20-token JSON commands!
 */

export type CharacterArchetypeId =
  | 'stickman-classic'       // Classic clean vector stick figure (Casually Explained / xkcd / Sam O'Nella style)
  | 'stickman-economist'     // Stick figure with red tie, glasses & suit lapel (Economics / Finance)
  | 'stickman-wallstreet'    // Stick figure with sunglasses, slick hair & briefcase
  | 'astronaut-explorer'     // Visor helmet + backpack suit for Universe / Space documentaries
  | 'lore-chronicler-hooded' // Cloak + glowing eyes + lantern/staff for Deep Lore / History / Fantasy
  | 'king-emperor-crown'     // Crown + royal cape for History / Geopolitics / Empire Lore
  | 'custom-sprite-rig';     // User-supplied PNG limbs mapped onto the same deterministic skeleton

export type ExpressionId =
  | 'neutral'
  | 'happy-talk'
  | 'shocked-wide'
  | 'panic-sweat'
  | 'smug-smirk'
  | 'angry-frown'
  | 'deadpan-unamused'
  | 'confused-question'
  | 'determined-focused';

export type HeldPropId =
  | 'none'
  | 'pointer-stick'          // Teacher/Economist board pointer
  | 'coffee-mug'             // Casual explainer mug
  | 'money-bag'              // Bag with '$' sign
  | 'money-printer-crank'    // Brrr printer lever
  | 'magnifying-glass'       // Lore / Detective clue inspection
  | 'ancient-scroll'         // History / Lore parchment
  | 'glowing-sword'          // Fantasy / Gaming lore weapon
  | 'telescope'              // Astronomy / Universe
  | 'microphone-news';       // Reporter / Interview

export type MoveSetId =
  | 'idle-breathe'
  | 'talk-explain-gestures'
  | 'point-at-chart-high'
  | 'point-at-board-side'
  | 'panic-head-grab'
  | 'shrug-confused'
  | 'money-printer-crank'
  | 'celebrate-stonks-up'
  | 'facepalm-disappointed'
  | 'eureka-lightbulb'
  | 'typing-furious'
  | 'float-zero-gravity'
  | 'telescope-observe'
  | 'lore-sword-raise'
  | 'lore-scroll-read'
  | 'walk-confident'
  | 'run-flee-danger'
  | 'bowtie-adjust-smug';

/**
 * Deterministic 2D Skeletal Bone Angles (in degrees, relative to parent bone)
 * and root offsets so any Canvas2D / PixiJS / SVG renderer can draw the character at 60-120fps.
 */
export interface StickmanBonePose {
  readonly rootOffsetX: number;
  readonly rootOffsetY: number;
  readonly scaleSquashX: number;
  readonly scaleStretchY: number;
  readonly torsoLeanDeg: number;
  readonly headTiltDeg: number;
  readonly shoulderLeftDeg: number;
  readonly elbowLeftDeg: number;
  readonly shoulderRightDeg: number;
  readonly elbowRightDeg: number;
  readonly hipLeftDeg: number;
  readonly kneeLeftDeg: number;
  readonly hipRightDeg: number;
  readonly kneeRightDeg: number;
  /** Mouth openness [0..1] driven automatically by voice audio envelope or phoneme */
  readonly mouthOpenness: number;
  /** Floating overhead emoticon badge ('?', '!', '💡', '💸', '💦', '📈', '💀') */
  readonly overheadEmote?: string;
}

export interface MoveSetMetadata {
  readonly id: MoveSetId;
  readonly nameVi: string;
  readonly category: 'explainer-core' | 'economics-finance' | 'universe-scifi' | 'lore-history' | 'locomotion';
  readonly defaultExpression: ExpressionId;
  readonly defaultProp: HeldPropId;
  readonly defaultOverheadEmote?: string;
  /** Keywords in Vietnamese & English that trigger this Move Set automatically in Zero-AI mode! */
  readonly autoTriggerKeywords: readonly string[];
}

export const MOVE_SET_CATALOG: readonly MoveSetMetadata[] = [
  {
    id: 'idle-breathe',
    nameVi: 'Đứng thở tự nhiên (Idle)',
    category: 'explainer-core',
    defaultExpression: 'neutral',
    defaultProp: 'none',
    autoTriggerKeywords: [],
  },
  {
    id: 'talk-explain-gestures',
    nameVi: 'Thuyết trình & Vung tay giải thích',
    category: 'explainer-core',
    defaultExpression: 'happy-talk',
    defaultProp: 'coffee-mug',
    autoTriggerKeywords: ['giải thích', 'ví dụ', 'cụ thể là', 'nói cách khác', 'explain', 'basically'],
  },
  {
    id: 'point-at-chart-high',
    nameVi: 'Chỉ tay lên Biểu đồ / Số liệu cao',
    category: 'economics-finance',
    defaultExpression: 'determined-focused',
    defaultProp: 'pointer-stick',
    defaultOverheadEmote: '📈',
    autoTriggerKeywords: ['tăng vọt', 'đỉnh điểm', 'biểu đồ', 'kỷ lục', 'tỷ đô', 'tăng trưởng', 'chart', 'peak'],
  },
  {
    id: 'point-at-board-side',
    nameVi: 'Cầm que chỉ bảng phân tích',
    category: 'explainer-core',
    defaultExpression: 'neutral',
    defaultProp: 'pointer-stick',
    autoTriggerKeywords: ['nhìn vào', 'sơ đồ', 'nguyên nhân', 'cấu trúc', 'bước 1', 'bước 2'],
  },
  {
    id: 'panic-head-grab',
    nameVi: 'Ôm đầu hoảng loạn (Sập thị trường / Thảm họa)',
    category: 'economics-finance',
    defaultExpression: 'panic-sweat',
    defaultProp: 'none',
    defaultOverheadEmote: '💦',
    autoTriggerKeywords: ['sụp đổ', 'khủng hoảng', 'vỡ nợ', 'bốc hơi', 'thảm họa', 'hoảng loạn', 'crash', 'collapse'],
  },
  {
    id: 'shrug-confused',
    nameVi: 'Nhún vai ngơ ngác (Khó hiểu / Nghịch lý)',
    category: 'explainer-core',
    defaultExpression: 'confused-question',
    defaultProp: 'none',
    defaultOverheadEmote: '❓',
    autoTriggerKeywords: ['tại sao', 'kỳ lạ', 'nghịch lý', 'không ai hiểu', 'bí ẩn', 'nhưng mà', 'weird', 'paradox'],
  },
  {
    id: 'money-printer-crank',
    nameVi: 'Quay máy in tiền FED (Money Printer Go Brrr)',
    category: 'economics-finance',
    defaultExpression: 'smug-smirk',
    defaultProp: 'money-printer-crank',
    defaultOverheadEmote: '💸',
    autoTriggerKeywords: ['in tiền', 'lạm phát', 'ngân hàng trung ương', 'fed', 'bơm tiền', 'lãi suất', 'inflation'],
  },
  {
    id: 'celebrate-stonks-up',
    nameVi: 'Nhảy ăn mừng chiến thắng / Giàu to',
    category: 'economics-finance',
    defaultExpression: 'happy-talk',
    defaultProp: 'money-bag',
    defaultOverheadEmote: '🚀',
    autoTriggerKeywords: ['lợi nhuận', 'giàu có', 'thành công', 'chiến thắng', 'bùng nổ', 'profit', 'boom'],
  },
  {
    id: 'facepalm-disappointed',
    nameVi: 'Vỗ trán bất lực (Sai lầm ngớ ngẩn)',
    category: 'explainer-core',
    defaultExpression: 'deadpan-unamused',
    defaultProp: 'none',
    defaultOverheadEmote: '🤦',
    autoTriggerKeywords: ['sai lầm', 'ngớ ngẩn', 'thất bại', 'đáng tiếc', 'tệ hại', 'mistake', 'fail'],
  },
  {
    id: 'eureka-lightbulb',
    nameVi: 'Nảy ra ý tưởng thiên tài (Eureka!)',
    category: 'explainer-core',
    defaultExpression: 'shocked-wide',
    defaultProp: 'none',
    defaultOverheadEmote: '💡',
    autoTriggerKeywords: ['phát hiện', 'đột phá', 'ý tưởng', 'phát minh', 'bất ngờ thay', 'breakthrough', 'idea'],
  },
  {
    id: 'typing-furious',
    nameVi: 'Gõ phím / Nghiên cứu siêu tốc',
    category: 'explainer-core',
    defaultExpression: 'determined-focused',
    defaultProp: 'none',
    autoTriggerKeywords: ['thuật toán', 'dữ liệu', 'máy tính', 'lập trình', 'tính toán'],
  },
  {
    id: 'float-zero-gravity',
    nameVi: 'Trôi lơ lửng không trọng lực (Vũ trụ)',
    category: 'universe-scifi',
    defaultExpression: 'shocked-wide',
    defaultProp: 'none',
    defaultOverheadEmote: '🪐',
    autoTriggerKeywords: ['vũ trụ', 'không gian', 'hố đen', 'thiên hà', 'ngôi sao', 'hành tinh', 'ánh sáng', 'space', 'universe'],
  },
  {
    id: 'telescope-observe',
    nameVi: 'Ngắm kính thiên văn quan sát',
    category: 'universe-scifi',
    defaultExpression: 'determined-focused',
    defaultProp: 'telescope',
    autoTriggerKeywords: ['quan sát', 'kính viễn vọng', 'nhà thiên văn', 'james webb', 'xa xôi', 'năm ánh sáng'],
  },
  {
    id: 'lore-sword-raise',
    nameVi: 'Giơ kiếm / Quyền trượng sử thi (Lore)',
    category: 'lore-history',
    defaultExpression: 'determined-focused',
    defaultProp: 'glowing-sword',
    defaultOverheadEmote: '⚔️',
    autoTriggerKeywords: ['chiến tranh', 'đế chế', 'vị vua', 'trận chiến', 'huyền thoại', 'boss', 'empire', 'battle'],
  },
  {
    id: 'lore-scroll-read',
    nameVi: 'Đọc cuộn cổ thư / Biên niên sử (Lore)',
    category: 'lore-history',
    defaultExpression: 'neutral',
    defaultProp: 'ancient-scroll',
    defaultOverheadEmote: '📜',
    autoTriggerKeywords: ['truyền thuyết', 'cổ đại', 'lịch sử', 'ghi chép', 'ngàn năm trước', 'lore', 'ancient'],
  },
  {
    id: 'walk-confident',
    nameVi: 'Bước đi tự tin trên sân khấu',
    category: 'locomotion',
    defaultExpression: 'neutral',
    defaultProp: 'none',
    autoTriggerKeywords: ['bước vào', 'hành trình', 'tiếp tục', 'di chuyển'],
  },
  {
    id: 'run-flee-danger',
    nameVi: 'Chạy trối chết khỏi nguy hiểm',
    category: 'locomotion',
    defaultExpression: 'panic-sweat',
    defaultProp: 'none',
    defaultOverheadEmote: '💨',
    autoTriggerKeywords: ['tháo chạy', 'bỏ chạy', 'tuyệt chủng', 'nguy hiểm', 'escape', 'run'],
  },
  {
    id: 'bowtie-adjust-smug',
    nameVi: 'Chỉnh cà vạt / Nơ vẻ chuyên gia',
    category: 'economics-finance',
    defaultExpression: 'smug-smirk',
    defaultProp: 'none',
    autoTriggerKeywords: ['chuyên gia', 'tỷ phú', 'chiến lược', 'bí quyết', 'thâu tóm'],
  },
];

/**
 * Pure deterministic kinematics evaluator:
 * Given a MoveSetId, local clip time in seconds, and optional audio amplitude [0..1],
 * returns the exact StickmanBonePose for this frame in <0.01ms!
 */
export function evaluateMoveSetAtTime(
  moveSetId: MoveSetId,
  timeSec: number,
  audioAmplitude: number = 0.35
): StickmanBonePose {
  const t = timeSec;
  const breathe = Math.sin(t * 2.5);
  const fastOsc = Math.sin(t * 12.0);
  const medOsc = Math.sin(t * 5.0);
  const mouth = Math.min(1, Math.max(0, audioAmplitude * 1.4));

  const basePose: StickmanBonePose = {
    rootOffsetX: 0,
    rootOffsetY: breathe * 2,
    scaleSquashX: 1.0,
    scaleStretchY: 1.0 + breathe * 0.015,
    torsoLeanDeg: 0,
    headTiltDeg: Math.sin(t * 1.8) * 3,
    shoulderLeftDeg: -25,
    elbowLeftDeg: -20,
    shoulderRightDeg: 25,
    elbowRightDeg: 20,
    hipLeftDeg: -8,
    kneeLeftDeg: 0,
    hipRightDeg: 8,
    kneeRightDeg: 0,
    mouthOpenness: mouth,
  };

  switch (moveSetId) {
    case 'talk-explain-gestures':
      return {
        ...basePose,
        torsoLeanDeg: Math.sin(t * 3.0) * 4,
        headTiltDeg: Math.sin(t * 4.5) * 6,
        shoulderLeftDeg: -45 + medOsc * 25,
        elbowLeftDeg: -50 + Math.cos(t * 5.0) * 20,
        shoulderRightDeg: 55 + Math.cos(t * 4.0) * 30,
        elbowRightDeg: -65 + medOsc * 25,
      };

    case 'point-at-chart-high':
      return {
        ...basePose,
        torsoLeanDeg: -6,
        headTiltDeg: -15 + breathe * 3,
        shoulderLeftDeg: -30,
        elbowLeftDeg: -15,
        shoulderRightDeg: 135 + Math.sin(t * 6.0) * 8, // Pointing sharply up-right!
        elbowRightDeg: -10,
        overheadEmote: '📈',
      };

    case 'panic-head-grab':
      return {
        ...basePose,
        rootOffsetY: Math.abs(fastOsc) * -8,
        scaleSquashX: 1.0 + fastOsc * 0.05,
        scaleStretchY: 1.0 - fastOsc * 0.05,
        torsoLeanDeg: fastOsc * 8,
        headTiltDeg: fastOsc * 12,
        shoulderLeftDeg: -140,
        elbowLeftDeg: -110,
        shoulderRightDeg: 140,
        elbowRightDeg: 110,
        hipLeftDeg: -20 + fastOsc * 10,
        hipRightDeg: 20 - fastOsc * 10,
        overheadEmote: '💦',
      };

    case 'shrug-confused': {
      const shrugLift = Math.min(1, (Math.sin(t * 3.0) + 1) * 0.6);
      return {
        ...basePose,
        headTiltDeg: 18 * shrugLift,
        shoulderLeftDeg: -75 * shrugLift - 20,
        elbowLeftDeg: -85 * shrugLift,
        shoulderRightDeg: 75 * shrugLift + 20,
        elbowRightDeg: 85 * shrugLift,
        overheadEmote: '❓',
      };
    }

    case 'money-printer-crank':
      return {
        ...basePose,
        torsoLeanDeg: 10 + fastOsc * 3,
        shoulderRightDeg: 70 + Math.sin(t * 15.0) * 45,
        elbowRightDeg: 40 + Math.cos(t * 15.0) * 45,
        overheadEmote: '💸',
      };

    case 'celebrate-stonks-up':
      return {
        ...basePose,
        rootOffsetY: Math.abs(Math.sin(t * 7.0)) * -24,
        shoulderLeftDeg: -155 + medOsc * 15,
        elbowLeftDeg: -20,
        shoulderRightDeg: 155 - medOsc * 15,
        elbowRightDeg: 20,
        hipLeftDeg: -25,
        kneeLeftDeg: 35,
        hipRightDeg: 25,
        kneeRightDeg: -35,
        overheadEmote: '🚀',
      };

    case 'float-zero-gravity':
      return {
        ...basePose,
        rootOffsetX: Math.sin(t * 0.9) * 18,
        rootOffsetY: Math.cos(t * 1.2) * 22,
        torsoLeanDeg: Math.sin(t * 0.7) * 18,
        headTiltDeg: Math.cos(t * 1.1) * 10,
        shoulderLeftDeg: -65 + Math.sin(t * 1.5) * 20,
        elbowLeftDeg: -25,
        shoulderRightDeg: 65 + Math.cos(t * 1.5) * 20,
        elbowRightDeg: 25,
        hipLeftDeg: -25 + Math.sin(t * 1.3) * 15,
        kneeLeftDeg: 30,
        hipRightDeg: 20 + Math.cos(t * 1.3) * 15,
        kneeRightDeg: 25,
        overheadEmote: '🪐',
      };

    case 'lore-sword-raise':
      return {
        ...basePose,
        torsoLeanDeg: -8,
        headTiltDeg: -10,
        shoulderLeftDeg: -40,
        elbowLeftDeg: -45,
        shoulderRightDeg: 145 + breathe * 5,
        elbowRightDeg: -15,
        hipLeftDeg: -22,
        hipRightDeg: 18,
        overheadEmote: '⚔️',
      };

    case 'walk-confident':
      return {
        ...basePose,
        rootOffsetY: Math.abs(medOsc) * -6,
        torsoLeanDeg: 5,
        shoulderLeftDeg: medOsc * 35,
        elbowLeftDeg: -30,
        shoulderRightDeg: -medOsc * 35,
        elbowRightDeg: -30,
        hipLeftDeg: -medOsc * 32,
        kneeLeftDeg: Math.max(0, medOsc * 40),
        hipRightDeg: medOsc * 32,
        kneeRightDeg: Math.max(0, -medOsc * 40),
      };

    case 'point-at-board-side':
      return {
        ...basePose,
        torsoLeanDeg: -4,
        headTiltDeg: -8,
        shoulderLeftDeg: -20,
        elbowLeftDeg: -15,
        shoulderRightDeg: 80 + Math.sin(t * 3.0) * 10,
        elbowRightDeg: 15,
      };

    case 'facepalm-disappointed':
      return {
        ...basePose,
        torsoLeanDeg: 12 + breathe * 2,
        headTiltDeg: 25,
        shoulderLeftDeg: -25,
        elbowLeftDeg: -15,
        shoulderRightDeg: 135,
        elbowRightDeg: 110,
        overheadEmote: '🤦',
      };

    case 'eureka-lightbulb':
      return {
        ...basePose,
        torsoLeanDeg: -5,
        headTiltDeg: -12,
        shoulderLeftDeg: -30,
        elbowLeftDeg: -20,
        shoulderRightDeg: 160 + breathe * 4,
        elbowRightDeg: -10,
        overheadEmote: '💡',
      };

    case 'typing-furious':
      return {
        ...basePose,
        torsoLeanDeg: 15 + Math.sin(t * 8.0) * 2,
        headTiltDeg: 15,
        shoulderLeftDeg: -45,
        elbowLeftDeg: -85 + fastOsc * 15,
        shoulderRightDeg: 45,
        elbowRightDeg: 85 - fastOsc * 15,
      };

    case 'telescope-observe':
      return {
        ...basePose,
        torsoLeanDeg: -10,
        headTiltDeg: -20,
        shoulderLeftDeg: -60,
        elbowLeftDeg: -70,
        shoulderRightDeg: 75,
        elbowRightDeg: 80,
      };

    case 'lore-scroll-read':
      return {
        ...basePose,
        torsoLeanDeg: 8 + breathe * 2,
        headTiltDeg: 18,
        shoulderLeftDeg: -50,
        elbowLeftDeg: -65,
        shoulderRightDeg: 50,
        elbowRightDeg: 65,
        overheadEmote: '📜',
      };

    case 'bowtie-adjust-smug':
      return {
        ...basePose,
        torsoLeanDeg: -8,
        headTiltDeg: -5 + Math.sin(t * 2.0) * 4,
        shoulderLeftDeg: -70 + medOsc * 10,
        elbowLeftDeg: -100,
        shoulderRightDeg: 70 - medOsc * 10,
        elbowRightDeg: 100,
      };

    case 'run-flee-danger':
      return {
        ...basePose,
        rootOffsetY: Math.abs(fastOsc) * -14,
        torsoLeanDeg: 22,
        shoulderLeftDeg: -120 + fastOsc * 45,
        elbowLeftDeg: -60,
        shoulderRightDeg: 120 - fastOsc * 45,
        elbowRightDeg: 60,
        hipLeftDeg: -fastOsc * 55,
        kneeLeftDeg: Math.max(0, fastOsc * 70),
        hipRightDeg: fastOsc * 55,
        kneeRightDeg: Math.max(0, -fastOsc * 70),
        overheadEmote: '💨',
      };

    default:
      return basePose;
  }
}

/**
 * Zero-AI Rule Engine: Automatically picks the best MoveSetId for a spoken sentence
 * without spending a single LLM token!
 */
export function inferMoveSetFromTranscriptLine(spokenText: string): MoveSetId {
  const normalized = spokenText.toLowerCase();
  for (const item of MOVE_SET_CATALOG) {
    for (const kw of item.autoTriggerKeywords) {
      if (normalized.includes(kw.toLowerCase())) {
        return item.id;
      }
    }
  }
  return 'talk-explain-gestures';
}

