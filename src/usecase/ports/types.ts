/**
 * Common Types for Usecase Layer Ports
 *
 * This file contains shared types used across repository and gateway ports.
 * These types define the contracts between Usecase and Infrastructure layers.
 */

import type { Edition, EditionValue } from '../../domain/value-objects/edition.js';
import type { Version } from '../../domain/value-objects/version.js';
import type { FileFormat } from '../../domain/value-objects/file-format.js';
import type { SizeCategoryValue } from '../../domain/value-objects/dimensions.js';

// ========================================
// Pagination Types
// ========================================

/**
 * Paginated result wrapper for list operations
 */
export interface PaginatedResult<T> {
  /** Array of items for the current page */
  readonly items: readonly T[];
  /** Total number of items across all pages */
  readonly total: number;
  /** Current page number (1-based) */
  readonly page: number;
  /** Number of items per page */
  readonly limit: number;
  /** Whether there are more pages */
  readonly hasMore: boolean;
}

// ========================================
// Query Types
// ========================================

/**
 * Sort options for post search
 */
export type PostSortBy = 'popular' | 'newest' | 'downloads';

/**
 * Time period filter for post search
 */
export type CreatedWithin = '1day' | '1week' | '1month' | 'all';

/**
 * Post search query parameters
 *
 * Based on docs/contracts/dtos.md PostQuery definition
 */
export interface PostQuery {
  /** Keyword search (title/description/tags) */
  readonly keyword?: string;
  /** Filter by editions */
  readonly edition?: readonly EditionValue[];
  /** Filter by versions */
  readonly version?: readonly string[];
  /** Filter by size category */
  readonly sizeCategory?: readonly SizeCategoryValue[];
  /** Filter by presence of required mods */
  readonly hasRequiredMods?: boolean;
  /** Filter by author */
  readonly authorId?: string;
  /** Filter by creation time period */
  readonly createdWithin?: CreatedWithin;
  /** Sort order */
  readonly sortBy?: PostSortBy;
  /** Page number (1-based) */
  readonly page?: number;
  /** Items per page (1-100) */
  readonly limit?: number;
}

// ========================================
// Structure Conversion Types
// ========================================

/**
 * Raw structure data (binary format)
 * The actual structure is implementation-dependent (Infra layer)
 */
export interface StructureData {
  /** Raw binary content */
  readonly content: Uint8Array;
  /** File format of the data */
  readonly format: FileFormat;
  /** Optional structure ID for cached data lookup */
  readonly structureId?: string;
}

/**
 * Metadata extracted from a structure file
 */
export interface StructureMetadata {
  /** Dimensions in blocks */
  readonly dimensions: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  /** Total block count (non-air) */
  readonly blockCount: number;
  /** List of unique block IDs used */
  readonly usedBlocks: readonly string[];
  /** Detected edition (if determinable) */
  readonly detectedEdition?: Edition;
  /** Detected version (if determinable) */
  readonly detectedVersion?: Version;
}

/**
 * Block that was converted to air during edition/version conversion
 */
export interface ConvertedBlock {
  /** Original block ID */
  readonly blockId: string;
  /** Number of blocks converted */
  readonly count: number;
  /** Reason for conversion */
  readonly reason: string;
}

/**
 * Result of structure conversion
 */
export interface ConversionResult {
  /** Converted structure data */
  readonly data: StructureData;
  /** Blocks that were converted to air */
  readonly convertedBlocks: readonly ConvertedBlock[];
  /** Whether any data was lost during conversion */
  readonly hasDataLoss: boolean;
}

// ========================================
// Rendering Types
// ========================================

/**
 * Level of Detail for 3D rendering
 */
export type LodLevel = 'full' | 'high' | 'medium' | 'low' | 'preview';

/**
 * Block shape type for rendering
 */
export type BlockShape =
  | 'full' | 'stairs' | 'slab' | 'fence' | 'wall' | 'door' | 'trapdoor'
  | 'pressure_plate' | 'button' | 'torch' | 'wall_torch' | 'carpet' | 'glass_pane' | 'chain'
  | 'lantern' | 'hanging_lantern' | 'cross' | 'lever' | 'sign' | 'banner' | 'bed' | 'chest'
  | 'anvil' | 'cauldron' | 'hopper' | 'brewing_stand' | 'enchanting_table'
  | 'end_portal_frame' | 'dragon_egg' | 'bell' | 'campfire' | 'grindstone'
  | 'lectern' | 'stonecutter' | 'composter' | 'beehive' | 'candle'
  | 'amethyst_cluster' | 'pointed_dripstone' | 'sculk_sensor' | 'decorated_pot'
  | 'head' | 'flower_pot' | 'rail' | 'ladder' | 'snow_layer' | 'farmland'
  | 'path' | 'cake' | 'end_rod' | 'lightning_rod' | 'copper_grate' | 'heavy_core'
  | 'resin_clump' | 'vine' | 'hanging_moss' | 'trial_spawner' | 'vault'
  | 'crafter' | 'leaf_litter' | 'custom';

/**
 * Block facing direction
 */
