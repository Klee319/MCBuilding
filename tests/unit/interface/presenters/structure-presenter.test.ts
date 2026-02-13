/**
 * Structure Presenter Unit Tests
 *
 * TDD tests for StructurePresenter class.
 * Tests structure entity formatting for API responses including render data.
 */

import { describe, it, expect } from 'vitest';
import { StructurePresenter } from '../../../../src/interface/presenters/structure-presenter.js';
import { Structure } from '../../../../src/domain/entities/structure.js';
import { Edition } from '../../../../src/domain/value-objects/edition.js';
import { Version } from '../../../../src/domain/value-objects/version.js';
import { FileFormat } from '../../../../src/domain/value-objects/file-format.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';
import type { RenderData, LodLevel } from '../../../../src/usecase/ports/types.js';

// ========================================
// Mock Data Factory
// ========================================
function createMockStructure(overrides: Partial<{
  id: string;
  uploaderId: string;
  originalEdition: Edition;
  originalVersion: Version;
  originalFormat: FileFormat;
  dimensions: Dimensions;
  blockCount: number;
  createdAt: Date;
}> = {}): Structure {
  return Structure.create({
    id: overrides.id ?? 'structure-123',
    uploaderId: overrides.uploaderId ?? 'user-123',
    originalEdition: overrides.originalEdition ?? Edition.java(),
    originalVersion: overrides.originalVersion ?? Version.create('1.20.4'),
    originalFormat: overrides.originalFormat ?? FileFormat.schematic(),
    dimensions: overrides.dimensions ?? Dimensions.create(64, 128, 64),
    blockCount: overrides.blockCount ?? 50000,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z'),
  });
}

function createMockRenderData(overrides: Partial<{
  dimensions: { x: number; y: number; z: number };
  blocks: readonly { x: number; y: number; z: number; paletteIndex: number }[];
  palette: readonly { name: string; properties?: Readonly<Record<string, string>> }[];
  lodLevel: LodLevel;
}> = {}): RenderData {
  return {
    dimensions: overrides.dimensions ?? { x: 64, y: 128, z: 64 },
    blocks: overrides.blocks ?? [
      { x: 0, y: 0, z: 0, paletteIndex: 0 },
      { x: 1, y: 1, z: 1, paletteIndex: 1 },
      { x: 2, y: 0, z: 0, paletteIndex: 0 },
    ],
    palette: overrides.palette ?? [
      { name: 'minecraft:stone' },
      { name: 'minecraft:dirt' },
    ],
    lodLevel: overrides.lodLevel ?? 'high',
  };
}

// ========================================
// Test: toOutput method
// ========================================
describe('StructurePresenter.toOutput', () => {
  it('returns correct structure output structure', () => {
    const structure = createMockStructure();
    const result = StructurePresenter.toOutput(structure);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('originalFormat');
    expect(result).toHaveProperty('originalEdition');
    expect(result).toHaveProperty('originalVersion');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('blockCount');
    expect(result).toHaveProperty('availableEditions');
    expect(result).toHaveProperty('availableVersions');
  });

  it('formats structure id correctly', () => {
    const structure = createMockStructure({ id: 'structure-abc-123' });
    const result = StructurePresenter.toOutput(structure);

    expect(result.id).toBe('structure-abc-123');
  });

  it('formats originalFormat as string value', () => {
    const structure = createMockStructure({ originalFormat: FileFormat.litematic() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalFormat).toBe('litematic');
  });

  it('formats originalEdition as string value', () => {
    const structure = createMockStructure({ originalEdition: Edition.bedrock() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalEdition).toBe('bedrock');
  });

  it('formats originalVersion as string', () => {
    const structure = createMockStructure({ originalVersion: Version.create('1.19.4') });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalVersion).toBe('1.19.4');
  });

  it('formats dimensions correctly', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(100, 200, 150),
    });
    const result = StructurePresenter.toOutput(structure);

    expect(result.dimensions).toEqual({ x: 100, y: 200, z: 150 });
  });

  it('formats blockCount correctly', () => {
    const structure = createMockStructure({ blockCount: 123456 });
    const result = StructurePresenter.toOutput(structure);

    expect(result.blockCount).toBe(123456);
  });

  it('includes availableEditions', () => {
    const structure = createMockStructure();
    const result = StructurePresenter.toOutput(structure);

    expect(result.availableEditions).toEqual(['java', 'bedrock']);
  });

  it('includes availableVersions', () => {
    const structure = createMockStructure();
    const result = StructurePresenter.toOutput(structure);

    expect(result.availableVersions).toEqual([
      '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2'
    ]);
  });
});

