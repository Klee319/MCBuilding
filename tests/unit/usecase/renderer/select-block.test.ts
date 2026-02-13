/**
 * SelectBlockUsecase Tests
 *
 * Tests for the select block use case.
 * This use case handles selecting blocks by screen coordinates using raycasting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SelectBlockUsecase,
  createSelectBlockUsecase,
  type SelectBlockInput,
  type SelectBlockOutput,
} from '../../../../src/usecase/renderer/select-block.js';
import type { WebGLRendererPort, RaycastResult, BlockFace } from '../../../../src/usecase/ports/renderer/webgl-renderer-port.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';
import { Block } from '../../../../src/domain/renderer/block.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// Helper to create test structure with specific blocks
function createTestStructure(blocks: Array<{ x: number; y: number; z: number; state: string }>): Structure {
  const dimensions = Dimensions.create(16, 16, 16);
  const palette: BlockState[] = [];
  const blockMap = new Map<string, Block>();

  for (const blockDef of blocks) {
    let blockState = palette.find(s => s.name === blockDef.state);
    if (!blockState) {
      blockState = BlockState.create(blockDef.state);
      palette.push(blockState);
    }

    const position = Position.create(blockDef.x, blockDef.y, blockDef.z);
    const block = Block.create(position, blockState);
    blockMap.set(position.toKey(), block);
  }

  return Structure.create('Test Structure', dimensions, palette, blockMap);
}

// Mock WebGLRendererPort
function createMockWebGLRendererPort(): WebGLRendererPort {
  return {
    initialize: vi.fn(),
    render: vi.fn(),
    raycast: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('SelectBlockUsecase', () => {
  let mockRenderer: WebGLRendererPort;
  let usecase: SelectBlockUsecase;

  beforeEach(() => {
    mockRenderer = createMockWebGLRendererPort();
    usecase = createSelectBlockUsecase(mockRenderer);
  });

  describe('execute', () => {
    it('should return block when raycast hits', () => {
      const structure = createTestStructure([
        { x: 5, y: 2, z: 3, state: 'minecraft:stone' },
      ]);

      const raycastResult: RaycastResult = {
        position: Position.create(5, 2, 3),
        face: 'top',
        distance: 10.5,
      };
      vi.mocked(mockRenderer.raycast).mockReturnValue(raycastResult);

      const input: SelectBlockInput = {
        screenX: 100,
        screenY: 200,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).not.toBeNull();
      expect(result.block?.position.x).toBe(5);
      expect(result.block?.position.y).toBe(2);
      expect(result.block?.position.z).toBe(3);
      expect(result.face).toBe('top');
    });

    it('should return null when raycast misses', () => {
      const structure = createTestStructure([
        { x: 0, y: 0, z: 0, state: 'minecraft:stone' },
      ]);

      vi.mocked(mockRenderer.raycast).mockReturnValue(null);

      const input: SelectBlockInput = {
        screenX: 100,
        screenY: 200,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).toBeNull();
      expect(result.face).toBeNull();
    });

    it('should return null when hit position has no block', () => {
      const structure = createTestStructure([
        { x: 0, y: 0, z: 0, state: 'minecraft:stone' },
      ]);

      // Raycast returns position but no block exists there
      const raycastResult: RaycastResult = {
        position: Position.create(5, 5, 5), // No block at this position
        face: 'north',
        distance: 15.0,
      };
      vi.mocked(mockRenderer.raycast).mockReturnValue(raycastResult);

      const input: SelectBlockInput = {
        screenX: 100,
        screenY: 200,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).toBeNull();
      expect(result.face).toBeNull();
    });

    it('should detect all block faces', () => {
      const structure = createTestStructure([
        { x: 8, y: 8, z: 8, state: 'minecraft:diamond_block' },
      ]);

      const faces: BlockFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

      for (const face of faces) {
        const raycastResult: RaycastResult = {
          position: Position.create(8, 8, 8),
          face,
          distance: 10.0,
        };
        vi.mocked(mockRenderer.raycast).mockReturnValue(raycastResult);

        const input: SelectBlockInput = {
          screenX: 50,
          screenY: 50,
          structure,
        };

        const result = usecase.execute(input);

        expect(result.face).toBe(face);
      }
    });

    it('should return correct block state information', () => {
      const structure = createTestStructure([
        { x: 1, y: 2, z: 3, state: 'minecraft:oak_stairs' },
      ]);

      const raycastResult: RaycastResult = {
        position: Position.create(1, 2, 3),
        face: 'east',
        distance: 8.0,
      };
      vi.mocked(mockRenderer.raycast).mockReturnValue(raycastResult);

      const input: SelectBlockInput = {
        screenX: 150,
        screenY: 150,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).not.toBeNull();
      expect(result.block?.state.name).toBe('minecraft:oak_stairs');
    });

    it('should handle screen coordinates at boundaries', () => {
      const structure = createTestStructure([
        { x: 0, y: 0, z: 0, state: 'minecraft:stone' },
      ]);

      vi.mocked(mockRenderer.raycast).mockReturnValue(null);

      // Test with negative coordinates
      const result1 = usecase.execute({
        screenX: -1,
        screenY: -1,
        structure,
      });
      expect(result1.block).toBeNull();

      // Test with zero coordinates
      const result2 = usecase.execute({
        screenX: 0,
        screenY: 0,
        structure,
      });
      expect(result2.block).toBeNull();

      // Test with very large coordinates
      const result3 = usecase.execute({
        screenX: 10000,
        screenY: 10000,
        structure,
      });
      expect(result3.block).toBeNull();
    });

    it('should handle empty structure', () => {
      const dimensions = Dimensions.create(16, 16, 16);
      const structure = Structure.empty('Empty', dimensions);

      vi.mocked(mockRenderer.raycast).mockReturnValue(null);

      const input: SelectBlockInput = {
        screenX: 100,
        screenY: 100,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).toBeNull();
      expect(result.face).toBeNull();
    });

    it('should pass correct coordinates to raycast', () => {
      const structure = createTestStructure([
        { x: 0, y: 0, z: 0, state: 'minecraft:stone' },
      ]);

      vi.mocked(mockRenderer.raycast).mockReturnValue(null);

      const input: SelectBlockInput = {
        screenX: 123,
        screenY: 456,
        structure,
      };

      usecase.execute(input);

      expect(mockRenderer.raycast).toHaveBeenCalledWith(123, 456);
    });

    it('should select block with light level information', () => {
      const dimensions = Dimensions.create(16, 16, 16);
      const palette = [BlockState.create('minecraft:glowstone')];
      const blockMap = new Map<string, Block>();

      const position = Position.create(4, 4, 4);
      const block = Block.create(position, palette[0], 15); // Max light level
      blockMap.set(position.toKey(), block);

      const structure = Structure.create('Lit Structure', dimensions, palette, blockMap);

      const raycastResult: RaycastResult = {
        position: Position.create(4, 4, 4),
        face: 'top',
        distance: 5.0,
      };
      vi.mocked(mockRenderer.raycast).mockReturnValue(raycastResult);

      const input: SelectBlockInput = {
        screenX: 100,
        screenY: 100,
        structure,
      };

      const result = usecase.execute(input);

      expect(result.block).not.toBeNull();
      expect(result.block?.lightLevel).toBe(15);
    });
  });
});

describe('SelectBlockInput', () => {
  it('should contain screen coordinates and structure', () => {
    const structure = createTestStructure([]);
    const input: SelectBlockInput = {
      screenX: 100,
      screenY: 200,
      structure,
    };

    expect(input.screenX).toBe(100);
    expect(input.screenY).toBe(200);
    expect(input.structure).toBe(structure);
  });
});

describe('SelectBlockOutput', () => {
  it('should contain block and face when selected', () => {
    const position = Position.create(0, 0, 0);
    const state = BlockState.create('minecraft:stone');
    const block = Block.create(position, state);

    const output: SelectBlockOutput = {
      block,
      face: 'top',
    };

    expect(output.block).toBe(block);
    expect(output.face).toBe('top');
  });

  it('should allow null values when nothing selected', () => {
    const output: SelectBlockOutput = {
      block: null,
      face: null,
    };

    expect(output.block).toBeNull();
    expect(output.face).toBeNull();
  });
});