export type BlockFacing = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/**
 * Block half position (for slabs and stairs)
 */
export type BlockHalf = 'top' | 'bottom';

/**
 * Stair connection shape
 */
export type StairShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';

/**
 * Wall connection height
 */
export type WallHeight = 'none' | 'low' | 'tall';

/**
 * Block connection state for connectable blocks (walls, fences, glass panes)
 */
export interface BlockConnections {
  readonly north?: boolean | WallHeight;
  readonly south?: boolean | WallHeight;
  readonly east?: boolean | WallHeight;
  readonly west?: boolean | WallHeight;
  readonly up?: boolean;
}

/**
 * Block position and palette index for rendering
 */
export interface RenderBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly paletteIndex: number;
  /** Block shape (defaults to 'full') */
  readonly shape?: BlockShape;
  /** Block facing direction */
  readonly facing?: BlockFacing;
  /** Half position for slabs/stairs */
  readonly half?: BlockHalf;
  /** Stair connection shape */
  readonly stairShape?: StairShape;
  /** Connection state for walls, fences, glass panes */
  readonly connections?: BlockConnections;
}

/**
 * Block palette entry
 */
export interface PaletteEntry {
  readonly name: string;
  /** Block state properties */
  readonly properties?: Readonly<Record<string, string>>;
}

/**
 * Render data for WebGL display (block-based format)
 */
export interface RenderData {
  /** Structure dimensions */
  readonly dimensions: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  /** Block positions with palette indices */
  readonly blocks: readonly RenderBlock[];
  /** Block palette (block names) */
  readonly palette: readonly PaletteEntry[];
  /** LOD level of this render data */
  readonly lodLevel: LodLevel;
}

/**
 * Texture atlas for block rendering
 */
export interface TextureAtlas {
  /** Atlas image data (PNG) */
  readonly imageData: Uint8Array;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** UV mapping for each block ID */
  readonly uvMapping: Readonly<Record<string, {
    readonly u: number;
    readonly v: number;
    readonly width: number;
    readonly height: number;
  }>>;
}

// ========================================
// Notification Types
// ========================================

/**
 * Type of notification
 */
export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'system';

/**
 * Payload for sending notifications
 */
export interface NotificationPayload {
  /** Type of notification */
  readonly type: NotificationType;
  /** Notification title */
  readonly title: string;
  /** Notification body/message */
  readonly body: string;
  /** URL to navigate to when notification is clicked */
  readonly actionUrl?: string;
  /** Additional metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Result of bulk notification operation
 */
export interface BulkNotificationResult {
  /** Number of notifications sent successfully */
  readonly successCount: number;
  /** Number of notifications that failed */
  readonly failureCount: number;
  /** IDs of users that failed to receive notification */
  readonly failedUserIds: readonly string[];
}

// ========================================
// Spam Detection Types
// ========================================

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the action is allowed */
  readonly allowed: boolean;
  /** Seconds until rate limit resets (if not allowed) */
  readonly retryAfter?: number;
  /** Current count in the rate limit window */
  readonly currentCount?: number;
  /** Maximum allowed count in the rate limit window */
  readonly maxCount?: number;
}

/**
 * Result of content moderation check
 */
export interface ContentCheckResult {
  /** Whether the content is allowed */
  readonly allowed: boolean;
  /** Reason for rejection (if not allowed) */
  readonly reason?: string;
  /** Confidence score (0-1) */
  readonly confidence?: number;
  /** Categories of detected violations */
  readonly categories?: readonly string[];
}

// ========================================
// Error Types
// ========================================

// ========================================
// Export Types
// ========================================

/**
 * Result of structure export to a specific file format
 */
export interface ExportResult {
  /** Exported binary data */
  readonly data: Uint8Array;
  /** Target file format */
  readonly format: FileFormat;
  /** Suggested file name */
  readonly fileName: string;
  /** Whether any data was lost during conversion */
  readonly hasDataLoss: boolean;
  /** Blocks that were lost (converted to air) */
  readonly lostBlocks: readonly ConvertedBlock[];
}

// ========================================
// Error Types
// ========================================

/**
 * Port operation error codes
 */
export type PortErrorCode =
  // Storage errors
  | 'STORAGE_ERROR'
  | 'NOT_FOUND'
  // User errors
  | 'DUPLICATE_EMAIL'
  // Conversion errors
  | 'UNSUPPORTED_VERSION'
  | 'CONVERSION_FAILED'
  | 'INVALID_FORMAT'
  | 'PARSE_ERROR'
  // Export errors
  | 'UNSUPPORTED_CONVERSION'
  | 'EXPORT_FAILED'
  // Rendering errors
  | 'GENERATION_FAILED'
  | 'INVALID_RESOURCE_PACK'
  | 'FETCH_FAILED'
  // Communication errors
  | 'SEND_FAILED'
  | 'INVALID_PHONE_NUMBER';

/**
 * Error thrown by port operations
 */
export class PortError extends Error {
  public override readonly name = 'PortError';

  constructor(
    public readonly code: PortErrorCode,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, PortError.prototype);
  }
}
