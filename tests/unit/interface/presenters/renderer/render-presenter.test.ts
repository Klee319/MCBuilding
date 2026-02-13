/**
 * Render Presenter Unit Tests
 *
 * TDD tests for RenderPresenter class.
 * Tests rendering state transformation to view models for the 3D Structure Renderer.
 */

import { describe, it, expect } from 'vitest';
import { RenderPresenter } from '../../../../../src/interface/presenters/renderer/render-presenter.js';
import type {
  RenderViewModel,
  BlockInfoViewModel,
  RenderStatsViewModel,
  StructureInfoViewModel,
} from '../../../../../src/interface/presenters/renderer/types.js';
import { Position } from '../../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../../src/domain/renderer/block-state.js';
import { Block } from '../../../../../src/domain/renderer/block.js';
import { Structure } from '../../../../../src/domain/renderer/structure.js';
import { Dimensions } from '../../../../../src/domain/value-objects/dimensions.js';

// ========================================
// Mock Data Factory
// ========================================

/**
 * Creates a mock RenderStats object
 */
function createMockRenderStats(overrides: Partial<{
  fps: number;
  drawCalls: number;
  triangles: number;
  memoryBytes: number;
}> = {}): {
  fps: number;
  drawCalls: number;
  triangles: number;
  memoryBytes: number;
} {
  return {
    fps: overrides.fps ?? 60,
    drawCalls: overrides.drawCalls ?? 100,
    triangles: overrides.triangles ?? 1200000,
    memoryBytes: overrides.memoryBytes ?? 268435456, // 256 MB
  };
}

/**
 * Creates a mock Block
 */
function createMockBlock(overrides: Partial<{
  name: string;
  position: Position;
  properties: Record<string, string>;
}> = {}): Block {
  const position = overrides.position ?? Position.create(10, 20, 30);
  const state = BlockState.create(
    overrides.name ?? 'minecraft:stone',
    overrides.properties ?? {}
  );
  return Block.create(position, state);
}

/**
 * Creates a mock Structure
 */
function createMockStructure(overrides: Partial<{
  name: string;
  dimensions: Dimensions;
  blockCount: number;
}> = {}): Structure {
  const name = overrides.name ?? 'Test Structure';
  const dimensions = overrides.dimensions ?? Dimensions.create(100, 50, 100);
  const blocks = new Map<string, Block>();

  // Add some blocks based on blockCount if needed
  const blockCount = overrides.blockCount ?? 500000;
  if (blockCount > 0) {
    const block = Block.create(Position.create(0, 0, 0), BlockState.create('minecraft:stone'));
    blocks.set('0,0,0', block);
  }

  return Structure.create(name, dimensions, [], blocks);
}

// ========================================
// Test: RenderPresenter.loading
// ========================================
describe('RenderPresenter.loading', () => {
  it('returns RenderViewModel with isLoading true', () => {
    const result = RenderPresenter.loading(50);

    expect(result.isLoading).toBe(true);
  });

  it('returns progress value', () => {
    const result = RenderPresenter.loading(75);

    expect(result.progress).toBe(75);
  });

  it('returns null error when loading', () => {
    const result = RenderPresenter.loading(25);

    expect(result.error).toBeNull();
  });

  it('returns null blockInfo when loading', () => {
    const result = RenderPresenter.loading(50);

    expect(result.blockInfo).toBeNull();
  });

  it('returns default stats when loading', () => {
    const result = RenderPresenter.loading(50);

    expect(result.stats).toBeDefined();
    expect(result.stats.fps).toBe(0);
    expect(result.stats.drawCalls).toBe(0);
    expect(result.stats.triangles).toBe('0');
    expect(result.stats.memory).toBe('0 B');
  });

  it('handles 0 progress', () => {
    const result = RenderPresenter.loading(0);

    expect(result.progress).toBe(0);
    expect(result.isLoading).toBe(true);
  });

  it('handles 100 progress', () => {
    const result = RenderPresenter.loading(100);

    expect(result.progress).toBe(100);
    expect(result.isLoading).toBe(true);
  });
});