// ========================================
// Test: format method
// ========================================
describe('StructurePresenter.format', () => {
  it('returns success response with structure data', () => {
    const structure = createMockStructure();
    const result = StructurePresenter.format(structure);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes full structure output in data', () => {
    const structure = createMockStructure({
      id: 'structure-format-123',
      originalFormat: FileFormat.mcstructure(),
    });
    const result = StructurePresenter.format(structure);

    expect(result.data.id).toBe('structure-format-123');
    expect(result.data.originalFormat).toBe('mcstructure');
  });

  it('data structure matches toOutput result', () => {
    const structure = createMockStructure();
    const formatResult = StructurePresenter.format(structure);
    const toOutputResult = StructurePresenter.toOutput(structure);

    expect(formatResult.data).toEqual(toOutputResult);
  });
});

// ========================================
// Test: formatDownload method
// ========================================
describe('StructurePresenter.formatDownload', () => {
  it('returns success response with download data', () => {
    const result = StructurePresenter.formatDownload(
      'https://example.com/download/file.schematic',
      'java',
      '1.20.4'
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes downloadUrl correctly', () => {
    const url = 'https://cdn.example.com/files/structure-123.schematic';
    const result = StructurePresenter.formatDownload(url, 'java', '1.20.4');

    expect(result.data.downloadUrl).toBe(url);
  });

  it('includes edition correctly', () => {
    const result = StructurePresenter.formatDownload(
      'https://example.com/file.mcstructure',
      'bedrock',
      '1.20.0'
    );

    expect(result.data.edition).toBe('bedrock');
  });

  it('includes version correctly', () => {
    const result = StructurePresenter.formatDownload(
      'https://example.com/file.schematic',
      'java',
      '1.18.2'
    );

    expect(result.data.version).toBe('1.18.2');
  });

  it('handles different edition/version combinations', () => {
    const combinations = [
      { url: 'https://a.com/f.schematic', edition: 'java', version: '1.20.4' },
      { url: 'https://b.com/f.litematic', edition: 'java', version: '1.19.4' },
      { url: 'https://c.com/f.mcstructure', edition: 'bedrock', version: '1.20.0' },
    ];

    for (const { url, edition, version } of combinations) {
      const result = StructurePresenter.formatDownload(url, edition, version);
      expect(result.data.downloadUrl).toBe(url);
      expect(result.data.edition).toBe(edition);
      expect(result.data.version).toBe(version);
    }
  });
});

// ========================================
// Test: formatRenderData method
// ========================================
describe('StructurePresenter.formatRenderData', () => {
  it('returns success response with render data', () => {
    const renderData = createMockRenderData();
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes dimensions correctly', () => {
    const dimensions = { x: 32, y: 64, z: 32 };
    const renderData = createMockRenderData({ dimensions });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.dimensions).toEqual({ x: 32, y: 64, z: 32 });
  });

  it('includes blocks with palette indices', () => {
    const blocks = [
      { x: 0, y: 0, z: 0, paletteIndex: 0 },
      { x: 1, y: 0, z: 0, paletteIndex: 1 },
      { x: 0, y: 1, z: 0, paletteIndex: 2 },
    ];
    const renderData = createMockRenderData({ blocks });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.blocks).toHaveLength(3);
    expect(result.data.blocks[0]).toEqual({ x: 0, y: 0, z: 0, paletteIndex: 0 });
    expect(result.data.blocks[1]).toEqual({ x: 1, y: 0, z: 0, paletteIndex: 1 });
    expect(result.data.blocks[2]).toEqual({ x: 0, y: 1, z: 0, paletteIndex: 2 });
  });

  it('includes palette entries', () => {
    const palette = [
      { name: 'minecraft:stone' },
      { name: 'minecraft:oak_planks', properties: { variant: 'oak' } },
    ];
    const renderData = createMockRenderData({ palette });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.palette).toHaveLength(2);
    expect(result.data.palette[0].name).toBe('minecraft:stone');
    expect(result.data.palette[1].name).toBe('minecraft:oak_planks');
    expect(result.data.palette[1].properties).toEqual({ variant: 'oak' });
  });

  it('includes lodLevel correctly', () => {
    const renderData = createMockRenderData({ lodLevel: 'medium' });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.lodLevel).toBe('medium');
  });

  it('handles all LOD levels', () => {
    const lodLevels: LodLevel[] = ['full', 'high', 'medium', 'low', 'preview'];

    for (const lodLevel of lodLevels) {
      const renderData = createMockRenderData({ lodLevel });
      const result = StructurePresenter.formatRenderData(renderData);
      expect(result.data.lodLevel).toBe(lodLevel);
    }
  });
});

