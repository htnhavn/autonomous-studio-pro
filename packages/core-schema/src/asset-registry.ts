/**
 * @file asset-registry.ts
 * @description Unified Asset Registry & Asset Intelligence Layer.
 * Enforces stable asset IDs, content hashing (SHA-256 deduplication), license & attribution
 * tracking, download state management, usage references, and built-in pre-assets.
 */

import { RationalTime } from './rational-time';

export type AssetCategory =
  | 'video'
  | 'audio-voice'
  | 'audio-music'
  | 'audio-sfx'
  | 'image'
  | 'vector-graphic'
  | 'font'
  | 'character-rig'
  | 'animation-clip'
  | 'stage-backdrop'
  | 'model-3d-gltf';

export type AssetSourceKind =
  | 'built-in-preasset'
  | 'user-local'
  | 'stock-pexels'
  | 'stock-pixabay'
  | 'stock-unsplash'
  | 'stock-freesound'
  | 'generated-local-worker';

export type AssetDownloadStatus =
  | 'ready-local'
  | 'pending-download'
  | 'downloading'
  | 'failed'
  | 'missing-on-disk';

export type AssetLicenseKind =
  | 'first-party-mit'
  | 'cc0-public-domain'
  | 'cc-by-4.0'
  | 'pexels-license'
  | 'pixabay-license'
  | 'unsplash-license'
  | 'user-owned-commercial'
  | 'restricted-unknown';

export interface AssetLicenseMetadata {
  readonly licenseKind: AssetLicenseKind;
  readonly commercialUseAllowed: boolean;
  readonly attributionRequired: boolean;
  readonly attributionText?: string;
  readonly creatorName?: string;
  readonly sourceTermsUrl?: string;
}

export interface AssetDimensions {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly aspectRatioLabel: string;
}

export interface AssetRegistryEntry {
  readonly assetId: string;
  readonly name: string;
  readonly category: AssetCategory;
  readonly mimeType: string;
  readonly sourceKind: AssetSourceKind;
  readonly originalUrl?: string;
  readonly localFilePath: string;
  readonly downloadStatus: AssetDownloadStatus;
  /** SHA-256 hex digest of asset content (or deterministic URI fingerprint) for duplicate detection */
  readonly sha256Hash: string;
  readonly fileSizeBytes?: number;
  readonly dimensions?: AssetDimensions;
  readonly duration?: RationalTime;
  readonly frameRate?: number;
  readonly semanticTags: readonly string[];
  readonly visualDescription: string;
  readonly license: AssetLicenseMetadata;
  readonly previewThumbnailPath?: string;
  /** Scene IDs and Clip IDs that reference this asset */
  readonly usageReferences: {
    readonly sceneIds: readonly string[];
    readonly clipIds: readonly string[];
  };
  readonly createdAtIso: string;
}

/**
 * Built-in Pre-Assets shipped with Autonomous Studio Pro.
 * 100% clean first-party MIT provenance; available offline with 0 AI tokens.
 */
