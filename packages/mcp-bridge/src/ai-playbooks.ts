/**
 * @file ai-playbooks.ts
 * @description Standard Operating Procedures (SOPs / "Mô thức quy trình dùng App") for AI Agents & Hybrid Production.
 *
 * Solves the "Blind Full-AI Token Burn" problem:
 * Instead of forcing AI to reinvent animations from scratch or call heavy generative models on every frame,
 * these Playbooks teach any connected AI Agent (or the built-in Rule Engine) HOW to combine:
 *   1. Pre-built Stickman/Character Move Sets (`packages/stage-engine/src/puppet-rig.ts`)
 *   2. Pre-built 2.5D Camera Choreography Rigs (`packages/stage-engine/src/camera-choreography.ts`)
 *   3. Pre-built Genre Widgets & Particle Atmospheres (`packages/stage-engine/src/genre-kits.ts`)
 *   4. Targeted Web/Stock Asset Hunting & Heavy Neural VFX ONLY on Hero/Climax shots!
 */

import { VideoGenreKitId } from '../../stage-engine/src/genre-kits';

export type ProductionAutonomyTier =
  | 'tier-0-zero-ai'       // ⚡ 0 Token AI: 100% Deterministic Keyword Rule Compiler + Built-in Move Sets & Camera Rigs
  | 'tier-1-eco-puppeteer' // 🎭 Siêu Tiết Kiệm Token (~90% Sân khấu/Người que có sẵn + AI chỉ đạo diễn JSON <100 tokens/cảnh)
  | 'tier-2-hybrid-pro'    // ⚖️ Hybrid Chuẩn (80% Built-in Stage/Move Sets + 20% Web Asset Hunter & 3D Depth Parallax cho cảnh đinh)
  | 'tier-3-full-ai-max';  // 🔥 100% Full AI Hạng Nặng (Bung toàn bộ SAM 2.1, Video-Depth 3D, Code-as-Motion, VLM Critic, AI Video Gen)

export interface AIProductionPlaybook {
  readonly id: string;
  readonly nameVi: string;
  readonly targetGenre: VideoGenreKitId | 'all-purpose-cinematic';
  readonly recommendedTier: ProductionAutonomyTier;
  readonly estimatedTokensPerMinuteOfVideo: number;
  readonly pacingRuleSecPerBeat: { readonly min: number; readonly max: number };
  /** Step-by-step SOP injected directly into the Director & Sub-Agent System Prompts */
  readonly systemPromptSopVi: string;
  /** Ordered sequence of MCP Tools the AI should prioritize */
  readonly prioritizedMcpToolSequence: readonly string[];
  /** Rules on when to use Built-in Deterministic Stage vs Heavy AI */
  readonly resourceAllocationPolicy: {
    readonly builtInStageAndPuppetPercent: number;
    readonly webStockAndArticlePercent: number;
    readonly heavyGenerativeAndNeuralVfxPercent: number;
  };
}

