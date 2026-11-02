/**
 * @file WebCodecsDecoderPool.ts
 * @description Hardware-Accelerated VideoDecoder Pool learned from WeftCut architecture.
 * Manages concurrent hardware WebCodecs VideoDecoder instances, frame ring buffers,
 * instant scrubbing seeks, and zero-copy VideoFrame GPU transfers into WebGL/WebGPU canvases.
 */

export interface DecodedVideoFrameHandle {
  readonly frame: VideoFrame;
  readonly timestampUs: number;
  readonly durationUs?: number;
  readonly release: () => void;
}

export interface DecoderPoolConfig {
  /** Maximum number of active hardware video decoders kept warm in memory */
  readonly maxResidentDecoders: number;
  /** Frame ring buffer capacity per active clip (for smooth 60fps scrub & playback) */
  readonly ringBufferCapacity: number;
  /** Hardware acceleration preference ('prefer-hardware' | 'prefer-software') */
  readonly hardwareAcceleration: HardwareAcceleration;
}

export interface VideoTrackMetadata {
  readonly codec: string; // e.g., 'avc1.640028' (H.264 High 4.0), 'vp09.00.41.08', 'hev1.1.6.L93.B0'
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly colorSpace?: VideoColorSpaceInit;
  readonly description?: Uint8Array | ArrayBuffer;
}

interface ResidentDecoderEntry {
  readonly clipId: string;
  readonly sourceUrl: string;
  decoder: VideoDecoder | null;
  lastAccessTs: number;
  frameRing: Map<number, VideoFrame>; // timestampUs -> VideoFrame
  isConfigured: boolean;
  metadata: VideoTrackMetadata;
}

/**
 * WeftCut-Style WebCodecs Hardware Decoder Pool
 */
export class WebCodecsDecoderPool {
  private readonly config: DecoderPoolConfig;
  private readonly residentDecoders: Map<string, ResidentDecoderEntry> = new Map();
  private isSupported: boolean;

  constructor(customConfig?: Partial<DecoderPoolConfig>) {
    this.config = {
      maxResidentDecoders: 6,
      ringBufferCapacity: 16,
      hardwareAcceleration: 'prefer-hardware',
      ...customConfig,
    };

    this.isSupported = typeof window !== 'undefined' && 'VideoDecoder' in window;
    if (!this.isSupported) {
      console.warn('[WebCodecsDecoderPool] WebCodecs API not detected. Falling back to HTML5 Video Element.');
    }
  }

  /**
   * Check if hardware WebCodecs decoding is supported on the client browser/environment.
   */
  public hasHardwareWebCodecs(): boolean {
    return this.isSupported;
  }