// ========================================
// Test: File Format handling
// ========================================
describe('StructurePresenter file format handling', () => {
  it('formats schematic correctly', () => {
    const structure = createMockStructure({ originalFormat: FileFormat.schematic() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalFormat).toBe('schematic');
  });

  it('formats litematic correctly', () => {
    const structure = createMockStructure({ originalFormat: FileFormat.litematic() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalFormat).toBe('litematic');
  });

  it('formats mcstructure correctly', () => {
    const structure = createMockStructure({ originalFormat: FileFormat.mcstructure() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalFormat).toBe('mcstructure');
  });
});

// ========================================
// Test: Edition handling
// ========================================
describe('StructurePresenter edition handling', () => {
  it('formats java edition correctly', () => {
    const structure = createMockStructure({ originalEdition: Edition.java() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalEdition).toBe('java');
  });

  it('formats bedrock edition correctly', () => {
    const structure = createMockStructure({ originalEdition: Edition.bedrock() });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalEdition).toBe('bedrock');
  });
});

// ========================================
// Test: Version handling
// ========================================
describe('StructurePresenter version handling', () => {
  it('formats version with major.minor', () => {
    const structure = createMockStructure({ originalVersion: Version.create('1.20') });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalVersion).toBe('1.20');
  });

  it('formats version with major.minor.patch', () => {
    const structure = createMockStructure({ originalVersion: Version.create('1.20.4') });
    const result = StructurePresenter.toOutput(structure);

    expect(result.originalVersion).toBe('1.20.4');
  });

  it('handles various supported versions', () => {
    const versions = ['1.12', '1.12.2', '1.16.5', '1.18.2', '1.19.4', '1.20.1', '1.20.4'];

    for (const versionStr of versions) {
      const structure = createMockStructure({ originalVersion: Version.create(versionStr) });
      const result = StructurePresenter.toOutput(structure);
      expect(result.originalVersion).toBe(versionStr);
    }
  });
});

// ========================================
// Test: Dimensions handling
// ========================================
describe('StructurePresenter dimensions handling', () => {
  it('formats small dimensions correctly', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(10, 10, 10),
    });
    const result = StructurePresenter.toOutput(structure);

    expect(result.dimensions).toEqual({ x: 10, y: 10, z: 10 });
  });

  it('formats large dimensions correctly', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(256, 320, 256),
    });
    const result = StructurePresenter.toOutput(structure);

    expect(result.dimensions).toEqual({ x: 256, y: 320, z: 256 });
  });

  it('formats asymmetric dimensions correctly', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(50, 100, 75),
    });
    const result = StructurePresenter.toOutput(structure);

    expect(result.dimensions).toEqual({ x: 50, y: 100, z: 75 });
  });

  it('formats minimum dimensions (1x1x1)', () => {
    const structure = createMockStructure({
      dimensions: Dimensions.create(1, 1, 1),
    });
    const result = StructurePresenter.toOutput(structure);

    expect(result.dimensions).toEqual({ x: 1, y: 1, z: 1 });
  });
});

