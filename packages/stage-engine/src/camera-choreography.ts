/**
 * @file camera-choreography.ts
 * @description Pre-built Virtual 2.5D Multi-Plane Camera Rigs & Choreography Presets.
 * Gives both Zero-AI Rule Engines and Low-Token AI Agents instant cinematic camera control
 * (Dolly Push, Multiplane Parallax, Crash Zoom, Spotlight Focus, Whiteboard Pan, Isometric Map Tilt).
 */

export type CameraRigPresetId =
  | 'static-stage-wide'
  | 'dolly-push-cosmic'
  | 'dolly-pull-reveal'
  | 'multiplane-parallax-drift'
  | 'whiteboard-pan-left-to-right'
  | 'crash-zoom-actor-face'
  | 'spotlight-dark-focus'
  | 'split-screen-versus-duel'
  | 'isometric-tactical-tilt'
  | 'handheld-documentary-float'
  | 'vertigo-contra-zoom'
  | 'whip-pan-target-snap';

export interface EvaluatedCameraFrame {
  readonly zoom: number;
  /** Normalized pan [-1.0 .. +1.0] */
  readonly panX: number;
  readonly panY: number;
  readonly rotationDeg: number;
  /** 2.5D CSS/WebGPU perspective tilt in degrees */
  readonly tilt3DXDeg: number;
  readonly tilt3DYDeg: number;
  /** Foreground / Midground / Background parallax multiplier */
  readonly parallaxMultiplier: number;
  readonly vignetteStrength: number; // [0..1]
  readonly spotlightCenter?: { readonly x: number; readonly y: number; readonly radius: number };
}

export interface CameraRigMetadata {
  readonly id: CameraRigPresetId;
  readonly nameVi: string;
  readonly bestForGenre: readonly ('universe' | 'lore' | 'economics' | 'all')[];
  readonly descriptionVi: string;
}

export const CAMERA_RIG_CATALOG: readonly CameraRigMetadata[] = [
  {
    id: 'static-stage-wide',
    nameVi: 'Góc rộng Sân khấu Chuẩn (Wide Stage)',
    bestForGenre: ['all'],
    descriptionVi: 'Khung hình cố định thấy rõ nhân vật người que và bảng/biểu đồ bên cạnh.',
  },
  {
    id: 'dolly-push-cosmic',
    nameVi: 'Dolly Push Sâu Lắng (Kiểu Vũ trụ / Lemmino)',
    bestForGenre: ['universe', 'lore'],
    descriptionVi: 'Đẩy máy vào chậm rãi kết hợp tách lớp chiều sâu 2.5D tạo cảm giác vĩ đại.',
  },
  {
    id: 'dolly-pull-reveal',
    nameVi: 'Dolly Pull Lùi Ra Toàn Cảnh (Scale Reveal)',
    bestForGenre: ['universe', 'lore', 'economics'],
    descriptionVi: 'Bắt đầu cận cảnh rồi kéo lùi ra để lộ quy mô khổng lồ của thiên hà/bản đồ/nợ công.',
  },
  {
    id: 'multiplane-parallax-drift',
    nameVi: 'Trôi Đa Lớp 2.5D (Multi-Plane Parallax)',
    bestForGenre: ['universe', 'lore'],
    descriptionVi: 'Lớp tiền cảnh (bụi sao/cây cối), trung cảnh (nhân vật) và hậu cảnh trôi khác tốc độ.',
  },
  {
    id: 'whiteboard-pan-left-to-right',
    nameVi: 'Lia Máy Bảng Trắng Trái -> Phải (Explainer Pan)',
    bestForGenre: ['economics', 'lore'],
    descriptionVi: 'Lia mượt từ nhân vật thuyết trình sang sơ đồ mũi tên / biểu đồ bên phải.',
  },
  {
    id: 'crash-zoom-actor-face',
    nameVi: 'Crash Zoom Cận Mặt + Rung Chấn (Plot Twist / Hài)',
    bestForGenre: ['economics', 'all'],
    descriptionVi: 'Phóng cực nhanh vào biểu cảm hoảng loạn/ngơ ngác của người que kèm rung nhẹ.',
  },
  {
    id: 'spotlight-dark-focus',
    nameVi: 'Đèn Spotlight Chiếu Điểm Tối (Dramatic Focus)',
    bestForGenre: ['lore', 'economics', 'universe'],
    descriptionVi: 'Tối 80% toàn bộ sân khấu, chỉ rọi đèn tròn vào nhân vật hoặc con số quan trọng.',
  },
  {
    id: 'split-screen-versus-duel',
    nameVi: 'Chia Đôi Màn Hình Đối Đầu (Versus Duel)',
    bestForGenre: ['economics', 'lore'],
    descriptionVi: 'Đặt 2 phe hoặc 2 mô hình kinh tế/đế chế đối diện nhau với tia sét phân cách.',
  },
  {
    id: 'isometric-tactical-tilt',
    nameVi: 'Sa Bàn Chiến Thuật 3D Nghiêng (Isometric Map)',
    bestForGenre: ['lore', 'economics'],
    descriptionVi: 'Nghiêng mặt phẳng sân khấu/bản đồ 35 độ theo trục X như bàn cờ địa chính trị.',
  },
  {
    id: 'handheld-documentary-float',
    nameVi: 'Máy Cầm Tay Phóng Sự (Organic Handheld)',
    bestForGenre: ['all'],
    descriptionVi: 'Chuyển động thở tự nhiên của ống kính cầm tay giúp khung hình tĩnh luôn có sức sống.',
  },
  {
    id: 'vertigo-contra-zoom',
    nameVi: 'Hiệu Ứng Vertigo (Dolly Zoom Bí Ẩn)',
    bestForGenre: ['universe', 'lore'],
    descriptionVi: 'Chủ thể giữ nguyên kích thước trong khi hậu cảnh giãn nở tạo cảm giác choáng ngợp.',
  },
  {
    id: 'whip-pan-target-snap',
    nameVi: 'Quất Máy Chuyển Điểm (Whip-Pan Snap)',
    bestForGenre: ['economics', 'all'],
    descriptionVi: 'Quất máy cực nhanh có gia tốc Ease-Out Expo sang đối tượng tiếp theo.',
  },
];

