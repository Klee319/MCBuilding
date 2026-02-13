/**
 * LoadStructureUsecase Tests
 *
 * Tests for the load structure use case.
 * This use case handles loading and parsing structure files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LoadStructureUsecase,
  createLoadStructureUsecase,
  type LoadStructureInput,
  type LoadStructureOutput,
} from '../../../../src/usecase/renderer/load-structure.js';
import type { NBTParserPort, ParsedNBT, StructureFormat } from '../../../../src/usecase/ports/renderer/nbt-parser-port.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';
import { Block } from '../../../../src/domain/renderer/block.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// Helper to create test structure
function createTestStructure(name: string = 'Test Structure'): Structure {
  const dimensions = Dimensions.create(10, 5, 10);
  const palette = [BlockState.create('minecraft:stone')];
  const blocks = new Map<string, Block>();
  const position = Position.create(0, 0, 0);
  const block = Block.create(position, palette[0]);
  blocks.set(position.toKey(), block);

  return Structure.create(name, dimensions, palette, blocks);
}

// Mock NBTParserPort
function createMockNBTParserPort(): NBTParserPort {
  return {
    parse: vi.fn(),
    toStructure: vi.fn(),
  };
}

describe('LoadStructureUsecase', () => {
  let mockParser: NBTParserPort;
  let usecase: LoadStructureUsecase;

  beforeEach(() => {
    mockParser = createMockNBTParserPort();
    usecase = createLoadStructureUsecase(mockParser);
  });

  describe('execute', () => {
    it('should load and parse a schematic file successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: { Width: 10, Height: 5, Length: 10 },
        rawSize: 1024,
      };
      const mockStructure = createTestStructure();

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure).toBe(mockStructure);
        expect(result.value.parseTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should load and parse a schem file successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schem',
        data: { Version: 2 },
        rawSize: 2048,
      };
      const mockStructure = createTestStructure('Sponge Structure');

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(200),
        format: 'schem',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.name).toBe('Sponge Structure');
      }
    });

    it('should load and parse a litematic file successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'litematic',
        data: { MinecraftDataVersion: 3218 },
        rawSize: 4096,
      };
      const mockStructure = createTestStructure('Litematic Structure');

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(300),
        format: 'litematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.name).toBe('Litematic Structure');
      }
    });

    it('should load and parse an mcstructure file successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'mcstructure',
        data: { format_version: 1 },
        rawSize: 512,
      };
      const mockStructure = createTestStructure('Bedrock Structure');

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(50),
        format: 'mcstructure',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.name).toBe('Bedrock Structure');
      }
    });

    it('should handle File input', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: {},
        rawSize: 100,
      };
      const mockStructure = createTestStructure();

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const fileContent = new Uint8Array([0x1f, 0x8b, 0x08]); // gzip header
      const file = new File([fileContent], 'test.schematic', {
        type: 'application/octet-stream',
      });

      const input: LoadStructureInput = {
        data: file,
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
    });

    it('should return error when parsing fails', async () => {
      vi.mocked(mockParser.parse).mockResolvedValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Failed to decompress NBT data'),
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
      }
    });

    it('should return error when structure conversion fails', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: {},
        rawSize: 100,
      };

      vi.mocked(mockParser.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Missing required dimensions'),
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
      }
    });

    it('should return error for empty data', async () => {
      vi.mocked(mockParser.parse).mockResolvedValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Empty data buffer'),
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(0),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
    });

    it('should return error for invalid format', async () => {
      vi.mocked(mockParser.parse).mockResolvedValue({
        success: false,
        error: new PortError('INVALID_FORMAT', 'Unsupported file format'),
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_FORMAT');
      }
    });

    it('should track parse time', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: {},
        rawSize: 100,
      };
      const mockStructure = createTestStructure();

      vi.mocked(mockParser.parse).mockImplementation(async () => {
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true, value: mockNBT };
      });
      vi.mocked(mockParser.toStructure).mockReturnValue({
        success: true,
        value: mockStructure,
      });

      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format: 'schematic',
      };

      const result = await usecase.execute(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.parseTime).toBeGreaterThan(0);
      }
    });
  });
});

describe('LoadStructureInput', () => {
  it('should accept ArrayBuffer data', () => {
    const input: LoadStructureInput = {
      data: new ArrayBuffer(100),
      format: 'schematic',
    };

    expect(input.data).toBeInstanceOf(ArrayBuffer);
    expect(input.format).toBe('schematic');
  });

  it('should accept all format types', () => {
    const formats: StructureFormat[] = ['schematic', 'schem', 'litematic', 'mcstructure'];

    for (const format of formats) {
      const input: LoadStructureInput = {
        data: new ArrayBuffer(100),
        format,
      };
      expect(input.format).toBe(format);
    }
  });
});

describe('LoadStructureOutput', () => {
  it('should contain structure and parse time', () => {
    const structure = createTestStructure();
    const output: LoadStructureOutput = {
      structure,
      parseTime: 123,
    };

    expect(output.structure).toBe(structure);
    expect(output.parseTime).toBe(123);
  });
});
