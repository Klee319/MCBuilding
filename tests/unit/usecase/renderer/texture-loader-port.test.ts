/**
 * TextureLoaderPort Tests
 *
 * Tests for the texture loader port interface.
 * These tests verify the contract for loading textures and getting block textures.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  TextureLoaderPort,
  TextureAtlas,
  BlockTextures,
  UVCoordinates,
} from '../../../../src/usecase/ports/renderer/texture-loader-port.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';

// Mock implementation for testing
function createMockTextureLoaderPort(): TextureLoaderPort {
  return {
    loadDefaultTextures: vi.fn(),
    getBlockTexture: vi.fn(),
  };
}

// Helper to create a mock texture atlas
function createMockTextureAtlas(): TextureAtlas {
  return {
    texture: new Uint8Array(16 * 16 * 4), // RGBA pixel data
    width: 256,
    height: 256,
    tileSize: 16,
    uvMapping: new Map([
      ['minecraft:stone', { u: 0, v: 0, width: 16, height: 16 }],
      ['minecraft:dirt', { u: 16, v: 0, width: 16, height: 16 }],
      ['minecraft:grass_block', { u: 32, v: 0, width: 16, height: 16 }],
    ]),
  };
}

describe('TextureLoaderPort', () => {
  let mockPort: TextureLoaderPort;

  beforeEach(() => {
    mockPort = createMockTextureLoaderPort();
  });

  describe('loadDefaultTextures', () => {
    it('should load default textures successfully', async () => {
      const mockAtlas = createMockTextureAtlas();

      vi.mocked(mockPort.loadDefaultTextures).mockResolvedValue({
        success: true,
        value: mockAtlas,
      });

      const result = await mockPort.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.width).toBe(256);
        expect(result.value.height).toBe(256);
        expect(result.value.tileSize).toBe(16);
        expect(result.value.uvMapping.size).toBeGreaterThan(0);
      }
    });

    it('should return error when texture loading fails', async () => {
      vi.mocked(mockPort.loadDefaultTextures).mockResolvedValue({
        success: false,
        error: new PortError('FETCH_FAILED', 'Failed to load texture atlas'),
      });

      const result = await mockPort.loadDefaultTextures();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FETCH_FAILED');
      }
    });

    it('should return error for corrupted texture data', async () => {
      vi.mocked(mockPort.loadDefaultTextures).mockResolvedValue({
        success: false,
        error: new PortError('INVALID_FORMAT', 'Invalid texture format'),
      });

      const result = await mockPort.loadDefaultTextures();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_FORMAT');
      }
    });
  });

  describe('getBlockTexture', () => {
    it('should return textures for a simple block', () => {
      const stone = BlockState.create('minecraft:stone');
      const stoneUV: UVCoordinates = { u: 0, v: 0, width: 16, height: 16 };

      const blockTextures: BlockTextures = {
        top: stoneUV,
        bottom: stoneUV,
        north: stoneUV,
        south: stoneUV,
        east: stoneUV,
        west: stoneUV,
      };

      vi.mocked(mockPort.getBlockTexture).mockReturnValue(blockTextures);

      const result = mockPort.getBlockTexture(stone);

      expect(result.top).toEqual(stoneUV);
      expect(result.bottom).toEqual(stoneUV);
      expect(result.north).toEqual(stoneUV);
      expect(result.south).toEqual(stoneUV);
      expect(result.east).toEqual(stoneUV);
      expect(result.west).toEqual(stoneUV);
    });

    it('should return different textures for different faces (grass block)', () => {
      const grass = BlockState.create('minecraft:grass_block');

      const topUV: UVCoordinates = { u: 0, v: 0, width: 16, height: 16 };
      const bottomUV: UVCoordinates = { u: 16, v: 0, width: 16, height: 16 };
      const sideUV: UVCoordinates = { u: 32, v: 0, width: 16, height: 16 };

      const blockTextures: BlockTextures = {
        top: topUV,
        bottom: bottomUV,
        north: sideUV,
        south: sideUV,
        east: sideUV,
        west: sideUV,
      };

      vi.mocked(mockPort.getBlockTexture).mockReturnValue(blockTextures);

      const result = mockPort.getBlockTexture(grass);

      expect(result.top).not.toEqual(result.bottom);
      expect(result.north).toEqual(result.south);
    });

    it('should return fallback texture for unknown blocks', () => {
      const unknown = BlockState.create('mod:custom_block');
      const missingUV: UVCoordinates = { u: 240, v: 240, width: 16, height: 16 };

      const blockTextures: BlockTextures = {
        top: missingUV,
        bottom: missingUV,
        north: missingUV,
        south: missingUV,
        east: missingUV,
        west: missingUV,
      };

      vi.mocked(mockPort.getBlockTexture).mockReturnValue(blockTextures);

      const result = mockPort.getBlockTexture(unknown);

      // Should return the missing texture placeholder
      expect(result.top.u).toBe(240);
      expect(result.top.v).toBe(240);
    });

    it('should handle blocks with properties', () => {
      const stairs = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      const stairsUV: UVCoordinates = { u: 64, v: 0, width: 16, height: 16 };
      const blockTextures: BlockTextures = {
        top: stairsUV,
        bottom: stairsUV,
        north: stairsUV,
        south: stairsUV,
        east: stairsUV,
        west: stairsUV,
      };

      vi.mocked(mockPort.getBlockTexture).mockReturnValue(blockTextures);

      const result = mockPort.getBlockTexture(stairs);

      expect(result).toBeDefined();
      expect(mockPort.getBlockTexture).toHaveBeenCalledWith(stairs);
    });

    it('should handle air blocks', () => {
      const air = BlockState.air();

      // Air blocks typically don't have textures but the method should handle it
      const emptyUV: UVCoordinates = { u: 0, v: 0, width: 0, height: 0 };
      const blockTextures: BlockTextures = {
        top: emptyUV,
        bottom: emptyUV,
        north: emptyUV,
        south: emptyUV,
        east: emptyUV,
        west: emptyUV,
      };

      vi.mocked(mockPort.getBlockTexture).mockReturnValue(blockTextures);

      const result = mockPort.getBlockTexture(air);

      expect(result.top.width).toBe(0);
    });
  });
});

describe('TextureAtlas', () => {
  it('should contain required properties', () => {
    const atlas = createMockTextureAtlas();

    expect(atlas.texture).toBeInstanceOf(Uint8Array);
    expect(typeof atlas.width).toBe('number');
    expect(typeof atlas.height).toBe('number');
    expect(typeof atlas.tileSize).toBe('number');
    expect(atlas.uvMapping).toBeInstanceOf(Map);
  });

  it('should store UV coordinates for blocks', () => {
    const atlas = createMockTextureAtlas();

    const stoneUV = atlas.uvMapping.get('minecraft:stone');

    expect(stoneUV).toBeDefined();
    expect(stoneUV?.u).toBeDefined();
    expect(stoneUV?.v).toBeDefined();
    expect(stoneUV?.width).toBeDefined();
    expect(stoneUV?.height).toBeDefined();
  });
});

describe('BlockTextures', () => {
  it('should define textures for all six faces', () => {
    const uv: UVCoordinates = { u: 0, v: 0, width: 16, height: 16 };
    const textures: BlockTextures = {
      top: uv,
      bottom: uv,
      north: uv,
      south: uv,
      east: uv,
      west: uv,
    };

    expect(textures.top).toBeDefined();
    expect(textures.bottom).toBeDefined();
    expect(textures.north).toBeDefined();
    expect(textures.south).toBeDefined();
    expect(textures.east).toBeDefined();
    expect(textures.west).toBeDefined();
  });
});

describe('UVCoordinates', () => {
  it('should contain position and size', () => {
    const uv: UVCoordinates = {
      u: 64,
      v: 128,
      width: 16,
      height: 16,
    };

    expect(uv.u).toBe(64);
    expect(uv.v).toBe(128);
    expect(uv.width).toBe(16);
    expect(uv.height).toBe(16);
  });
});