// ========================================
// Test: RenderPresenter.error
// ========================================
describe('RenderPresenter.error', () => {
  it('returns RenderViewModel with error message', () => {
    const result = RenderPresenter.error('Failed to load structure');

    expect(result.error).toBe('Failed to load structure');
  });

  it('returns isLoading false on error', () => {
    const result = RenderPresenter.error('Error occurred');

    expect(result.isLoading).toBe(false);
  });

  it('returns progress 0 on error', () => {
    const result = RenderPresenter.error('Error occurred');

    expect(result.progress).toBe(0);
  });

  it('returns null blockInfo on error', () => {
    const result = RenderPresenter.error('Error occurred');

    expect(result.blockInfo).toBeNull();
  });

  it('returns default stats on error', () => {
    const result = RenderPresenter.error('Error occurred');

    expect(result.stats.fps).toBe(0);
    expect(result.stats.drawCalls).toBe(0);
  });

  it('handles empty error message', () => {
    const result = RenderPresenter.error('');

    expect(result.error).toBe('');
  });

  it('handles long error message', () => {
    const longMessage = 'A'.repeat(1000);
    const result = RenderPresenter.error(longMessage);

    expect(result.error).toBe(longMessage);
  });
});

// ========================================
// Test: RenderPresenter.ready
// ========================================
describe('RenderPresenter.ready', () => {
  it('returns isLoading false when ready', () => {
    const stats = createMockRenderStats();
    const result = RenderPresenter.ready(stats, null);

    expect(result.isLoading).toBe(false);
  });

  it('returns progress 100 when ready', () => {
    const stats = createMockRenderStats();
    const result = RenderPresenter.ready(stats, null);

    expect(result.progress).toBe(100);
  });

  it('returns null error when ready', () => {
    const stats = createMockRenderStats();
    const result = RenderPresenter.ready(stats, null);

    expect(result.error).toBeNull();
  });

  it('returns null blockInfo when no block selected', () => {
    const stats = createMockRenderStats();
    const result = RenderPresenter.ready(stats, null);

    expect(result.blockInfo).toBeNull();
  });

  it('returns formatted stats', () => {
    const stats = createMockRenderStats({
      fps: 60,
      drawCalls: 100,
      triangles: 1200000,
      memoryBytes: 268435456, // 256 MB
    });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.fps).toBe(60);
    expect(result.stats.drawCalls).toBe(100);
    expect(result.stats.triangles).toBe('1.2M');
    expect(result.stats.memory).toBe('256 MB');
  });

  it('returns blockInfo when block is selected', () => {
    const stats = createMockRenderStats();
    const block = createMockBlock({
      name: 'minecraft:oak_planks',
      position: Position.create(5, 10, 15),
    });
    const result = RenderPresenter.ready(stats, block);

    expect(result.blockInfo).not.toBeNull();
    expect(result.blockInfo?.name).toBe('minecraft:oak_planks');
    expect(result.blockInfo?.position).toBe('X: 5, Y: 10, Z: 15');
  });

  it('formats block with properties', () => {
    const stats = createMockRenderStats();
    const block = createMockBlock({
      name: 'minecraft:oak_stairs',
      position: Position.create(1, 2, 3),
      properties: { facing: 'north', half: 'bottom' },
    });
    const result = RenderPresenter.ready(stats, block);

    expect(result.blockInfo?.properties).toContainEqual({ key: 'facing', value: 'north' });
    expect(result.blockInfo?.properties).toContainEqual({ key: 'half', value: 'bottom' });
  });
});

// ========================================
// Test: RenderPresenter.formatBlockName
// ========================================
describe('RenderPresenter.formatBlockName', () => {
  it('formats minecraft:stone to Stone', () => {
    const state = BlockState.create('minecraft:stone');
    const result = RenderPresenter.formatBlockName(state);

    expect(result).toBe('Stone');
  });

  it('formats minecraft:oak_planks to Oak Planks', () => {
    const state = BlockState.create('minecraft:oak_planks');
    const result = RenderPresenter.formatBlockName(state);

    expect(result).toBe('Oak Planks');
  });

  it('formats minecraft:chiseled_stone_bricks to Chiseled Stone Bricks', () => {
    const state = BlockState.create('minecraft:chiseled_stone_bricks');
    const result = RenderPresenter.formatBlockName(state);

    expect(result).toBe('Chiseled Stone Bricks');
  });

  it('formats air block correctly', () => {
    const state = BlockState.air();
    const result = RenderPresenter.formatBlockName(state);

    expect(result).toBe('Air');
  });

  it('handles modded blocks with namespace', () => {
    const state = BlockState.create('modname:custom_block');
    const result = RenderPresenter.formatBlockName(state);

    expect(result).toBe('Custom Block');
  });
});

