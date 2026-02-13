/**
 * TextureLoaderPort Interface
 *
 * Port interface for loading block textures for 3D rendering.
 * This port abstracts texture loading and management from the usecase layer.
 */

import type { BlockState } from '../../../domain/renderer/block-state.js';
import type { PortError } from '../types.js';

// ========================================
// Types
// ========================================

/**
 * UV coordinates for a texture region
 */
export interface UVCoordinates {
  /** U coordinate (horizontal, 0 = left) */
  readonly u: number;

  /** V coordinate (vertical, 0 = top) */
  readonly v: number;

  /** Width in pixels */
  readonly width: number;

  /** Height in pixels */
  readonly height: number;
}

/**
 * Block textures for all six faces
 */
export interface BlockTextures {
  /** Top face (+Y) texture */
  readonly top: UVCoordinates;

  /** Bottom face (-Y) texture */
  readonly bottom: UVCoordinates;

  /** North face (-Z) texture */
  readonly north: UVCoordinates;

  /** South face (+Z) texture */
  readonly south: UVCoordinates;

  /** East face (+X) texture */
  readonly east: UVCoordinates;

  /** West face (-X) texture */
  readonly west: UVCoordinates;
}

/**
 * Texture atlas containing all block textures
 */
export interface TextureAtlas {
  /** Raw texture data (RGBA) */
  readonly texture: Uint8Array;

  /** Atlas width in pixels */
  readonly width: number;

  /** Atlas height in pixels */
  readonly height: number;

  /** Size of each tile in pixels */
  readonly tileSize: number;

  /** Mapping from block ID to UV coordinates */
  readonly uvMapping: ReadonlyMap<string, UVCoordinates>;
}

/**
 * Result type for async operations
 */
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

// ========================================
// Port Interface
// ========================================

/**
 * TextureLoaderPort
 *
 * Interface for loading and managing block textures.
 *
 * @example
 * ```typescript
 * const result = await textureLoader.loadDefaultTextures();
 * if (result.success) {
 *   const atlas = result.value;
 *   console.log(`Loaded ${atlas.uvMapping.size} block textures`);
 *
 *   const stoneTextures = textureLoader.getBlockTexture(
 *     BlockState.create('minecraft:stone')
 *   );
 *   console.log(`Stone top UV: ${stoneTextures.top.u}, ${stoneTextures.top.v}`);
 * }
 * ```
 */
export interface TextureLoaderPort {
  /**
   * Loads the default Minecraft block textures
   *
   * This method:
   * - Loads the texture atlas image
   * - Parses UV mappings for all blocks
   * - Handles animated textures
   *
   * @returns Texture atlas with all block textures
   *
   * @throws Never - errors are returned as Result
   *
   * Possible errors:
   * - FETCH_FAILED: Failed to load texture file
   * - INVALID_FORMAT: Invalid texture format
   */
  loadDefaultTextures(): Promise<Result<TextureAtlas, PortError>>;

  /**
   * Gets textures for a specific block state
   *
   * This method:
   * - Looks up textures by block ID
   * - Handles directional blocks (stairs, logs, etc.)
   * - Returns fallback texture for unknown blocks
   *
   * @param blockState - Block state to get textures for
   * @returns Block textures for all six faces
   */
  getBlockTexture(blockState: BlockState): BlockTextures;
}
