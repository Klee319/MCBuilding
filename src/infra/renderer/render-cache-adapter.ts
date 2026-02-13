/**
 * RenderCacheAdapter
 *
 * In-memory cache implementation for chunk meshes using LRU eviction strategy.
 * Implements RenderCachePort interface.
 *
 * @example
 * const cache = new RenderCacheAdapter(1000);
 * cache.setChunkMesh(coord, mesh);
 * const cached = cache.getChunkMesh(coord);
 */

import type { ChunkCoord } from '../../domain/renderer/chunk-coord.js';
import type { RenderCachePort, ChunkMesh } from '../../usecase/ports/renderer/render-cache-port.js';

/**
 * Converts ChunkCoord to string key for Map storage
 */
function chunkCoordToKey(coord: ChunkCoord): string {
  return coord.toKey();
}

/**
 * RenderCacheAdapter
 *
 * LRU (Least Recently Used) cache for chunk meshes.
 * When the cache is full, the least recently accessed entry is evicted.
 */
export class RenderCacheAdapter implements RenderCachePort {
  private readonly cache: Map<string, ChunkMesh>;
  private readonly maxSize: number;

  /**
   * Creates a new RenderCacheAdapter
   *
   * @param maxSize - Maximum number of chunks to cache (default: 1000)
   * @throws Error if maxSize is not a positive number
   */
  constructor(maxSize: number = 1000) {
    if (typeof maxSize !== 'number' || maxSize < 1 || !Number.isFinite(maxSize)) {
      throw new Error(
        `Invalid maxSize: ${maxSize}. Must be a positive integer.`
      );
    }

    this.cache = new Map();
    this.maxSize = Math.floor(maxSize);
  }

  /**
   * Gets cached mesh for a chunk
   *
   * Accessing a mesh moves it to the end (most recently used).
   *
   * @param coord - Chunk coordinate to lookup
   * @returns Cached mesh or null if not cached
   */
  getChunkMesh(coord: ChunkCoord): ChunkMesh | null {
    const key = chunkCoordToKey(coord);
    const mesh = this.cache.get(key);

    if (mesh === undefined) {
      return null;
    }

    // Move to end (most recently used) - LRU behavior
    this.cache.delete(key);
    this.cache.set(key, mesh);

    return mesh;
  }

  /**
   * Caches a chunk mesh
   *
   * If a mesh already exists for this coordinate, it will be replaced.
   * If the cache is full, the least recently used entry is evicted.
   *
   * @param coord - Chunk coordinate to cache
   * @param mesh - Mesh data to cache
   */
  setChunkMesh(coord: ChunkCoord, mesh: ChunkMesh): void {
    const key = chunkCoordToKey(coord);

    // If key exists, delete first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, mesh);
  }

  /**
   * Invalidates cached meshes
   *
   * @param coords - Specific chunks to invalidate.
   *                 If undefined, invalidates ALL cached chunks.
   */
  invalidate(coords?: readonly ChunkCoord[]): void {
    if (coords === undefined) {
      this.cache.clear();
      return;
    }

    for (const coord of coords) {
      const key = chunkCoordToKey(coord);
      this.cache.delete(key);
    }
  }

  /**
   * Clears all cached meshes
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the current number of cached chunks
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Gets the maximum cache size
   */
  get capacity(): number {
    return this.maxSize;
  }
}