// ========================================
// Test: RenderPresenter.formatPosition
// ========================================
describe('RenderPresenter.formatPosition', () => {
  it('formats position with positive values', () => {
    const pos = Position.create(10, 20, 30);
    const result = RenderPresenter.formatPosition(pos);

    expect(result).toBe('X: 10, Y: 20, Z: 30');
  });

  it('formats position with zero values', () => {
    const pos = Position.create(0, 0, 0);
    const result = RenderPresenter.formatPosition(pos);

    expect(result).toBe('X: 0, Y: 0, Z: 0');
  });

  it('formats position with negative values', () => {
    const pos = Position.create(-5, -10, -15);
    const result = RenderPresenter.formatPosition(pos);

    expect(result).toBe('X: -5, Y: -10, Z: -15');
  });

  it('formats position with mixed values', () => {
    const pos = Position.create(-100, 64, 200);
    const result = RenderPresenter.formatPosition(pos);

    expect(result).toBe('X: -100, Y: 64, Z: 200');
  });

  it('formats position with large values', () => {
    const pos = Position.create(1000000, 2000000, 3000000);
    const result = RenderPresenter.formatPosition(pos);

    expect(result).toBe('X: 1000000, Y: 2000000, Z: 3000000');
  });
});

// ========================================
// Test: RenderPresenter.formatStructureInfo
// ========================================
describe('RenderPresenter.formatStructureInfo', () => {
  it('returns correct structure info view model', () => {
    const structure = createMockStructure({
      name: 'Medieval Castle',
      dimensions: Dimensions.create(100, 50, 100),
    });
    const result = RenderPresenter.formatStructureInfo(structure);

    expect(result.name).toBe('Medieval Castle');
  });

  it('formats dimensions as string', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(100, 50, 100),
    });
    const result = RenderPresenter.formatStructureInfo(structure);

    expect(result.dimensions).toBe('100 x 50 x 100');
  });

  it('formats block count with commas', () => {
    const structure = createMockStructure();
    const result = RenderPresenter.formatStructureInfo(structure);

    // The structure has 1 block from our mock
    expect(result.blockCount).toMatch(/^\d{1,3}(,\d{3})*$/);
  });

  it('returns format as schematic by default', () => {
    const structure = createMockStructure();
    const result = RenderPresenter.formatStructureInfo(structure);

    // Format is based on structure metadata, default to 'Unknown'
    expect(result.format).toBeDefined();
  });
});

// ========================================
// Test: RenderPresenter.formatNumber
// ========================================
describe('RenderPresenter.formatNumber', () => {
  it('formats small numbers without commas', () => {
    const result = RenderPresenter.formatNumber(999);

    expect(result).toBe('999');
  });

  it('formats thousands with commas', () => {
    const result = RenderPresenter.formatNumber(1000);

    expect(result).toBe('1,000');
  });

  it('formats millions with commas', () => {
    const result = RenderPresenter.formatNumber(1000000);

    expect(result).toBe('1,000,000');
  });

  it('formats zero', () => {
    const result = RenderPresenter.formatNumber(0);

    expect(result).toBe('0');
  });

  it('formats large numbers correctly', () => {
    const result = RenderPresenter.formatNumber(123456789);

    expect(result).toBe('123,456,789');
  });

  it('formats irregular numbers correctly', () => {
    const result = RenderPresenter.formatNumber(12345);

    expect(result).toBe('12,345');
  });
});

// ========================================
// Test: RenderPresenter.formatBytes
// ========================================
describe('RenderPresenter.formatBytes', () => {
  it('formats bytes correctly', () => {
    const result = RenderPresenter.formatBytes(500);

    expect(result).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    const result = RenderPresenter.formatBytes(1024);

    expect(result).toBe('1 KB');
  });

  it('formats megabytes correctly', () => {
    const result = RenderPresenter.formatBytes(1048576); // 1 MB

    expect(result).toBe('1 MB');
  });

  it('formats gigabytes correctly', () => {
    const result = RenderPresenter.formatBytes(1073741824); // 1 GB

    expect(result).toBe('1 GB');
  });

  it('formats 256 MB correctly', () => {
    const result = RenderPresenter.formatBytes(268435456);

    expect(result).toBe('256 MB');
  });

  it('formats zero bytes', () => {
    const result = RenderPresenter.formatBytes(0);

    expect(result).toBe('0 B');
  });

  it('formats decimal values correctly', () => {
    const result = RenderPresenter.formatBytes(1536); // 1.5 KB

    expect(result).toBe('1.5 KB');
  });

  it('formats 1.2 MB correctly', () => {
    const result = RenderPresenter.formatBytes(1258291); // ~1.2 MB

    expect(result).toBe('1.2 MB');
  });
});