/**
 * Deterministic evaluator returning exact camera transform values for any frame.
 */
export function evaluateCameraRigAtProgress(
  presetId: CameraRigPresetId,
  progress0to1: number,
  timeSec: number
): EvaluatedCameraFrame {
  const p = Math.min(1, Math.max(0, progress0to1));
  const smoothP = p * p * (3 - 2 * p); // Smoothstep
  const easeOutExpo = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);

  const base: EvaluatedCameraFrame = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotationDeg: 0,
    tilt3DXDeg: 0,
    tilt3DYDeg: 0,
    parallaxMultiplier: 1.0,
    vignetteStrength: 0.15,
  };

  switch (presetId) {
    case 'dolly-push-cosmic':
      return {
        ...base,
        zoom: 1.0 + p * 0.28,
        parallaxMultiplier: 1.6,
        vignetteStrength: 0.35,
      };

    case 'dolly-pull-reveal':
      return {
        ...base,
        zoom: 1.45 - smoothP * 0.45,
        parallaxMultiplier: 1.8,
        vignetteStrength: 0.25,
      };

    case 'multiplane-parallax-drift':
      return {
        ...base,
        zoom: 1.12,
        panX: -0.15 + p * 0.3,
        panY: Math.sin(timeSec * 0.8) * 0.03,
        tilt3DYDeg: -6 + p * 12,
        parallaxMultiplier: 2.2,
      };

    case 'whiteboard-pan-left-to-right':
      return {
        ...base,
        zoom: 1.18,
        panX: -0.25 + smoothP * 0.5,
      };

    case 'crash-zoom-actor-face': {
      const shake = p < 0.25 ? Math.sin(timeSec * 45) * 0.015 : 0;
      return {
        ...base,
        zoom: 1.0 + easeOutExpo * 0.65,
        panX: -0.18 + shake,
        panY: -0.12 - shake,
        rotationDeg: shake * 40,
        vignetteStrength: 0.4,
      };
    }

    case 'spotlight-dark-focus':
      return {
        ...base,
        zoom: 1.15,
        vignetteStrength: 0.85,
        spotlightCenter: { x: 0.5, y: 0.5, radius: 0.28 },
      };

    case 'isometric-tactical-tilt':
      return {
        ...base,
        zoom: 1.1 + p * 0.1,
        tilt3DXDeg: 28,
        tilt3DYDeg: -8 + p * 16,
        parallaxMultiplier: 1.5,
        vignetteStrength: 0.45,
      };

    case 'handheld-documentary-float':
      return {
        ...base,
        zoom: 1.05,
        panX: Math.sin(timeSec * 1.7) * 0.02,
        panY: Math.cos(timeSec * 2.3) * 0.015,
        rotationDeg: Math.sin(timeSec * 1.1) * 0.6,
      };

    case 'whip-pan-target-snap':
      return {
        ...base,
        zoom: 1.1,
        panX: (1 - easeOutExpo) * -0.6,
      };

    default:
      return base;
  }
}

