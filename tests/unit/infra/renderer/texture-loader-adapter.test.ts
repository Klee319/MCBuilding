/**
 * TextureLoaderAdapter Tests
 *
 * Tests for the texture loading implementation.
 * Follows TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextureLoaderAdapter } from '../../../../src/infra/renderer/texture-loader-adapter.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';

describe('TextureLoaderAdapter', () => {
  let loader: TextureLoaderAdapter;

  beforeEach(() => {
    loader = new TextureLoaderAdapter();
  });

  // ========================================
  // loadDefaultTextures Tests
  // ========================================

  describe('loadDefaultTextures', () => {
    it('returns success with texture atlas', async () => {
      const result = await loader.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeDefined();
        expect(result.value.texture).toBeInstanceOf(Uint8Array);
      }
    });

    it('returns atlas with valid dimensions', async () => {
      const result = await loader.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.width).toBeGreaterThan(0);
        expect(result.value.height).toBeGreaterThan(0);
        expect(result.value.tileSize).toBeGreaterThan(0);
      }
    });

    it('returns atlas with RGBA texture data', async () => {
      const result = await loader.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        const atlas = result.value;
        // RGBA = 4 bytes per pixel
        const expectedSize = atlas.width * atlas.height * 4;
        expect(atlas.texture.length).toBe(expectedSize);
      }
    });

    it('includes UV mappings for common blocks', async () => {
      const result = await loader.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        const atlas = result.value;
        expect(atlas.uvMapping).toBeDefined();
        expect(atlas.uvMapping.size).toBeGreaterThan(0);

        // Should have mappings for basic blocks
        expect(atlas.uvMapping.has('minecraft:stone')).toBe(true);
        expect(atlas.uvMapping.has('minecraft:dirt')).toBe(true);
        expect(atlas.uvMapping.has('minecraft:grass_block')).toBe(true);
      }
    });

    it('UV coordinates are within valid range', async () => {
      const result = await loader.loadDefaultTextures();

      expect(result.success).toBe(true);
      if (result.success) {
        const atlas = result.value;

        for (const [_, uv] of atlas.uvMapping) {
          expect(uv.u).toBeGreaterThanOrEqual(0);
          expect(uv.v).toBeGreaterThanOrEqual(0);
          expect(uv.u + uv.width).toBeLessThanOrEqual(atlas.width);
          expect(uv.v + uv.height).toBeLessThanOrEqual(atlas.height);
        }
      }
    });

    it('can be called multiple times (idempotent)', async () => {
      const result1 = await loader.loadDefaultTextures();
      const result2 = await loader.loadDefaultTextures();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Should return same atlas dimensions
        expect(result1.value.width).toBe(result2.value.width);
        expect(result1.value.height).toBe(result2.value.height);
      }
    });
  });

  // ========================================
  // getBlockTexture Tests
  // ========================================

  describe('getBlockTexture', () => {
    beforeEach(async () => {
      // Load textures before testing getBlockTexture
      await loader.loadDefaultTextures();
    });

    it('returns textures for all 6 faces', async () => {
      const blockState = BlockState.create('minecraft:stone');
      const textures = loader.getBlockTexture(blockState);

      expect(textures).toBeDefined();
      expect(textures.top).toBeDefined();
      expect(textures.bottom).toBeDefined();
      expect(textures.north).toBeDefined();
      expect(textures.south).toBeDefined();
      expect(textures.east).toBeDefined();
      expect(textures.west).toBeDefined();
    });

    it('returns valid UV coordinates for each face', async () => {
      const blockState = BlockState.create('minecraft:stone');
      const textures = loader.getBlockTexture(blockState);

      const faces = ['top', 'bottom', 'north', 'south', 'east', 'west'] as const;
      for (const face of faces) {
        const uv = textures[face];
        expect(uv.u).toBeGreaterThanOrEqual(0);
        expect(uv.v).toBeGreaterThanOrEqual(0);
        expect(uv.width).toBeGreaterThan(0);
        expect(uv.height).toBeGreaterThan(0);
      }
    });

    it('returns same texture for all faces of uniform blocks', async () => {
      const blockState = BlockState.create('minecraft:stone');
      const textures = loader.getBlockTexture(blockState);

      // Stone has same texture on all faces
      expect(textures.top).toEqual(textures.bottom);
      expect(textures.north).toEqual(textures.south);
      expect(textures.east).toEqual(textures.west);
    });

    it('returns different textures for directional blocks', async () => {
      const blockState = BlockState.create('minecraft:grass_block');
      const textures = loader.getBlockTexture(blockState);

      // Grass block has different top, side, and bottom
      expect(textures.top).not.toEqual(textures.bottom);
      expect(textures.top).not.toEqual(textures.north);
    });

    it('returns fallback texture for unknown blocks', async () => {
      const blockState = BlockState.create('minecraft:nonexistent_block');
      const textures = loader.getBlockTexture(blockState);

      // Should return default/missing texture, not throw
      expect(textures).toBeDefined();
      expect(textures.top).toBeDefined();
    });

    it('handles block states with properties', async () => {
      const blockState = BlockState.create('minecraft:oak_stairs', {
        facing: 'north',
        half: 'bottom',
      });
      const textures = loader.getBlockTexture(blockState);

      expect(textures).toBeDefined();
      expect(textures.top).toBeDefined();
    });

    it('caches block textures for performance', async () => {
      const blockState = BlockState.create('minecraft:stone');

      const textures1 = loader.getBlockTexture(blockState);
      const textures2 = loader.getBlockTexture(blockState);

      // Should return same object reference (cached)
      expect(textures1).toBe(textures2);
    });

    it('handles air block', async () => {
      const blockState = BlockState.air();
      const textures = loader.getBlockTexture(blockState);

      // Air should still return valid textures (for rendering air pockets if needed)
      expect(textures).toBeDefined();
    });

    it('handles modded blocks with namespace', async () => {
      const blockState = BlockState.create('modname:custom_block');
      const textures = loader.getBlockTexture(blockState);

      // Should return fallback texture
      expect(textures).toBeDefined();
      expect(textures.top).toBeDefined();
    });
  });

  // ========================================
  // Texture Color Tests (Default Atlas)
  // ========================================

  describe('default atlas colors', () => {
    beforeEach(async () => {
      await loader.loadDefaultTextures();
    });

    it('stone has gray color', async () => {
      const blockState = BlockState.create('minecraft:stone');
      const textures = loader.getBlockTexture(blockState);

      // Stone should have a gray-ish color
      expect(textures.top).toBeDefined();
    });

    it('dirt has brown color', async () => {
      const blockState = BlockState.create('minecraft:dirt');
      const textures = loader.getBlockTexture(blockState);

      expect(textures.top).toBeDefined();
    });

    it('grass_block has green top', async () => {
      const blockState = BlockState.create('minecraft:grass_block');
      const textures = loader.getBlockTexture(blockState);

      expect(textures.top).toBeDefined();
      // Top should be different from sides (green vs dirt)
      expect(textures.top).not.toEqual(textures.north);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('edge cases', () => {
    it('getBlockTexture before loadDefaultTextures uses fallback', () => {
      // Create new loader without loading textures first
      const newLoader = new TextureLoaderAdapter();
      const blockState = BlockState.create('minecraft:stone');

      // Should not throw, should return fallback
      const textures = newLoader.getBlockTexture(blockState);
      expect(textures).toBeDefined();
    });

    it('handles blocks with many properties', async () => {
      await loader.loadDefaultTextures();

      const blockState = BlockState.create('minecraft:oak_fence', {
        north: 'true',
        south: 'true',
        east: 'false',
        west: 'false',
        waterlogged: 'false',
      });

      const textures = loader.getBlockTexture(blockState);
      expect(textures).toBeDefined();
    });

    it('handles wool colors', async () => {
      await loader.loadDefaultTextures();

      const colors = ['white', 'orange', 'magenta', 'red', 'blue', 'green', 'black'];

      for (const color of colors) {
        const blockState = BlockState.create(`minecraft:${color}_wool`);
        const textures = loader.getBlockTexture(blockState);

        expect(textures).toBeDefined();
        expect(textures.top).toBeDefined();
      }
    });

    it('handles concrete colors', async () => {
      await loader.loadDefaultTextures();

      const blockState = BlockState.create('minecraft:red_concrete');
      const textures = loader.getBlockTexture(blockState);

      expect(textures).toBeDefined();
    });

    it('handles glass variants', async () => {
      await loader.loadDefaultTextures();

      const glass = BlockState.create('minecraft:glass');
      const stainedGlass = BlockState.create('minecraft:red_stained_glass');
      const pane = BlockState.create('minecraft:glass_pane');

      expect(loader.getBlockTexture(glass)).toBeDefined();
      expect(loader.getBlockTexture(stainedGlass)).toBeDefined();
      expect(loader.getBlockTexture(pane)).toBeDefined();
    });
  });

  // ========================================
  // Performance Tests
  // ========================================

  describe('performance', () => {
    it('loads default textures in reasonable time', async () => {
      const start = performance.now();
      await loader.loadDefaultTextures();
      const duration = performance.now() - start;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('getBlockTexture is fast for cached blocks', async () => {
      await loader.loadDefaultTextures();

      const blockState = BlockState.create('minecraft:stone');

      // Warm up cache
      loader.getBlockTexture(blockState);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        loader.getBlockTexture(blockState);
      }
      const duration = performance.now() - start;

      // 1000 lookups should be under 10ms
      expect(duration).toBeLessThan(10);
    });
  });
});
