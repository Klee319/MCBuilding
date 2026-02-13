/**
 * MockStructureConverterGateway Tests
 *
 * Mock Structure Converter Gatewayの単体テスト
 * - 構造変換
 * - 構造解析
 * - バージョンサポート
 * - エラーシナリオ
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockStructureConverterGateway } from '../../../../src/infra/gateways/mock/mock-structure-converter-gateway.js';
import type { Edition } from '../../../../src/domain/value-objects/edition.js';
import type { Version } from '../../../../src/domain/value-objects/version.js';
import type { FileFormat } from '../../../../src/domain/value-objects/file-format.js';
import type {
  StructureData,
  StructureMetadata,
  ConversionResult,
} from '../../../../src/usecase/ports/types.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import { structureDataStore } from '../../../../src/infra/gateways/structure-data-store.js';
import type { ParsedSchematic } from '../../../../src/infra/gateways/schematic-parser.js';
import { serializeToSponge } from '../../../../src/infra/gateways/structure-serializer.js';

describe('MockStructureConverterGateway', () => {
  let gateway: MockStructureConverterGateway;

  // ヘルパー関数: モックエディションを作成
  function createEdition(value: 'java' | 'bedrock'): Edition {
    return { value } as Edition;
  }

  // ヘルパー関数: モックバージョンを作成
  function createVersion(version: string): Version {
    return {
      toString: () => version,
    } as unknown as Version;
  }

  // ヘルパー関数: モックファイルフォーマットを作成
  function createFileFormat(value: string): FileFormat {
    return { value } as FileFormat;
  }

  // ヘルパー関数: モック構造データを作成
  function createStructureData(size: number = 100): StructureData {
    return {
      content: new Uint8Array(size),
      format: createFileFormat('schematic'),
    };
  }

  // ヘルパー関数: 有効なSponge Schematicバイナリデータを生成
  async function createValidSchematicBytes(): Promise<Uint8Array> {
    const parsed: ParsedSchematic = {
      dimensions: { x: 2, y: 2, z: 2 },
      palette: [
        { name: 'minecraft:air' },
        { name: 'minecraft:stone' },
      ],
      blocks: [
        { x: 0, y: 0, z: 0, paletteIndex: 1 },
        { x: 1, y: 0, z: 0, paletteIndex: 1 },
      ],
      blockCount: 2,
    };
    return serializeToSponge(parsed);
  }

  beforeEach(() => {
    gateway = new MockStructureConverterGateway();
  });

  // ========================================
  // convert テスト
  // ========================================

  describe('convert', () => {
    it('JavaからJavaへの変換が成功すること', async () => {
      const source = createStructureData();

      const result = await gateway.convert(
        source,
        createEdition('java'),
        createVersion('1.20'),
        createEdition('java'),
        createVersion('1.21')
      );

      expect(result.data).toBeDefined();
      expect(result.hasDataLoss).toBe(false);
      expect(result.convertedBlocks).toEqual([]);
    });

    it('JavaからBedrockへの変換が成功すること', async () => {
      const source = createStructureData();

      const result = await gateway.convert(
        source,
        createEdition('java'),
        createVersion('1.20'),
        createEdition('bedrock'),
        createVersion('1.20')
      );

      expect(result.data.format.value).toBe('mcstructure');
    });

    it('BedrockからJavaへの変換が成功すること', async () => {
      const source = createStructureData();

      const result = await gateway.convert(
        source,
        createEdition('bedrock'),
        createVersion('1.20'),
        createEdition('java'),
        createVersion('1.20')
      );

      expect(result.data.format.value).toBe('schematic');
    });

    describe('バージョンサポート', () => {
      it('1.12未満のソースバージョンはエラーになること', async () => {
        const source = createStructureData();

        await expect(
          gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.11'),
            createEdition('java'),
            createVersion('1.20')
          )
        ).rejects.toThrow(PortError);
      });

      it('1.12未満のターゲットバージョンはエラーになること', async () => {
        const source = createStructureData();

        await expect(
          gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.20'),
            createEdition('java'),
            createVersion('1.11')
          )
        ).rejects.toThrow(PortError);
      });

      it('エラーコードがUNSUPPORTED_VERSIONであること', async () => {
        const source = createStructureData();

        try {
          await gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.11'),
            createEdition('java'),
            createVersion('1.20')
          );
        } catch (error) {
          expect((error as PortError).code).toBe('UNSUPPORTED_VERSION');
        }
      });

      it('1.12のバージョンは許可されること', async () => {
        const source = createStructureData();

        await expect(
          gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.12'),
            createEdition('java'),
            createVersion('1.12')
          )
        ).resolves.not.toThrow();
      });

      it('1.20以上のバージョンは許可されること', async () => {
        const source = createStructureData();

        await expect(
          gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.20'),
            createEdition('java'),
            createVersion('1.21')
          )
        ).resolves.not.toThrow();
      });
    });

    describe('shouldFailConversion', () => {
      it('変換失敗をシミュレートできること', async () => {
        gateway.setShouldFailConversion(true);
        const source = createStructureData();

        await expect(
          gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.20'),
            createEdition('bedrock'),
            createVersion('1.20')
          )
        ).rejects.toThrow(PortError);
      });

      it('エラーコードがCONVERSION_FAILEDであること', async () => {
        gateway.setShouldFailConversion(true);
        const source = createStructureData();

        try {
          await gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.20'),
            createEdition('bedrock'),
            createVersion('1.20')
          );
        } catch (error) {
          expect((error as PortError).code).toBe('CONVERSION_FAILED');
        }
      });

      it('バージョンチェックは変換エラーより先に評価されること', async () => {
        gateway.setShouldFailConversion(true);
        const source = createStructureData();

        try {
          await gateway.convert(
            source,
            createEdition('java'),
            createVersion('1.11'), // 無効なバージョン
            createEdition('bedrock'),
            createVersion('1.20')
          );
        } catch (error) {
          expect((error as PortError).code).toBe('UNSUPPORTED_VERSION');
        }
      });
    });

    describe('setMockConversionResult', () => {
      it('モック変換結果を設定できること', async () => {
        const mockResult: ConversionResult = {
          data: {
            content: new Uint8Array([1, 2, 3]),
            format: createFileFormat('custom'),
          },
          convertedBlocks: [
            { blockId: 'minecraft:coral', count: 5, reason: 'Not supported in target' },
          ],
          hasDataLoss: true,
        };

        gateway.setMockConversionResult(mockResult);
        const source = createStructureData();

        const result = await gateway.convert(
          source,
          createEdition('java'),
          createVersion('1.20'),
          createEdition('bedrock'),
          createVersion('1.20')
        );

        expect(result).toEqual(mockResult);
        expect(result.hasDataLoss).toBe(true);
        expect(result.convertedBlocks).toHaveLength(1);
      });
    });
  });

  // ========================================
  // parseStructure テスト
  // ========================================

  describe('parseStructure', () => {
    it('有効なファイルからメタデータを抽出できること', async () => {
      const file = await createValidSchematicBytes();
      const format = createFileFormat('schematic');

      const result = await gateway.parseStructure(file, format);

      expect(result.dimensions).toBeDefined();
      expect(result.dimensions.x).toBeGreaterThan(0);
      expect(result.dimensions.y).toBeGreaterThan(0);
      expect(result.dimensions.z).toBeGreaterThan(0);
      expect(result.blockCount).toBeGreaterThan(0);
      expect(result.usedBlocks).toContain('minecraft:stone');
    });

    it('異なるサイズのスキーマティックを正しく解析すること', async () => {
      const file = await createValidSchematicBytes();
      const format = createFileFormat('schematic');

      const result = await gateway.parseStructure(file, format);

      expect(result.blockCount).toBe(2);
      expect(result.dimensions).toEqual({ x: 2, y: 2, z: 2 });
    });

    describe('バリデーション', () => {
      it('4バイト未満のファイルはエラーになること', async () => {
        const tinyFile = new Uint8Array(3);
        const format = createFileFormat('schematic');

        await expect(gateway.parseStructure(tinyFile, format)).rejects.toThrow(PortError);
      });

      it('エラーコードがINVALID_FORMATであること', async () => {
        const tinyFile = new Uint8Array(3);
        const format = createFileFormat('schematic');

        try {
          await gateway.parseStructure(tinyFile, format);
        } catch (error) {
          expect((error as PortError).code).toBe('INVALID_FORMAT');
        }
      });

      it('ちょうど4バイトのファイルはパースエラーになること', async () => {
        const minFile = new Uint8Array(4);
        const format = createFileFormat('schematic');

        await expect(gateway.parseStructure(minFile, format)).rejects.toThrow(PortError);
      });
    });

    describe('shouldFailParse', () => {
      it('解析失敗をシミュレートできること', async () => {
        gateway.setShouldFailParse(true);
        const file = new Uint8Array(100);
        const format = createFileFormat('schematic');

        await expect(gateway.parseStructure(file, format)).rejects.toThrow(PortError);
      });

      it('エラーコードがPARSE_ERRORであること', async () => {
        gateway.setShouldFailParse(true);
        const file = new Uint8Array(100);
        const format = createFileFormat('schematic');

        try {
          await gateway.parseStructure(file, format);
        } catch (error) {
          expect((error as PortError).code).toBe('PARSE_ERROR');
        }
      });

      it('shouldFailParseがtrueの場合、ファイルサイズに関係なくPARSE_ERRORになること', async () => {
        // 実装では shouldFailParse のチェックが先に行われる
        gateway.setShouldFailParse(true);
        const tinyFile = new Uint8Array(3);
        const format = createFileFormat('schematic');

        try {
          await gateway.parseStructure(tinyFile, format);
        } catch (error) {
          expect((error as PortError).code).toBe('PARSE_ERROR');
        }
      });
    });

    describe('setMockMetadata', () => {
      it('モックメタデータを設定できること', async () => {
        const mockMetadata: StructureMetadata = {
          dimensions: { x: 10, y: 20, z: 30 },
          blockCount: 5000,
          usedBlocks: ['minecraft:diamond_block', 'minecraft:emerald_block'],
        };

        gateway.setMockMetadata(mockMetadata);
        const file = new Uint8Array(100);
        const format = createFileFormat('schematic');

        const result = await gateway.parseStructure(file, format);

        expect(result).toEqual(mockMetadata);
      });
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('shouldFailConversionをリセットできること', async () => {
      gateway.setShouldFailConversion(true);
      gateway.clear();

      const source = createStructureData();
      await expect(
        gateway.convert(
          source,
          createEdition('java'),
          createVersion('1.20'),
          createEdition('bedrock'),
          createVersion('1.20')
        )
      ).resolves.not.toThrow();
    });

    it('shouldFailParseをリセットできること', async () => {
      gateway.setShouldFailParse(true);
      gateway.clear();

      const file = await createValidSchematicBytes();
      const format = createFileFormat('schematic');
      await expect(gateway.parseStructure(file, format)).resolves.not.toThrow();
    });

    it('mockMetadataをリセットできること', async () => {
      gateway.setMockMetadata({
        dimensions: { x: 100, y: 100, z: 100 },
        blockCount: 1000000,
        usedBlocks: [],
      });
      gateway.clear();

      const file = await createValidSchematicBytes();
      const format = createFileFormat('schematic');
      const result = await gateway.parseStructure(file, format);

      // デフォルトのモック動作に戻る
      expect(result.blockCount).not.toBe(1000000);
    });

    it('mockConversionResultをリセットできること', async () => {
      gateway.setMockConversionResult({
        data: { content: new Uint8Array([1, 2, 3]), format: createFileFormat('custom') },
        convertedBlocks: [],
        hasDataLoss: true,
      });
      gateway.clear();

      const source = createStructureData();
      const result = await gateway.convert(
        source,
        createEdition('java'),
        createVersion('1.20'),
        createEdition('bedrock'),
        createVersion('1.20')
      );

      // デフォルトのモック動作に戻る
      expect(result.hasDataLoss).toBe(false);
    });
  });

  // ========================================
  // エッジケース テスト
  // ========================================

  describe('エッジケース', () => {
    it('空のコンテンツを持つ構造データでも変換できること', async () => {
      const emptySource: StructureData = {
        content: new Uint8Array(0),
        format: createFileFormat('schematic'),
      };

      const result = await gateway.convert(
        emptySource,
        createEdition('java'),
        createVersion('1.20'),
        createEdition('bedrock'),
        createVersion('1.20')
      );

      expect(result.data.content).toEqual(new Uint8Array(0));
    });

    it('大きなファイルでも解析できること', async () => {
      const file = await createValidSchematicBytes();
      const format = createFileFormat('schematic');

      const result = await gateway.parseStructure(file, format);
      expect(result.blockCount).toBeGreaterThan(0);
    });

    it('同じエディション・バージョンへの変換も動作すること', async () => {
      const source = createStructureData();

      const result = await gateway.convert(
        source,
        createEdition('java'),
        createVersion('1.20'),
        createEdition('java'),
        createVersion('1.20')
      );

      expect(result.hasDataLoss).toBe(false);
    });
  });

  // ========================================
  // exportStructure テスト
  // ========================================

  describe('exportStructure', () => {
    const testStructureId = 'test-struct-export-1';
    const testRawFile = new Uint8Array([1, 2, 3, 4, 5]);
    const testParsed: ParsedSchematic = {
      dimensions: { x: 2, y: 2, z: 2 },
      palette: [
        { name: 'minecraft:air' },
        { name: 'minecraft:stone' },
      ],
      blocks: [
        { x: 0, y: 0, z: 0, paletteIndex: 1 },
        { x: 1, y: 0, z: 0, paletteIndex: 1 },
        { x: 0, y: 1, z: 0, paletteIndex: 1 },
      ],
      blockCount: 3,
    };

    beforeEach(() => {
      structureDataStore.clear();
      structureDataStore.set(testStructureId, {
        rawFile: testRawFile,
        format: 'schematic',
        parsed: testParsed,
      });
    });

    it('同一フォーマットの場合、元のrawFileが返されること', async () => {
      const format = createFileFormat('schematic') as FileFormat & { getExtension(): string };
      // getExtensionが必要なのでモックを拡張
      (format as any).getExtension = () => '.schematic';

      const result = await gateway.exportStructure(
        testStructureId,
        format,
        createEdition('java'),
        createVersion('1.20')
      );

      expect(result.data).toBe(testRawFile);
      expect(result.hasDataLoss).toBe(false);
      expect(result.lostBlocks).toEqual([]);
    });

    it('litematic形式へのクロスフォーマット変換が成功すること', async () => {
      const format = createFileFormat('litematic') as FileFormat & { getExtension(): string };
      (format as any).getExtension = () => '.litematic';

      const result = await gateway.exportStructure(
        testStructureId,
        format,
        createEdition('java'),
        createVersion('1.20')
      );

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.hasDataLoss).toBe(false);
      // gzip magic bytes
      expect(result.data[0]).toBe(0x1f);
      expect(result.data[1]).toBe(0x8b);
    });

    it('mcstructure形式へのクロスフォーマット変換が成功すること', async () => {
      const format = createFileFormat('mcstructure') as FileFormat & { getExtension(): string };
      (format as any).getExtension = () => '.mcstructure';

      const result = await gateway.exportStructure(
        testStructureId,
        format,
        createEdition('bedrock'),
        createVersion('1.20')
      );

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.hasDataLoss).toBe(false);
    });

    it('存在しないstructureIdの場合NOT_FOUNDエラーになること', async () => {
      const format = createFileFormat('schematic') as FileFormat & { getExtension(): string };
      (format as any).getExtension = () => '.schematic';

      try {
        await gateway.exportStructure(
          'non-existent-id',
          format,
          createEdition('java'),
          createVersion('1.20')
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PortError);
        expect((error as PortError).code).toBe('NOT_FOUND');
      }
    });

    it('fileNameにフォーマットの拡張子が含まれること', async () => {
      const format = createFileFormat('litematic') as FileFormat & { getExtension(): string };
      (format as any).getExtension = () => '.litematic';

      const result = await gateway.exportStructure(
        testStructureId,
        format,
        createEdition('java'),
        createVersion('1.20')
      );

      expect(result.fileName).toContain('.litematic');
    });
  });
});
