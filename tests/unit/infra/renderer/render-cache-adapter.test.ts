/**
 * RenderCacheAdapter Tests
 *
 * Tests for the in-memory chunk mesh cache implementation.
 * Follows TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RenderCacheAdapter } from '../../../../src/infra/renderer/render-cache-adapter.js';
import { ChunkCoord } from '../../../../src/domain/renderer/chunk-coord.js';
import type { ChunkMesh } from '../../../../src/usecase/ports/renderer/render-cache-port.js';

// ========================================
// Test Fixtures
// ========================================

/**
 * Creates a mock ChunkMesh for testing
 */
function createMockChunkMesh(blockCount: number = 10): ChunkMesh {
  return {
    vertices: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 1.0]),
    indices: new Uint32Array([0, 1, 2]),
    uvs: new Float32Array([0.0, 0.0, 1.0, 1.0]),
    normals: new Float32Array([0.0, 1.0, 0.0, 0.0, 1.0, 0.0]),
    blockCount,
    isComplete: true,
  };
}

describe('RenderCacheAdapter', () => {
  let cache: RenderCacheAdapter;

  beforeEach(() => {
    cache = new RenderCacheAdapter();
  });

  // ========================================
  // Constructor Tests
  // ========================================

  describe('constructor', () => {
    it('creates cache with default max size', () => {
      const defaultCache = new RenderCacheAdapter();
      expect(defaultCache).toBeInstanceOf(RenderCacheAdapter);
    });

    it('creates cache with custom max size', () => {
      const customCache = new RenderCacheAdapter(500);
      expect(customCache).toBeInstanceOf(RenderCacheAdapter);
    });

    it('throws error for invalid max size (zero)', () => {
      expect(() => new RenderCacheAdapter(0)).toThrow();
    });

    it('throws error for invalid max size (negative)', () => {
      expect(() => new RenderCacheAdapter(-1)).toThrow();
    });
  });

  // ========================================
  // getChunkMesh Tests
  // ========================================

  describe('getChunkMesh', () => {
    it('returns null for non-existent chunk', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const result = cache.getChunkMesh(coord);
      expect(result).toBeNull();
    });

    it('returns cached mesh for existing chunk', () => {
      const coord = ChunkCoord.create(1, 2, 3);
      const mesh = createMockChunkMesh();

      cache.setChunkMesh(coord, mesh);
      const result = cache.getChunkMesh(coord);

      expect(result).not.toBeNull();
      expect(result).toEqual(mesh);
    });

    it('returns correct mesh when multiple chunks are cached', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(0, 1, 0);

      const mesh1 = createMockChunkMesh(10);
      const mesh2 = createMockChunkMesh(20);
      const mesh3 = createMockChunkMesh(30);

      cache.setChunkMesh(coord1, mesh1);
      cache.setChunkMesh(coord2, mesh2);
      cache.setChunkMesh(coord3, mesh3);

      expect(cache.getChunkMesh(coord1)?.blockCount).toBe(10);
      expect(cache.getChunkMesh(coord2)?.blockCount).toBe(20);
      expect(cache.getChunkMesh(coord3)?.blockCount).toBe(30);
    });

    it('handles negative chunk coordinates', () => {
      const coord = ChunkCoord.create(-1, -2, -3);
      const mesh = createMockChunkMesh();

      cache.setChunkMesh(coord, mesh);
      const result = cache.getChunkMesh(coord);

      expect(result).toEqual(mesh);
    });
  });

  // ========================================
  // setChunkMesh Tests
  // ========================================

  describe('setChunkMesh', () => {
    it('stores mesh in cache', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh = createMockChunkMesh();

      cache.setChunkMesh(coord, mesh);

      expect(cache.getChunkMesh(coord)).toEqual(mesh);
    });

    it('replaces existing mesh for same coordinate', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh1 = createMockChunkMesh(10);
      const mesh2 = createMockChunkMesh(20);

      cache.setChunkMesh(coord, mesh1);
      cache.setChunkMesh(coord, mesh2);

      const result = cache.getChunkMesh(coord);
      expect(result?.blockCount).toBe(20);
    });

    it('evicts oldest entry when cache is full (LRU)', () => {
      const smallCache = new RenderCacheAdapter(3);

      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);
      const coord4 = ChunkCoord.create(3, 0, 0);

      smallCache.setChunkMesh(coord1, createMockChunkMesh(1));
      smallCache.setChunkMesh(coord2, createMockChunkMesh(2));
      smallCache.setChunkMesh(coord3, createMockChunkMesh(3));

      // This should evict coord1 (oldest)
      smallCache.setChunkMesh(coord4, createMockChunkMesh(4));

      expect(smallCache.getChunkMesh(coord1)).toBeNull();
      expect(smallCache.getChunkMesh(coord2)).not.toBeNull();
      expect(smallCache.getChunkMesh(coord3)).not.toBeNull();
      expect(smallCache.getChunkMesh(coord4)).not.toBeNull();
    });

    it('stores incomplete mesh', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const incompleteMesh: ChunkMesh = {
        ...createMockChunkMesh(),
        isComplete: false,
      };

      cache.setChunkMesh(coord, incompleteMesh);
      const result = cache.getChunkMesh(coord);

      expect(result?.isComplete).toBe(false);
    });
  });

  // ========================================
  // invalidate Tests
  // ========================================

  describe('invalidate', () => {
    it('invalidates all chunks when no coords provided', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);

      cache.setChunkMesh(coord1, createMockChunkMesh());
      cache.setChunkMesh(coord2, createMockChunkMesh());

      cache.invalidate();

      expect(cache.getChunkMesh(coord1)).toBeNull();
      expect(cache.getChunkMesh(coord2)).toBeNull();
    });

    it('invalidates specific chunks when coords provided', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);

      cache.setChunkMesh(coord1, createMockChunkMesh());
      cache.setChunkMesh(coord2, createMockChunkMesh());
      cache.setChunkMesh(coord3, createMockChunkMesh());

      cache.invalidate([coord1, coord3]);

      expect(cache.getChunkMesh(coord1)).toBeNull();
      expect(cache.getChunkMesh(coord2)).not.toBeNull();
      expect(cache.getChunkMesh(coord3)).toBeNull();
    });

    it('handles empty coords array', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      cache.setChunkMesh(coord, createMockChunkMesh());

      cache.invalidate([]);

      expect(cache.getChunkMesh(coord)).not.toBeNull();
    });

    it('handles invalidating non-existent chunks', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);

      cache.setChunkMesh(coord1, createMockChunkMesh());

      // coord2 is not in cache, should not throw
      expect(() => cache.invalidate([coord2])).not.toThrow();
      expect(cache.getChunkMesh(coord1)).not.toBeNull();
    });
  });

  // ========================================
  // clear Tests
  // ========================================

  describe('clear', () => {
    it('removes all cached meshes', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);

      cache.setChunkMesh(coord1, createMockChunkMesh());
      cache.setChunkMesh(coord2, createMockChunkMesh());
      cache.setChunkMesh(coord3, createMockChunkMesh());

      cache.clear();

      expect(cache.getChunkMesh(coord1)).toBeNull();
      expect(cache.getChunkMesh(coord2)).toBeNull();
      expect(cache.getChunkMesh(coord3)).toBeNull();
    });

    it('is safe to call on empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });

    it('is safe to call multiple times', () => {
      cache.setChunkMesh(ChunkCoord.create(0, 0, 0), createMockChunkMesh());

      cache.clear();
      cache.clear();
      cache.clear();

      expect(cache.getChunkMesh(ChunkCoord.create(0, 0, 0))).toBeNull();
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('edge cases', () => {
    it('handles very large coordinate values', () => {
      const coord = ChunkCoord.create(1000000, -1000000, 999999);
      const mesh = createMockChunkMesh();

      cache.setChunkMesh(coord, mesh);
      expect(cache.getChunkMesh(coord)).toEqual(mesh);
    });

    it('maintains order with access (LRU behavior)', () => {
      const smallCache = new RenderCacheAdapter(3);

      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);
      const coord4 = ChunkCoord.create(3, 0, 0);

      smallCache.setChunkMesh(coord1, createMockChunkMesh(1));
      smallCache.setChunkMesh(coord2, createMockChunkMesh(2));
      smallCache.setChunkMesh(coord3, createMockChunkMesh(3));

      // Access coord1 to make it recently used
      smallCache.getChunkMesh(coord1);

      // Adding coord4 should evict coord2 (least recently used)
      smallCache.setChunkMesh(coord4, createMockChunkMesh(4));

      expect(smallCache.getChunkMesh(coord1)).not.toBeNull();
      expect(smallCache.getChunkMesh(coord2)).toBeNull();
      expect(smallCache.getChunkMesh(coord3)).not.toBeNull();
      expect(smallCache.getChunkMesh(coord4)).not.toBeNull();
    });
  });
});