// ========================================
// Edge Cases
// ========================================
describe('StructurePresenter edge cases', () => {
  it('handles structure with zero block count', () => {
    const structure = createMockStructure({ blockCount: 0 });
    const result = StructurePresenter.toOutput(structure);

    expect(result.blockCount).toBe(0);
  });

  it('handles structure with very large block count', () => {
    const structure = createMockStructure({ blockCount: 10000000 });
    const result = StructurePresenter.toOutput(structure);

    expect(result.blockCount).toBe(10000000);
  });

  it('handles empty blocks array in render data', () => {
    const renderData = createMockRenderData({
      blocks: [],
      palette: [],
    });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.blocks).toEqual([]);
    expect(result.data.palette).toEqual([]);
  });

  it('handles large blocks array in render data', () => {
    const blocks = Array.from({ length: 1000 }, (_, i) => ({
      x: i % 10,
      y: Math.floor(i / 100),
      z: Math.floor(i / 10) % 10,
      paletteIndex: i % 3,
    }));

    const renderData = createMockRenderData({ blocks });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.blocks).toHaveLength(1000);
    expect(result.data.blocks[0].paletteIndex).toBe(0);
  });

  it('handles dimensions with various values', () => {
    const renderData = createMockRenderData({
      dimensions: { x: 256, y: 320, z: 256 },
    });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.dimensions).toEqual({ x: 256, y: 320, z: 256 });
  });

  it('handles palette with properties', () => {
    const palette = [
      { name: 'minecraft:stone' },
      { name: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom' } },
    ];
    const renderData = createMockRenderData({ palette });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.palette[1].properties).toEqual({ facing: 'north', half: 'bottom' });
  });

  it('handles download URL with query parameters', () => {
    const url = 'https://example.com/download?token=abc&expire=123';
    const result = StructurePresenter.formatDownload(url, 'java', '1.20.4');

    expect(result.data.downloadUrl).toBe(url);
  });

  it('handles download URL with special characters', () => {
    const url = 'https://example.com/files/structure%20name.schematic';
    const result = StructurePresenter.formatDownload(url, 'java', '1.20.4');

    expect(result.data.downloadUrl).toBe(url);
  });

  it('preserves block coordinates correctly', () => {
    const blocks = [
      { x: 0, y: 0, z: 0, paletteIndex: 0 },
      { x: 255, y: 319, z: 255, paletteIndex: 1 },
    ];
    const renderData = createMockRenderData({ blocks });
    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.data.blocks[0]).toEqual({ x: 0, y: 0, z: 0, paletteIndex: 0 });
    expect(result.data.blocks[1]).toEqual({ x: 255, y: 319, z: 255, paletteIndex: 1 });
  });
});

// ========================================
// Integration-like tests
// ========================================
describe('StructurePresenter complete scenarios', () => {
  it('formats Java schematic structure completely', () => {
    const structure = Structure.create({
      id: 'java-schematic-123',
      uploaderId: 'user-456',
      originalEdition: Edition.java(),
      originalVersion: Version.create('1.20.4'),
      originalFormat: FileFormat.schematic(),
      dimensions: Dimensions.create(64, 128, 64),
      blockCount: 50000,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
    });

    const result = StructurePresenter.format(structure);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('java-schematic-123');
    expect(result.data.originalEdition).toBe('java');
    expect(result.data.originalFormat).toBe('schematic');
    expect(result.data.originalVersion).toBe('1.20.4');
    expect(result.data.dimensions).toEqual({ x: 64, y: 128, z: 64 });
    expect(result.data.blockCount).toBe(50000);
  });

  it('formats Bedrock mcstructure completely', () => {
    const structure = Structure.create({
      id: 'bedrock-mcstructure-789',
      uploaderId: 'user-321',
      originalEdition: Edition.bedrock(),
      originalVersion: Version.create('1.20'),
      originalFormat: FileFormat.mcstructure(),
      dimensions: Dimensions.create(32, 64, 32),
      blockCount: 10000,
      createdAt: new Date('2025-02-20T15:45:00.000Z'),
    });

    const result = StructurePresenter.format(structure);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('bedrock-mcstructure-789');
    expect(result.data.originalEdition).toBe('bedrock');
    expect(result.data.originalFormat).toBe('mcstructure');
    expect(result.data.originalVersion).toBe('1.20');
    expect(result.data.dimensions).toEqual({ x: 32, y: 64, z: 32 });
    expect(result.data.blockCount).toBe(10000);
  });

  it('formats complete render data for WebGL', () => {
    const renderData: RenderData = {
      dimensions: { x: 16, y: 16, z: 16 },
      blocks: [
        { x: 0, y: 0, z: 0, paletteIndex: 0 },
        { x: 1, y: 0, z: 0, paletteIndex: 1 },
        { x: 0, y: 1, z: 0, paletteIndex: 0 },
      ],
      palette: [
        { name: 'minecraft:stone' },
        { name: 'minecraft:dirt' },
      ],
      lodLevel: 'full',
    };

    const result = StructurePresenter.formatRenderData(renderData);

    expect(result.success).toBe(true);
    expect(result.data.dimensions).toEqual({ x: 16, y: 16, z: 16 });
    expect(result.data.blocks).toHaveLength(3);
    expect(result.data.palette).toHaveLength(2);
    expect(result.data.lodLevel).toBe('full');
  });
});
