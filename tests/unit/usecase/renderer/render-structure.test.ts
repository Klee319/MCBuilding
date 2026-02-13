/**
 * RenderStructureUsecase Tests
 *
 * Tests for the render structure use case.
 * This use case handles rendering structures to a canvas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RenderStructureUsecase,
  createRenderStructureUsecase,
  type RenderStructureInput,
} from '../../../../src/usecase/renderer/render-structure.js';
import type { WebGLRendererPort, RendererOptions, CanvasElement } from '../../../../src/usecase/ports/renderer/webgl-renderer-port.js';
import type { TextureLoaderPort, TextureAtlas, BlockTextures, UVCoordinates } from '../../../../src/usecase/ports/renderer/texture-loader-port.js';
import type { RenderCachePort, ChunkMesh } from '../../../../src/usecase/ports/renderer/render-cache-port.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { RenderState } from '../../../../src/domain/renderer/render-state.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';
import { Block } from '../../../../src/domain/renderer/block.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// Helper to create test structure
function createTestStructure(blockCount: number = 10): Structure {
  const dimensions = Dimensions.create(10, 5, 10);
  const palette = [BlockState.create('minecraft:stone')];
  const blocks = new Map<string, Block>();

  for (let i = 0; i < blockCount; i++) {
    const position = Position.create(i % 10, Math.floor(i / 10) % 5, Math.floor(i / 50));
    const block = Block.create(position, palette[0]);
    blocks.set(position.toKey(), block);
  }

  return Structure.create('Test Structure', dimensions, palette, blocks);
}

// Mock ports
function createMockWebGLRendererPort(): WebGLRendererPort {
  return {
    initialize: vi.fn(),
    render: vi.fn(),
    raycast: vi.fn(),
    dispose: vi.fn(),
  };
}

function createMockTextureLoaderPort(): TextureLoaderPort {
  const defaultUV: UVCoordinates = { u: 0, v: 0, width: 16, height: 16 };
  const defaultTextures: BlockTextures = {
    top: defaultUV,
    bottom: defaultUV,
    north: defaultUV,
    south: defaultUV,
    east: defaultUV,
    west: defaultUV,
  };

  return {
    loadDefaultTextures: vi.fn(),
    getBlockTexture: vi.fn().mockReturnValue(defaultTextures),
  };
}

function createMockRenderCachePort(): RenderCachePort {
  const cache = new Map<string, ChunkMesh>();

  return {
    getChunkMesh: vi.fn((coord) => cache.get(coord.toKey()) ?? null),
    setChunkMesh: vi.fn((coord, mesh) => cache.set(coord.toKey(), mesh)),
    invalidate: vi.fn((coords) => {
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

function createMockTextureAtlas(): TextureAtlas {
  return {
    texture: new Uint8Array(256 * 256 * 4),
    width: 256,
    height: 256,
    tileSize: 16,
    uvMapping: new Map([
      ['minecraft:stone', { u: 0, v: 0, width: 16, height: 16 }],
    ]),
  };
}

// Mock canvas element for testing without DOM
function createMockCanvas(): CanvasElement {
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => null),
  };
}

describe('RenderStructureUsecase', () => {
  let mockRenderer: WebGLRendererPort;
  let mockTextureLoader: TextureLoaderPort;
  let mockCache: RenderCachePort;
  let usecase: RenderStructureUsecase;

  beforeEach(() => {
    mockRenderer = createMockWebGLRendererPort();
    mockTextureLoader = createMockTextureLoaderPort();
    mockCache = createMockRenderCachePort();
    usecase = createRenderStructureUsecase(mockRenderer, mockTextureLoader, mockCache);

    // Setup default mock responses
    vi.mocked(mockRenderer.initialize).mockResolvedValue({
      success: true,
      value: undefined,
    });
    vi.mocked(mockTextureLoader.loadDefaultTextures).mockResolvedValue({
      success: true,
      value: createMockTextureAtlas(),
    });
  });

  afterEach(() => {
    usecase.dispose();
  });

  describe('execute', () => {
    it('should render structure successfully', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      expect(mockRenderer.render).toHaveBeenCalledWith(structure, state);
    });

    it('should initialize renderer on first call', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      await usecase.execute(input);

      expect(mockRenderer.initialize).toHaveBeenCalledWith(canvas, expect.any(Object));
    });

    it('should load textures on first call', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      await usecase.execute(input);

      expect(mockTextureLoader.loadDefaultTextures).toHaveBeenCalled();
    });

    it('should not re-initialize renderer on subsequent calls', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      await usecase.execute(input);
      await usecase.execute(input);
      await usecase.execute(input);

      expect(mockRenderer.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return error when renderer initialization fails', async () => {
      vi.mocked(mockRenderer.initialize).mockResolvedValue({
        success: false,
        error: new PortError('GENERATION_FAILED', 'Failed to create WebGL context'),
      });

      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('GENERATION_FAILED');
      }
    });

    it('should return error when texture loading fails', async () => {
      vi.mocked(mockTextureLoader.loadDefaultTextures).mockResolvedValue({
        success: false,
        error: new PortError('FETCH_FAILED', 'Failed to load textures'),
      });

      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FETCH_FAILED');
      }
    });

    it('should render empty structure', async () => {
      const canvas = createMockCanvas();
      const dimensions = Dimensions.create(1, 1, 1);
      const structure = Structure.empty('Empty', dimensions);
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
    });

    it('should render structure with selected block', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const position = Position.create(0, 0, 0);
      const state = RenderState.default().withSelectedBlock(position);

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      expect(mockRenderer.render).toHaveBeenCalledWith(structure, state);
    });

    it('should render large structure', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure(1000);
      const state = RenderState.default();

      const input: RenderStructureInput = {
        structure,
        state,
        canvas,
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should dispose renderer resources', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      await usecase.execute({
        structure,
        state,
        canvas,
      });

      usecase.dispose();

      expect(mockRenderer.dispose).toHaveBeenCalled();
    });

    it('should clear cache on dispose', async () => {
      const canvas = createMockCanvas();
      const structure = createTestStructure();
      const state = RenderState.default();

      await usecase.execute({
        structure,
        state,
        canvas,
      });

      usecase.dispose();

      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      usecase.dispose();
      usecase.dispose();
      usecase.dispose();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should be safe to call without initialization', () => {
      // Create new usecase and immediately dispose without execute
      const newUsecase = createRenderStructureUsecase(
        createMockWebGLRendererPort(),
        createMockTextureLoaderPort(),
        createMockRenderCachePort()
      );

      expect(() => newUsecase.dispose()).not.toThrow();
    });
  });
});

describe('RenderStructureInput', () => {
  it('should contain required fields', () => {
    const canvas = createMockCanvas();
    const structure = createTestStructure();
    const state = RenderState.default();

    const input: RenderStructureInput = {
      structure,
      state,
      canvas,
    };

    expect(input.structure).toBe(structure);
    expect(input.state).toBe(state);
    expect(input.canvas).toBe(canvas);
  });
});