export const STUDIO_AI_PLAYBOOKS: readonly AIProductionPlaybook[] = [
  // ============================================================================
  // 1. MÔ THỨC KINH TẾ / TÀI CHÍNH / NGƯỜI QUE (CASUALLY EXPLAINED / OVER-SIMPLIFIED)
  // ============================================================================
  {
    id: 'playbook.economics-stickman-master',
    nameVi: '📈 Mô Thức Kinh Tế & Người Que (Nhanh, Hài Hước, Tối Ưu Token)',
    targetGenre: 'economics-stickman',
    recommendedTier: 'tier-1-eco-puppeteer',
    estimatedTokensPerMinuteOfVideo: 650,
    pacingRuleSecPerBeat: { min: 2.5, max: 4.5 },
    resourceAllocationPolicy: {
      builtInStageAndPuppetPercent: 80,
      webStockAndArticlePercent: 15,
      heavyGenerativeAndNeuralVfxPercent: 5,
    },
    prioritizedMcpToolSequence: [
      'audio.transcribe_and_build_dynamic_captions',
      'stage.compile_deterministic_draft',
      'stage.compose_choreographed_scene',
      'hunter.capture_news_article_highlight',
      'audio.master_mix_beat_sync_and_sfx',
    ],
    systemPromptSopVi: `
[MÔ THỨC QUY TRÌNH DÙNG APP: VIDEO KINH TẾ / TÀI CHÍNH NGƯỜI QUE]
1. NGUYÊN TẮC CỐT LÕI (KHÔNG ĐỐT TOKEN VÔ ÍCH):
   - Tuyệt đối KHÔNG tự viết code React/Shader dài dòng cho các cảnh giải thích thông thường.
   - Luôn gọi 'stage.compile_deterministic_draft' trước để dựng khung 100% các phân cảnh bằng bộ 'economics-stickman' có sẵn trong 5ms.
2. CÁCH ĐIỀU KHIỂN NHÂN VẬT & GÓC QUAY CÓ SẴN:
   - Sử dụng nhân vật 'stickman-economist' và 'stickman-wallstreet'.
   - Cứ mỗi 3-4 giây (hoặc khi đổi ý trong câu thoại), đổi 'moveSet' của người que:
     + Khi giới thiệu khái niệm: dùng 'talk-explain-gestures' hoặc 'point-at-board-side' + góc máy 'whiteboard-pan-left-to-right'.
     + Khi nói về số liệu tăng vọt: dùng 'point-at-chart-high' + widget 'econ.supply-demand-curve' hoặc 'econ.inflation-money-stack'.
     + Khi nói về in tiền / FED / lạm phát: dùng 'money-printer-crank' + hạt 'particles.falling-dollar-bills'.
     + Khi thị trường sập / khủng hoảng / plot twist: dùng 'panic-head-grab' + góc máy 'crash-zoom-actor-face' + SFX 'sfx.impact-cinematic-boom'.
3. KHI NÀO MỚI DÙNG TÍNH NĂNG NẶNG:
   - Chỉ gọi 'hunter.capture_news_article_highlight' 1-2 lần trong video khi cần dẫn chứng một bài báo tài chính thật để tăng độ uy tín.
`.trim(),
  },

  // ============================================================================
  // 2. MÔ THỨC VŨ TRỤ / THIÊN VĂN / KHOA HỌC (KURZGESAGT / LEMMINO)
  // ============================================================================
  {
    id: 'playbook.universe-cosmic-odyssey',
    nameVi: '🌌 Mô Thức Vũ Trụ & Khoa Học (Đa Lớp 2.5D + Ảnh Thiên Văn 3D)',
    targetGenre: 'universe-cosmic',
    recommendedTier: 'tier-2-hybrid-pro',
    estimatedTokensPerMinuteOfVideo: 950,
    pacingRuleSecPerBeat: { min: 4.0, max: 6.5 },
    resourceAllocationPolicy: {
      builtInStageAndPuppetPercent: 65,
      webStockAndArticlePercent: 25,
      heavyGenerativeAndNeuralVfxPercent: 10,
    },
    prioritizedMcpToolSequence: [
      'audio.transcribe_and_build_dynamic_captions',
      'stage.compose_choreographed_scene',
      'hunter.search_and_score_media',
      'aivfx.convert_image_to_3d_parallax',
      'vfx.apply_shader_and_transition',
      'audio.master_mix_beat_sync_and_sfx',
    ],
    systemPromptSopVi: `
[MÔ THỨC QUY TRÌNH DÙNG APP: VIDEO VŨ TRỤ & KHOA HỌC]
1. SÂN KHẤU & GÓC QUAY CHỦ ĐẠO:
   - Sử dụng bộ kit 'universe-cosmic' với nền 'cosmic.deep-space-nebula' hoặc 'cosmic.event-horizon-blackhole' và hạt 'particles.nebula-stardust'.
   - Nhân vật dẫn chuyện: 'astronaut-explorer' với moveSet 'float-zero-gravity' hoặc 'telescope-observe'.
   - Ưu tiên các góc máy chuyển động chậm, sâu lắng: 'dolly-push-cosmic', 'dolly-pull-reveal' (khi so sánh kích thước thiên thể bằng widget 'cosmic.scale-comparison-spheres'), và 'multiplane-parallax-drift'.
2. KẾT HỢP ẢNH NASA/WEB VỚI 3D DEPTH PARALLAX:
   - Ở các cảnh miêu tả tinh vân, kính James Webb, hoặc bề mặt hành tinh: gọi 'hunter.search_and_score_media' tải ảnh độ phân giải cao từ NASA/Wikimedia, sau đó gọi 'aivfx.convert_image_to_3d_parallax' với preset 'slow-push-in-dof' để biến ảnh tĩnh thành cảnh quay 3D có chiều sâu.
`.trim(),
  },

  // ============================================================================
  // 3. MÔ THỨC LORE / LỊCH SỬ / ĐỊA CHÍNH TRỊ (VAATIVIDYA / KINGS & GENERALS)
  // ============================================================================
  {
    id: 'playbook.deep-lore-chronicle',
    nameVi: '📜 Mô Thức Deep Lore, Lịch Sử & Bản Đồ Chiến Thuật',
    targetGenre: 'lore-chronicle',
    recommendedTier: 'tier-1-eco-puppeteer',
    estimatedTokensPerMinuteOfVideo: 750,
    pacingRuleSecPerBeat: { min: 3.5, max: 5.5 },
    resourceAllocationPolicy: {
      builtInStageAndPuppetPercent: 75,
      webStockAndArticlePercent: 15,
      heavyGenerativeAndNeuralVfxPercent: 10,
    },
    prioritizedMcpToolSequence: [
      'audio.transcribe_and_build_dynamic_captions',
      'stage.compose_choreographed_scene',
      'hunter.search_and_score_media',
      'aivfx.convert_image_to_3d_parallax',
      'color.auto_match_and_grade',
      'audio.master_mix_beat_sync_and_sfx',
    ],
    systemPromptSopVi: `
[MÔ THỨC QUY TRÌNH DÙNG APP: VIDEO LORE / LỊCH SỬ / ĐỊA CHÍNH TRỊ]
1. SÂN KHẤU BẢN ĐỒ & SƠ ĐỒ PHE PHÁI CÓ SẴN:
   - Dùng kit 'lore-chronicle', nền 'lore.ancient-parchment-map' hoặc 'lore.tactical-war-room-table' kèm hạt lửa 'particles.torch-fire-embers'.
   - Khi kể về di chuyển quân đội / hành trình: dùng widget 'lore.animated-map-march-line' kết hợp góc máy nghiêng 3D 'isometric-tactical-tilt'.
   - Khi giải thích mối quan hệ nhân vật / huyết thống / các phe phái: dùng widget 'lore.faction-relation-web' + góc máy 'whiteboard-pan-left-to-right'.
   - Khi giới thiệu một nhân vật / boss / cổ vật quan trọng: bật góc máy 'spotlight-dark-focus' + widget 'lore.boss-item-stat-card' + nhân vật 'lore-chronicler-hooded' với moveSet 'lore-sword-raise' hoặc 'lore-scroll-read'.
`.trim(),
  },

  // ============================================================================
  // 4. MÔ THỨC FULL AI BLOCKBUSTER (100% SỨC MẠNH AI TỐI ĐA)
  // ============================================================================
  {
    id: 'playbook.full-ai-blockbuster-max',
    nameVi: '🔥 Mô Thức Full AI Điện Ảnh Tối Đa (Không Giới Hạn Hiệu Ứng)',
    targetGenre: 'all-purpose-cinematic',
    recommendedTier: 'tier-3-full-ai-max',
    estimatedTokensPerMinuteOfVideo: 4500,
    pacingRuleSecPerBeat: { min: 2.0, max: 4.0 },
    resourceAllocationPolicy: {
      builtInStageAndPuppetPercent: 25,
      webStockAndArticlePercent: 35,
      heavyGenerativeAndNeuralVfxPercent: 40,
    },
    prioritizedMcpToolSequence: [
      'audio.transcribe_and_build_dynamic_captions',
      'hunter.search_and_score_media',
      'hunter.capture_news_article_highlight',
      'aivfx.rotoscope_text_behind_subject',
      'aivfx.convert_image_to_3d_parallax',
      'motion.inject_procedural_graphic',
      'vfx.apply_shader_and_transition',
      'color.auto_match_and_grade',
      'audio.master_mix_beat_sync_and_sfx',
      'critic.inspect_rendered_preview',
      'youtube.generate_package_and_publish',
    ],
    systemPromptSopVi: `
[MÔ THỨC QUY TRÌNH DÙNG APP: FULL AI ĐIỆN ẢNH TỐI ĐA]
- Kích hoạt toàn bộ 6 Sub-Agents chạy song song.
- Bắt buộc dùng 'aivfx.rotoscope_text_behind_subject' (SAM 2.1) ở 5 giây Hook đầu tiên.
- Bắt buộc dùng 'aivfx.convert_image_to_3d_parallax' cho mọi ảnh tĩnh tải từ Web.
- Viết custom code đồ họa trong 'motion.inject_procedural_graphic' cho các phân đoạn dữ liệu phức tạp.
- Chạy vòng lặp 'critic.inspect_rendered_preview' (VLM Critic) cho tới khi điểm tổng >= 9.2/10 trước khi xuất bản YouTube.
`.trim(),
  },
];

