/**
 * RenderCachePort Tests
 *
 * Tests for the render cache port interface.
 * These tests verify the contract for caching and invalidating chunk meshes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  RenderCachePort,
  ChunkMesh,
} from '../../../../src/usecase/ports/renderer/render-cache-port.js';
import { ChunkCoord } from '../../../../src/domain/renderer/chunk-coord.js';

// Mock implementation for testing
function createMockRenderCachePort(): RenderCachePort {
  const cache = new Map<string, ChunkMesh>();

  return {
    getChunkMesh: vi.fn((coord: ChunkCoord) => cache.get(coord.toKey()) ?? null),
    setChunkMesh: vi.fn((coord: ChunkCoord, mesh: ChunkMesh) => {
      cache.set(coord.toKey(), mesh);
    }),
    invalidate: vi.fn((coords?: readonly ChunkCoord[]) => {
      if (coords) {
        for (const coord of coords) {
          cache.delete(coord.toKey());
        }
      } else {
        cache.clear();
      }
    }),
    clear: vi.fn(() => cache.clear()),
  };
}

// Helper to create a mock chunk mesh
function createMockChunkMesh(blockCount: number = 100): ChunkMesh {
  return {
    vertices: new Float32Array(blockCount * 24 * 3), // 24 vertices per block, 3 components
    indices: new Uint32Array(blockCount * 36), // 36 indices per block
    uvs: new Float32Array(blockCount * 24 * 2), // 24 UVs per block, 2 components
    normals: new Float32Array(blockCount * 24 * 3), // 24 normals per block, 3 components
    blockCount,
    isComplete: true,
  };
}

describe('RenderCachePort', () => {
  let mockPort: RenderCachePort;

  beforeEach(() => {
    mockPort = createMockRenderCachePort();
  });

  describe('getChunkMesh', () => {
    it('should return null for uncached chunk', () => {
      const coord = ChunkCoord.create(0, 0, 0);

      const result = mockPort.getChunkMesh(coord);

      expect(result).toBeNull();
    });

    it('should return cached mesh for existing chunk', () => {
      const coord = ChunkCoord.create(1, 2, 3);
      const mesh = createMockChunkMesh(50);

      mockPort.setChunkMesh(coord, mesh);
      const result = mockPort.getChunkMesh(coord);

      expect(result).not.toBeNull();
      expect(result?.blockCount).toBe(50);
    });

    it('should return different meshes for different coordinates', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const mesh1 = createMockChunkMesh(100);
      const mesh2 = createMockChunkMesh(200);

      mockPort.setChunkMesh(coord1, mesh1);
      mockPort.setChunkMesh(coord2, mesh2);

      expect(mockPort.getChunkMesh(coord1)?.blockCount).toBe(100);
      expect(mockPort.getChunkMesh(coord2)?.blockCount).toBe(200);
    });

    it('should handle negative coordinates', () => {
      const coord = ChunkCoord.create(-5, -3, -1);
      const mesh = createMockChunkMesh(75);

      mockPort.setChunkMesh(coord, mesh);
      const result = mockPort.getChunkMesh(coord);

      expect(result).not.toBeNull();
      expect(result?.blockCount).toBe(75);
    });
  });

  describe('setChunkMesh', () => {
    it('should cache a new mesh', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh = createMockChunkMesh(100);

      mockPort.setChunkMesh(coord, mesh);

      expect(mockPort.setChunkMesh).toHaveBeenCalledWith(coord, mesh);
      expect(mockPort.getChunkMesh(coord)).not.toBeNull();
    });

    it('should overwrite existing mesh', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh1 = createMockChunkMesh(100);
      const mesh2 = createMockChunkMesh(200);

      mockPort.setChunkMesh(coord, mesh1);
      mockPort.setChunkMesh(coord, mesh2);

      expect(mockPort.getChunkMesh(coord)?.blockCount).toBe(200);
    });

    it('should handle empty mesh', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh = createMockChunkMesh(0);

      mockPort.setChunkMesh(coord, mesh);

      expect(mockPort.getChunkMesh(coord)?.blockCount).toBe(0);
    });

    it('should handle incomplete mesh', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      const mesh: ChunkMesh = {
        ...createMockChunkMesh(50),
        isComplete: false,
      };

      mockPort.setChunkMesh(coord, mesh);

      expect(mockPort.getChunkMesh(coord)?.isComplete).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific chunks', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);

      mockPort.setChunkMesh(coord1, createMockChunkMesh());
      mockPort.setChunkMesh(coord2, createMockChunkMesh());
      mockPort.setChunkMesh(coord3, createMockChunkMesh());

      mockPort.invalidate([coord1, coord2]);

      expect(mockPort.getChunkMesh(coord1)).toBeNull();
      expect(mockPort.getChunkMesh(coord2)).toBeNull();
      expect(mockPort.getChunkMesh(coord3)).not.toBeNull();
    });

    it('should invalidate all chunks when no coords specified', () => {
      const coord1 = ChunkCoord.create(0, 0, 0);
      const coord2 = ChunkCoord.create(1, 0, 0);
      const coord3 = ChunkCoord.create(2, 0, 0);

      mockPort.setChunkMesh(coord1, createMockChunkMesh());
      mockPort.setChunkMesh(coord2, createMockChunkMesh());
      mockPort.setChunkMesh(coord3, createMockChunkMesh());

      mockPort.invalidate();

      expect(mockPort.getChunkMesh(coord1)).toBeNull();
      expect(mockPort.getChunkMesh(coord2)).toBeNull();
      expect(mockPort.getChunkMesh(coord3)).toBeNull();
    });

    it('should handle empty coords array', () => {
      const coord = ChunkCoord.create(0, 0, 0);
      mockPort.setChunkMesh(coord, createMockChunkMesh());

      mockPort.invalidate([]);

      // Empty array should not affect anything
      expect(mockPort.getChunkMesh(coord)).not.toBeNull();
    });

    it('should handle invalidating non-existent chunks', () => {
      const coord = ChunkCoord.create(99, 99, 99);

      // Should not throw
      expect(() => mockPort.invalidate([coord])).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached meshes', () => {
      const coords = [
        ChunkCoord.create(0, 0, 0),
        ChunkCoord.create(1, 1, 1),
        ChunkCoord.create(-1, -1, -1),
      ];

      for (const coord of coords) {
        mockPort.setChunkMesh(coord, createMockChunkMesh());
      }

      mockPort.clear();

      for (const coord of coords) {
        expect(mockPort.getChunkMesh(coord)).toBeNull();
      }
    });

    it('should be safe to call on empty cache', () => {
      expect(() => mockPort.clear()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      mockPort.setChunkMesh(ChunkCoord.create(0, 0, 0), createMockChunkMesh());

      mockPort.clear();
      mockPort.clear();
      mockPort.clear();

      expect(mockPort.clear).toHaveBeenCalledTimes(3);
    });
  });
});

describe('ChunkMesh', () => {
  it('should contain vertex data', () => {
    const mesh = createMockChunkMesh(10);

    expect(mesh.vertices).toBeInstanceOf(Float32Array);
    expect(mesh.vertices.length).toBeGreaterThan(0);
  });

  it('should contain index data', () => {
    const mesh = createMockChunkMesh(10);

    expect(mesh.indices).toBeInstanceOf(Uint32Array);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it('should contain UV data', () => {
    const mesh = createMockChunkMesh(10);

    expect(mesh.uvs).toBeInstanceOf(Float32Array);
    expect(mesh.uvs.length).toBeGreaterThan(0);
  });

  it('should contain normal data', () => {
    const mesh = createMockChunkMesh(10);

    expect(mesh.normals).toBeInstanceOf(Float32Array);
    expect(mesh.normals.length).toBeGreaterThan(0);
  });

  it('should track block count', () => {
    const mesh = createMockChunkMesh(42);

    expect(mesh.blockCount).toBe(42);
  });

  it('should track completion status', () => {
    const completeMesh = createMockChunkMesh(10);
    const incompleteMesh: ChunkMesh = {
      ...createMockChunkMesh(5),
      isComplete: false,
    };

    expect(completeMesh.isComplete).toBe(true);
    expect(incompleteMesh.isComplete).toBe(false);
  });
});
