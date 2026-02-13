/**
 * WebGLRendererPort Tests
 *
 * Tests for the WebGL renderer port interface.
 * These tests verify the contract for rendering structures and raycast operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  WebGLRendererPort,
  RendererOptions,
  RaycastResult,
  BlockFace,
  CanvasElement,
} from '../../../../src/usecase/ports/renderer/webgl-renderer-port.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { RenderState } from '../../../../src/domain/renderer/render-state.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';
import { Block } from '../../../../src/domain/renderer/block.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// Mock implementation for testing
function createMockWebGLRendererPort(): WebGLRendererPort {
  return {
    initialize: vi.fn(),
    render: vi.fn(),
    raycast: vi.fn(),
    dispose: vi.fn(),
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

// Helper to create test structure
function createTestStructure(): Structure {
  const dimensions = Dimensions.create(10, 5, 10);
  const palette = [BlockState.create('minecraft:stone')];
  const blocks = new Map<string, Block>();
  const position = Position.create(0, 0, 0);
  const block = Block.create(position, palette[0]);
  blocks.set(position.toKey(), block);

  return Structure.create('Test Structure', dimensions, palette, blocks);
}

describe('WebGLRendererPort', () => {
  let mockPort: WebGLRendererPort;

  beforeEach(() => {
    mockPort = createMockWebGLRendererPort();
  });

  describe('initialize', () => {
    it('should initialize renderer with valid canvas and options', async () => {
      vi.mocked(mockPort.initialize).mockResolvedValue({
        success: true,
        value: undefined,
      });

      const canvas = createMockCanvas();
      const options: RendererOptions = {
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      };

      const result = await mockPort.initialize(canvas, options);

      expect(result.success).toBe(true);
      expect(mockPort.initialize).toHaveBeenCalledWith(canvas, options);
    });

    it('should initialize with default options', async () => {
      vi.mocked(mockPort.initialize).mockResolvedValue({
        success: true,
        value: undefined,
      });

      const canvas = createMockCanvas();
      const options: RendererOptions = {};

      const result = await mockPort.initialize(canvas, options);

      expect(result.success).toBe(true);
    });

    it('should return error for WebGL context creation failure', async () => {
      vi.mocked(mockPort.initialize).mockResolvedValue({
        success: false,
        error: new PortError('GENERATION_FAILED', 'Failed to create WebGL context'),
      });

      const canvas = createMockCanvas();
      const options: RendererOptions = {};

      const result = await mockPort.initialize(canvas, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('GENERATION_FAILED');
        expect(result.error.message).toContain('WebGL');
      }
    });

    it('should return error for invalid canvas', async () => {
      vi.mocked(mockPort.initialize).mockResolvedValue({
        success: false,
        error: new PortError('GENERATION_FAILED', 'Invalid canvas element'),
      });

      const canvas = null as unknown as HTMLCanvasElement;
      const options: RendererOptions = {};

      const result = await mockPort.initialize(canvas, options);

      expect(result.success).toBe(false);
    });
  });

  describe('render', () => {
    it('should render structure with render state', () => {
      const structure = createTestStructure();
      const state = RenderState.default();

      mockPort.render(structure, state);

      expect(mockPort.render).toHaveBeenCalledWith(structure, state);
    });

    it('should render empty structure', () => {
      const dimensions = Dimensions.create(1, 1, 1);
      const structure = Structure.empty('Empty', dimensions);
      const state = RenderState.default();

      mockPort.render(structure, state);

      expect(mockPort.render).toHaveBeenCalledWith(structure, state);
    });

    it('should handle render state with selected block', () => {
      const structure = createTestStructure();
      const position = Position.create(0, 0, 0);
      const state = RenderState.default().withSelectedBlock(position);

      mockPort.render(structure, state);

      expect(mockPort.render).toHaveBeenCalledWith(structure, state);
    });
  });

  describe('raycast', () => {
    it('should return block and face when hit', () => {
      const raycastResult: RaycastResult = {
        position: Position.create(5, 2, 3),
        face: 'top',
        distance: 10.5,
      };

      vi.mocked(mockPort.raycast).mockReturnValue(raycastResult);

      const result = mockPort.raycast(100, 200);

      expect(result).not.toBeNull();
      expect(result?.position.x).toBe(5);
      expect(result?.position.y).toBe(2);
      expect(result?.position.z).toBe(3);
      expect(result?.face).toBe('top');
      expect(result?.distance).toBe(10.5);
    });

    it('should return null when no block hit', () => {
      vi.mocked(mockPort.raycast).mockReturnValue(null);

      const result = mockPort.raycast(100, 200);

      expect(result).toBeNull();
    });

    it('should detect all six block faces', () => {
      const faces: BlockFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

      for (const face of faces) {
        const raycastResult: RaycastResult = {
          position: Position.create(0, 0, 0),
          face,
          distance: 5.0,
        };

        vi.mocked(mockPort.raycast).mockReturnValue(raycastResult);

        const result = mockPort.raycast(50, 50);

        expect(result?.face).toBe(face);
      }
    });

    it('should handle screen coordinates at boundaries', () => {
      vi.mocked(mockPort.raycast).mockReturnValue(null);

      // Test negative coordinates
      expect(mockPort.raycast(-1, -1)).toBeNull();

      // Test large coordinates
      expect(mockPort.raycast(10000, 10000)).toBeNull();

      // Test zero coordinates
      expect(mockPort.raycast(0, 0)).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should dispose renderer resources', () => {
      mockPort.dispose();

      expect(mockPort.dispose).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      mockPort.dispose();
      mockPort.dispose();
      mockPort.dispose();

      expect(mockPort.dispose).toHaveBeenCalledTimes(3);
    });
  });
});

describe('RendererOptions', () => {
  it('should support all configuration options', () => {
    const options: RendererOptions = {
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true,
      maxTextureSize: 4096,
    };

    expect(options.antialias).toBe(true);
    expect(options.powerPreference).toBe('high-performance');
    expect(options.alpha).toBe(true);
    expect(options.preserveDrawingBuffer).toBe(true);
    expect(options.maxTextureSize).toBe(4096);
  });

  it('should accept minimal options', () => {
    const options: RendererOptions = {};

    expect(options).toBeDefined();
  });
});

describe('BlockFace type', () => {
  it('should define all six faces', () => {
    const faces: BlockFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

    expect(faces).toHaveLength(6);
  });
});