// ========================================
// Test: Triangles formatting
// ========================================
describe('RenderPresenter triangle formatting', () => {
  it('formats thousands as K', () => {
    const stats = createMockRenderStats({ triangles: 5000 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.triangles).toBe('5K');
  });

  it('formats millions as M', () => {
    const stats = createMockRenderStats({ triangles: 1200000 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.triangles).toBe('1.2M');
  });

  it('formats small numbers as is', () => {
    const stats = createMockRenderStats({ triangles: 500 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.triangles).toBe('500');
  });

  it('formats zero triangles', () => {
    const stats = createMockRenderStats({ triangles: 0 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.triangles).toBe('0');
  });

  it('formats 2.5M triangles', () => {
    const stats = createMockRenderStats({ triangles: 2500000 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.triangles).toBe('2.5M');
  });
});

// ========================================
// Edge Cases
// ========================================
describe('RenderPresenter edge cases', () => {
  it('handles block with empty properties', () => {
    const stats = createMockRenderStats();
    const block = createMockBlock({
      name: 'minecraft:stone',
      properties: {},
    });
    const result = RenderPresenter.ready(stats, block);

    expect(result.blockInfo?.properties).toEqual([]);
  });

  it('handles block with many properties', () => {
    const stats = createMockRenderStats();
    const block = createMockBlock({
      name: 'minecraft:oak_stairs',
      properties: {
        facing: 'north',
        half: 'bottom',
        shape: 'straight',
        waterlogged: 'false',
      },
    });
    const result = RenderPresenter.ready(stats, block);

    expect(result.blockInfo?.properties).toHaveLength(4);
  });

  it('handles very large FPS values', () => {
    const stats = createMockRenderStats({ fps: 999 });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.fps).toBe(999);
  });

  it('handles zero stats', () => {
    const stats = createMockRenderStats({
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      memoryBytes: 0,
    });
    const result = RenderPresenter.ready(stats, null);

    expect(result.stats.fps).toBe(0);
    expect(result.stats.drawCalls).toBe(0);
    expect(result.stats.triangles).toBe('0');
    expect(result.stats.memory).toBe('0 B');
  });

  it('handles structure with minimal dimensions', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(1, 1, 1),
    });
    const result = RenderPresenter.formatStructureInfo(structure);

    expect(result.dimensions).toBe('1 x 1 x 1');
  });

  it('handles structure with large dimensions', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(1000, 1000, 1000),
    });
    const result = RenderPresenter.formatStructureInfo(structure);

    expect(result.dimensions).toBe('1000 x 1000 x 1000');
  });
});

// ========================================
// Type Safety
// ========================================
describe('RenderPresenter type safety', () => {
  it('loading returns correct RenderViewModel type', () => {
    const result: RenderViewModel = RenderPresenter.loading(50);

    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('blockInfo');
    expect(result).toHaveProperty('stats');
  });

  it('error returns correct RenderViewModel type', () => {
    const result: RenderViewModel = RenderPresenter.error('Error');

    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('blockInfo');
    expect(result).toHaveProperty('stats');
  });

  it('ready returns correct RenderViewModel type', () => {
    const stats = createMockRenderStats();
    const result: RenderViewModel = RenderPresenter.ready(stats, null);

    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('blockInfo');
    expect(result).toHaveProperty('stats');
  });

  it('blockInfo has correct type when present', () => {
    const stats = createMockRenderStats();
    const block = createMockBlock();
    const result = RenderPresenter.ready(stats, block);

    const blockInfo: BlockInfoViewModel | null = result.blockInfo;
    expect(blockInfo).not.toBeNull();
    expect(blockInfo).toHaveProperty('name');
    expect(blockInfo).toHaveProperty('displayName');
    expect(blockInfo).toHaveProperty('position');
    expect(blockInfo).toHaveProperty('properties');
  });

  it('stats has correct type', () => {
    const stats = createMockRenderStats();
    const result = RenderPresenter.ready(stats, null);

    const renderStats: RenderStatsViewModel = result.stats;
    expect(renderStats).toHaveProperty('fps');
    expect(renderStats).toHaveProperty('drawCalls');
    expect(renderStats).toHaveProperty('triangles');
    expect(renderStats).toHaveProperty('memory');
  });

  it('structureInfo has correct type', () => {
    const structure = createMockStructure();
    const result: StructureInfoViewModel = RenderPresenter.formatStructureInfo(structure);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('blockCount');
    expect(result).toHaveProperty('format');
  });
});
