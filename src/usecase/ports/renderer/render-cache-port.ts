/**
 * RenderCachePort Interface
 *
 * Port interface for caching rendered chunk meshes.
 * This port abstracts chunk mesh caching from the usecase layer.
 *
 * Caching improves performance by:
 * - Avoiding repeated mesh generation for unchanged chunks
 * - Enabling incremental updates when blocks change
 * - Managing memory by invalidating unused chunks
 */

import type { ChunkCoord } from '../../../domain/renderer/chunk-coord.js';

// ========================================
// Types
// ========================================

/**
 * Mesh data for a single chunk (16x16x16 blocks)
 */
export interface ChunkMesh {
  /**
   * Vertex position data
   * Format: [x1, y1, z1, x2, y2, z2, ...] (3 components per vertex)
   */
  readonly vertices: Float32Array;

  /**
   * Index data for triangle faces
   * Format: [i1, i2, i3, ...] (3 indices per triangle)
   */
  readonly indices: Uint32Array;

  /**
   * UV coordinate data for texturing
   * Format: [u1, v1, u2, v2, ...] (2 components per vertex)
   */
  readonly uvs: Float32Array;

  /**
   * Normal vector data for lighting
   * Format: [nx1, ny1, nz1, nx2, ny2, nz2, ...] (3 components per vertex)
   */
  readonly normals: Float32Array;

  /** Number of blocks in this chunk mesh */
  readonly blockCount: number;

  /** Whether this mesh is complete (false during progressive loading) */
  readonly isComplete: boolean;
}

// ========================================
// Port Interface
// ========================================

/**
 * RenderCachePort
 *
 * Interface for caching chunk meshes.
 *
 * @example
 * ```typescript
 * const chunkCoord = ChunkCoord.create(0, 0, 0);
 *
 * // Check cache first
 * let mesh = cache.getChunkMesh(chunkCoord);
 * if (!mesh) {
 *   // Generate and cache
 *   mesh = generateChunkMesh(structure, chunkCoord);
 *   cache.setChunkMesh(chunkCoord, mesh);
 * }
 *
 * // Invalidate when blocks change
 * cache.invalidate([affectedChunk1, affectedChunk2]);
 *
 * // Clear all when loading new structure
 * cache.clear();
 * ```
 */
export interface RenderCachePort {
  /**
   * Gets cached mesh for a chunk
   *
   * @param coord - Chunk coordinate to lookup
   * @returns Cached mesh or null if not cached
   */
  getChunkMesh(coord: ChunkCoord): ChunkMesh | null;

  /**
   * Caches a chunk mesh
   *
   * If a mesh already exists for this coordinate, it will be replaced.
   *
   * @param coord - Chunk coordinate to cache
   * @param mesh - Mesh data to cache
   */
  setChunkMesh(coord: ChunkCoord, mesh: ChunkMesh): void;

  /**
   * Invalidates cached meshes
   *
   * @param coords - Specific chunks to invalidate.
   *                 If undefined, invalidates ALL cached chunks.
   */
  invalidate(coords?: readonly ChunkCoord[]): void;

  /**
   * Clears all cached meshes
   *
   * Use when loading a new structure or freeing memory.
   */
  clear(): void;
}
