/**
 * Structure Serializer Tests
 *
 * ラウンドトリップテスト（serialize → parse）、バリデーション、エッジケースをカバー。
 */

import { describe, it, expect } from 'vitest';
import {
  serializeToSponge,
  serializeToLitematic,
  serializeToMcstructure,
} from '../../../../src/infra/gateways/structure-serializer.js';
import {
  parseSpongeSchematic,
  parseLitematic,
  parseMcstructure,
  type ParsedSchematic,
  type ParsedBlock,
  type ParsedPaletteEntry,
} from '../../../../src/infra/gateways/schematic-parser.js';
import { PortError } from '../../../../src/usecase/ports/types.js';

// ========================================
// Test Helpers
// ========================================

function createParsedSchematic(overrides: Partial<ParsedSchematic> = {}): ParsedSchematic {
  const palette: ParsedPaletteEntry[] = [
    { name: 'minecraft:air' },
    { name: 'minecraft:stone' },
    { name: 'minecraft:oak_planks' },
  ];
  const blocks: ParsedBlock[] = [
    { x: 0, y: 0, z: 0, paletteIndex: 1 },
    { x: 1, y: 0, z: 0, paletteIndex: 2 },
    { x: 0, y: 1, z: 0, paletteIndex: 1 },
    { x: 1, y: 1, z: 1, paletteIndex: 2 },
  ];

  return {
    dimensions: { x: 3, y: 3, z: 3 },
    palette,
    blocks,
    blockCount: blocks.length,
    ...overrides,
  };
}

function createSingleBlockSchematic(): ParsedSchematic {
  return {
    dimensions: { x: 1, y: 1, z: 1 },
    palette: [{ name: 'minecraft:air' }, { name: 'minecraft:diamond_block' }],
    blocks: [{ x: 0, y: 0, z: 0, paletteIndex: 1 }],
    blockCount: 1,
  };
}

