/**
 * MockRendererDataGateway Tests
 *
 * Mock Renderer Data Gatewayの単体テスト
 * - レンダリングデータ生成
 * - リソースパック適用
 * - LODレベル
 * - エラーシナリオ
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockRendererDataGateway } from '../../../../src/infra/gateways/mock/mock-renderer-data-gateway.js';
import type {
  StructureData,
  RenderData,
  TextureAtlas,
  LodLevel,
} from '../../../../src/usecase/ports/types.js';
import { PortError } from '../../../../src/usecase/ports/types.js';

describe('MockRendererDataGateway', () => {
  let gateway: MockRendererDataGateway;

  // ヘルパー関数: モック構造データを作成
  function createStructureData(): StructureData {
    return {
      content: new Uint8Array(100),
      format: { value: 'schematic' } as any,
    };
  }

  beforeEach(() => {
    gateway = new MockRendererDataGateway();
  });

  // ========================================
  // generateRenderData テスト
  // ========================================

  describe('generateRenderData', () => {
    it('レンダリングデータを生成できること', async () => {
      const structure = createStructureData();

      const result = await gateway.generateRenderData(structure);

      expect(result.dimensions).toBeDefined();
      expect(result.blocks).toBeInstanceOf(Array);
      expect(result.palette).toBeInstanceOf(Array);
    });

    it('ブロックデータが有効であること', async () => {
      const structure = createStructureData();

      const result = await gateway.generateRenderData(structure);

      expect(result.blocks.length).toBeGreaterThan(0);
      for (const block of result.blocks.slice(0, 3)) {
        expect(block).toHaveProperty('x');
        expect(block).toHaveProperty('y');
        expect(block).toHaveProperty('z');
        expect(block).toHaveProperty('paletteIndex');
      }
    });

    it('パレットデータが有効であること', async () => {
      const structure = createStructureData();

      const result = await gateway.generateRenderData(structure);

      expect(result.palette.length).toBeGreaterThan(0);
      for (const entry of result.palette) {
        expect(entry).toHaveProperty('name');
      }
    });

    it('ディメンションが含まれること', async () => {
      const structure = createStructureData();

      const result = await gateway.generateRenderData(structure);

      expect(result.dimensions).toBeDefined();
      expect(result.dimensions).toHaveProperty('x');
      expect(result.dimensions).toHaveProperty('y');
      expect(result.dimensions).toHaveProperty('z');
      expect(result.dimensions.x).toBeGreaterThan(0);
      expect(result.dimensions.y).toBeGreaterThan(0);
      expect(result.dimensions.z).toBeGreaterThan(0);
    });

    describe('LODレベル', () => {
      const lodLevels: LodLevel[] = ['full', 'high', 'medium', 'low', 'preview'];

      lodLevels.forEach((level) => {
        it(`LODレベル '${level}' でレンダリングデータを生成できること`, async () => {
          const structure = createStructureData();

          const result = await gateway.generateRenderData(structure, level);

          expect(result.lodLevel).toBe(level);
        });
      });

      it('LODレベル未指定時はmediumになること', async () => {
        const structure = createStructureData();

        const result = await gateway.generateRenderData(structure);

        expect(result.lodLevel).toBe('medium');
      });
    });

    describe('shouldFailGeneration', () => {
      it('生成失敗をシミュレートできること', async () => {
        gateway.setShouldFailGeneration(true);
        const structure = createStructureData();

        await expect(gateway.generateRenderData(structure)).rejects.toThrow(PortError);
      });

      it('エラーコードがGENERATION_FAILEDであること', async () => {
        gateway.setShouldFailGeneration(true);
        const structure = createStructureData();

        try {
          await gateway.generateRenderData(structure);
        } catch (error) {
          expect((error as PortError).code).toBe('GENERATION_FAILED');
        }
      });
    });

    describe('setMockRenderData', () => {
      it('モックレンダリングデータを設定できること', async () => {
        const mockRenderData: RenderData = {
          dimensions: { x: 4, y: 4, z: 4 },
          blocks: [{ x: 0, y: 0, z: 0, paletteIndex: 0 }],
          palette: [{ name: 'minecraft:stone' }],
          lodLevel: 'full',
        };

        gateway.setMockRenderData(mockRenderData);
        const structure = createStructureData();

        const result = await gateway.generateRenderData(structure);

        expect(result).toEqual(mockRenderData);
      });
    });
  });

  // ========================================
  // applyResourcePack テスト
  // ========================================

  describe('applyResourcePack', () => {
    it('テクスチャアトラスを生成できること', async () => {
      const blockIds = ['minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block'];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      expect(result.imageData).toBeInstanceOf(Uint8Array);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.uvMapping).toBeDefined();
    });

    it('各ブロックIDに対応するUVマッピングが生成されること', async () => {
      const blockIds = ['minecraft:stone', 'minecraft:dirt'];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      expect(result.uvMapping['minecraft:stone']).toBeDefined();
      expect(result.uvMapping['minecraft:dirt']).toBeDefined();
    });

    it('UVマッピングに必要なプロパティが含まれること', async () => {
      const blockIds = ['minecraft:stone'];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      const mapping = result.uvMapping['minecraft:stone'];
      expect(mapping).toHaveProperty('u');
      expect(mapping).toHaveProperty('v');
      expect(mapping).toHaveProperty('width');
      expect(mapping).toHaveProperty('height');
    });

    it('UV座標が0-1の範囲内であること', async () => {
      const blockIds = ['minecraft:stone', 'minecraft:dirt', 'minecraft:cobblestone'];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      for (const mapping of Object.values(result.uvMapping)) {
        expect(mapping.u).toBeGreaterThanOrEqual(0);
        expect(mapping.u).toBeLessThanOrEqual(1);
        expect(mapping.v).toBeGreaterThanOrEqual(0);
        expect(mapping.v).toBeLessThanOrEqual(1);
        expect(mapping.width).toBeGreaterThan(0);
        expect(mapping.height).toBeGreaterThan(0);
      }
    });

    it('ブロック数に応じてアトラスサイズが調整されること', async () => {
      const fewBlocks = ['minecraft:stone'];
      const manyBlocks = Array.from(
        { length: 100 },
        (_, i) => `minecraft:block_${i}`
      );

      const smallResult = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        fewBlocks
      );
      const largeResult = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        manyBlocks
      );

      expect(largeResult.width).toBeGreaterThanOrEqual(smallResult.width);
      expect(largeResult.height).toBeGreaterThanOrEqual(smallResult.height);
    });

    it('空のブロックIDリストでも動作すること', async () => {
      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        []
      );

      expect(result.uvMapping).toEqual({});
    });

    describe('shouldFailResourcePack', () => {
      it('リソースパック読み込み失敗をシミュレートできること', async () => {
        gateway.setShouldFailResourcePack(true);

        await expect(
          gateway.applyResourcePack('https://example.com/resourcepack.zip', ['minecraft:stone'])
        ).rejects.toThrow(PortError);
      });

      it('無効なリソースパックURLの場合はINVALID_RESOURCE_PACKエラーになること', async () => {
        gateway.setShouldFailResourcePack(true);

        try {
          await gateway.applyResourcePack(
            'https://example.com/invalid-pack.zip',
            ['minecraft:stone']
          );
        } catch (error) {
          expect((error as PortError).code).toBe('INVALID_RESOURCE_PACK');
        }
      });

      it('通常のURL失敗はFETCH_FAILEDエラーになること', async () => {
        gateway.setShouldFailResourcePack(true);

        try {
          await gateway.applyResourcePack(
            'https://example.com/resourcepack.zip',
            ['minecraft:stone']
          );
        } catch (error) {
          expect((error as PortError).code).toBe('FETCH_FAILED');
        }
      });
    });

    describe('setMockTextureAtlas', () => {
      it('モックテクスチャアトラスを設定できること', async () => {
        const mockAtlas: TextureAtlas = {
          imageData: new Uint8Array([255, 0, 0, 255]),
          width: 1,
          height: 1,
          uvMapping: {
            'minecraft:custom': { u: 0, v: 0, width: 1, height: 1 },
          },
        };

        gateway.setMockTextureAtlas(mockAtlas);

        const result = await gateway.applyResourcePack(
          'https://example.com/resourcepack.zip',
          ['minecraft:stone']
        );

        expect(result).toEqual(mockAtlas);
      });
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('shouldFailGenerationをリセットできること', async () => {
      gateway.setShouldFailGeneration(true);
      gateway.clear();

      const structure = createStructureData();
      await expect(gateway.generateRenderData(structure)).resolves.not.toThrow();
    });

    it('shouldFailResourcePackをリセットできること', async () => {
      gateway.setShouldFailResourcePack(true);
      gateway.clear();

      await expect(
        gateway.applyResourcePack('https://example.com/resourcepack.zip', ['minecraft:stone'])
      ).resolves.not.toThrow();
    });

    it('mockRenderDataをリセットできること', async () => {
      gateway.setMockRenderData({
        dimensions: { x: 1, y: 1, z: 1 },
        blocks: [{ x: 0, y: 0, z: 0, paletteIndex: 0 }],
        palette: [{ name: 'minecraft:stone' }],
        lodLevel: 'full',
      });
      gateway.clear();

      const structure = createStructureData();
      const result = await gateway.generateRenderData(structure);

      // デフォルトのモック動作に戻る（256ブロックの床）
      expect(result.blocks.length).toBeGreaterThan(1);
    });

    it('mockTextureAtlasをリセットできること', async () => {
      gateway.setMockTextureAtlas({
        imageData: new Uint8Array([1]),
        width: 1,
        height: 1,
        uvMapping: {},
      });
      gateway.clear();

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        ['minecraft:stone', 'minecraft:dirt']
      );

      // デフォルトのモック動作に戻る
      expect(Object.keys(result.uvMapping).length).toBe(2);
    });
  });

  // ========================================
  // エッジケース テスト
  // ========================================

  describe('エッジケース', () => {
    it('空の構造データでもレンダリングデータを生成できること', async () => {
      const emptyStructure: StructureData = {
        content: new Uint8Array(0),
        format: { value: 'schematic' } as any,
      };

      const result = await gateway.generateRenderData(emptyStructure);
      expect(result.blocks).toBeInstanceOf(Array);
      expect(result.palette).toBeInstanceOf(Array);
    });

    it('特殊文字を含むブロックIDでもUVマッピングを生成できること', async () => {
      const blockIds = [
        'minecraft:stone_brick_stairs',
        'mod:custom-block',
        'mod:block_v2',
      ];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      expect(Object.keys(result.uvMapping)).toHaveLength(3);
    });

    it('重複するブロックIDでも正常に動作すること', async () => {
      const blockIds = ['minecraft:stone', 'minecraft:stone', 'minecraft:stone'];

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      // 重複は実装依存（最後の一つが残るなど）
      expect(result.uvMapping['minecraft:stone']).toBeDefined();
    });

    it('大量のブロックIDでもUVマッピングを生成できること', async () => {
      const blockIds = Array.from({ length: 1000 }, (_, i) => `minecraft:block_${i}`);

      const result = await gateway.applyResourcePack(
        'https://example.com/resourcepack.zip',
        blockIds
      );

      expect(Object.keys(result.uvMapping)).toHaveLength(1000);
    });

    it('異なるLODレベルで連続して生成できること', async () => {
      const structure = createStructureData();
      const levels: LodLevel[] = ['preview', 'low', 'medium', 'high', 'full'];

      for (const level of levels) {
        const result = await gateway.generateRenderData(structure, level);
        expect(result.lodLevel).toBe(level);
      }
    });
  });
});