  /**
   * Register or warm up a video stream decoder for a timeline clip.
   */
  public async prepareDecoder(
    clipId: string,
    sourceUrl: string,
    metadata: VideoTrackMetadata
  ): Promise<boolean> {
    if (!this.isSupported) return false;

    // Return true if already resident
    if (this.residentDecoders.has(clipId)) {
      const entry = this.residentDecoders.get(clipId)!;
      entry.lastAccessTs = Date.now();
      return true;
    }

    // Evict oldest decoder if capacity exceeded
    this.evictLruDecoderIfNecessary();

    // Verify codec support with VideoDecoder.isConfigSupported
    try {
      const support = await VideoDecoder.isConfigSupported({
        codec: metadata.codec,
        codedWidth: metadata.codedWidth,
        codedHeight: metadata.codedHeight,
        hardwareAcceleration: this.config.hardwareAcceleration,
      });

      if (!support.supported) {
        console.warn(`[WebCodecsDecoderPool] Codec '${metadata.codec}' unsupported by hardware decoder.`);
        return false;
      }
    } catch (err) {
      console.warn('[WebCodecsDecoderPool] Error checking config support:', err);
    }

    // Allocate frame ring and resident slot
    const entry: ResidentDecoderEntry = {
      clipId,
      sourceUrl,
      decoder: null,
      lastAccessTs: Date.now(),
      frameRing: new Map(),
      isConfigured: false,
      metadata,
    };

    // Instantiate native VideoDecoder with ring buffer collector
    entry.decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        const tsUs = frame.timestamp;
        // Keep within ring buffer capacity
        if (entry.frameRing.size >= this.config.ringBufferCapacity) {
          const oldestKey = entry.frameRing.keys().next().value;
          if (oldestKey !== undefined) {
            const oldFrame = entry.frameRing.get(oldestKey);
            oldFrame?.close();
            entry.frameRing.delete(oldestKey);
          }
        }
        entry.frameRing.set(tsUs, frame);
      },
      error: (e: DOMException) => {
        console.error(`[WebCodecsDecoderPool] Decode error on clip '${clipId}':`, e);
      },
    });

    try {
      entry.decoder.configure({
        codec: metadata.codec,
        codedWidth: metadata.codedWidth,
        codedHeight: metadata.codedHeight,
        description: metadata.description,
        hardwareAcceleration: this.config.hardwareAcceleration,
      });
      entry.isConfigured = true;
    } catch (cfgError) {
      console.error(`[WebCodecsDecoderPool] Failed to configure decoder for clip '${clipId}':`, cfgError);
      entry.decoder.close();
      entry.decoder = null;
      return false;
    }

    this.residentDecoders.set(clipId, entry);
    return true;
  }

  /**
   * Feed an encoded chunk into the hardware pipeline.
   */
  public decodeChunk(
    clipId: string,
    data: BufferSource,
    type: 'key' | 'delta',
    timestampUs: number,
    durationUs?: number
  ): void {
    const entry = this.residentDecoders.get(clipId);
    if (!entry || !entry.decoder || !entry.isConfigured) return;

    entry.lastAccessTs = Date.now();
    try {
      const chunk = new EncodedVideoChunk({
        type,
        timestamp: timestampUs,
        duration: durationUs,
        data,
      });
      entry.decoder.decode(chunk);
    } catch (err) {
      console.error(`[WebCodecsDecoderPool] Failed to feed chunk to clip '${clipId}':`, err);
    }
  }

  /**
   * Acquire closest decoded frame at target timestamp for real-time canvas rendering.
   */
  public acquireNearestFrame(
    clipId: string,
    targetTimestampUs: number,
    toleranceUs: number = 50_000 // 50ms window
  ): DecodedVideoFrameHandle | null {
    const entry = this.residentDecoders.get(clipId);
    if (!entry || entry.frameRing.size === 0) return null;

    entry.lastAccessTs = Date.now();

    let bestTs: number | null = null;
    let minDelta = Infinity;

    for (const ts of entry.frameRing.keys()) {
      const delta = Math.abs(ts - targetTimestampUs);
      if (delta < minDelta && delta <= toleranceUs) {
        minDelta = delta;
        bestTs = ts;
      }
    }

    if (bestTs === null) return null;

    const frame = entry.frameRing.get(bestTs)!;
    // Clone frame handle so the caller can safely hold it without racing ring eviction
    try {
      const clonedFrame = frame.clone();
      return {
        frame: clonedFrame,
        timestampUs: clonedFrame.timestamp,
        durationUs: clonedFrame.duration || undefined,
        release: () => clonedFrame.close(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Release and dispose a specific clip's decoder and its ring buffer.
   */
  public releaseClip(clipId: string): void {
    const entry = this.residentDecoders.get(clipId);
    if (!entry) return;

    // Close all ring buffer frames
    for (const frame of entry.frameRing.values()) {
      try {
        frame.close();
      } catch {}
    }
    entry.frameRing.clear();

    if (entry.decoder) {
      try {
        if (entry.decoder.state !== 'closed') {
          entry.decoder.close();
        }
      } catch {}
      entry.decoder = null;
    }

    this.residentDecoders.delete(clipId);
  }

  /**
   * Release all resident decoders on project switch / unload.
   */
  public disposeAll(): void {
    for (const clipId of Array.from(this.residentDecoders.keys())) {
      this.releaseClip(clipId);
    }
  }

  private evictLruDecoderIfNecessary(): void {
    if (this.residentDecoders.size < this.config.maxResidentDecoders) return;

    let oldestClipId: string | null = null;
    let oldestTs = Infinity;

    for (const [clipId, entry] of this.residentDecoders.entries()) {
      if (entry.lastAccessTs < oldestTs) {
        oldestTs = entry.lastAccessTs;
        oldestClipId = clipId;
      }
    }

    if (oldestClipId) {
      this.releaseClip(oldestClipId);
    }
  }
}

// Global shared singleton for ProgramMonitor & WebGPU Render
export const sharedDecoderPool = new WebCodecsDecoderPool();