function createSchematicWithProperties(): ParsedSchematic {
  return {
    dimensions: { x: 2, y: 1, z: 1 },
    palette: [
      { name: 'minecraft:air' },
      { name: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom', shape: 'straight' } },
    ],
    blocks: [{ x: 0, y: 0, z: 0, paletteIndex: 1 }],
    blockCount: 1,
  };
}

function createLargePaletteSchematic(): ParsedSchematic {
  const palette: ParsedPaletteEntry[] = [];
  for (let i = 0; i < 64; i++) {
    palette.push({ name: `minecraft:block_${i}` });
  }
  const blocks: ParsedBlock[] = [
    { x: 0, y: 0, z: 0, paletteIndex: 0 },
    { x: 1, y: 0, z: 0, paletteIndex: 63 },
  ];
  return {
    dimensions: { x: 2, y: 1, z: 1 },
    palette,
    blocks,
    blockCount: 2,
  };
}

// ========================================
// Sponge Schematic (.schem) Tests
// ========================================

describe('serializeToSponge', () => {
  it('基本的なシリアライズが成功すること', async () => {
    const input = createParsedSchematic();
    const result = await serializeToSponge(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // gzip magic bytes
    expect(result[0]).toBe(0x1f);
    expect(result[1]).toBe(0x8b);
  });

  it('ラウンドトリップ: serialize → parse で元のデータが復元されること', async () => {
    const input = createParsedSchematic();
    const serialized = await serializeToSponge(input);
    const parsed = await parseSpongeSchematic(serialized);

    expect(parsed.dimensions).toEqual(input.dimensions);
    expect(parsed.palette.length).toBe(input.palette.length);

    // ブロック名が一致
    const inputNames = input.palette.map((p) => p.name).sort();
    const parsedNames = parsed.palette.map((p) => p.name).sort();
    expect(parsedNames).toEqual(inputNames);

    // 非airブロック数が一致
    expect(parsed.blockCount).toBe(input.blockCount);
  });

  it('単一ブロックのラウンドトリップが成功すること', async () => {
    const input = createSingleBlockSchematic();
    const serialized = await serializeToSponge(input);
    const parsed = await parseSpongeSchematic(serialized);

    expect(parsed.dimensions).toEqual({ x: 1, y: 1, z: 1 });
    expect(parsed.blockCount).toBe(1);
    expect(parsed.blocks[0]).toEqual({ x: 0, y: 0, z: 0, paletteIndex: expect.any(Number) });
    // ブロック名確認
    const blockName = parsed.palette[parsed.blocks[0].paletteIndex]?.name;
    expect(blockName).toBe('minecraft:diamond_block');
  });

  it('プロパティ付きブロックが保存されること', async () => {
    const input = createSchematicWithProperties();
    const serialized = await serializeToSponge(input);
    const parsed = await parseSpongeSchematic(serialized);

    const stairEntry = parsed.palette.find((p) => p.name === 'minecraft:oak_stairs');
    expect(stairEntry).toBeDefined();
    expect(stairEntry!.properties).toBeDefined();
    expect(stairEntry!.properties!['facing']).toBe('north');
    expect(stairEntry!.properties!['half']).toBe('bottom');
  });

  it('大きなパレットでも正しくシリアライズされること', async () => {
    const input = createLargePaletteSchematic();
    const serialized = await serializeToSponge(input);
    const parsed = await parseSpongeSchematic(serialized);

    expect(parsed.palette.length).toBe(64);
  });
});

// ========================================
// Litematic (.litematic) Tests
// ========================================

describe('serializeToLitematic', () => {
  it('基本的なシリアライズが成功すること', async () => {
    const input = createParsedSchematic();
    const result = await serializeToLitematic(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // gzip magic bytes
    expect(result[0]).toBe(0x1f);
    expect(result[1]).toBe(0x8b);
  });

  it('ラウンドトリップ: serialize → parse で元のデータが復元されること', async () => {
    const input = createParsedSchematic();
    const serialized = await serializeToLitematic(input);
    const parsed = await parseLitematic(serialized);

    expect(parsed.dimensions).toEqual(input.dimensions);
    expect(parsed.blockCount).toBe(input.blockCount);

    // パレット名が一致
    const inputNames = input.palette.map((p) => p.name).sort();
    const parsedNames = parsed.palette.map((p) => p.name).sort();
    expect(parsedNames).toEqual(inputNames);
  });

  it('単一ブロックのラウンドトリップが成功すること', async () => {
    const input = createSingleBlockSchematic();
    const serialized = await serializeToLitematic(input);
    const parsed = await parseLitematic(serialized);

    expect(parsed.dimensions).toEqual({ x: 1, y: 1, z: 1 });
    expect(parsed.blockCount).toBe(1);
    const blockName = parsed.palette[parsed.blocks[0].paletteIndex]?.name;
    expect(blockName).toBe('minecraft:diamond_block');
  });

  it('大きなパレット（>16エントリ）でパッキングが正しく動作すること', async () => {
    const input = createLargePaletteSchematic();
    const serialized = await serializeToLitematic(input);
    const parsed = await parseLitematic(serialized);

    // 最初と最後のパレットインデックスが保存されていること
    expect(parsed.palette.length).toBeGreaterThanOrEqual(2);
    const blockNames = parsed.blocks.map((b) => parsed.palette[b.paletteIndex]?.name);
    expect(blockNames).toContain('minecraft:block_0');
    expect(blockNames).toContain('minecraft:block_63');
  });

  it('spanning パッキングがパーサーと一致すること', async () => {
    // 17エントリパレット → bitsPerBlock=5, entries can span longs
    const palette: ParsedPaletteEntry[] = [];
    for (let i = 0; i < 17; i++) {
      palette.push({ name: `minecraft:block_${i}` });
    }
    // 4x4x4構造で64ブロック（全てのインデックスを使用）
    const blocks: ParsedBlock[] = [];
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        for (let x = 0; x < 4; x++) {
          const idx = (y * 4 + z) * 4 + x;
          blocks.push({ x, y, z, paletteIndex: idx % 17 });
        }
      }
    }
    const input: ParsedSchematic = {
      dimensions: { x: 4, y: 4, z: 4 },
      palette,
      blocks,
      blockCount: 64,
    };

    const serialized = await serializeToLitematic(input);
    const parsed = await parseLitematic(serialized);

    // 全ブロックの位置とパレットインデックスが一致
    expect(parsed.blockCount).toBe(64);
    for (const originalBlock of blocks) {
      const matchingBlock = parsed.blocks.find(
        (b) => b.x === originalBlock.x && b.y === originalBlock.y && b.z === originalBlock.z
      );
      expect(matchingBlock).toBeDefined();
      const originalName = palette[originalBlock.paletteIndex].name;
      const parsedName = parsed.palette[matchingBlock!.paletteIndex]?.name;
      expect(parsedName).toBe(originalName);
    }
  });
});

// ========================================
// Bedrock .mcstructure Tests
// ========================================

describe('serializeToMcstructure', () => {
  it('基本的なシリアライズが成功すること', async () => {
    const input = createParsedSchematic();
    const result = await serializeToMcstructure(input);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // NOT gzip (Bedrock uses uncompressed little-endian NBT)
    expect(result[0]).not.toBe(0x1f);
  });

  it('ラウンドトリップ: serialize → parse で元のデータが復元されること', async () => {
    const input = createParsedSchematic();
    const serialized = await serializeToMcstructure(input);
    const parsed = await parseMcstructure(serialized);

    expect(parsed.dimensions).toEqual(input.dimensions);
    expect(parsed.blockCount).toBe(input.blockCount);

    const inputNames = input.palette.map((p) => p.name).sort();
    const parsedNames = parsed.palette.map((p) => p.name).sort();
    expect(parsedNames).toEqual(inputNames);
  });

  it('単一ブロックのラウンドトリップが成功すること', async () => {
    const input = createSingleBlockSchematic();
    const serialized = await serializeToMcstructure(input);
    const parsed = await parseMcstructure(serialized);

    expect(parsed.dimensions).toEqual({ x: 1, y: 1, z: 1 });
    expect(parsed.blockCount).toBe(1);
    const blockName = parsed.palette[parsed.blocks[0].paletteIndex]?.name;
    expect(blockName).toBe('minecraft:diamond_block');
  });
});

// ========================================
// Validation Tests
// ========================================

describe('バリデーション', () => {
  it('dimensionが0の場合エラーになること', async () => {
    const input = createParsedSchematic({ dimensions: { x: 0, y: 3, z: 3 } });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
    await expect(serializeToLitematic(input)).rejects.toThrow(PortError);
    await expect(serializeToMcstructure(input)).rejects.toThrow(PortError);
  });

  it('dimensionが負の場合エラーになること', async () => {
    const input = createParsedSchematic({ dimensions: { x: -1, y: 3, z: 3 } });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
  });

  it('空のパレットの場合エラーになること', async () => {
    const input = createParsedSchematic({ palette: [] });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
  });

  it('不正なpaletteIndexの場合エラーになること', async () => {
    const input = createParsedSchematic({
      blocks: [{ x: 0, y: 0, z: 0, paletteIndex: 999 }],
    });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
    await expect(serializeToLitematic(input)).rejects.toThrow(PortError);
    await expect(serializeToMcstructure(input)).rejects.toThrow(PortError);
  });

  it('Spongeの次元制限を超える場合エラーになること', async () => {
    const input = createParsedSchematic({
      dimensions: { x: 40000, y: 1, z: 1 },
      blocks: [],
      blockCount: 0,
    });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
  });

  it('構造が大きすぎる場合エラーになること', async () => {
    const input = createParsedSchematic({
      dimensions: { x: 513, y: 513, z: 513 },
      blocks: [],
      blockCount: 0,
    });

    await expect(serializeToSponge(input)).rejects.toThrow(PortError);
  });
});

// ========================================
// Cross-format Tests
// ========================================

describe('クロスフォーマット変換', () => {
  it('Sponge → Litematic のクロスフォーマットラウンドトリップ', async () => {
    const original = createParsedSchematic();

    // Sponge → binary → parse → Litematic → binary → parse
    const spongeBytes = await serializeToSponge(original);
    const fromSponge = await parseSpongeSchematic(spongeBytes);

    const litematicBytes = await serializeToLitematic(fromSponge);
    const fromLitematic = await parseLitematic(litematicBytes);

    expect(fromLitematic.dimensions).toEqual(original.dimensions);
    expect(fromLitematic.blockCount).toBe(original.blockCount);
  });

  it('Litematic → mcstructure のクロスフォーマットラウンドトリップ', async () => {
    const original = createParsedSchematic();

    const litematicBytes = await serializeToLitematic(original);
    const fromLitematic = await parseLitematic(litematicBytes);

    const mcstructureBytes = await serializeToMcstructure(fromLitematic);
    const fromMcstructure = await parseMcstructure(mcstructureBytes);

    expect(fromMcstructure.dimensions).toEqual(original.dimensions);
    expect(fromMcstructure.blockCount).toBe(original.blockCount);
  });
});
