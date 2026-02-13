/**
 * Texture Types
 *
 * Type definitions for texture mode rendering.
 */

/**
 * UV coordinates for a texture in the atlas
 */
export interface UVCoords {
  /** U min (0-1) */
  readonly u1: number;
  /** V min (0-1) */
  readonly v1: number;
  /** U max (0-1) */
  readonly u2: number;
  /** V max (0-1) */
  readonly v2: number;
}

/**
 * Face texture mapping for a block
 */
export interface BlockFaceTextures {
  readonly top: UVCoords;
  readonly bottom: UVCoords;
  readonly north: UVCoords;
  readonly south: UVCoords;
  readonly east: UVCoords;
  readonly west: UVCoords;
}

/**
 * Texture atlas response from the API
 */
export interface TextureAtlasResponse {
  /** Base64 encoded PNG image */
  readonly atlasImage: string;
  /** Atlas width in pixels */
  readonly width: number;
  /** Atlas height in pixels */
  readonly height: number;
  /** UV mapping for each block ID */
  readonly uvMapping: Record<string, BlockFaceTextures>;
  /** Minecraft version used */
  readonly version: string;
  /** Whether this is from a custom resource pack */
  readonly isCustomResourcePack: boolean;
}

/**
 * Render mode for the structure viewer
 */
export type RenderMode = 'fast' | 'texture';

/**
 * Texture loading state
 */
export interface TextureState {
  readonly mode: RenderMode;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly atlas: TextureAtlasResponse | null;
  readonly resourcePackUrl: string;
  readonly version: string;
}

/**
 * Available Minecraft versions for texture download
 */
export interface MinecraftVersion {
  readonly id: string;
  readonly type: 'release' | 'snapshot';
  readonly releaseTime: string;
}