export const BUILT_IN_PRE_ASSETS: readonly AssetRegistryEntry[] = [
  {
    assetId: 'preasset.char.stickman-economist',
    name: 'Stickman Economist (Red Tie)',
    category: 'character-rig',
    mimeType: 'application/vnd.studio.character+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://characters/stickman-economist',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_char_stickman_economist_v1',
    semanticTags: ['stickman', 'economist', 'presenter', 'finance', '2d-character'],
    visualDescription: 'Classic 2D skeletal stickman presenter wearing a red tie with expressive eyes and pointer stick.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.char.stickman-astronaut',
    name: 'Stickman Astronaut (Visor Helmet)',
    category: 'character-rig',
    mimeType: 'application/vnd.studio.character+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://characters/stickman-astronaut',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_char_stickman_astronaut_v1',
    semanticTags: ['stickman', 'astronaut', 'space', 'science', 'cosmic', '2d-character'],
    visualDescription: '2D skeletal stickman in a space helmet suitable for zero-gravity cosmic science explainers.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.char.stickman-lore-scholar',
    name: 'Stickman Lore Scholar & Knight',
    category: 'character-rig',
    mimeType: 'application/vnd.studio.character+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://characters/stickman-lore-scholar',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_char_stickman_lore_v1',
    semanticTags: ['stickman', 'lore', 'history', 'knight', 'scholar', '2d-character'],
    visualDescription: '2D skeletal stickman historian/knight with ancient scroll and glowing sword props.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.bg.econ-chalkboard-grid',
    name: 'Economics Chalkboard & Terminal Grid',
    category: 'stage-backdrop',
    mimeType: 'application/vnd.studio.backdrop+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://backdrops/econ-chalkboard-grid',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_bg_econ_chalkboard_v1',
    dimensions: { widthPx: 1920, heightPx: 1080, aspectRatioLabel: '16:9' },
    semanticTags: ['background', 'economics', 'chalkboard', 'grid', 'finance'],
    visualDescription: 'Dark slate chalkboard with glowing emerald financial terminal grid lines.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.bg.cosmic-deep-nebula',
    name: 'Deep Space Nebula & Event Horizon',
    category: 'stage-backdrop',
    mimeType: 'application/vnd.studio.backdrop+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://backdrops/cosmic-deep-nebula',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_bg_cosmic_nebula_v1',
    dimensions: { widthPx: 1920, heightPx: 1080, aspectRatioLabel: '16:9' },
    semanticTags: ['background', 'space', 'nebula', 'universe', 'black-hole'],
    visualDescription: 'Deep space starfield with cyan-violet nebula clouds and gravitational lens ring.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.bg.lore-parchment-map',
    name: 'Ancient Parchment War Map',
    category: 'stage-backdrop',
    mimeType: 'application/vnd.studio.backdrop+json',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://backdrops/lore-parchment-map',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_bg_lore_map_v1',
    dimensions: { widthPx: 1920, heightPx: 1080, aspectRatioLabel: '16:9' },
    semanticTags: ['background', 'lore', 'history', 'map', 'parchment'],
    visualDescription: 'Warm weathered parchment map with compass rose and tactical terrain contours.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
  {
    assetId: 'preasset.sfx.whoosh-transition',
    name: 'Cinematic Whoosh Transition SFX',
    category: 'audio-sfx',
    mimeType: 'audio/wav',
    sourceKind: 'built-in-preasset',
    localFilePath: 'builtin://sfx/whoosh-transition.wav',
    downloadStatus: 'ready-local',
    sha256Hash: 'sha256_builtin_sfx_whoosh_v1',
    duration: { value: 30, rate: 60 },
    semanticTags: ['sfx', 'whoosh', 'transition', 'pan'],
    visualDescription: 'Clean air whoosh sound effect for whip-pans and slide transitions.',
    license: {
      licenseKind: 'first-party-mit',
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    usageReferences: { sceneIds: [], clipIds: [] },
    createdAtIso: '2026-11-03T00:00:00Z',
  },
];

export interface AssetRegistrationResult {
  readonly entry: AssetRegistryEntry;
  readonly deduplicatedExisting: boolean;
  readonly registry: Record<string, AssetRegistryEntry>;
}

/**
 * Registers an asset in the unified registry, performing automatic duplicate detection
 * by `sha256Hash` or `originalUrl` so the same stock image/video is never downloaded twice.
 */
export function registerAssetInRegistry(
  registry: Record<string, AssetRegistryEntry>,
  candidate: AssetRegistryEntry
): AssetRegistrationResult {
  // Check by exact assetId first
  if (registry[candidate.assetId]) {
    return {
      entry: registry[candidate.assetId],
      deduplicatedExisting: true,
      registry,
    };
  }

  // Check by SHA-256 hash or canonical original URL
  for (const existing of Object.values(registry)) {
    const sameHash =
      Boolean(candidate.sha256Hash) &&
      existing.sha256Hash === candidate.sha256Hash;
    const sameSourceUrl =
      Boolean(candidate.originalUrl) &&
      existing.originalUrl === candidate.originalUrl;

    if (sameHash || sameSourceUrl) {
      return {
        entry: existing,
        deduplicatedExisting: true,
        registry,
      };
    }
  }

  return {
    entry: candidate,
    deduplicatedExisting: false,
    registry: {
      ...registry,
      [candidate.assetId]: candidate,
    },
  };
}

/**
 * Resolves the best matching asset from the registry given semantic tags and category.
 */
export function resolveAssetByQuery(
  registry: Record<string, AssetRegistryEntry>,
  queryTags: readonly string[],
  category?: AssetCategory
): AssetRegistryEntry | null {
  const normalizedTags = queryTags.map((t) => t.toLowerCase().trim()).filter(Boolean);
  let bestEntry: AssetRegistryEntry | null = null;
  let bestScore = -1;

  for (const entry of Object.values(registry)) {
    if (category && entry.category !== category) continue;
    if (!entry.license.commercialUseAllowed) continue;

    let score = 0;
    const entryTagSet = new Set(entry.semanticTags.map((t) => t.toLowerCase()));
    const descLower = entry.visualDescription.toLowerCase();

    for (const q of normalizedTags) {
      if (entryTagSet.has(q)) score += 3;
      else if (descLower.includes(q)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestEntry;
}

/**
 * Creates a default AssetRegistry seeded with all built-in pre-assets.
 */
export function createDefaultAssetRegistry(): Record<string, AssetRegistryEntry> {
  const map: Record<string, AssetRegistryEntry> = {};
  for (const item of BUILT_IN_PRE_ASSETS) {
    map[item.assetId] = item;
  }
  return map;
}

